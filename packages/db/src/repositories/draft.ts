import type { Draft, Prisma } from '@prisma/client';
import { type Citation, citationSchema } from '@zeiro/core';
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
  const merged = { ...existing, ...patch } as Prisma.InputJsonValue;
  await getPrisma().draft.update({ where: { id: draftId }, data: { metadata: merged } });
  return true;
}

export async function findDraftByOutboundMessageId(
  outboundMessageId: string,
): Promise<{ id: string; inquiryId: string } | null> {
  const rows = await getPrisma().$queryRaw<{ id: string; inquiry_id: string }[]>`
    SELECT id, inquiry_id FROM drafts
    WHERE metadata->>'outboundMessageId' = ${outboundMessageId}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? { id: row.id, inquiryId: row.inquiry_id } : null;
}
