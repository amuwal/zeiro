import { type CitationBlock, DRAFT_MODEL } from '@zeiro/core';
import { createDraft, recordAudit, setInquiryStatus } from '@zeiro/db';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

export type InquiryStatus = 'pending' | 'drafted' | 'sent' | 'escalated' | 'rejected';

/** A terminal tool result accumulated from a chat stream. We only care about
 * the latest one — if the agent (mis)calls multiple, the last wins. */
export type TerminalToolResult =
  | {
      name: 'propose-draft';
      body: string;
      citations: { source: string; citedText: string }[];
      blocks: CitationBlock[];
    }
  | { name: 'escalate'; reason: string }
  | { name: 'no-reply-needed'; reason: string };

/** Maps a Mastra tool-call registry key to our terminal kind. Keys MUST match
 * the keys used in `inquiryAgent.tools` (not the tool's own `id` field). */
export const TERMINAL_REGISTRY_KEYS: Record<string, TerminalToolResult['name']> = {
  proposeDraft: 'propose-draft',
  escalate: 'escalate',
  noReplyNeeded: 'no-reply-needed',
};

export function readTerminalToolResult(
  registryKey: string,
  result: unknown,
): TerminalToolResult | null {
  const kind = TERMINAL_REGISTRY_KEYS[registryKey];
  if (!kind || !result || typeof result !== 'object') return null;
  const r = result as Record<string, unknown>;
  if (kind === 'propose-draft' && r.kind === 'draft') {
    type Cite = { source: string; citedText: string };
    return {
      name: 'propose-draft',
      body: String(r.body ?? ''),
      citations: Array.isArray(r.citations) ? (r.citations as Cite[]) : [],
      blocks: Array.isArray(r.blocks) ? (r.blocks as CitationBlock[]) : [],
    };
  }
  if (kind === 'escalate' && r.kind === 'escalate') {
    return { name: 'escalate', reason: String(r.reason ?? '') };
  }
  if (kind === 'no-reply-needed' && r.kind === 'no_draft') {
    return { name: 'no-reply-needed', reason: String(r.reason ?? '') };
  }
  return null;
}

/** Persist the chat agent's terminal tool result. Gated by current status:
 *  - `sent` → noop (the reply already went out; mutating the draft is meaningless)
 *  - anything else → write draft / flip status / audit.
 *  Returns the new status and (for draft) the draft id, so the SSE endpoint
 *  can tell the client to refresh. */
export async function persistChatTerminal(args: {
  firmId: string;
  inquiryId: string;
  subject: string;
  currentStatus: InquiryStatus;
  terminal: TerminalToolResult;
}): Promise<{ status: InquiryStatus; draftId?: string } | null> {
  if (args.currentStatus === 'sent') return null;

  if (args.terminal.name === 'propose-draft') {
    const t = args.terminal;
    const confidence = confidenceFromCitations(t.citations.length);
    const draft = await createDraft({
      firmId: args.firmId,
      inquiryId: args.inquiryId,
      subject: args.subject,
      body: t.body,
      citations: t.citations.map((c) => ({ source: c.source, snippet: c.citedText })),
      ...(t.blocks.length > 0 ? { citationBlocks: t.blocks } : {}),
      confidence,
      model: DRAFT_MODEL,
    });
    await setInquiryStatus(args.firmId, args.inquiryId, 'drafted');
    await recordAudit({
      firmId: args.firmId,
      actorId: SYSTEM_ACTOR,
      inquiryId: args.inquiryId,
      action: 'draft.generated',
      metadata: {
        source: 'chat',
        confidence,
        citationCount: t.citations.length,
      },
    });
    return { status: 'drafted', draftId: draft.id };
  }

  // escalate / no-reply-needed both land on 'escalated' status; the difference
  // is the audit action + downstream UI tone (suggestion-pill uses analysis).
  // Pipeline uses the same 'draft.escalated' action for both escalate and
  // no_reply outcomes — metadata.tool distinguishes them.
  await setInquiryStatus(args.firmId, args.inquiryId, 'escalated');
  await recordAudit({
    firmId: args.firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId: args.inquiryId,
    action: 'draft.escalated',
    metadata: { source: 'chat', tool: args.terminal.name, reason: args.terminal.reason },
  });
  return { status: 'escalated' };
}

function confidenceFromCitations(count: number): number {
  if (count === 0) return 0.3;
  if (count >= 3) return 0.85;
  return 0.55 + (count - 1) * 0.15;
}
