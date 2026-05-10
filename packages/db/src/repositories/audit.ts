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
