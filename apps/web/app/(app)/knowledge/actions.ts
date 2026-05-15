'use server';

import { randomUUID } from 'node:crypto';
import {
  bulkSetGlobalSourcesDisabled,
  createIngestionJob,
  disableGlobalSource,
  enableGlobalSource,
  flagKnowledgeChunk,
  recordAudit,
  searchKnowledgeBM25,
  unflagKnowledgeChunk,
} from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireFirmContext } from '@/lib/firm-context';
import { inngest } from '@/lib/inngest/client';
import { preflight } from '@/lib/knowledge/preflight';
import { ParserError } from '@/lib/knowledge/types';
import { ingestKnowledge } from '@/lib/knowledge-ingest';

export type IngestState = { error: string | null };

// File uploads queue a background job and redirect immediately. Pasted body
// text stays synchronous — it's always cheap (~2s for an embed) and the
// extra UX of a status banner isn't worth it for that path.
export async function ingestKnowledgeAction(
  _prev: IngestState,
  formData: FormData,
): Promise<IngestState> {
  const { firmId, userId } = await requireFirmContext();

  const source = formData.get('source');
  if (typeof source !== 'string' || !source.trim()) {
    return { error: '出典名は必須です' };
  }
  const trimmedSource = source.trim();

  const file = formData.get('file');
  const body = formData.get('body');

  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Run preflight inline so obvious failures (size, format, password) are
    // surfaced on the form rather than swallowed into a failed job row.
    try {
      await preflight({ buffer, filename: file.name, mimetype: file.type });
    } catch (e) {
      if (e instanceof ParserError) return { error: e.message };
      throw e;
    }

    const job = await createIngestionJob({
      firmId,
      actorId: userId,
      source: trimmedSource,
      filename: file.name,
      ...(file.type ? { mimetype: file.type } : {}),
      bytes: buffer,
      metadata: { sizeBytes: buffer.length },
    });

    await inngest.send({
      name: 'knowledge.user_uploaded',
      data: { jobId: job.id, firmId, actorId: userId },
    });

    revalidatePath('/knowledge');
    redirect(`/knowledge?job=${job.id}`);
  }

  if (typeof body === 'string' && body.trim().length > 0) {
    const documentId = randomUUID();
    const result = await ingestKnowledge({
      firmId,
      source: trimmedSource,
      documentId,
      body,
    });

    if (result.chunks === 0) {
      return {
        error: '抽出は成功しましたが、有効な文章が見つかりませんでした。内容をご確認ください。',
      };
    }

    await recordAudit({
      firmId,
      actorId: userId,
      inquiryId: null,
      action: 'knowledge.updated',
      metadata: {
        documentId,
        source: trimmedSource,
        chunks: result.chunks,
        op: 'ingest',
        parsedKind: 'text',
      },
    });

    revalidatePath('/knowledge');
    redirect(`/knowledge?ingested=${result.chunks}`);
  }

  return { error: 'ファイルまたは本文を入力してください' };
}

export async function flagChunk(formData: FormData) {
  const { firmId, userId } = await requireFirmContext();
  const chunkId = readField(formData, 'chunkId');
  const reason = readField(formData, 'reason') ?? '法改正の可能性';
  if (!chunkId) throw new Error('chunkId required');

  const ok = await flagKnowledgeChunk({ firmId, chunkId, reason, flaggedBy: userId });
  if (ok) {
    await recordAudit({
      firmId,
      actorId: userId,
      inquiryId: null,
      action: 'knowledge.updated',
      metadata: { op: 'flag', chunkId, reason },
    });
  }
  revalidatePath('/knowledge');
}

export async function unflagChunk(formData: FormData) {
  const { firmId, userId } = await requireFirmContext();
  const chunkId = readField(formData, 'chunkId');
  if (!chunkId) throw new Error('chunkId required');

  const ok = await unflagKnowledgeChunk({ firmId, chunkId, clearedBy: userId });
  if (ok) {
    await recordAudit({
      firmId,
      actorId: userId,
      inquiryId: null,
      action: 'knowledge.updated',
      metadata: { op: 'unflag', chunkId },
    });
  }
  revalidatePath('/knowledge');
}

export type BulkFlagState = { error: string | null; flagged: number };

export async function bulkFlagBySearch(
  _prev: BulkFlagState,
  formData: FormData,
): Promise<BulkFlagState> {
  const { firmId, userId, role } = await requireFirmContext();
  if (!role.toLowerCase().includes('admin')) {
    return { error: '権限がありません (所長のみ法改正フラグを操作可能)', flagged: 0 };
  }

  const query = readField(formData, 'query');
  const reason = readField(formData, 'reason') ?? '法改正の可能性';
  if (!query) return { error: '検索キーワードを入力してください', flagged: 0 };

  const matches = await searchKnowledgeBM25(firmId, query, 200);
  let flagged = 0;
  for (const hit of matches) {
    const ok = await flagKnowledgeChunk({ firmId, chunkId: hit.id, reason, flaggedBy: userId });
    if (ok) flagged += 1;
  }

  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'knowledge.updated',
    metadata: { op: 'bulk_flag', query, reason, flagged },
  });

  revalidatePath('/knowledge');
  return { error: null, flagged };
}

// One-shot enable/disable for every entry in the global pack at once. Common
// flow for new firms that want to bring in their own knowledge first and turn
// on the shared FAQ later (or vice versa).
export async function toggleAllGlobalSources(formData: FormData) {
  const { firmId, userId } = await requireFirmContext();
  const next = readField(formData, 'next');
  if (next !== 'disabled' && next !== 'enabled') throw new Error('next must be disabled|enabled');

  const changed = await bulkSetGlobalSourcesDisabled({
    firmId,
    actorId: userId,
    disabled: next === 'disabled',
  });

  if (changed > 0) {
    await recordAudit({
      firmId,
      actorId: userId,
      inquiryId: null,
      action: 'knowledge.updated',
      metadata: { op: next === 'disabled' ? 'global_disable_all' : 'global_enable_all', changed },
    });
  }
  revalidatePath('/knowledge');
  revalidatePath('/knowledge/packs/jp-tax-faq');
}

// Called by the in-flight ingestion banner on its 3-second poll. Just
// revalidating the path is enough — the page itself re-fetches the
// `listIngestionJobs` snapshot and the banner re-renders.
export async function revalidateKnowledge() {
  await requireFirmContext();
  revalidatePath('/knowledge');
}

// Per-firm opt-out for a single global knowledge source. The user can re-enable
// it at any time; both directions are audited so admins can later see which
// sources a firm has chosen to suppress and when.
export async function toggleGlobalSource(formData: FormData) {
  const { firmId, userId } = await requireFirmContext();
  const source = readField(formData, 'source');
  const next = readField(formData, 'next');
  if (!source) throw new Error('source required');
  if (next !== 'disabled' && next !== 'enabled') throw new Error('next must be disabled|enabled');

  const changed =
    next === 'disabled'
      ? await disableGlobalSource({ firmId, source, actorId: userId })
      : await enableGlobalSource({ firmId, source, actorId: userId });

  if (changed) {
    await recordAudit({
      firmId,
      actorId: userId,
      inquiryId: null,
      action: 'knowledge.updated',
      metadata: { op: next === 'disabled' ? 'global_disable' : 'global_enable', source },
    });
  }
  revalidatePath('/knowledge');
  revalidatePath('/knowledge/packs/jp-tax-faq');
}

function readField(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
