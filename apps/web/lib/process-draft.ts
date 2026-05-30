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
    inquiryId,
    clientId: inquiry.clientId,
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
      firmId,
      inquiryId,
      subject: result.subject,
      body: result.body,
      citations: result.citations,
      ...(result.citationBlocks ? { citationBlocks: result.citationBlocks } : {}),
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

  // no_draft and escalate both end up at 'escalated' status — the UI
  // distinguishes them via aiReview.recommendation. We still create a
  // skeleton draft row so the composer always has a starting template
  // (instead of falling back to the textarea placeholder) and reviewers
  // can immediately edit + send if they choose to override the agent's
  // judgment. The skeleton is marked via metadata so future UI can flag it.
  const inquiry = await getInquiry(firmId, inquiryId);
  const recipientName = inquiry?.client?.name ?? '顧問先';
  await createDraft({
    firmId,
    inquiryId,
    subject: inquiry?.subject ?? '',
    body: buildSkeletonBody({
      recipientName,
      kind: result.kind,
      reason: result.reason,
    }),
    citations: [],
    confidence: result.kind === 'no_draft' ? 0 : 0.1,
    model: DRAFT_MODEL,
  });
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
      skeletonDraft: true,
    },
  });
}

function buildSkeletonBody(args: {
  recipientName: string;
  kind: 'escalate' | 'no_draft';
  reason: string;
}): string {
  const note =
    args.kind === 'escalate'
      ? `※ AI判定: 所長税理士による個別判断が推奨されています。\n※ 理由: ${args.reason}\n`
      : `※ AI判定: 返信不要と判定されました（${args.reason}）。\n※ 必要な場合のみ送信してください。\n`;
  return [
    note,
    `${args.recipientName} 様`,
    '',
    'いつもお世話になっております。',
    '',
    '[ここに本文を記入してください]',
    '',
    'ご不明な点がございましたら、お気軽にお申し付けください。',
  ].join('\n');
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
