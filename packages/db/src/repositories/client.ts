import { Prisma } from '@prisma/client';
import { getPrisma } from '../server';

// See inquiry.ts ViewerScope — assigned-only users see only clients they are a
// 担当者 of. Undefined = full access.
export type ClientViewerScope = { userId: string; seeAll: boolean };

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

export function findClientByChatworkRoomId(firmId: string, chatworkRoomId: string) {
  return getPrisma().client.findUnique({
    where: { firmId_chatworkRoomId: { firmId, chatworkRoomId } },
  });
}

// Binds a 顧問先 to its Chatwork room (one room per client). firmId-scoped update
// so a firm can never touch another firm's client.
export async function setClientChatworkRoom(
  firmId: string,
  clientId: string,
  chatworkRoomId: string | null,
): Promise<void> {
  await getPrisma().client.updateMany({
    where: { id: clientId, firmId },
    data: { chatworkRoomId },
  });
}

export function getClient(firmId: string, id: string) {
  return getPrisma().client.findFirstOrThrow({ where: { id, firmId } });
}

export function listClients(firmId: string, scope?: ClientViewerScope) {
  return getPrisma().client.findMany({
    where: {
      firmId,
      ...(scope && !scope.seeAll ? { assignees: { some: { userId: scope.userId } } } : {}),
    },
    select: { id: true, name: true, lineUserId: true },
    orderBy: { name: 'asc' },
  });
}

// Tight lookup used by the CSV-import flow to detect duplicates before
// attempting inserts. Returns lowercase emails (citext column is already
// case-insensitive; lowercasing here keeps the JS Set lookup predictable).
export async function listClientEmails(firmId: string): Promise<Set<string>> {
  const rows = await getPrisma().client.findMany({
    where: { firmId },
    select: { primaryEmail: true },
  });
  return new Set(rows.map((r) => r.primaryEmail.toLowerCase()));
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

export type ClientListRow = {
  id: string;
  name: string;
  primaryEmail: string;
  lineUserId: string | null;
  contractType: string;
  assignedToId: string | null;
  assignedToName: string | null;
  source: string | null;
  archivedAt: string | null;
  notes: string | null;
  inquiryCount: number;
  lastContactAt: string | null;
};

export async function listClientsRich(
  firmId: string,
  scope?: ClientViewerScope,
): Promise<ClientListRow[]> {
  const scopeClause =
    scope && !scope.seeAll
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM client_assignees ca WHERE ca.client_id = c.id AND ca.user_id = ${scope.userId}::uuid
        )`
      : Prisma.empty;
  return getPrisma().$queryRaw<ClientListRow[]>`
    SELECT
      c.id,
      c.name,
      c.primary_email AS "primaryEmail",
      c.line_user_id AS "lineUserId",
      c.contract_type AS "contractType",
      c.assigned_tax_accountant_id AS "assignedToId",
      u.name AS "assignedToName",
      c.metadata->>'source' AS "source",
      c.metadata->>'archivedAt' AS "archivedAt",
      c.notes AS "notes",
      (SELECT COUNT(*)::int FROM inquiries i WHERE i.client_id = c.id) AS "inquiryCount",
      (
        SELECT to_char(MAX(i.received_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        FROM inquiries i WHERE i.client_id = c.id
      ) AS "lastContactAt"
    FROM clients c
    LEFT JOIN users u ON u.id = c.assigned_tax_accountant_id
    WHERE c.firm_id = ${firmId}::uuid
      ${scopeClause}
    ORDER BY c.name ASC
  `;
}

export type ClientDetail = ClientListRow & {
  createdAt: string | null;
  createdBy: string | null;
  archivedBy: string | null;
};

export async function getClientDetail(
  firmId: string,
  id: string,
  scope?: ClientViewerScope,
): Promise<ClientDetail | null> {
  const scopeClause =
    scope && !scope.seeAll
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM client_assignees ca WHERE ca.client_id = c.id AND ca.user_id = ${scope.userId}::uuid
        )`
      : Prisma.empty;
  const rows = await getPrisma().$queryRaw<ClientDetail[]>`
    SELECT
      c.id,
      c.name,
      c.primary_email AS "primaryEmail",
      c.line_user_id AS "lineUserId",
      c.contract_type AS "contractType",
      c.assigned_tax_accountant_id AS "assignedToId",
      u.name AS "assignedToName",
      c.metadata->>'source' AS "source",
      c.metadata->>'archivedAt' AS "archivedAt",
      c.metadata->>'archivedBy' AS "archivedBy",
      c.metadata->>'createdAt' AS "createdAt",
      c.metadata->>'createdBy' AS "createdBy",
      c.notes AS "notes",
      (SELECT COUNT(*)::int FROM inquiries i WHERE i.client_id = c.id) AS "inquiryCount",
      (
        SELECT to_char(MAX(i.received_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        FROM inquiries i WHERE i.client_id = c.id
      ) AS "lastContactAt"
    FROM clients c
    LEFT JOIN users u ON u.id = c.assigned_tax_accountant_id
    WHERE c.firm_id = ${firmId}::uuid AND c.id = ${id}::uuid
      ${scopeClause}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
