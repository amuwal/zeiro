'use server';

import { searchClients, tombstoneClient } from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireFirmContext } from '@/lib/firm-context';
import { isAdminRole } from '@/lib/team';
import type { TombstoneExecuteState, TombstoneSearchState } from './tombstone-state';

const searchSchema = z.object({
  query: z.string().trim().min(1, '検索キーワードを入力してください').max(255),
});

const executeSchema = z.object({
  clientId: z.string().uuid(),
  reason: z.string().trim().min(10, '理由を10文字以上で入力してください').max(1000),
  confirm: z.literal('on'),
});

async function requireAdmin() {
  const ctx = await requireFirmContext();
  if (!isAdminRole(ctx.role)) {
    return { ok: false as const, message: '権限がありません (所長のみ)' };
  }
  return { ok: true as const, ctx };
}

export async function searchClientsForTombstone(
  _prev: TombstoneSearchState,
  formData: FormData,
): Promise<TombstoneSearchState> {
  const guard = await requireAdmin();
  if (!guard.ok) return { status: 'error', message: guard.message };

  const parsed = searchSchema.safeParse({ query: formData.get('query') });
  if (!parsed.success) {
    const message = parsed.error.flatten().fieldErrors.query?.[0] ?? '入力が不正です';
    return { status: 'error', message };
  }

  const results = await searchClients(guard.ctx.firmId, parsed.data.query, 20);
  return { status: 'results', query: parsed.data.query, results };
}

export async function tombstoneClientAction(
  _prev: TombstoneExecuteState,
  formData: FormData,
): Promise<TombstoneExecuteState> {
  const guard = await requireAdmin();
  if (!guard.ok) return { status: 'error', message: guard.message };

  const parsed = executeSchema.safeParse({
    clientId: formData.get('clientId'),
    reason: formData.get('reason'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const message =
      fieldErrors.confirm?.[0] === 'Invalid literal value, expected "on"'
        ? '同意のチェックボックスにチェックを入れてください'
        : (fieldErrors.reason?.[0] ?? fieldErrors.clientId?.[0] ?? '入力内容を確認してください');
    return { status: 'error', message };
  }

  const result = await tombstoneClient({
    firmId: guard.ctx.firmId,
    clientId: parsed.data.clientId,
    requestedBy: guard.ctx.userId,
    reason: parsed.data.reason,
  });

  revalidatePath('/settings');
  return {
    status: 'success',
    clientId: parsed.data.clientId,
    tombstonedInquiries: result.inquiryCount,
    tombstonedDrafts: result.draftCount,
  };
}
