'use server';

import { getFirmChannel, recordAudit, upsertFirmChannel } from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { requireFirmContext } from '@/lib/firm-context';
import { parseLineConfig } from '@/lib/line/parse';

export type SaveLineState = { error: string | null; ok: boolean };

export async function saveLineChannel(
  _prev: SaveLineState,
  formData: FormData,
): Promise<SaveLineState> {
  const { firmId, userId, role } = await requireFirmContext();
  if (!isAdmin(role)) return { error: '権限がありません (所長のみ設定可能)', ok: false };

  const submittedSecret = readField(formData, 'channelSecret');
  const submittedToken = readField(formData, 'channelAccessToken');
  const enabled = formData.get('enabled') === 'on';

  const existing = await getFirmChannel(firmId, 'line');
  const existingConfig = parseLineConfig(existing?.config);

  const channelSecret = submittedSecret ?? existingConfig?.channelSecret;
  const channelAccessToken = submittedToken ?? existingConfig?.channelAccessToken;

  if (!channelSecret || !channelAccessToken) {
    return { error: 'Channel Secret と Access Token を入力してください', ok: false };
  }

  await upsertFirmChannel({
    firmId,
    channelType: 'line',
    config: { channelSecret, channelAccessToken },
    enabled,
  });
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'channel.configured',
    metadata: { channelType: 'line', enabled, secretsRotated: Boolean(submittedSecret || submittedToken) },
  });

  revalidatePath('/settings');
  return { error: null, ok: true };
}

function readField(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isAdmin(role: string): boolean {
  return role.toLowerCase().includes('admin');
}
