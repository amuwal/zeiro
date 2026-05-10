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

export type ClientSearchHit = {
  id: string;
  name: string;
  primaryEmail: string;
  contractType: string;
  lineUserId: string | null;
  inquiryCount: number;
};

export async function searchClients(
  firmId: string,
  query: string,
  limit = 10,
): Promise<ClientSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const pattern = `%${trimmed}%`;
  return getPrisma().$queryRaw<ClientSearchHit[]>`
    SELECT
      c.id,
      c.name,
      c.primary_email AS "primaryEmail",
      c.contract_type AS "contractType",
      c.line_user_id AS "lineUserId",
      (SELECT COUNT(*)::int FROM inquiries i WHERE i.client_id = c.id) AS "inquiryCount"
    FROM clients c
    WHERE c.firm_id = ${firmId}::uuid
      AND (c.name ILIKE ${pattern} OR c.primary_email ILIKE ${pattern})
    ORDER BY c.name ASC
    LIMIT ${limit}
  `;
}

export type ClientFootprint = {
  inquiryCount: number;
  draftCount: number;
  auditCount: number;
};

export async function getClientFootprint(
  firmId: string,
  clientId: string,
): Promise<ClientFootprint | null> {
  const rows = await getPrisma().$queryRaw<
    { inquiryCount: number; draftCount: number; auditCount: number }[]
  >`
    SELECT
      (SELECT COUNT(*)::int FROM inquiries i WHERE i.firm_id = ${firmId}::uuid AND i.client_id = ${clientId}::uuid) AS "inquiryCount",
      (SELECT COUNT(*)::int FROM drafts d WHERE d.inquiry_id IN
         (SELECT id FROM inquiries WHERE firm_id = ${firmId}::uuid AND client_id = ${clientId}::uuid)
      ) AS "draftCount",
      (SELECT COUNT(*)::int FROM audit_events a WHERE a.firm_id = ${firmId}::uuid AND a.inquiry_id IN
         (SELECT id FROM inquiries WHERE firm_id = ${firmId}::uuid AND client_id = ${clientId}::uuid)
      ) AS "auditCount"
  `;
  return rows[0] ?? null;
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
