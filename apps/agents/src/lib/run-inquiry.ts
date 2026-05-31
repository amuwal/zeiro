import { RequestContext } from '@mastra/core/di';
import {
  type AiReview,
  type CitationBlock,
  DRAFT_GENERATION_TIMEOUT_MS,
  type DraftResult,
  type TriageResult,
  triageResultSchema,
} from '@zeiro/core';
import { pingDatabase } from '@zeiro/db';
import { ensureRePrefix } from '@zeiro/email';
import { inquiryAgent } from '../mastra/agents/inquiry.js';
import { triageAgent } from '../mastra/agents/triage.js';
import type { PipelineInput } from '../mastra/schemas.js';

// Matched against the *registry key* in inquiryAgent.tools (e.g. `proposeDraft`),
// not the tool's `id` field. Mastra emits the registry key as `toolName` in
// step payloads.
const TERMINAL_KEY_TO_KIND: Record<string, 'propose-draft' | 'escalate' | 'no-reply-needed'> = {
  proposeDraft: 'propose-draft',
  escalate: 'escalate',
  noReplyNeeded: 'no-reply-needed',
};
const MAX_STEPS = 8;

class AgentTimeoutError extends Error {
  constructor(ms: number) {
    super(`agent generation exceeded ${ms}ms`);
    this.name = 'AgentTimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AgentTimeoutError(ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Orchestrates a single inquiry: fast triage classifier first, then the
// autonomous inquiry agent. Returns the same DraftResult shape as the legacy
// pipeline so the web side doesn't change.
export async function runInquiry(input: PipelineInput): Promise<DraftResult> {
  // Degenerate input (empty body — e.g. an attachment-only or malformed mail)
  // must not crash the triage model call; hand it to a human instead of
  // leaving the inquiry stuck in "processing".
  if (!input.body || input.body.trim().length === 0) {
    const triage: TriageResult = {
      category: 'その他',
      urgency: 'medium',
      confidence: 0,
      requiresTaxJudgment: false,
    };
    return {
      kind: 'escalate',
      triage,
      reason: '本文が空のため自動処理できませんでした。担当者が内容を確認してください。',
      aiReview: defaultAiReview('human_handoff', 'low', 'empty inquiry body'),
    };
  }

  // Wake a suspended Neon compute via the resilient Prisma adapter before the
  // agent touches Mastra's @mastra/pg store, which would otherwise throw
  // "Authentication timed out" on the first draft after idle. Best-effort: a
  // ping failure shouldn't fail the run — the agent surfaces real DB errors.
  await pingDatabase().catch(() => {});

  const triage = await runTriage(input.body);

  const requestContext = new RequestContext<{
    firmId: string;
    clientId: string | null;
    subject: string;
    body: string;
  }>([
    ['firmId', input.firmId],
    ['clientId', input.clientId ?? null],
    ['subject', input.subject],
    ['body', input.body],
  ]);

  const userMessage = buildAgentMessage(input, triage);

  // N-10: cap the agent loop at the p95 budget. On timeout we escalate to a
  // human rather than let the inquiry hang (or burn 3 Inngest retries).
  let result: Awaited<ReturnType<typeof inquiryAgent.generate>>;
  try {
    result = await withTimeout(
      inquiryAgent.generate(userMessage, {
        requestContext,
        // Mastra-schema isolation: `resource` is the firmId, and the agent's
        // thread (which stores raw email bodies in the `mastra` schema) is
        // recalled only by {thread, resource}. input.firmId here is the
        // token-VERIFIED firmId (server.ts overwrites the body value with the
        // signed claim), so no request can plant or read another firm's thread.
        memory: {
          thread: input.inquiryId ?? `transient:${Date.now()}`,
          resource: input.firmId,
        },
        maxSteps: MAX_STEPS,
      }),
      DRAFT_GENERATION_TIMEOUT_MS,
    );
  } catch (e) {
    if (e instanceof AgentTimeoutError) {
      return {
        kind: 'escalate',
        triage,
        reason: `AI 処理が ${Math.round(DRAFT_GENERATION_TIMEOUT_MS / 1000)} 秒以内に完了しませんでした。担当者の確認が必要です。`,
        aiReview: defaultAiReview('human_handoff', 'low', 'agent generation timed out'),
      };
    }
    throw e;
  }

  const terminal = extractTerminalToolResult(result.steps);
  if (!terminal) {
    // The agent gave up without calling a terminal tool. Defensive escalate
    // so the inquiry still surfaces to a human rather than silently dropping.
    return {
      kind: 'escalate',
      triage,
      reason:
        'AI agent ended without selecting a terminal action (propose-draft / escalate / no-reply-needed).',
      aiReview: defaultAiReview('human_handoff', 'low', 'no terminal tool was called'),
    };
  }

  return composeDraftResult(input, triage, terminal);
}

async function runTriage(body: string): Promise<TriageResult> {
  const result = await triageAgent.generate(body, {
    structuredOutput: { schema: triageResultSchema },
  });
  return triageResultSchema.parse(result.object);
}

type TerminalCall =
  | { name: 'propose-draft'; result: ProposeDraftResult }
  | { name: 'escalate'; result: { kind: 'escalate'; reason: string } }
  | { name: 'no-reply-needed'; result: { kind: 'no_draft'; reason: string } };

type ProposeDraftResult = {
  kind: 'draft';
  body: string;
  citations: { source: string; citedText: string }[];
  blocks: CitationBlock[];
  usedSourceIds: string[];
};

// Walk the step results newest→oldest and return the first terminal tool
// result we find. The agent might have called multiple terminals if it
// misbehaved; we take the most recent and rely on the system prompt to
// enforce single-call discipline.
function extractTerminalToolResult(steps: unknown[]): TerminalCall | null {
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i] as {
      toolResults?: Array<{ payload?: { toolName?: string; result?: unknown } }>;
    };
    const results = step?.toolResults ?? [];
    for (let j = results.length - 1; j >= 0; j--) {
      const payload = results[j]?.payload;
      const key = payload?.toolName;
      if (typeof key === 'string' && key in TERMINAL_KEY_TO_KIND) {
        return { name: TERMINAL_KEY_TO_KIND[key]!, result: payload?.result } as TerminalCall;
      }
    }
  }
  return null;
}

function composeDraftResult(
  input: PipelineInput,
  triage: TriageResult,
  terminal: TerminalCall,
): DraftResult {
  if (terminal.name === 'propose-draft') {
    const r = terminal.result;
    return {
      kind: 'draft',
      triage,
      subject: ensureRePrefix(input.subject),
      body: r.body,
      citations: r.citations.map((c) => ({ source: c.source, snippet: c.citedText })),
      citationBlocks: r.blocks,
      confidence: confidenceFromCitations(r.citations.length),
      aiReview: defaultAiReview(
        'review_required',
        'medium',
        'agent selected propose-draft after autonomous retrieval',
      ),
    };
  }
  if (terminal.name === 'escalate') {
    return {
      kind: 'escalate',
      triage,
      reason: terminal.result.reason,
      aiReview: defaultAiReview('human_handoff', 'high', terminal.result.reason),
    };
  }
  return {
    kind: 'no_draft',
    triage,
    reason: terminal.result.reason,
    aiReview: defaultAiReview('no_reply_needed', 'high', terminal.result.reason),
  };
}

// Slice 1 synthesises aiReview from the agent's terminal choice — we no
// longer run a separate reflector pass. If eval shows the agent over-drafts
// borderline cases, slice 1.5 can re-introduce a reflector tool the agent
// is required to call before propose-draft.
function defaultAiReview(
  recommendation: AiReview['recommendation'],
  confidence: AiReview['confidence'],
  reasoning: string,
): AiReview {
  return { recommendation, confidence, reasoning, gaps: [], suggestions: [] };
}

function confidenceFromCitations(count: number): number {
  if (count === 0) return 0.3;
  if (count >= 3) return 0.85;
  return 0.55 + (count - 1) * 0.15;
}

function buildAgentMessage(input: PipelineInput, triage: TriageResult): string {
  const sections: string[] = [];
  sections.push(
    `# triage 分類結果\nカテゴリ: ${triage.category}\n緊急度: ${triage.urgency}\n税務判断要否: ${triage.requiresTaxJudgment}\n確信度: ${triage.confidence}`,
  );
  sections.push(`# 件名\n${input.subject}`);
  sections.push(`# 本文\n${input.body}`);
  if (input.clientNotes) sections.push(`# 顧問先メモ (事前共有)\n${input.clientNotes}`);
  if (input.threadHistory && input.threadHistory.length > 0) {
    const turns = input.threadHistory
      .map(
        (m) =>
          `--- ${m.role === 'customer' ? '顧問先' : '当事務所'} (${m.at}) ---\n${m.body.trim()}`,
      )
      .join('\n\n');
    sections.push(`# これまでのやり取り\n${turns}`);
  }
  sections.push(
    '上記を踏まえて、必要なツールを呼び出してから、終端ツールを 1 回だけ呼んでターンを終えてください。',
  );
  return sections.join('\n\n');
}
