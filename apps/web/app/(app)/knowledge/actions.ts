'use server';

import {
  flagKnowledgeChunk,
  recordAudit,
  searchKnowledgeBM25,
  unflagKnowledgeChunk,
} from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { requireFirmContext } from '@/lib/firm-context';
import { ingestKnowledge } from '@/lib/knowledge-ingest';

export type IngestState = { error: string | null };

export async function ingestKnowledgeAction(
  _prev: IngestState,
  formData: FormData,
): Promise<IngestState> {
  const { firmId, userId } = await requireFirmContext();

  const source = formData.get('source');
  if (typeof source !== 'string' || !source.trim()) {
    return { error: '出典名は必須です' };
  }

  const file = formData.get('file');
  const body = formData.get('body');
  const isEmail = formData.get('isEmail') === 'on';

  let content: string;
  if (file instanceof File && file.size > 0) {
    content = await file.text();
  } else if (typeof body === 'string' && body.trim().length > 0) {
    content = body;
  } else {
    return { error: 'ファイルまたは本文を入力してください' };
  }

  const documentId = randomUUID();
  const result = await ingestKnowledge({
    firmId,
    source: source.trim(),
    documentId,
    body: content,
    isEmail,
  });

  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'knowledge.updated',
    metadata: { documentId, source: source.trim(), chunks: result.chunks, op: 'ingest' },
  });

  revalidatePath('/knowledge');
  redirect(`/knowledge?ingested=${result.chunks}`);
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

function readField(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
