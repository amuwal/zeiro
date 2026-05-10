import type { AuditAction } from '@zeiro/core';
import type { Prisma } from '@prisma/client';
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

export async function findLatestSentBody(firmId: string, inquiryId: string): Promise<string | null> {
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
