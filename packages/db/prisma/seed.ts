import { getPrisma } from '../src/server';
import { CLIENTS, FIRM, INQUIRIES, type InquirySpec, KNOWLEDGE } from './fixtures';

const prisma = getPrisma();

async function main() {
  const clerkOrgId = process.env.SEED_LINK_TO_CLERK_ORG?.trim() || null;
  const clerkUserId = process.env.SEED_LINK_TO_CLERK_USER?.trim() || null;
  const seedUserEmail = process.env.SEED_USER_EMAIL?.trim() || null;
  const seedUserName = process.env.SEED_USER_NAME?.trim() || 'Dev User';
  const seedUserRole = process.env.SEED_USER_ROLE?.trim() || 'org:admin';

  const firm = await resolveFirm(clerkOrgId);

  if (clerkUserId && seedUserEmail) {
    const user = await prisma.user.upsert({
      where: { clerkUserId },
      update: { email: seedUserEmail, name: seedUserName },
      create: { clerkUserId, email: seedUserEmail, name: seedUserName },
    });
    await prisma.membership.upsert({
      where: { userId_firmId: { userId: user.id, firmId: firm.id } },
      update: { role: seedUserRole },
      create: { userId: user.id, firmId: firm.id, role: seedUserRole },
    });
    // biome-ignore lint/suspicious/noConsole: seed script output
    console.log(`linked Clerk user ${clerkUserId} as ${seedUserRole} of firm`);
  }

  const clientByEmail = new Map<string, string>();
  for (const c of CLIENTS) {
    const row = await prisma.client.upsert({
      where: { firmId_primaryEmail: { firmId: firm.id, primaryEmail: c.email } },
      update: { name: c.name, contractType: c.contractType },
      create: {
        firmId: firm.id,
        name: c.name,
        primaryEmail: c.email,
        contractType: c.contractType,
      },
    });
    clientByEmail.set(c.email, row.id);
  }

  for (const inq of INQUIRIES) {
    await upsertInquiry(firm.id, clientByEmail, inq);
  }

  await reseedKnowledge(firm.id);

  // biome-ignore lint/suspicious/noConsole: seed script output
  console.log(`seed complete — firm.id = ${firm.id}`);
  if (firm.clerkOrgId) {
    // biome-ignore lint/suspicious/noConsole: seed script output
    console.log(`linked to Clerk org ${firm.clerkOrgId} — sign in there to view`);
  } else {
    // biome-ignore lint/suspicious/noConsole: seed script output
    console.log('no Clerk org linked. Set SEED_LINK_TO_CLERK_ORG=<org_id> and re-run');
    // biome-ignore lint/suspicious/noConsole: seed script output
    console.log('to attach this seed firm to your Clerk org.');
  }
  if (!clerkUserId) {
    // biome-ignore lint/suspicious/noConsole: seed script output
    console.log(
      'no Clerk user linked. Set SEED_LINK_TO_CLERK_USER + SEED_USER_EMAIL to provision a membership without webhooks.',
    );
  }
}

async function resolveFirm(clerkOrgId: string | null) {
  if (clerkOrgId) {
    const existing = await prisma.firm.findUnique({ where: { clerkOrgId } });
    if (existing) {
      // biome-ignore lint/suspicious/noConsole: seed script output
      console.log(
        `attaching demo data to existing firm "${existing.name}" (${existing.inboundAddress})`,
      );
      return existing;
    }
  }
  return prisma.firm.upsert({
    where: { inboundAddress: FIRM.inboundAddress },
    update: { name: FIRM.name, clerkOrgId },
    create: {
      name: FIRM.name,
      inboundAddress: FIRM.inboundAddress,
      region: FIRM.region,
      clerkOrgId,
    },
  });
}

async function upsertInquiry(firmId: string, clientByEmail: Map<string, string>, inq: InquirySpec) {
  const clientId = clientByEmail.get(inq.clientEmail);
  if (!clientId) throw new Error(`no client for ${inq.clientEmail}`);

  const row = await prisma.inquiry.upsert({
    where: { firmId_messageId: { firmId, messageId: inq.messageId } },
    update: {
      subject: inq.subject,
      body: inq.body,
      status: inq.status,
      analysis: inq.analysis,
    },
    create: {
      firmId,
      clientId,
      messageId: inq.messageId,
      receivedAt: new Date(inq.receivedAt),
      subject: inq.subject,
      body: inq.body,
      status: inq.status,
      analysis: inq.analysis,
    },
  });

  await prisma.draft.deleteMany({ where: { inquiryId: row.id } });
  if (inq.draft) {
    await prisma.draft.create({
      data: {
        inquiryId: row.id,
        subject: inq.draft.subject,
        body: inq.draft.body,
        citations: inq.draft.citations,
        confidence: inq.draft.confidence,
        model: inq.draft.model,
      },
    });
  }
}

async function reseedKnowledge(firmId: string) {
  await prisma.knowledgeChunk.deleteMany({ where: { firmId } });
  const zeros = `[${Array.from({ length: 1536 }, () => 0).join(',')}]`;
  for (const k of KNOWLEDGE) {
    const meta = JSON.stringify(k.meta);
    await prisma.$executeRaw`
      INSERT INTO knowledge_chunks (firm_id, source, content, embedding, metadata)
      VALUES (${firmId}::uuid, ${k.source}, ${k.content}, ${zeros}::vector, ${meta}::jsonb)
    `;
  }
}

main()
  .catch((e) => {
    // biome-ignore lint/suspicious/noConsole: seed script output
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
