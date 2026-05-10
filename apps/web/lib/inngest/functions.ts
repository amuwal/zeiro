import {
  findLatestSentBody,
  getDraftByInquiry,
  getInquiry,
  recordAudit,
  setInquiryAnalysis,
  setInquiryStatus,
} from '@zeiro/db';
import { ingestKnowledge } from '../knowledge-ingest';
import { processDraft } from '../process-draft';
import { inngest } from './client';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';
const MIN_INGEST_LENGTH = 50;

export const draftInquiryFn = inngest.createFunction(
  {
    id: 'draft-inquiry',
    concurrency: { key: 'event.data.firmId', limit: 5 },
    retries: 3,
    onFailure: async ({ event, error }) => {
      // Inngest fires this after all retries are exhausted. Mark the inquiry as
      // escalated so the poller stops, the reviewer sees a clear error state, and
      // the audit trail records the technical failure (vs. an AI-decided escalation).
      const original = event.data.event.data as { firmId: string; inquiryId: string };
      const { firmId, inquiryId } = original;
      const reason = `AI 処理に失敗しました: ${error.message}`;
      await setInquiryAnalysis(firmId, inquiryId, {
        category: 'その他',
        confidence: 0,
        urgency: 'medium',
        requiresTaxJudgment: false,
        reason,
        failureType: error.name,
      });
      await setInquiryStatus(firmId, inquiryId, 'escalated');
      await recordAudit({
        firmId,
        actorId: SYSTEM_ACTOR,
        inquiryId,
        action: 'draft.failed',
        metadata: { reason, errorName: error.name },
      });
    },
  },
  { event: 'inquiry.queued' },
  async ({ event, step }) => {
    await step.run('draft', () => processDraft(event.data.firmId, event.data.inquiryId));
    return { ok: true };
  },
);

export const autoAddKnowledgeFn = inngest.createFunction(
  {
    id: 'auto-add-knowledge',
    concurrency: { key: 'event.data.firmId', limit: 3 },
    retries: 3,
  },
  { event: 'knowledge.auto_add' },
  async ({ event, step }) => {
    await step.run('ingest', async () => {
      const { firmId, inquiryId, draftId } = event.data;
      const [inquiry, draft, sentBody] = await Promise.all([
        getInquiry(firmId, inquiryId),
        getDraftByInquiry(inquiryId),
        findLatestSentBody(firmId, inquiryId),
      ]);
      if (!inquiry || !draft) return { skipped: 'missing' };
      if (!inquiry.client) return { skipped: 'unmatched' };

      const body = sentBody ?? draft.body;
      if (body.trim().length < MIN_INGEST_LENGTH) return { skipped: 'too_short' };

      const result = await ingestKnowledge({
        firmId,
        source: `過去回答 / ${inquiry.client.name} / ${formatYMD(inquiry.receivedAt)}`,
        documentId: inquiry.id,
        body,
      });

      await recordAudit({
        firmId,
        actorId: SYSTEM_ACTOR,
        inquiryId,
        action: 'knowledge.updated',
        metadata: {
          source: 'auto_add_from_sent',
          chunks: result.chunks,
          draftId,
        },
      });
      return { chunks: result.chunks };
    });
    return { ok: true };
  },
);

function formatYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const functions = [draftInquiryFn, autoAddKnowledgeFn];
