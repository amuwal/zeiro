import type { Prisma } from '@prisma/client';
import { getPrisma } from '../server';

export type IntegrationRow = {
  id: string;
  firmId: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string | null;
  expiresAt: Date | null;
  status: string;
  lastRefreshedAt: Date | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

function rowFromPrisma(
  row: Awaited<ReturnType<ReturnType<typeof getPrisma>['integration']['findFirst']>>,
): IntegrationRow | null {
  if (!row) return null;
  return {
    id: row.id,
    firmId: row.firmId,
    provider: row.provider,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    tokenType: row.tokenType,
    scope: row.scope,
    expiresAt: row.expiresAt,
    status: row.status,
    lastRefreshedAt: row.lastRefreshedAt,
    lastError: row.lastError,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function findIntegration(
  firmId: string,
  provider: string,
): Promise<IntegrationRow | null> {
  const row = await getPrisma().integration.findUnique({
    where: { firmId_provider: { firmId, provider } },
  });
  return rowFromPrisma(row);
}

export type IntegrationUpsert = {
  firmId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string;
  scope?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
};

export async function upsertIntegration(input: IntegrationUpsert): Promise<IntegrationRow> {
  const data = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken ?? null,
    tokenType: input.tokenType ?? 'Bearer',
    scope: input.scope ?? null,
    expiresAt: input.expiresAt ?? null,
    status: 'active',
    lastRefreshedAt: new Date(),
    lastError: null,
    metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
  };
  const row = await getPrisma().integration.upsert({
    where: { firmId_provider: { firmId: input.firmId, provider: input.provider } },
    create: { firmId: input.firmId, provider: input.provider, ...data },
    update: data,
  });
  const mapped = rowFromPrisma(row);
  if (!mapped) throw new Error('upsertIntegration unexpectedly returned null');
  return mapped;
}

export async function updateIntegrationTokens(
  firmId: string,
  id: string,
  update: {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    scope?: string | null;
  },
): Promise<void> {
  const result = await getPrisma().integration.updateMany({
    where: { id, firmId },
    data: {
      accessToken: update.accessToken,
      ...(update.refreshToken !== undefined ? { refreshToken: update.refreshToken } : {}),
      ...(update.expiresAt !== undefined ? { expiresAt: update.expiresAt } : {}),
      ...(update.scope !== undefined ? { scope: update.scope } : {}),
      status: 'active',
      lastRefreshedAt: new Date(),
      lastError: null,
    },
  });
  if (result.count === 0) throw new Error(`integration ${id} not found in firm ${firmId}`);
}

export async function markIntegrationStatus(
  firmId: string,
  id: string,
  status: 'active' | 'needs_reconnect' | 'revoked' | 'error',
  lastError?: string,
): Promise<void> {
  const result = await getPrisma().integration.updateMany({
    where: { id, firmId },
    data: { status, ...(lastError !== undefined ? { lastError } : {}) },
  });
  if (result.count === 0) throw new Error(`integration ${id} not found in firm ${firmId}`);
}

export async function updateIntegrationMetadata(
  firmId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const existing = await getPrisma().integration.findFirst({
    where: { id, firmId },
    select: { metadata: true },
  });
  if (!existing) throw new Error(`integration ${id} not found in firm ${firmId}`);
  const merged = { ...((existing.metadata ?? {}) as Record<string, unknown>), ...patch };
  await getPrisma().integration.updateMany({
    where: { id, firmId },
    data: { metadata: merged as Prisma.InputJsonValue },
  });
}

export async function deleteIntegration(firmId: string, provider: string): Promise<void> {
  await getPrisma().integration.deleteMany({ where: { firmId, provider } });
}

export async function listFirmIntegrations(firmId: string): Promise<IntegrationRow[]> {
  const rows = await getPrisma().integration.findMany({
    where: { firmId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(rowFromPrisma).filter((r): r is IntegrationRow => r !== null);
}
