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

export async function listClientsRich(firmId: string): Promise<ClientListRow[]> {
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
    ORDER BY c.name ASC
  `;
}

export type ClientDetail = ClientListRow & {
  createdAt: string | null;
  createdBy: string | null;
  archivedBy: string | null;
};

export async function getClientDetail(firmId: string, id: string): Promise<ClientDetail | null> {
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
    LIMIT 1
  `;
  return rows[0] ?? null;
}
