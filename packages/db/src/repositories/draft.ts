import type { Draft, Prisma } from '@prisma/client';
import {
  type Citation,
  type CitationBlock,
  citationBlockSchema,
  citationSchema,
} from '@zeiro/core';
import { z } from 'zod';
import { getPrisma } from '../server';

const citationsArraySchema = z.array(citationSchema);
const citationBlocksSchema = z.array(citationBlockSchema);

type DraftInsert = {
  inquiryId: string;
  subject: string;
  body: string;
  citations: Citation[];
  citationBlocks?: CitationBlock[];
  confidence: number;
  model: string;
};

export type DraftWithCitations = Omit<Draft, 'citations'> & {
  citations: Citation[];
  citationBlocks: CitationBlock[] | null;
};

export async function createDraft(input: DraftInsert): Promise<DraftWithCitations> {
  const metadata: Prisma.InputJsonValue =
    input.citationBlocks && input.citationBlocks.length > 0
      ? { citationBlocks: input.citationBlocks }
      : {};
  const row = await getPrisma().draft.create({
    data: {
      inquiryId: input.inquiryId,
      subject: input.subject,
      body: input.body,
      citations: input.citations,
      confidence: input.confidence,
      model: input.model,
      metadata,
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
  return {
    ...row,
    citations: citationsArraySchema.parse(row.citations),
    citationBlocks: readBlocks(row.metadata),
  };
}

function readBlocks(metadata: Prisma.JsonValue): CitationBlock[] | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const raw = (metadata as { citationBlocks?: unknown }).citationBlocks;
  if (raw === undefined) return null;
  const parsed = citationBlocksSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
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

// Resend sends via AWS SES which rewrites our custom Message-ID with its own
// (e.g. `01<seq>-<uuid>-000000@ap-northeast-1.amazonses.com`) before transmission.
// We capture the SES-assigned Message-ID from the email.sent/delivered webhook and
// store it on draft.metadata.sentMessageId so the customer's eventual In-Reply-To
// (which references the SES Message-ID, not ours) can still resolve back to a draft.
export async function findDraftBySentMessageId(
  sentMessageId: string,
): Promise<{ id: string; inquiryId: string } | null> {
  const rows = await getPrisma().$queryRaw<{ id: string; inquiry_id: string }[]>`
    SELECT id, inquiry_id FROM drafts
    WHERE metadata->>'sentMessageId' = ${sentMessageId}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? { id: row.id, inquiryId: row.inquiry_id } : null;
}
