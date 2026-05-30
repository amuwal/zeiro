import { Prisma } from '@prisma/client';
import type { ClientContractType, ClientSource } from '@zeiro/core';
import { getPrisma } from '../server';

// Keep client_assignees (the source of truth for assigned-scope visibility) in
// sync with the denormalized clients.assigned_tax_accountant_id "primary"
// pointer. Without this, setting a 担当税理士 on a client wouldn't let that user
// (if Staff/Viewer) actually see the client's inbox.
export async function syncPrimaryAssignee(
  firmId: string,
  clientId: string,
  userId: string | null,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.clientAssignee.deleteMany({ where: { firmId, clientId, role: 'primary' } });
  if (userId) {
    await prisma.clientAssignee.upsert({
      where: { clientId_userId: { clientId, userId } },
      update: { role: 'primary' },
      create: { firmId, clientId, userId, role: 'primary' },
    });
  }
}

export type LinkLineResult = { ok: true } | { ok: false; reason: 'not_found' | 'already_linked' };

export async function linkClientLineUserId(
  firmId: string,
  clientId: string,
  lineUserId: string,
): Promise<LinkLineResult> {
  const client = await getPrisma().client.findFirst({
    where: { id: clientId, firmId },
    select: { id: true },
  });
  if (!client) return { ok: false, reason: 'not_found' };

  try {
    await getPrisma().client.update({
      where: { id: client.id },
      data: { lineUserId },
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, reason: 'already_linked' };
    }
    throw e;
  }
}

export async function findOrCreateClientByEmail(
  firmId: string,
  email: string,
  name: string,
  source: ClientSource = 'web_form',
) {
  const primaryEmail = email.toLowerCase();
  const existing = await getPrisma().client.findUnique({
    where: { firmId_primaryEmail: { firmId, primaryEmail } },
  });
  if (existing) return { client: existing, created: false };

  const metadata = {
    source,
    createdAt: new Date().toISOString(),
    createdBy: null,
  } satisfies Record<string, unknown>;

  try {
    const created = await getPrisma().client.create({
      data: {
        firmId,
        name,
        primaryEmail,
        contractType: 'unverified',
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    return { client: created, created: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const racedRow = await getPrisma().client.findUniqueOrThrow({
        where: { firmId_primaryEmail: { firmId, primaryEmail } },
      });
      return { client: racedRow, created: false };
    }
    throw e;
  }
}

export type CreateClientInput = {
  name: string;
  primaryEmail: string;
  contractType: ClientContractType;
  assignedTaxAccountantId?: string | null;
  notes?: string | null;
  source?: ClientSource;
  createdBy: string;
};

export type CreateClientResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'duplicate_email' };

export async function createClient(
  firmId: string,
  input: CreateClientInput,
): Promise<CreateClientResult> {
  const metadata = {
    source: input.source ?? 'manual',
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  } satisfies Record<string, unknown>;
  try {
    const row = await getPrisma().client.create({
      data: {
        firmId,
        name: input.name,
        primaryEmail: input.primaryEmail.toLowerCase(),
        contractType: input.contractType,
        assignedTaxAccountantId: input.assignedTaxAccountantId ?? null,
        notes: input.notes ?? null,
        metadata: metadata as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    if (input.assignedTaxAccountantId) {
      await syncPrimaryAssignee(firmId, row.id, input.assignedTaxAccountantId);
    }
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, reason: 'duplicate_email' };
    }
    throw e;
  }
}

export type UpdateClientInput = {
  name?: string;
  contractType?: ClientContractType;
  assignedTaxAccountantId?: string | null;
  notes?: string | null;
  chatworkRoomId?: string | null;
};

export async function updateClient(
  firmId: string,
  id: string,
  patch: UpdateClientInput,
): Promise<void> {
  await getPrisma().client.updateMany({
    where: { id, firmId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.contractType !== undefined ? { contractType: patch.contractType } : {}),
      ...(patch.assignedTaxAccountantId !== undefined
        ? { assignedTaxAccountantId: patch.assignedTaxAccountantId }
        : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.chatworkRoomId !== undefined ? { chatworkRoomId: patch.chatworkRoomId } : {}),
    },
  });
  if (patch.assignedTaxAccountantId !== undefined) {
    await syncPrimaryAssignee(firmId, id, patch.assignedTaxAccountantId);
  }
}

async function patchClientMetadata(
  firmId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const current = await getPrisma().client.findFirst({
    where: { id, firmId },
    select: { metadata: true },
  });
  if (!current) return false;
  const existing =
    current.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata)
      ? (current.metadata as Record<string, unknown>)
      : {};
  const merged = { ...existing, ...patch } as Prisma.InputJsonValue;
  await getPrisma().client.updateMany({ where: { id, firmId }, data: { metadata: merged } });
  return true;
}

export async function archiveClient(firmId: string, id: string, archivedBy: string): Promise<void> {
  await patchClientMetadata(firmId, id, {
    archivedAt: new Date().toISOString(),
    archivedBy,
  });
}

export async function unarchiveClient(firmId: string, id: string): Promise<void> {
  await patchClientMetadata(firmId, id, {
    archivedAt: null,
    archivedBy: null,
  });
}

export type DeleteClientResult =
  | { ok: true }
  | { ok: false; reason: 'has_inquiries'; inquiryCount: number };

export async function deleteClient(firmId: string, id: string): Promise<DeleteClientResult> {
  const inquiryCount = await getPrisma().inquiry.count({
    where: { firmId, clientId: id },
  });
  if (inquiryCount > 0) return { ok: false, reason: 'has_inquiries', inquiryCount };
  await getPrisma().client.deleteMany({ where: { id, firmId } });
  return { ok: true };
}
