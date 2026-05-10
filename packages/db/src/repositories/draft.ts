import { type Citation, citationSchema } from '@zeiro/core';
import { Prisma, type Draft } from '@prisma/client';
import { z } from 'zod';
import { getPrisma } from '../server';

const citationsArraySchema = z.array(citationSchema);

type DraftInsert = {
  inquiryId: string;
  subject: string;
  body: string;
  citations: Citation[];
  confidence: number;
  model: string;
};

export type DraftWithCitations = Omit<Draft, 'citations'> & { citations: Citation[] };

export async function createDraft(input: DraftInsert): Promise<DraftWithCitations> {
  const row = await getPrisma().draft.create({
    data: {
      inquiryId: input.inquiryId,
      subject: input.subject,
      body: input.body,
      citations: input.citations,
      confidence: input.confidence,
      model: input.model,
    },
  });
  return hydrate(row);
}

export async function getDraftByInquiry(inquiryId: string): Promise<DraftWithCitations | null> {
  const row = await getPrisma().draft.findFirst({
    where: { inquiryId },
    orderBy: { createdAt: 'desc' },
  });
  return row ? hydrate(row) : null;
}

function hydrate(row: Draft): DraftWithCitations {
  return { ...row, citations: citationsArraySchema.parse(row.citations) };
}

type SentMetadata = {
  outboundMessageId: string;
  sgMessageId: string | null;
};

export async function recordDraftSent(draftId: string, info: SentMetadata): Promise<void> {
  await patchDraftMetadata(draftId, {
    outboundMessageId: info.outboundMessageId,
    sgMessageId: info.sgMessageId,
    sentAt: new Date().toISOString(),
  });
}

export async function patchDraftMetadata(
  draftId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const current = await getPrisma().draft.findUnique({
    where: { id: draftId },
    select: { metadata: true },
  });
  if (!current) return false;
  const existing =
    current.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata)
      ? (current.metadata as Record<string, unknown>)
      : {};
  const merged: Prisma.InputJsonValue = { ...existing, ...patch };
  await getPrisma().draft.update({ where: { id: draftId }, data: { metadata: merged } });
  return true;
}

type DraftRef = { id: string; inquiryId: string; deliveredAt: string | null };

export async function findDraftBySgMessageId(sgMessageId: string): Promise<DraftRef | null> {
  const rows = await getPrisma().$queryRaw<
    { id: string; inquiry_id: string; metadata: Record<string, unknown> | null }[]
  >`
    SELECT id, inquiry_id, metadata FROM drafts
    WHERE metadata->>'sgMessageId' = ${sgMessageId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const deliveredAt =
    row.metadata && typeof row.metadata === 'object' && 'deliveredAt' in row.metadata
      ? String(row.metadata.deliveredAt)
      : null;
  return { id: row.id, inquiryId: row.inquiry_id, deliveredAt };
}
