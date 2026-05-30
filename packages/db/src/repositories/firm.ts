import type { Firm, Prisma } from '@prisma/client';
import { getPrisma } from '../server';

export function findFirmByInboundAddress(address: string) {
  return getPrisma().firm.findUnique({
    where: { inboundAddress: address.toLowerCase() },
  });
}

export function findFirmByClerkOrgId(clerkOrgId: string) {
  return getPrisma().firm.findUnique({ where: { clerkOrgId } });
}

export function getFirm(id: string) {
  return getPrisma().firm.findUniqueOrThrow({ where: { id } });
}

type UpsertFromClerkInput = {
  clerkOrgId: string;
  name: string;
  inboundAddress: string;
  region?: string;
};

// Onboarding profile: the firm's display name (used in the greeting of every
// client-facing draft) + an optional 担当者署名 sign-off + the onboarding-complete
// flag. name updates the column; the rest merge into settings JSONB (loose DB).
export async function updateFirmProfile(
  firmId: string,
  patch: { name?: string; signature?: string | null; onboardingCompleted?: boolean },
): Promise<void> {
  const current = await getPrisma().firm.findUniqueOrThrow({
    where: { id: firmId },
    select: { settings: true },
  });
  const settings =
    current.settings && typeof current.settings === 'object' && !Array.isArray(current.settings)
      ? (current.settings as Record<string, unknown>)
      : {};
  if (patch.signature !== undefined) settings.signature = patch.signature;
  if (patch.onboardingCompleted !== undefined)
    settings.onboardingCompleted = patch.onboardingCompleted;
  await getPrisma().firm.update({
    where: { id: firmId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      settings: settings as Prisma.InputJsonValue,
    },
  });
}

export async function upsertFirmFromClerk(input: UpsertFromClerkInput): Promise<Firm> {
  return getPrisma().firm.upsert({
    where: { clerkOrgId: input.clerkOrgId },
    update: { name: input.name },
    create: {
      clerkOrgId: input.clerkOrgId,
      name: input.name,
      inboundAddress: input.inboundAddress,
      region: input.region ?? 'jp-tokyo',
    },
  });
}
