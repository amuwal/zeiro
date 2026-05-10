'use server';

import { recordAudit } from '@zeiro/db';
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
