import { Prisma } from '@prisma/client';
import { getPrisma } from '../server';

export function findClientByEmail(firmId: string, email: string) {
  return getPrisma().client.findUnique({
    where: { firmId_primaryEmail: { firmId, primaryEmail: email.toLowerCase() } },
  });
}

export function findClientByLineUserId(firmId: string, lineUserId: string) {
  return getPrisma().client.findUnique({
    where: { firmId_lineUserId: { firmId, lineUserId } },
  });
}

export function getClient(firmId: string, id: string) {
  return getPrisma().client.findFirstOrThrow({ where: { id, firmId } });
}

export function listClients(firmId: string) {
  return getPrisma().client.findMany({
    where: { firmId },
    select: { id: true, name: true, lineUserId: true },
    orderBy: { name: 'asc' },
  });
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

export async function findOrCreateClientByEmail(firmId: string, email: string, name: string) {
  const primaryEmail = email.toLowerCase();
  const existing = await getPrisma().client.findUnique({
    where: { firmId_primaryEmail: { firmId, primaryEmail } },
  });
  if (existing) return { client: existing, created: false };

  try {
    const created = await getPrisma().client.create({
      data: { firmId, name, primaryEmail, contractType: 'unverified' },
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
