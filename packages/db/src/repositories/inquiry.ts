import type { InquiryHeaders, InquiryStatus } from '@zeiro/core';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../server';

type InquiryInsert = {
  firmId: string;
  clientId: string;
  messageId: string;
  receivedAt: string;
  subject: string;
  body: string;
  channel?: string;
  headers?: InquiryHeaders;
  assignedToId?: string | null;
  parentInquiryId?: string | null;
};

export type CreateInquiryResult =
  | { kind: 'created'; id: string }
  | { kind: 'duplicate'; id: string };

export async function createInquiry(input: InquiryInsert): Promise<CreateInquiryResult> {
  const prisma = getPrisma();
  try {
    const created = await prisma.inquiry.create({
      data: {
        firmId: input.firmId,
        clientId: input.clientId,
        messageId: input.messageId,
        receivedAt: new Date(input.receivedAt),
        subject: input.subject,
        body: input.body,
        channel: input.channel ?? 'email',
        headers: (input.headers ?? {}) as Prisma.InputJsonValue,
        assignedToId: input.assignedToId ?? null,
        parentInquiryId: input.parentInquiryId ?? null,
      },
      select: { id: true },
    });
    return { kind: 'created', id: created.id };
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') {
      throw e;
    }
    const existing = await prisma.inquiry.findUniqueOrThrow({
      where: { firmId_messageId: { firmId: input.firmId, messageId: input.messageId } },
      select: { id: true },
    });
    return { kind: 'duplicate', id: existing.id };
  }
}

export function listInquiries(firmId: string, status?: InquiryStatus) {
  return getPrisma().inquiry.findMany({
    where: { firmId, ...(status ? { status } : {}) },
    include: { client: { select: { name: true, primaryEmail: true } } },
    orderBy: { receivedAt: 'desc' },
  });
}

export type InquiryRow = Awaited<ReturnType<typeof listInquiries>>[number];

export function getInquiry(firmId: string, id: string) {
  return getPrisma().inquiry.findFirst({
    where: { id, firmId },
    include: {
      client: { select: { name: true, primaryEmail: true, lineUserId: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
}

export async function setInquiryStatus(firmId: string, id: string, status: InquiryStatus) {
  await getPrisma().inquiry.updateMany({
    where: { id, firmId },
    data: { status },
  });
}

export async function setInquiryAssignee(
  firmId: string,
  id: string,
  assignedToId: string | null,
) {
  await getPrisma().inquiry.updateMany({
    where: { id, firmId },
    data: { assignedToId },
  });
}

export type InquiryWithClient = NonNullable<Awaited<ReturnType<typeof getInquiry>>>;

export type InboxCounts = {
  all: number;
  pending: number;
  drafted: number;
  escalated: number;
  sent: number;
};

export async function getInboxCounts(firmId: string): Promise<InboxCounts> {
  const grouped = await getPrisma().inquiry.groupBy({
    by: ['status'],
    where: { firmId },
    _count: { _all: true },
  });
  const counts: InboxCounts = { all: 0, pending: 0, drafted: 0, escalated: 0, sent: 0 };
  for (const row of grouped) {
    const n = row._count._all;
    counts.all += n;
    if (row.status === 'pending') counts.pending = n;
    else if (row.status === 'drafted') counts.drafted = n;
    else if (row.status === 'escalated') counts.escalated = n;
    else if (row.status === 'sent') counts.sent = n;
  }
  return counts;
}

export function getMyInquiryCount(firmId: string, userId: string): Promise<number> {
  return getPrisma().inquiry.count({
    where: { firmId, assignedToId: userId },
  });
}

export async function walkThread(firmId: string, anchorInquiryId: string) {
  const ids = await getPrisma().$queryRaw<{ id: string }[]>`
    WITH RECURSIVE thread AS (
      SELECT id, parent_inquiry_id FROM inquiries WHERE id = ${anchorInquiryId}::uuid
      UNION
      SELECT i.id, i.parent_inquiry_id FROM inquiries i
      JOIN thread t ON i.id = t.parent_inquiry_id OR i.parent_inquiry_id = t.id
    )
    SELECT id FROM thread
  `;
  if (ids.length <= 1) return [];

  return getPrisma().inquiry.findMany({
    where: { firmId, id: { in: ids.map((r) => r.id) } },
    include: {
      client: { select: { name: true, primaryEmail: true } },
      drafts: {
        select: { id: true, subject: true, model: true, createdAt: true, metadata: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { receivedAt: 'asc' },
  });
}

export type ThreadInquiry = Awaited<ReturnType<typeof walkThread>>[number];
