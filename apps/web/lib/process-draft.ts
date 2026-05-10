import { DRAFT_MODEL, type DraftResult } from '@zeiro/core';
import {
  createDraft,
  findClientByEmail,
  getInquiry,
  recordAudit,
  setInquiryStatus,
} from '@zeiro/db';
import { runInquiryPipeline } from './agent-client';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

export async function processDraft(firmId: string, inquiryId: string): Promise<void> {
  const inquiry = await getInquiry(firmId, inquiryId);
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found in firm ${firmId}`);

  const result = await runInquiryPipeline({
    firmId,
    clientNotes: await readClientNotes(firmId, inquiry.client.primaryEmail),
    subject: inquiry.subject,
    body: inquiry.body,
  });

  await persistResult(firmId, inquiryId, result);
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
      metadata: { confidence: result.confidence, citationCount: result.citations.length },
    });
    return;
  }

  const metadata =
    result.kind === 'escalate'
      ? { reason: result.reason, triage: result.triage }
      : { reason: result.reason };
  await setInquiryStatus(firmId, inquiryId, 'escalated');
  await recordAudit({
    firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId,
    action: 'draft.escalated',
    metadata,
  });
}
