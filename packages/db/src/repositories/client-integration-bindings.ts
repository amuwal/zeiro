import { Prisma } from '@prisma/client';
import { getPrisma } from '../server';

export type ClientIntegrationBindingRow = {
  id: string;
  integrationId: string;
  clientId: string;
  externalId: string;
  externalName: string | null;
  createdAt: Date;
};

export async function getBindingByClient(
  firmId: string,
  clientId: string,
  provider: string,
): Promise<ClientIntegrationBindingRow | null> {
  const row = await getPrisma().clientIntegrationBinding.findFirst({
    where: {
      clientId,
      integration: { firmId, provider },
    },
  });
  return row;
}

export async function listBindingsForFirm(
  firmId: string,
  provider: string,
): Promise<Array<ClientIntegrationBindingRow & { clientName: string }>> {
  const rows = await getPrisma().clientIntegrationBinding.findMany({
    where: { integration: { firmId, provider } },
    include: { client: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    integrationId: r.integrationId,
    clientId: r.clientId,
    externalId: r.externalId,
    externalName: r.externalName,
    createdAt: r.createdAt,
    clientName: r.client.name,
  }));
}

export async function upsertBinding(input: {
  firmId: string;
  clientId: string;
  provider: string;
  externalId: string;
  externalName?: string | null;
}): Promise<ClientIntegrationBindingRow> {
  const integration = await getPrisma().integration.findUnique({
    where: { firmId_provider: { firmId: input.firmId, provider: input.provider } },
    select: { id: true },
  });
  if (!integration) {
    throw new Error(`no ${input.provider} integration for firm ${input.firmId}`);
  }
  return getPrisma().clientIntegrationBinding.upsert({
    where: {
      clientId_integrationId: { clientId: input.clientId, integrationId: integration.id },
    },
    create: {
      integrationId: integration.id,
      clientId: input.clientId,
      externalId: input.externalId,
      externalName: input.externalName ?? null,
    },
    update: {
      externalId: input.externalId,
      externalName: input.externalName ?? null,
    },
  });
}

export async function deleteBinding(
  firmId: string,
  clientId: string,
  provider: string,
): Promise<void> {
  const integration = await getPrisma().integration.findUnique({
    where: { firmId_provider: { firmId, provider } },
    select: { id: true },
  });
  if (!integration) return;
  await getPrisma().clientIntegrationBinding.deleteMany({
    where: { clientId, integrationId: integration.id },
  });
}

// Silence unused-import warning for Prisma — kept to namespace types if needed later.
export type _PrismaRef = typeof Prisma;
