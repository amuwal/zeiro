import { randomUUID } from 'node:crypto';
import { getPrisma } from '../src/server';

// A deterministic, normalised 1536-dim embedding (so cosine distance is defined
// and pgvector accepts the insert). Content of the vector is irrelevant to the
// isolation assertions — we only care WHICH firm's rows come back.
function embedding(seed: number): number[] {
  const v = new Array<number>(1536);
  for (let i = 0; i < 1536; i++) v[i] = Math.sin(seed + i) / 40;
  return v;
}

export type SeededFirm = {
  firmId: string;
  userId: string;
  clientId: string;
  inquiryId: string;
  childInquiryId: string;
  draftId: string;
  knowledgeChunkId: string;
  integrationProvider: string;
  clientEmail: string;
  inquiryMessageId: string;
  draftSentMessageId: string;
  clientImportId: string;
  ingestionJobId: string;
  unmatchedInquiryId: string;
  unmatchedSenderEmail: string;
  lineUserId: string;
  clientLineUserId: string;
  clientChatworkRoomId: string;
  freeeExternalId: string;
  sentBody: string;
  documentFilename: string;
};

// Both firms get a client with the SAME primaryEmail and overlapping subjects so
// any missing firm_id predicate would surface as a cross-firm leak rather than
// an empty result.
const SHARED_CLIENT_EMAIL = 'overlap-client@example.com';

async function seedFirm(label: string): Promise<SeededFirm> {
  const prisma = getPrisma();
  const tag = randomUUID().slice(0, 8);

  const firm = await prisma.firm.create({
    data: {
      name: `Firm ${label} ${tag}`,
      inboundAddress: `firm-${label.toLowerCase()}-${tag}@reply.example.com`,
      clerkOrgId: `org_${label}_${tag}`,
      region: 'jp-tokyo',
    },
  });

  const user = await prisma.user.create({
    data: {
      clerkUserId: `user_${label}_${tag}`,
      email: `owner-${label.toLowerCase()}-${tag}@example.com`,
      name: `Owner ${label}`,
    },
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      firmId: firm.id,
      role: 'org:admin',
      appRole: 'owner',
      canSend: true,
      clientScope: 'all',
    },
  });

  // lineUserId / chatworkRoomId on the client row are stable re-identification
  // handles; the RTBF cascade must null them. Seeded distinct per firm so a
  // missing firm scope on the scrub would surface as a cross-firm leak.
  const clientLineUserId = `Uclient${label}${tag}`;
  const clientChatworkRoomId = `room-${label}-${tag}`;
  const client = await prisma.client.create({
    data: {
      firmId: firm.id,
      name: `Client ${label}`,
      primaryEmail: SHARED_CLIENT_EMAIL,
      contractType: 'advisory',
      assignedTaxAccountantId: user.id,
      notes: `${label} private notes`,
      lineUserId: clientLineUserId,
      chatworkRoomId: clientChatworkRoomId,
    },
  });

  await prisma.clientAssignee.create({
    data: { firmId: firm.id, clientId: client.id, userId: user.id },
  });

  const inquiryMessageId = `<msg-${label}-${tag}@example.com>`;
  const inquiry = await prisma.inquiry.create({
    data: {
      firmId: firm.id,
      clientId: client.id,
      assignedToId: user.id,
      messageId: inquiryMessageId,
      receivedAt: new Date(),
      subject: '共通の件名',
      body: `${label} inquiry body`,
      status: 'drafted',
      channel: 'email',
      // Cleartext client name/email in the raw headers — the RTBF cascade must
      // scrub this to {}.
      headers: { fromName: `Client ${label}`, From: `Client ${label} <${SHARED_CLIENT_EMAIL}>` },
    },
  });

  const childInquiry = await prisma.inquiry.create({
    data: {
      firmId: firm.id,
      clientId: client.id,
      parentInquiryId: inquiry.id,
      messageId: `<child-${label}-${tag}@example.com>`,
      receivedAt: new Date(),
      subject: 'Re: 共通の件名',
      body: `${label} follow-up`,
      status: 'pending',
      channel: 'email',
      // Child inquiry also carries cleartext sender headers — the RTBF cascade
      // must scrub EVERY inquiry of the client, not just the thread root.
      headers: { fromName: `Client ${label}`, From: `Client ${label} <${SHARED_CLIENT_EMAIL}>` },
    },
  });

  const draftSentMessageId = `01000-${tag}-000000@ap-northeast-1.amazonses.com`;
  const draft = await prisma.draft.create({
    data: {
      firmId: firm.id,
      inquiryId: inquiry.id,
      subject: 'Re: 共通の件名',
      body: `${label} draft body`,
      citations: [],
      confidence: 0.8,
      model: 'test-model',
      metadata: { sentMessageId: draftSentMessageId, sentAt: new Date().toISOString() },
    },
  });

  await prisma.auditEvent.create({
    data: {
      firmId: firm.id,
      actorId: user.id,
      inquiryId: inquiry.id,
      action: 'draft.generated',
      metadata: { label },
    },
  });

  await prisma.inquiryRead.create({
    data: { firmId: firm.id, inquiryId: inquiry.id, userId: user.id },
  });

  // KnowledgeChunk.embedding is a required vector column with no Prisma default,
  // so insert via raw SQL (mirrors insertKnowledgeChunk).
  // metadata.documentId = inquiry.id marks this as an auto-added "past answer"
  // chunk, the exact shape the RTBF cascade deletes.
  const chunkId = randomUUID();
  const vec = `[${embedding(label === 'A' ? 1 : 2).join(',')}]`;
  const chunkMeta = JSON.stringify({ documentId: inquiry.id });
  await prisma.$executeRaw`
    INSERT INTO knowledge_chunks (id, firm_id, scope, source, content, embedding, metadata)
    VALUES (
      ${chunkId}::uuid, ${firm.id}::uuid, 'firm',
      ${`過去回答 / Client ${label}`}, ${`${label} knowledge content`},
      ${vec}::vector, ${chunkMeta}::jsonb
    )
  `;

  const integration = await prisma.integration.create({
    data: {
      firmId: firm.id,
      provider: 'freee',
      accessToken: 'enc-token',
      status: 'active',
    },
  });

  const clientImport = await prisma.clientImport.create({
    data: {
      firmId: firm.id,
      actorId: user.id,
      filename: `${label}.csv`,
      status: 'pending',
    },
  });

  const ingestionJob = await prisma.knowledgeIngestionJob.create({
    data: {
      firmId: firm.id,
      actorId: user.id,
      source: `${label}-doc`,
      filename: `${label}.pdf`,
      status: 'pending',
    },
  });

  // A freee 事業所 binding for this firm's client — exercises getBindingByClient /
  // listBindingsForFirm cross-firm isolation.
  const freeeExternalId = `freee-${label}-${tag}`;
  await prisma.clientIntegrationBinding.create({
    data: {
      integrationId: integration.id,
      clientId: client.id,
      externalId: freeeExternalId,
      externalName: `${label} 事業所`,
    },
  });

  // LINE channel + an unmatched inbound LINE event audit row, both keyed to this
  // firm — exercises getFirmChannel + listUnmatchedLineEvents isolation.
  const lineUserId = `Uline${label}${tag}`;
  await prisma.firmChannel.create({
    data: {
      firmId: firm.id,
      channelType: 'line',
      config: { channelSecret: `secret-${label}` },
      enabled: true,
    },
  });
  await prisma.auditEvent.create({
    data: {
      firmId: firm.id,
      actorId: user.id,
      inquiryId: null,
      action: 'inquiry.received',
      metadata: { unmatched: 'true', channel: 'line', lineUserId },
    },
  });

  // A draft.sent audit carrying sentBody (findLatestSentBody) + a received-document
  // audit (listReceivedDocuments), both inquiry-linked and firm-scoped.
  const sentBody = `${label} sent reply body`;
  await prisma.auditEvent.create({
    data: {
      firmId: firm.id,
      actorId: user.id,
      inquiryId: inquiry.id,
      action: 'draft.sent',
      metadata: { sentBody },
    },
  });
  const documentFilename = `${label}-領収書.pdf`;
  await prisma.auditEvent.create({
    data: {
      firmId: firm.id,
      actorId: user.id,
      inquiryId: inquiry.id,
      action: 'inquiry.received',
      metadata: { attachments: { parsed: [{ filename: documentFilename, kind: 'receipt' }] } },
    },
  });

  // An unmatched inquiry (no client) for the promote-flow mutation tests.
  const unmatchedSenderEmail = `unmatched-${label.toLowerCase()}-${tag}@example.com`;
  const unmatchedInquiry = await prisma.inquiry.create({
    data: {
      firmId: firm.id,
      clientId: null,
      messageId: `<unmatched-${label}-${tag}@example.com>`,
      receivedAt: new Date(),
      subject: 'unmatched',
      body: `${label} unmatched body`,
      status: 'unmatched',
      channel: 'email',
      unmatchedSender: unmatchedSenderEmail,
    },
  });

  return {
    firmId: firm.id,
    userId: user.id,
    clientId: client.id,
    inquiryId: inquiry.id,
    childInquiryId: childInquiry.id,
    draftId: draft.id,
    knowledgeChunkId: chunkId,
    integrationProvider: integration.provider,
    clientEmail: SHARED_CLIENT_EMAIL,
    inquiryMessageId,
    draftSentMessageId,
    clientImportId: clientImport.id,
    ingestionJobId: ingestionJob.id,
    unmatchedInquiryId: unmatchedInquiry.id,
    unmatchedSenderEmail,
    lineUserId,
    clientLineUserId,
    clientChatworkRoomId,
    freeeExternalId,
    sentBody,
    documentFilename,
  };
}

export async function seedTwoFirms(): Promise<{ a: SeededFirm; b: SeededFirm }> {
  const a = await seedFirm('A');
  const b = await seedFirm('B');
  return { a, b };
}

export async function teardownFirms(firmIds: string[]): Promise<void> {
  const prisma = getPrisma();
  // Cascades clear clients/inquiries/drafts/knowledge/integrations/imports/jobs.
  // inquiry_reads + audit_events have no Prisma cascade on the firm relation in
  // every case, so clear them explicitly first.
  await prisma.inquiryRead.deleteMany({ where: { firmId: { in: firmIds } } });
  // audit_events is append-only in prod (a trigger blocks DELETE). This is a
  // disposable test DB, so drop the seeded rows by disabling the guard for the
  // teardown only, then restoring it.
  await prisma.$executeRawUnsafe('ALTER TABLE audit_events DISABLE TRIGGER USER');
  try {
    await prisma.auditEvent.deleteMany({ where: { firmId: { in: firmIds } } });
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE audit_events ENABLE TRIGGER USER');
  }
  await prisma.firm.deleteMany({ where: { id: { in: firmIds } } });
}
