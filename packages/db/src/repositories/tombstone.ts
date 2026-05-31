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
  chunkCount: number;
  bindingCount: number;
};

// RTBF (削除要求) cascade for one client, all inside a single transaction so the
// purge is all-or-nothing with the audit write. Scope (roadmap #3): scrub the
// client row + its inquiries/drafts in place, delete the auto-added RAG chunks
// keyed to those inquiries, and cascade-delete its freee bindings.
//
// Out of scope by design — flag for the broader RTBF audit:
//   - Firm-uploaded knowledge docs NOT linked to an inquiry (metadata.documentId
//     = a jobId, not an inquiry.id) are not matched here; deleting them needs a
//     separate document-keyed purge.
//   - draft.metadata citation prose, unmatched_sender inquiries, and the Mastra
//     `mastra` schema thread/message store carry residual client PII outside
//     this client-cascade; they need their own keyed purge (see the RTBF surface
//     review).
//   - audit_events.metadata (draft.sent sentBody, inquiry.received attachment
//     filenames) intersects N-06 (RTBF) with N-05 (5-year append-only retention —
//     a DB trigger blocks DELETE). Keeping the immutable legal-retention log is
//     the deliberate call; whether to additionally redact those PII payloads in
//     place (keep event + action + references, null the prose/filenames) is a
//     legal decision tracked separately, NOT a silent omission.
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

    // headers carries the raw From/To/Reply-To (client name + email in cleartext);
    // clear it alongside subject/body/analysis. inquiryIds is firm-derived (the
    // findMany above is firm+client scoped), so this updateMany never reaches
    // another firm's inquiry. 削除要求 (RTBF) — 税理士法 §38.
    const inquiryCount = inquiryIds.length
      ? (
          await tx.inquiry.updateMany({
            where: { id: { in: inquiryIds } },
            data: { subject: TOMBSTONE_TEXT, body: TOMBSTONE_TEXT, analysis: {}, headers: {} },
          })
        ).count
      : 0;

    // Auto-added "past answer" RAG chunks are tagged metadata.documentId = inquiry.id
    // (see knowledge-ingest.ts + autoAddKnowledgeFn). A surviving vector still
    // surfaces the client's words — and their name in the source string — to a
    // firm-mate's RAG query, a silent §38 breach. embedding is an Unsupported
    // vector column, so raw SQL is the only access path. Double-scoped: firm_id
    // is the load-bearing predicate (global packs have firm_id NULL and so never
    // match) and the documentId set is the client's own inquiries. Both values
    // are bound via tagged-template params — no interpolation; ::text[] because
    // metadata->>'documentId' yields text.
    const chunkCount = inquiryIds.length
      ? await tx.$executeRaw`
          DELETE FROM knowledge_chunks
          WHERE firm_id = ${input.firmId}::uuid
            AND metadata->>'documentId' = ANY(${inquiryIds}::text[])
        `
      : 0;

    // client_integration_bindings has no firm_id column — its only firm anchor is
    // integration.firmId, so the firm scope MUST go through the relation. A bare
    // `where: { clientId }` would be a cross-firm hazard (clientId is globally
    // unique). Mirrors deleteBinding()'s nested-relation scope.
    const bindingCount = (
      await tx.clientIntegrationBinding.deleteMany({
        where: { clientId: input.clientId, integration: { firmId: input.firmId } },
      })
    ).count;

    // Scope the client row mutation by firmId — Client.id is globally unique, so
    // a bare `where: { id }` would let one firm tombstone another firm's client
    // (cross-firm destructive write, 税理士法 §38). updateMany + count assertion
    // makes a wrong-firm id a no-op that fails loudly instead of mutating B.
    // lineUserId / chatworkRoomId are nulled too: they are stable handles that
    // findClientByLineUserId / findClientByChatworkRoomId use to resolve an
    // inbound LINE/Chatwork message back to this row, so a later re-ping would
    // otherwise resurface the purged client.
    const clientCount = (
      await tx.client.updateMany({
        where: { id: input.clientId, firmId: input.firmId },
        data: {
          name: tombstoneName,
          primaryEmail: tombstoneEmail,
          notes: null,
          metadata: {},
          lineUserId: null,
          chatworkRoomId: null,
        },
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
          chunkCount,
          bindingCount,
          reason: input.reason,
        } as Prisma.InputJsonValue,
      },
    });

    return { inquiryCount, draftCount, chunkCount, bindingCount };
  });
}
