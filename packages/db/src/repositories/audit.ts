import type { Prisma } from '@prisma/client';
import type { AuditAction } from '@zeiro/core';
import { getPrisma } from '../server';

type AuditWrite = {
  firmId: string;
  actorId: string;
  inquiryId: string | null;
  action: AuditAction;
  metadata: Record<string, unknown>;
};

export async function recordAudit(event: AuditWrite) {
  await getPrisma().auditEvent.create({
    data: {
      firmId: event.firmId,
      actorId: event.actorId,
      inquiryId: event.inquiryId,
      action: event.action,
      metadata: event.metadata as Prisma.InputJsonValue,
    },
  });
}

export type UnmatchedLineEvent = {
  lineUserId: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
};

export async function listUnmatchedLineEvents(
  firmId: string,
  limit = 50,
): Promise<UnmatchedLineEvent[]> {
  const rows = await getPrisma().$queryRaw<
    { line_user_id: string; count: number; first_seen: Date; last_seen: Date }[]
  >`
    SELECT
      metadata->>'lineUserId' AS line_user_id,
      COUNT(*)::int AS count,
      MIN(created_at) AS first_seen,
      MAX(created_at) AS last_seen
    FROM audit_events
    WHERE firm_id = ${firmId}::uuid
      AND action = 'inquiry.received'
      AND metadata->>'unmatched' = 'true'
      AND metadata->>'channel' = 'line'
      AND metadata->>'lineUserId' IS NOT NULL
    GROUP BY metadata->>'lineUserId'
    ORDER BY MAX(created_at) DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    lineUserId: r.line_user_id,
    count: r.count,
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
  }));
}

export type AuditCursor = { createdAt: Date; id: string };

export type AuditFilter = {
  action?: AuditAction;
  actorId?: string;
  inquiryId?: string;
  after?: Date;
  before?: Date;
};

export type AuditRow = {
  id: string;
  firmId: string;
  actorId: string;
  inquiryId: string | null;
  action: string;
  metadata: unknown;
  createdAt: Date;
};

const DEFAULT_AUDIT_LIMIT = 50;

export async function listAuditEvents(
  firmId: string,
  filter: AuditFilter,
  cursor?: AuditCursor,
  limit: number = DEFAULT_AUDIT_LIMIT,
): Promise<{ rows: AuditRow[]; nextCursor: AuditCursor | null }> {
  const where: Prisma.AuditEventWhereInput = {
    firmId,
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.actorId ? { actorId: filter.actorId } : {}),
    ...(filter.inquiryId ? { inquiryId: filter.inquiryId } : {}),
    ...(filter.after || filter.before
      ? {
          createdAt: {
            ...(filter.after ? { gte: filter.after } : {}),
            ...(filter.before ? { lt: filter.before } : {}),
          },
        }
      : {}),
    ...(cursor
      ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }
      : {}),
  };

  const rows = await getPrisma().auditEvent.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const last = trimmed[trimmed.length - 1];
  const nextCursor = hasMore && last ? { createdAt: last.createdAt, id: last.id } : null;
  return { rows: trimmed, nextCursor };
}

export async function listRecentComplianceEvents(
  firmId: string,
  limit: number = 6,
): Promise<AuditRow[]> {
  const actions: AuditAction[] = [
    'knowledge.updated',
    'channel.configured',
    'client.identity_linked',
    'client.tombstoned',
    'draft.bounced',
    'draft.spam_reported',
    'draft.escalated',
  ];
  return getPrisma().auditEvent.findMany({
    where: { firmId, action: { in: actions } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function findLatestSentBody(
  firmId: string,
  inquiryId: string,
): Promise<string | null> {
  const event = await getPrisma().auditEvent.findFirst({
    where: { firmId, inquiryId, action: 'draft.sent' },
    orderBy: { createdAt: 'desc' },
    select: { metadata: true },
  });
  if (!event) return null;
  const meta = event.metadata;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const body = (meta as Record<string, unknown>).sentBody;
  return typeof body === 'string' ? body : null;
}
