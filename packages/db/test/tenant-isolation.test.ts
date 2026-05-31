import { TenantIsolationError } from '@zeiro/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  archiveClient,
  assigneesByClient,
  deleteBinding,
  deleteClient,
  findClientByEmail,
  findInquiryByMessageId,
  findIntegration,
  findLatestSentBody,
  flagKnowledgeChunk,
  getBindingByClient,
  getCategoryDistributionWindow,
  getChunkForFirm,
  getClient,
  getClientDetail,
  getClientFootprint,
  getDailyBuckets,
  getDraftByInquiry,
  getFirmChannel,
  getInboxCounts,
  getInquiry,
  getKnowledgeChunksByIds,
  getPrisma,
  getWindowKpis,
  linkClientLineUserId,
  listAssigneesForClient,
  listAuditEvents,
  listBindingsForFirm,
  listClientImports,
  listClients,
  listClientsRich,
  listFirmIntegrations,
  listIngestionJobs,
  listInquiries,
  listInquiryThreads,
  listKnowledgeChunks,
  listReadInquiryIds,
  listReceivedDocuments,
  listRecentInquiriesForClient,
  listUnmatchedLineEvents,
  markInquiryRead,
  promoteAllUnmatchedFromSender,
  promoteUnmatchedInquiry,
  searchClients,
  searchKnowledgeBM25,
  setInquiryStatus,
  tombstoneClient,
  updateClient,
  walkThread,
} from '../src/index';
import { type SeededFirm, seedTwoFirms, teardownFirms } from './seed';

// Ship-blocking tenant-isolation contract: seed two firms (A, B) with overlapping
// client email / inquiry subjects, then drive every list/get repository export
// from firm A and assert it can NEVER observe a firm-B row, and vice versa.
// Runs against the real Docker pgvector Postgres per CLAUDE.md (no DB mocks).

let A: SeededFirm;
let B: SeededFirm;

beforeAll(async () => {
  const seeded = await seedTwoFirms();
  A = seeded.a;
  B = seeded.b;
});

afterAll(async () => {
  if (A && B) await teardownFirms([A.firmId, B.firmId]);
});

function ids(rows: ReadonlyArray<{ id: string }>): string[] {
  return rows.map((r) => r.id);
}

describe('list exports never cross firm boundaries', () => {
  it('listInquiries: A sees only A inquiries', async () => {
    const aRows = await listInquiries(A.firmId);
    const bRows = await listInquiries(B.firmId);
    const aIds = ids(aRows);
    const bIds = ids(bRows);
    expect(aIds).toContain(A.inquiryId);
    expect(aIds).not.toContain(B.inquiryId);
    expect(aIds).not.toContain(B.childInquiryId);
    expect(bIds).toContain(B.inquiryId);
    expect(bIds).not.toContain(A.inquiryId);
  });

  it('listInquiryThreads: A never returns a B leaf', async () => {
    // Returns the leaf inquiry per thread; A's leaf is its child inquiry.
    const aLeafIds = ids(await listInquiryThreads(A.firmId));
    expect(aLeafIds).toContain(A.childInquiryId);
    expect(aLeafIds).not.toContain(B.inquiryId);
    expect(aLeafIds).not.toContain(B.childInquiryId);
  });

  it('listClients: A never returns B clients (same email both firms)', async () => {
    const aIds = ids(await listClients(A.firmId));
    const bIds = ids(await listClients(B.firmId));
    expect(aIds).toContain(A.clientId);
    expect(aIds).not.toContain(B.clientId);
    expect(bIds).toContain(B.clientId);
    expect(bIds).not.toContain(A.clientId);
  });

  it('listClientsRich: A never returns B clients', async () => {
    const aIds = ids(await listClientsRich(A.firmId));
    expect(aIds).toContain(A.clientId);
    expect(aIds).not.toContain(B.clientId);
  });

  it('searchClients (shared email): A only finds its own client', async () => {
    const aHits = ids(await searchClients(A.firmId, A.clientEmail, 20));
    expect(aHits).toContain(A.clientId);
    expect(aHits).not.toContain(B.clientId);
  });

  it('listKnowledgeChunks: A never returns B firm chunks', async () => {
    const aIds = ids(await listKnowledgeChunks(A.firmId));
    expect(aIds).toContain(A.knowledgeChunkId);
    expect(aIds).not.toContain(B.knowledgeChunkId);
  });

  it('searchKnowledgeBM25: A never returns B firm chunks', async () => {
    const aIds = ids(await searchKnowledgeBM25(A.firmId, 'knowledge content', 20));
    expect(aIds).not.toContain(B.knowledgeChunkId);
  });

  it('listFirmIntegrations: A never returns B integrations', async () => {
    const aIds = ids(await listFirmIntegrations(A.firmId));
    const bIds = ids(await listFirmIntegrations(B.firmId));
    // Each firm has exactly its own freee integration row.
    expect(aIds.length).toBe(1);
    expect(bIds.length).toBe(1);
    expect(new Set([...aIds, ...bIds]).size).toBe(2);
  });

  it('listAuditEvents: A never returns B audit rows', async () => {
    const { rows } = await listAuditEvents(A.firmId, {});
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((e) => e.firmId === A.firmId)).toBe(true);
    expect(rows.some((e) => e.firmId === B.firmId)).toBe(false);
  });

  it('listClientImports: A never returns B imports', async () => {
    const aIds = ids(await listClientImports(A.firmId));
    expect(aIds).toContain(A.clientImportId);
    expect(aIds).not.toContain(B.clientImportId);
  });

  it('listIngestionJobs: A never returns B jobs', async () => {
    const aIds = ids(await listIngestionJobs(A.firmId));
    expect(aIds).toContain(A.ingestionJobId);
    expect(aIds).not.toContain(B.ingestionJobId);
  });
});

describe('get exports refuse cross-firm ids', () => {
  it('getInquiry: A cannot read B inquiry by id', async () => {
    expect(await getInquiry(A.firmId, A.inquiryId)).not.toBeNull();
    expect(await getInquiry(A.firmId, B.inquiryId)).toBeNull();
    expect(await getInquiry(B.firmId, A.inquiryId)).toBeNull();
  });

  it('getClient: A cannot read B client by id', async () => {
    expect(await getClient(A.firmId, A.clientId)).not.toBeNull();
    // getClient uses findFirstOrThrow, so a cross-firm read REJECTS (not null)
    // — that rejection is itself the isolation guarantee.
    await expect(getClient(A.firmId, B.clientId)).rejects.toThrow();
  });

  it('getClientDetail: A cannot read B client by id', async () => {
    expect(await getClientDetail(A.firmId, A.clientId)).not.toBeNull();
    expect(await getClientDetail(A.firmId, B.clientId)).toBeNull();
  });

  it('getClientFootprint: A sees zero footprint for a B client id', async () => {
    // B's client genuinely has 1 inquiry + 1 draft + 1 audit in firm B; queried
    // under firm A those must all read as 0 (no cross-firm count leak).
    const bUnderA = await getClientFootprint(A.firmId, B.clientId);
    expect(bUnderA).toEqual({ inquiryCount: 0, draftCount: 0, auditCount: 0 });
    const bUnderB = await getClientFootprint(B.firmId, B.clientId);
    expect(bUnderB?.inquiryCount).toBeGreaterThan(0);
  });

  it('getDraftByInquiry: A cannot read B draft via B inquiry id', async () => {
    expect(await getDraftByInquiry(A.firmId, A.inquiryId)).not.toBeNull();
    expect(await getDraftByInquiry(A.firmId, B.inquiryId)).toBeNull();
  });

  it('getChunkForFirm: A cannot read B firm chunk by id', async () => {
    expect(await getChunkForFirm(A.firmId, A.knowledgeChunkId)).not.toBeNull();
    expect(await getChunkForFirm(A.firmId, B.knowledgeChunkId)).toBeNull();
  });

  it('findClientByEmail (shared email): each firm gets its own client', async () => {
    const aClient = await findClientByEmail(A.firmId, A.clientEmail);
    const bClient = await findClientByEmail(B.firmId, B.clientEmail);
    expect(aClient?.id).toBe(A.clientId);
    expect(bClient?.id).toBe(B.clientId);
    expect(aClient?.id).not.toBe(bClient?.id);
  });

  it('findInquiryByMessageId: A cannot resolve B message id', async () => {
    expect(await findInquiryByMessageId(A.firmId, A.inquiryMessageId)).not.toBeNull();
    expect(await findInquiryByMessageId(A.firmId, B.inquiryMessageId)).toBeNull();
  });

  it('findIntegration: A cannot read B integration', async () => {
    expect(await findIntegration(A.firmId, A.integrationProvider)).not.toBeNull();
    // Both firms have a freee row; A must get A's, not B's.
    const aInt = await findIntegration(A.firmId, 'freee');
    expect(aInt?.firmId).toBe(A.firmId);
  });
});

describe('aggregate exports count only the requesting firm', () => {
  it('getInboxCounts: A counts exclude B inquiries', async () => {
    const aCounts = await getInboxCounts(A.firmId);
    const bCounts = await getInboxCounts(B.firmId);
    // Each firm seeded exactly one leaf chain (root drafted + its pending child).
    // Counts must be symmetric and non-zero, proving neither bleeds into the other.
    expect(aCounts.all).toBeGreaterThan(0);
    expect(bCounts.all).toBeGreaterThan(0);
    expect(aCounts.all).toBe(bCounts.all);
  });

  it('getWindowKpis: A KPIs exclude B inquiries', async () => {
    const start = new Date(Date.now() - 60 * 60 * 1000);
    const end = new Date(Date.now() + 60 * 60 * 1000);
    const aKpis = await getWindowKpis(A.firmId, start, end);
    const bKpis = await getWindowKpis(B.firmId, start, end);
    expect(aKpis.totalInquiries).toBe(bKpis.totalInquiries);
    expect(aKpis.totalInquiries).toBeGreaterThan(0);
  });

  it('getDailyBuckets: A totals exclude B inquiries', async () => {
    const start = new Date(Date.now() - 60 * 60 * 1000);
    const end = new Date(Date.now() + 60 * 60 * 1000);
    const aTotal = (await getDailyBuckets(A.firmId, start, end)).reduce((s, b) => s + b.total, 0);
    const bTotal = (await getDailyBuckets(B.firmId, start, end)).reduce((s, b) => s + b.total, 0);
    expect(aTotal).toBeGreaterThan(0);
    expect(aTotal).toBe(bTotal);
  });

  it('getCategoryDistributionWindow: A counts exclude B inquiries', async () => {
    const start = new Date(Date.now() - 60 * 60 * 1000);
    const end = new Date(Date.now() + 60 * 60 * 1000);
    const aTotal = (await getCategoryDistributionWindow(A.firmId, start, end)).reduce(
      (s, r) => s + r.count,
      0,
    );
    const bTotal = (await getCategoryDistributionWindow(B.firmId, start, end)).reduce(
      (s, r) => s + r.count,
      0,
    );
    expect(aTotal).toBeGreaterThan(0);
    expect(aTotal).toBe(bTotal);
  });
});

// The most sensitive read path: getKnowledgeChunksByIds feeds the propose-draft
// tool's Citations grounding. A firm-scoping regression here injects another
// firm's knowledge into a client-facing reply (a §38 leak). Plus the other
// read/aggregate exports the original suite never touched.
describe('grounding + remaining read exports never cross firm boundaries', () => {
  it('getKnowledgeChunksByIds: A cannot resolve a B chunk id', async () => {
    const aOnly = await getKnowledgeChunksByIds(A.firmId, [A.knowledgeChunkId]);
    expect(aOnly.map((c) => c.id)).toEqual([A.knowledgeChunkId]);
    // Even when B's id is explicitly requested under firm A, it must not resolve.
    const mixed = await getKnowledgeChunksByIds(A.firmId, [A.knowledgeChunkId, B.knowledgeChunkId]);
    expect(mixed.map((c) => c.id)).toEqual([A.knowledgeChunkId]);
    expect(await getKnowledgeChunksByIds(A.firmId, [B.knowledgeChunkId])).toEqual([]);
  });

  it('walkThread: A cannot walk a B thread', async () => {
    const aIds = (await walkThread(A.firmId, A.inquiryId)).map((r) => r.id);
    expect(aIds).toContain(A.inquiryId);
    expect(aIds).toContain(A.childInquiryId);
    expect(await walkThread(A.firmId, B.inquiryId)).toEqual([]);
  });

  it('listRecentInquiriesForClient: A cannot read a B client history', async () => {
    const aRows = await listRecentInquiriesForClient(A.firmId, A.clientId, 20);
    expect(aRows.map((r) => r.id)).toContain(A.inquiryId);
    expect(await listRecentInquiriesForClient(A.firmId, B.clientId, 20)).toEqual([]);
  });

  it('listReceivedDocuments: A cannot read a B client documents', async () => {
    const aDocs = await listReceivedDocuments(A.firmId, A.clientId, 20);
    expect(aDocs.map((d) => d.filename)).toContain(A.documentFilename);
    expect(await listReceivedDocuments(A.firmId, B.clientId, 20)).toEqual([]);
  });

  it('findLatestSentBody: A cannot read a B sent body', async () => {
    expect(await findLatestSentBody(A.firmId, A.inquiryId)).toBe(A.sentBody);
    expect(await findLatestSentBody(A.firmId, B.inquiryId)).toBeNull();
  });

  it('listUnmatchedLineEvents: A never returns B line events', async () => {
    const aUsers = (await listUnmatchedLineEvents(A.firmId)).map((e) => e.lineUserId);
    expect(aUsers).toContain(A.lineUserId);
    expect(aUsers).not.toContain(B.lineUserId);
  });

  it('getFirmChannel: A cannot read B channel config', async () => {
    const aCh = await getFirmChannel(A.firmId, 'line');
    expect(aCh?.firmId).toBe(A.firmId);
    const aConfig = aCh?.config as { channelSecret?: string };
    expect(aConfig.channelSecret).toBe('secret-A');
  });

  it('getBindingByClient: A cannot read a B client freee binding', async () => {
    const aBind = await getBindingByClient(A.firmId, A.clientId, 'freee');
    expect(aBind?.externalId).toBe(A.freeeExternalId);
    expect(await getBindingByClient(A.firmId, B.clientId, 'freee')).toBeNull();
  });

  it('listBindingsForFirm: A never returns B bindings', async () => {
    const aExt = (await listBindingsForFirm(A.firmId, 'freee')).map((b) => b.externalId);
    expect(aExt).toContain(A.freeeExternalId);
    expect(aExt).not.toContain(B.freeeExternalId);
  });

  it('listAssigneesForClient: A cannot read a B client assignees', async () => {
    const aAssignees = await listAssigneesForClient(A.firmId, A.clientId);
    expect(aAssignees.map((a) => a.userId)).toContain(A.userId);
    expect(await listAssigneesForClient(A.firmId, B.clientId)).toEqual([]);
  });

  it('assigneesByClient: A passing a B client id gets nothing', async () => {
    const map = await assigneesByClient(A.firmId, [A.clientId, B.clientId]);
    expect(map.has(A.clientId)).toBe(true);
    expect(map.has(B.clientId)).toBe(false);
  });

  it('listReadInquiryIds: A never returns B read marks', async () => {
    const aRead = await listReadInquiryIds(A.firmId, A.userId);
    expect(aRead.has(A.inquiryId)).toBe(true);
    expect(aRead.has(B.inquiryId)).toBe(false);
  });
});

// Every by-id mutation called with firm A's firmId + firm B's id must affect
// ZERO rows in firm B. This is the layer that would have caught the tombstone
// cross-firm write. Each test asserts B's row is unchanged after the A-scoped call.
describe('mutations refuse cross-firm ids', () => {
  async function clientName(firmId: string, clientId: string): Promise<string | null> {
    const row = await getPrisma().client.findFirst({ where: { id: clientId, firmId } });
    return row?.name ?? null;
  }

  it('tombstoneClient: A cannot tombstone a B client (no mutation, throws)', async () => {
    const before = await clientName(B.firmId, B.clientId);
    await expect(
      tombstoneClient({
        firmId: A.firmId,
        clientId: B.clientId,
        requestedBy: A.userId,
        reason: 'cross-firm attempt should be rejected',
      }),
    ).rejects.toBeInstanceOf(TenantIsolationError);
    // B's client row is untouched: name, email, notes all intact.
    expect(await clientName(B.firmId, B.clientId)).toBe(before);
    const bRow = await getPrisma().client.findFirstOrThrow({ where: { id: B.clientId } });
    expect(bRow.firmId).toBe(B.firmId);
    expect(bRow.primaryEmail).not.toContain('@invalid');
    // No audit row leaked into firm A for B's client.
    const leaked = await getPrisma().auditEvent.count({
      where: { firmId: A.firmId, action: 'client.tombstoned' },
    });
    expect(leaked).toBe(0);
  });

  it('updateClient: A updating a B client id is a no-op in firm B', async () => {
    const before = await clientName(B.firmId, B.clientId);
    await updateClient(A.firmId, B.clientId, { name: 'HIJACKED' });
    expect(await clientName(B.firmId, B.clientId)).toBe(before);
  });

  it('archiveClient: A archiving a B client id is a no-op in firm B', async () => {
    await archiveClient(A.firmId, B.clientId, A.userId);
    const detail = await getClientDetail(B.firmId, B.clientId);
    expect(detail?.archivedAt).toBeNull();
  });

  it('linkClientLineUserId: A cannot link a line id onto a B client', async () => {
    const result = await linkClientLineUserId(A.firmId, B.clientId, `Uhijack-${Date.now()}`);
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('setInquiryStatus: A cannot change a B inquiry status', async () => {
    await setInquiryStatus(A.firmId, B.inquiryId, 'escalated');
    const bRow = await getInquiry(B.firmId, B.inquiryId);
    expect(bRow?.status).toBe('drafted');
  });

  it('promoteUnmatchedInquiry: A cannot promote a B unmatched inquiry', async () => {
    await promoteUnmatchedInquiry(A.firmId, B.unmatchedInquiryId, A.clientId, A.userId);
    const bRow = await getInquiry(B.firmId, B.unmatchedInquiryId);
    expect(bRow?.status).toBe('unmatched');
    expect(bRow?.clientId).toBeNull();
  });

  it('promoteAllUnmatchedFromSender: A cannot promote B unmatched by sender', async () => {
    const promoted = await promoteAllUnmatchedFromSender(
      A.firmId,
      B.unmatchedSenderEmail,
      A.clientId,
      A.userId,
    );
    expect(promoted).toEqual([]);
    const bRow = await getInquiry(B.firmId, B.unmatchedInquiryId);
    expect(bRow?.status).toBe('unmatched');
  });

  it('markInquiryRead: A marking a B inquiry does not leak into B reads', async () => {
    await markInquiryRead(A.firmId, A.userId, B.inquiryId);
    // The read row is written with firm A; firm B's reads for B.inquiryId are
    // unaffected for B's own user.
    const bRead = await listReadInquiryIds(B.firmId, B.userId);
    expect(bRead.has(B.inquiryId)).toBe(true);
    const aRead = await listReadInquiryIds(A.firmId, B.userId);
    expect(aRead.has(B.inquiryId)).toBe(false);
  });

  it('flagKnowledgeChunk: A cannot flag a B chunk', async () => {
    const flagged = await flagKnowledgeChunk({
      firmId: A.firmId,
      chunkId: B.knowledgeChunkId,
      reason: 'cross-firm',
      flaggedBy: A.userId,
    });
    expect(flagged).toBe(false);
  });

  it('deleteBinding: A cannot delete a B client binding', async () => {
    await deleteBinding(A.firmId, B.clientId, 'freee');
    expect(await getBindingByClient(B.firmId, B.clientId, 'freee')).not.toBeNull();
  });

  it('deleteClient: A cannot delete a B client', async () => {
    // B's client has inquiries, so even within B it would refuse; the point is A
    // must not delete it. Assert the row survives.
    await deleteClient(A.firmId, B.clientId);
    expect(await clientName(B.firmId, B.clientId)).not.toBeNull();
  });
});
