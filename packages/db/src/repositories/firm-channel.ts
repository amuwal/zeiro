import type { FirmChannel } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../server';

export async function getFirmChannel(
  firmId: string,
  channelType: string,
): Promise<FirmChannel | null> {
  return getPrisma().firmChannel.findUnique({
    where: { firmId_channelType: { firmId, channelType } },
  });
}

type UpsertInput = {
  firmId: string;
  channelType: string;
  config: Record<string, unknown>;
  enabled?: boolean;
};

export async function upsertFirmChannel(input: UpsertInput): Promise<FirmChannel> {
  return getPrisma().firmChannel.upsert({
    where: { firmId_channelType: { firmId: input.firmId, channelType: input.channelType } },
    update: {
      config: input.config as Prisma.InputJsonValue,
      enabled: input.enabled ?? true,
    },
    create: {
      firmId: input.firmId,
      channelType: input.channelType,
      config: input.config as Prisma.InputJsonValue,
      enabled: input.enabled ?? true,
    },
  });
}
