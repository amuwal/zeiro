import {
  claimIngestionJob,
  completeIngestionJob,
  failIngestionJob,
  findLatestSentBody,
  getDraftByInquiry,
  getInquiry,
  loadIngestionJobBytes,
  recordAudit,
  setInquiryAnalysis,
  setInquiryStatus,
} from '@zeiro/db';
import { extract } from '../knowledge/extract';
import { ParserError } from '../knowledge/types';
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

// Runs the slow part of a user-initiated knowledge upload off the request
// thread. The /knowledge/new server action validates + stores bytes + fires
// this event; everything heavy (parse, OCR, embed, insert) happens here.
// On failure we record the typed error code on the job row so the UI can
// distinguish "file was bad" from "the worker crashed" without parsing
// stack traces.
export const userUploadIngestionFn = inngest.createFunction(
  {
    id: 'knowledge-user-upload-ingestion',
    concurrency: { key: 'event.data.firmId', limit: 2 },
    retries: 2,
    onFailure: async ({ event, error }) => {
      const { jobId } = event.data.event.data as { jobId: string };
      await failIngestionJob({
        jobId,
        errorCode: 'extractor_failed',
        errorMessage: error.message,
      });
    },
  },
  { event: 'knowledge.user_uploaded' },
  async ({ event, step }) => {
    const { jobId, firmId, actorId } = event.data;

    // Everything happens in a single step. Inngest serializes step return
    // values via JSON, which mangles `Buffer` into `{type:"Buffer", data:…}`.
    // Keeping load → extract → ingest together avoids that boundary; retries
    // still work because the outer function is what Inngest retries.
    return step.run('ingest', async () => {
      const loaded = await loadIngestionJobBytes(jobId);
      if (!loaded) return { skipped: 'already-processed' };
      await claimIngestionJob(jobId);

      try {
        const extracted = await extract({
          buffer: loaded.bytes,
          filename: loaded.job.filename,
          ...(loaded.job.mimetype ? { mimetype: loaded.job.mimetype } : {}),
        });

        const ingest = await ingestKnowledge({
          firmId,
          source: loaded.job.source,
          documentId: jobId,
          body: extracted.text,
          ...(extracted.detectedLanguage ? { language: extracted.detectedLanguage } : {}),
          extractionKind: extracted.kind,
          extractionWarnings: extracted.warnings,
          extractionMeta: extracted.meta,
        });

        if (ingest.chunks === 0) {
          await failIngestionJob({
            jobId,
            errorCode: 'empty_extraction',
            errorMessage: '抽出は成功しましたが、有効な文章が見つかりませんでした。',
          });
          return { ok: false, reason: 'empty_extraction' };
        }

        await completeIngestionJob({
          jobId,
          chunkCount: ingest.chunks,
          metadata: {
            extractionKind: extracted.kind,
            pages: extracted.pages ?? null,
            language: extracted.detectedLanguage ?? null,
            warnings: extracted.warnings,
          },
        });

        await recordAudit({
          firmId,
          actorId,
          inquiryId: null,
          action: 'knowledge.updated',
          metadata: {
            op: 'ingest',
            jobId,
            source: loaded.job.source,
            chunks: ingest.chunks,
            parsedKind: extracted.kind,
            ...(extracted.pages !== undefined ? { pageCount: extracted.pages } : {}),
            ...(extracted.detectedLanguage ? { detectedLanguage: extracted.detectedLanguage } : {}),
            ...(extracted.warnings.length > 0 ? { warnings: extracted.warnings } : {}),
          },
        });

        return { ok: true, chunks: ingest.chunks };
      } catch (e) {
        // ParserError carries a typed code from preflight / extract. Anything
        // else is a real bug — rethrow so Inngest retries it, then onFailure
        // marks the job failed after retries are exhausted.
        if (e instanceof ParserError) {
          await failIngestionJob({
            jobId,
            errorCode: e.code,
            errorMessage: e.message,
          });
          return { ok: false, code: e.code };
        }
        throw e;
      }
    });
  },
);

export const functions = [draftInquiryFn, autoAddKnowledgeFn, userUploadIngestionFn];
