import { type AiReview, aiReviewSchema, type DraftResult, type TriageResult } from '@zeiro/core';
import type { KnowledgeHit } from '@zeiro/db';
import { ensureRePrefix } from '@zeiro/email';
import { reflectorAgent } from '../mastra/agents/reflector';
import { draftPrompt } from '../mastra/prompts/draft';
import type { ThreadMessage } from '../mastra/schemas';
import { callDrafterWithCitations, type DrafterResult } from './anthropic-draft';
import { hybridSearch } from './retrieval';

type Input = {
  firmId: string;
  clientNotes: string | null;
  subject: string;
  body: string;
  threadHistory?: ThreadMessage[] | undefined;
};

export type DraftDiagnostics = {
  hits: KnowledgeHit[];
  drafter: DrafterResult | null;
};

export async function draftReply(input: Input, triage: TriageResult): Promise<DraftResult> {
  const { result } = await runDraftPipeline(input, triage);
  return result;
}

// Same pipeline as `draftReply` but also returns the retrieval hits and raw
// drafter output, which the eval runner uses to assert retrieval quality and
// to verify that each cited snippet actually appears in the source document.
export async function runDraftPipeline(
  input: Input,
  triage: TriageResult,
): Promise<{ result: DraftResult; diagnostics: DraftDiagnostics }> {
  const hits = await hybridSearch(input.firmId, input.body);
  if (hits.length === 0) {
    const aiReview = await runReflector({ input, triage, hits, draftBody: null });
    const result: DraftResult =
      aiReview.recommendation === 'no_reply_needed'
        ? { kind: 'no_draft', triage, reason: aiReview.reasoning, aiReview }
        : { kind: 'escalate', triage, reason: aiReview.reasoning, aiReview };
    return { result, diagnostics: { hits, drafter: null } };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  const drafter = await callDrafterWithCitations({
    apiKey,
    systemPrompt: draftPrompt,
    userMessage: buildUserMessage(input, triage),
    documents: hits.map((h) => ({ source: h.source, content: h.content })),
  });

  const aiReview = await runReflector({ input, triage, hits, draftBody: drafter.text });
  const result = composeResult({ input, triage, drafter, aiReview });
  return { result, diagnostics: { hits, drafter } };
}

type ComposeArgs = {
  input: Input;
  triage: TriageResult;
  drafter: DrafterResult;
  aiReview: AiReview;
};

// The reflector is the sole decision-maker for what happens with the draft.
// It sees triage + thread + retrieved docs + the actual draft text, so it can
// spot issues that brittle keyword rules would miss.
function composeResult({ input, triage, drafter, aiReview }: ComposeArgs): DraftResult {
  switch (aiReview.recommendation) {
    case 'send_as_is':
    case 'review_required':
      return {
        kind: 'draft',
        triage,
        subject: ensureRePrefix(input.subject),
        body: drafter.text,
        citations: drafter.citations.map((c) => ({ source: c.source, snippet: c.citedText })),
        citationBlocks: drafter.blocks,
        confidence: confidenceFromReview(aiReview, drafter.citations.length),
        aiReview,
      };
    case 'human_handoff':
      return { kind: 'escalate', triage, reason: aiReview.reasoning, aiReview };
    case 'no_reply_needed':
      return { kind: 'no_draft', triage, reason: aiReview.reasoning, aiReview };
  }
}

export function verifyCitationCoverage(result: DrafterResult): boolean {
  return result.citations.length >= 1;
}

// Numeric confidence still drives the inbox row's confidence dots — anchored
// to the reflector's label, with a floor based on citation count.
function confidenceFromReview(review: AiReview, citationCount: number): number {
  const base = review.confidence === 'high' ? 0.9 : review.confidence === 'medium' ? 0.6 : 0.3;
  const citationFloor = Math.min(0.5, citationCount / 5);
  return Math.max(base, citationFloor);
}

type ReflectorInput = {
  input: Input;
  triage: TriageResult;
  hits: { source: string; content: string }[];
  draftBody: string | null;
};

async function runReflector(args: ReflectorInput): Promise<AiReview> {
  const userMessage = buildReflectorMessage(args);
  const result = await reflectorAgent.generate(userMessage, {
    structuredOutput: { schema: aiReviewSchema },
  });
  return aiReviewSchema.parse(result.object);
}

function buildReflectorMessage({ input, triage, hits, draftBody }: ReflectorInput): string {
  const sections: string[] = [];
  sections.push(`# triage 分類結果\n${JSON.stringify(triage, null, 2)}`);
  sections.push(`# 顧問先からの最新メッセージ\n件名: ${input.subject}\n本文:\n${input.body}`);
  if ((input.threadHistory ?? []).length > 0) {
    sections.push(`# 過去のスレッド履歴\n${formatThreadHistory(input.threadHistory ?? [])}`);
  }
  if (input.clientNotes) {
    sections.push(`# 顧問先メモ\n${input.clientNotes}`);
  }
  if (hits.length === 0) {
    sections.push('# 参照ナレッジ\n(該当なし — 関連知識が見つからなかった)');
  } else {
    const docs = hits.map((h, i) => `[${i + 1}] ${h.source}\n${h.content}`).join('\n\n---\n\n');
    sections.push(`# 参照ナレッジ\n${docs}`);
  }
  if (draftBody === null) {
    sections.push('# AI が生成した下書き\n(生成されていない — ナレッジ不足のため未生成)');
  } else {
    sections.push(`# AI が生成した下書き\n${draftBody}`);
  }
  sections.push(
    '上記を踏まえ、recommendation / reasoning / confidence / gaps / suggestions を出力してください。',
  );
  return sections.join('\n\n');
}

function buildUserMessage(input: Input, triage: TriageResult): string {
  const notes = input.clientNotes ? `\n\n顧問先メモ: ${input.clientNotes}` : '';
  const history = formatThreadHistory(input.threadHistory ?? []);
  return `カテゴリ: ${triage.category}${notes}${history}\n\n件名: ${input.subject}\n\n今回の問い合わせ本文:\n${input.body}\n\n上記の問い合わせに対する返信を作成してください。${history ? '過去のやり取りを踏まえ、繰り返しを避け、これまでに伝えた情報を前提として書いてください。' : ''}`;
}

function formatThreadHistory(history: ThreadMessage[]): string {
  if (history.length === 0) return '';
  const lines = history.map((m) => {
    const who = m.role === 'customer' ? '顧問先' : '当事務所';
    const at = formatTimestamp(m.at);
    return `--- ${who} (${at}) ---\n${m.body.trim()}`;
  });
  return `\n\n[これまでのやり取り]\n${lines.join('\n\n')}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').slice(0, 16);
}
