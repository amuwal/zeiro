import type { Prisma } from '@prisma/client';
import { TenantIsolationError } from '@zeiro/core';
import { getPrisma } from '../server';

const TOMBSTONE_TEXT = '[削除済み]';

type TombstoneInput = {
  firmId: string;
  clientId: string;
  requestedBy: string;
  reason: string;
};

export type TombstoneResult = {
  inquiryCount: number;
  draftCount: number;
};

export async function tombstoneClient(input: TombstoneInput): Promise<TombstoneResult> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const tombstoneEmail = `deleted-${input.clientId.slice(0, 8)}@invalid`;
    const tombstoneName = `[deleted-${input.clientId.slice(0, 8)}]`;

    const inquiries = await tx.inquiry.findMany({
      where: { firmId: input.firmId, clientId: input.clientId },
      select: { id: true },
    });
    const inquiryIds = inquiries.map((i) => i.id);

    const draftCount = inquiryIds.length
      ? (
          await tx.draft.updateMany({
            where: { inquiryId: { in: inquiryIds } },
            data: { subject: TOMBSTONE_TEXT, body: TOMBSTONE_TEXT, citations: [] },
          })
        ).count
      : 0;

    const inquiryCount = inquiryIds.length
      ? (
          await tx.inquiry.updateMany({
            where: { id: { in: inquiryIds } },
            data: { subject: TOMBSTONE_TEXT, body: TOMBSTONE_TEXT, analysis: {} },
          })
        ).count
      : 0;

    // Scope the client row mutation by firmId — Client.id is globally unique, so
    // a bare `where: { id }` would let one firm tombstone another firm's client
    // (cross-firm destructive write, 税理士法 §38). updateMany + count assertion
    // makes a wrong-firm id a no-op that fails loudly instead of mutating B.
    const clientCount = (
      await tx.client.updateMany({
        where: { id: input.clientId, firmId: input.firmId },
        data: { name: tombstoneName, primaryEmail: tombstoneEmail, notes: null, metadata: {} },
      })
    ).count;
    if (clientCount !== 1) {
      throw new TenantIsolationError('tombstone target client not found in firm');
    }

    await tx.auditEvent.create({
      data: {
        firmId: input.firmId,
        actorId: input.requestedBy,
        inquiryId: null,
        action: 'client.tombstoned',
        metadata: {
          clientId: input.clientId,
          inquiryCount,
          draftCount,
          reason: input.reason,
        } as Prisma.InputJsonValue,
      },
    });

    return { inquiryCount, draftCount };
  });
}
