'use server';

import { getFirmChannel, linkClientLineUserId, recordAudit, upsertFirmChannel } from '@zeiro/db';
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
    metadata: {
      channelType: 'line',
      enabled,
      secretsRotated: Boolean(submittedSecret || submittedToken),
    },
  });

  revalidatePath('/settings');
  return { error: null, ok: true };
}

export type SaveWebState = { error: string | null; ok: boolean };

export async function saveWebChannel(
  _prev: SaveWebState,
  formData: FormData,
): Promise<SaveWebState> {
  const { firmId, userId, role } = await requireFirmContext();
  if (!isAdmin(role)) return { error: '権限がありません (所長のみ設定可能)', ok: false };

  const enabled = formData.get('enabled') === 'on';

  await upsertFirmChannel({
    firmId,
    channelType: 'web',
    config: {},
    enabled,
  });
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'channel.configured',
    metadata: { channelType: 'web', enabled },
  });

  revalidatePath('/settings');
  return { error: null, ok: true };
}

export type LinkLineState = { error: string | null; linked: string | null };

export async function linkLineUserId(
  _prev: LinkLineState,
  formData: FormData,
): Promise<LinkLineState> {
  const { firmId, userId, role } = await requireFirmContext();
  if (!isAdmin(role)) return { error: '権限がありません (所長のみ)', linked: null };

  const lineUserId = readField(formData, 'lineUserId');
  const clientId = readField(formData, 'clientId');
  if (!lineUserId || !clientId) {
    return { error: 'クライアントを選択してください', linked: null };
  }

  const result = await linkClientLineUserId(firmId, clientId, lineUserId);
  if (!result.ok) {
    const msg =
      result.reason === 'already_linked'
        ? 'この LINE ユーザーは既に他の顧問先に紐付けられています'
        : '対象の顧問先が見つかりません';
    return { error: msg, linked: null };
  }

  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'client.identity_linked',
    metadata: { clientId, channel: 'line', lineUserId },
  });
  revalidatePath('/settings');
  return { error: null, linked: lineUserId };
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
