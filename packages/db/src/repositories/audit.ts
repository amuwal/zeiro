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
