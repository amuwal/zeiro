import { DRAFT_MODEL, type DraftResult, type TriageResult } from '@zeiro/core';
import {
  createDraft,
  findClientByEmail,
  getInquiry,
  recordAudit,
  setInquiryAnalysis,
  setInquiryStatus,
  walkThread,
} from '@zeiro/db';
import { runInquiryPipeline, type ThreadMessage } from './agent-client';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

export async function processDraft(firmId: string, inquiryId: string): Promise<void> {
  const inquiry = await getInquiry(firmId, inquiryId);
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found in firm ${firmId}`);
  if (!inquiry.client) {
    throw new Error(
      `inquiry ${inquiryId} has no client — must be promoted from unmatched before drafting`,
    );
  }

  const threadHistory = await assembleThreadHistory(firmId, inquiryId);

  const result = await runInquiryPipeline({
    firmId,
    clientNotes: await readClientNotes(firmId, inquiry.client.primaryEmail),
    subject: inquiry.subject,
    body: inquiry.body,
    ...(threadHistory.length > 0 ? { threadHistory } : {}),
  });

  await persistResult(firmId, inquiryId, result);
}

async function assembleThreadHistory(
  firmId: string,
  currentInquiryId: string,
): Promise<ThreadMessage[]> {
  const thread = await walkThread(firmId, currentInquiryId);
  if (thread.length === 0) return [];
  const messages: ThreadMessage[] = [];
  for (const inq of thread) {
    if (inq.id === currentInquiryId) continue;
    messages.push({ role: 'customer', at: inq.receivedAt.toISOString(), body: inq.body });
    for (const draft of inq.drafts) {
      const sentAt = readSentAt(draft.metadata);
      if (sentAt) messages.push({ role: 'firm', at: sentAt, body: draft.body });
    }
  }
  messages.sort((a, b) => a.at.localeCompare(b.at));
  return messages;
}

function readSentAt(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const v = (metadata as { sentAt?: unknown }).sentAt;
  return typeof v === 'string' ? v : null;
}

async function readClientNotes(firmId: string, email: string): Promise<string | null> {
  const c = await findClientByEmail(firmId, email);
  return c?.notes ?? null;
}

async function persistResult(
  firmId: string,
  inquiryId: string,
  result: DraftResult,
): Promise<void> {
  await setInquiryAnalysis(firmId, inquiryId, analysisFromResult(result));

  if (result.kind === 'draft') {
    await createDraft({
      inquiryId,
      subject: result.subject,
      body: result.body,
      citations: result.citations,
      confidence: result.confidence,
      model: DRAFT_MODEL,
    });
    await setInquiryStatus(firmId, inquiryId, 'drafted');
    await recordAudit({
      firmId,
      actorId: SYSTEM_ACTOR,
      inquiryId,
      action: 'draft.generated',
      metadata: {
        confidence: result.confidence,
        citationCount: result.citations.length,
        recommendation: result.aiReview.recommendation,
        reviewConfidence: result.aiReview.confidence,
      },
    });
    return;
  }

  // no_draft and escalate both end up at 'escalated' status — the UI distinguishes
  // them via aiReview.recommendation (human_handoff vs no_reply_needed).
  await setInquiryStatus(firmId, inquiryId, 'escalated');
  await recordAudit({
    firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId,
    action: 'draft.escalated',
    metadata: {
      reason: result.reason,
      triage: result.triage,
      recommendation: result.aiReview.recommendation,
      reviewConfidence: result.aiReview.confidence,
    },
  });
}

function analysisFromResult(result: DraftResult): Record<string, unknown> {
  const triage: TriageResult = result.triage;
  const base: Record<string, unknown> = {
    category: triage.category,
    confidence: triage.confidence,
    urgency: triage.urgency,
    requiresTaxJudgment: triage.requiresTaxJudgment,
    aiReview: result.aiReview,
  };
  if (result.kind === 'escalate' || result.kind === 'no_draft') {
    base.reason = result.reason;
  }
  return base;
}
