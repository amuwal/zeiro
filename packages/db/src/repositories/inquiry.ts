import { Prisma } from '@prisma/client';
import type { InquiryHeaders, InquiryStatus } from '@zeiro/core';
import { getPrisma } from '../server';

type InquiryInsert = {
  firmId: string;
  clientId: string | null;
  messageId: string;
  receivedAt: string;
  subject: string;
  body: string;
  channel?: string;
  headers?: InquiryHeaders;
  assignedToId?: string | null;
  parentInquiryId?: string | null;
  status?: string;
  unmatchedSender?: string | null;
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
        ...(input.status ? { status: input.status } : {}),
        ...(input.unmatchedSender !== undefined ? { unmatchedSender: input.unmatchedSender } : {}),
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

// Visibility scope for assigned-only users (Staff/Viewer). `seeAll` true → no
// filter. Otherwise the user sees an inquiry only if they're its assignee or a
// 担当者 of its client. Undefined scope = full access (system / server jobs).
export type ViewerScope = { userId: string; seeAll: boolean };

function scopeWhere(scope: ViewerScope | undefined): Prisma.InquiryWhereInput {
  if (!scope || scope.seeAll) return {};
  return {
    OR: [
      { assignedToId: scope.userId },
      { client: { assignees: { some: { userId: scope.userId } } } },
    ],
  };
}

export function listInquiries(firmId: string, status?: InquiryStatus, scope?: ViewerScope) {
  return getPrisma().inquiry.findMany({
    where: { firmId, ...(status ? { status } : {}), ...scopeWhere(scope) },
    include: {
      client: { select: { name: true, primaryEmail: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { receivedAt: 'desc' },
  });
}

export type InquiryRow = Awaited<ReturnType<typeof listInquiries>>[number];
export type InquiryThreadRow = InquiryRow & { threadCount: number };

// Inbox shows ONE row per conversation thread (the leaf inquiry — the latest message).
// Each thread is a chain of inquiries linked via `parent_inquiry_id`; a leaf has no
// other inquiry pointing at it. Status is reported by the leaf, so the inbox tells
// the reviewer "what to do next" rather than re-surfacing already-handled prior messages.
export async function listInquiryThreads(
  firmId: string,
  status?: InquiryStatus,
  scope?: ViewerScope,
): Promise<InquiryThreadRow[]> {
  const all = await listInquiries(firmId, undefined, scope);
  const childOf = new Map<string, true>();
  for (const inq of all) {
    if (inq.parentInquiryId) childOf.set(inq.parentInquiryId, true);
  }
  const byId = new Map(all.map((i) => [i.id, i]));
  const leaves = all.filter((i) => !childOf.has(i.id));
  return leaves
    .filter((i) => !status || i.status === status)
    .map((leaf) => {
      let count = 1;
      let parentId = leaf.parentInquiryId;
      while (parentId) {
        const parent = byId.get(parentId);
        if (!parent) break;
        count += 1;
        parentId = parent.parentInquiryId;
      }
      return { ...leaf, threadCount: count };
    });
}

// Last N inquiries for a single client, oldest→newest after slicing — used by
// the agent's get-recent-inquiries tool to give the model "what did we tell
// this client before" context without dragging in unrelated firm inquiries.
export async function listRecentInquiriesForClient(
  firmId: string,
  clientId: string,
  limit: number,
): Promise<Array<{ id: string; subject: string; status: string; receivedAt: Date }>> {
  const rows = await getPrisma().inquiry.findMany({
    where: { firmId, clientId },
    select: { id: true, subject: true, status: true, receivedAt: true },
    orderBy: { receivedAt: 'desc' },
    take: Math.max(1, Math.min(20, limit)),
  });
  return rows.reverse();
}

export function getInquiry(firmId: string, id: string, scope?: ViewerScope) {
  return getPrisma().inquiry.findFirst({
    where: { id, firmId, ...scopeWhere(scope) },
    include: {
      client: { select: { name: true, primaryEmail: true, lineUserId: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
}

// Threading lookup: when a customer reply has In-Reply-To pointing at one of the
// customer's own previous emails (not at our outbound draft), we need to find that
// prior inquiry to link the thread. Without this the chain orphans whenever Gmail
// picks the customer's prior message as the reply anchor.
export async function findInquiryByMessageId(
  firmId: string,
  messageId: string,
): Promise<{ id: string } | null> {
  return getPrisma().inquiry.findFirst({
    where: { firmId, messageId },
    select: { id: true },
  });
}

export async function setInquiryStatus(firmId: string, id: string, status: InquiryStatus) {
  await getPrisma().inquiry.updateMany({
    where: { id, firmId },
    data: { status },
  });
}

export async function setInquiryAssignee(firmId: string, id: string, assignedToId: string | null) {
  await getPrisma().inquiry.updateMany({
    where: { id, firmId },
    data: { assignedToId },
  });
}

export async function setInquiryAnalysis(
  firmId: string,
  id: string,
  analysis: Record<string, unknown>,
) {
  await getPrisma().inquiry.updateMany({
    where: { id, firmId },
    data: { analysis: analysis as Prisma.InputJsonValue },
  });
}

export type InquiryWithClient = NonNullable<Awaited<ReturnType<typeof getInquiry>>>;

export type InboxCounts = {
  all: number;
  pending: number;
  drafted: number;
  escalated: number;
  sent: number;
  unmatched: number;
};

export async function getInboxCounts(firmId: string, scope?: ViewerScope): Promise<InboxCounts> {
  // Count by thread (leaf inquiry) so the sidebar matches what's actually shown
  // in the inbox list. A long conversation that's "sent" appears once, not N times.
  const scopeClause =
    scope && !scope.seeAll
      ? Prisma.sql`AND (i.assigned_to_id = ${scope.userId}::uuid OR EXISTS (
          SELECT 1 FROM client_assignees ca WHERE ca.client_id = i.client_id AND ca.user_id = ${scope.userId}::uuid
        ))`
      : Prisma.empty;
  const rows = await getPrisma().$queryRaw<{ status: string; count: number }[]>`
    SELECT i.status, COUNT(*)::int AS count
    FROM inquiries i
    WHERE i.firm_id = ${firmId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM inquiries c WHERE c.parent_inquiry_id = i.id
      )
      ${scopeClause}
    GROUP BY i.status
  `;
  const counts: InboxCounts = {
    all: 0,
    pending: 0,
    drafted: 0,
    escalated: 0,
    sent: 0,
    unmatched: 0,
  };
  for (const row of rows) {
    counts.all += row.count;
    if (row.status === 'pending') counts.pending = row.count;
    else if (row.status === 'drafted') counts.drafted = row.count;
    else if (row.status === 'escalated') counts.escalated = row.count;
    else if (row.status === 'sent') counts.sent = row.count;
    else if (row.status === 'unmatched') counts.unmatched = row.count;
  }
  return counts;
}

// Count of actionable leaf inquiries the user has NOT yet opened — drives the
// inbox tab badge + the notification dot (decreases as items are opened).
export async function countUnreadLeaves(
  firmId: string,
  userId: string,
  scope?: ViewerScope,
): Promise<number> {
  const scopeClause =
    scope && !scope.seeAll
      ? Prisma.sql`AND (i.assigned_to_id = ${scope.userId}::uuid OR EXISTS (
          SELECT 1 FROM client_assignees ca WHERE ca.client_id = i.client_id AND ca.user_id = ${scope.userId}::uuid
        ))`
      : Prisma.empty;
  const rows = await getPrisma().$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM inquiries i
    WHERE i.firm_id = ${firmId}::uuid
      AND NOT EXISTS (SELECT 1 FROM inquiries c WHERE c.parent_inquiry_id = i.id)
      AND i.status IN ('pending', 'drafted', 'escalated', 'unmatched')
      AND NOT EXISTS (
        SELECT 1 FROM inquiry_reads r WHERE r.inquiry_id = i.id AND r.user_id = ${userId}::uuid
      )
      ${scopeClause}
  `;
  return rows[0]?.count ?? 0;
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
  if (ids.length === 0) return [];

  return getPrisma().inquiry.findMany({
    where: { firmId, id: { in: ids.map((r) => r.id) } },
    include: {
      client: { select: { name: true, primaryEmail: true } },
      drafts: {
        select: {
          id: true,
          subject: true,
          body: true,
          model: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { receivedAt: 'asc' },
  });
}

export type ThreadInquiry = Awaited<ReturnType<typeof walkThread>>[number];

export type ClientInquirySummary = {
  id: string;
  receivedAt: Date;
  subject: string;
  status: string;
  channel: string;
};

export async function promoteUnmatchedInquiry(
  firmId: string,
  inquiryId: string,
  clientId: string,
  assignedToId: string | null,
): Promise<void> {
  await getPrisma().inquiry.updateMany({
    where: { id: inquiryId, firmId, status: 'unmatched' },
    data: {
      clientId,
      assignedToId,
      unmatchedSender: null,
      status: 'pending',
    },
  });
}

export async function promoteAllUnmatchedFromSender(
  firmId: string,
  senderEmail: string,
  clientId: string,
  assignedToId: string | null,
): Promise<string[]> {
  const email = senderEmail.toLowerCase();
  const rows = await getPrisma().inquiry.findMany({
    where: { firmId, status: 'unmatched', unmatchedSender: email },
    select: { id: true },
  });
  if (rows.length === 0) return [];
  await getPrisma().inquiry.updateMany({
    where: { firmId, status: 'unmatched', unmatchedSender: email },
    data: {
      clientId,
      assignedToId,
      unmatchedSender: null,
      status: 'pending',
    },
  });
  return rows.map((r) => r.id);
}

export function listInquiriesByClient(
  firmId: string,
  clientId: string,
  limit = 50,
): Promise<ClientInquirySummary[]> {
  return getPrisma().inquiry.findMany({
    where: { firmId, clientId },
    select: { id: true, receivedAt: true, subject: true, status: true, channel: true },
    orderBy: { receivedAt: 'desc' },
    take: limit,
  });
}
