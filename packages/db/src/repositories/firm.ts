import type { Firm } from '@prisma/client';
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
