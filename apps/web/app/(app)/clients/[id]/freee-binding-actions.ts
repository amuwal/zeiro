'use server';

import { deleteBinding, recordAudit, upsertBinding } from '@zeiro/db';
import {
  ClientBindingMissingError,
  FreeeApiClient,
  IntegrationNotConnectedError,
  IntegrationRevokedError,
  RateLimitError,
  registerFreee,
  TokenRefreshError,
} from '@zeiro/integrations';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/authz';
import { env } from '@/lib/env';

function ensureFreeeRegistered(): void {
  if (env.FREEE_CLIENT_ID && env.FREEE_CLIENT_SECRET && env.FREEE_REDIRECT_URI) {
    registerFreee({
      clientId: env.FREEE_CLIENT_ID,
      clientSecret: env.FREEE_CLIENT_SECRET,
      redirectUri: env.FREEE_REDIRECT_URI,
    });
  }
}
ensureFreeeRegistered();

const bindSchema = z.object({
  clientId: z.string().uuid(),
  externalId: z.string().regex(/^\d+$/, '事業所IDは数値です'),
  externalName: z.string().optional(),
});

export async function bindClientToFreee(formData: FormData): Promise<void> {
  const ctx = await requireCan('integration.manage');
  const parsed = bindSchema.safeParse({
    clientId: formData.get('clientId'),
    externalId: formData.get('externalId'),
    externalName: formData.get('externalName') ?? undefined,
  });
  if (!parsed.success) throw new Error('invalid input');

  await upsertBinding({
    firmId: ctx.firmId,
    clientId: parsed.data.clientId,
    provider: 'freee',
    externalId: parsed.data.externalId,
    externalName: parsed.data.externalName ?? null,
  });
  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId: null,
    action: 'integration.binding_created',
    metadata: {
      provider: 'freee',
      clientId: parsed.data.clientId,
      externalId: parsed.data.externalId,
    },
  });
  revalidatePath(`/clients/${parsed.data.clientId}`);
}

const unbindSchema = z.object({ clientId: z.string().uuid() });

export async function unbindClientFromFreee(formData: FormData): Promise<void> {
  const ctx = await requireCan('integration.manage');
  const parsed = unbindSchema.safeParse({ clientId: formData.get('clientId') });
  if (!parsed.success) throw new Error('invalid input');
  await deleteBinding(ctx.firmId, parsed.data.clientId, 'freee');
  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId: null,
    action: 'integration.binding_removed',
    metadata: { provider: 'freee', clientId: parsed.data.clientId },
  });
  revalidatePath(`/clients/${parsed.data.clientId}`);
}

export type FreeeTestResult =
  | { status: 'idle' }
  | {
      status: 'ok';
      dealCount: number;
      partnerNames: string[];
      sampleDeal: { date: string; amount: number; type: string } | null;
    }
  | { status: 'error'; message: string };

// Verify a client's freee binding fetches the RIGHT company's data: pull one
// recent deal + a few partners so a human can eyeball that the bound 事業所 is
// correct before trusting the agent's freee-grounded drafts.
export async function testFreeeBinding(
  _prev: FreeeTestResult,
  formData: FormData,
): Promise<FreeeTestResult> {
  const ctx = await requireCan('integration.manage');
  const clientId = formData.get('clientId');
  if (typeof clientId !== 'string') return { status: 'error', message: 'clientId がありません' };

  try {
    const client = await FreeeApiClient.forClient(ctx.firmId, clientId);
    const [deals, partners] = await Promise.all([
      client.listRecentDeals({ limit: 1, daysBack: 180 }),
      client.listPartners({ limit: 3 }),
    ]);
    await recordAudit({
      firmId: ctx.firmId,
      actorId: ctx.userId,
      inquiryId: null,
      action: 'integration.freee_data_accessed',
      metadata: { provider: 'freee', clientId, scope: 'binding_test', rows: deals.length },
    });
    const d = deals[0];
    return {
      status: 'ok',
      dealCount: deals.length,
      partnerNames: partners.map((p) => p.name).slice(0, 3),
      sampleDeal: d ? { date: d.issue_date, amount: d.amount, type: d.type } : null,
    };
  } catch (e) {
    return { status: 'error', message: freeeErrorMessage(e) };
  }
}

function freeeErrorMessage(e: unknown): string {
  if (e instanceof ClientBindingMissingError) return 'この顧問先に事業所が紐付いていません';
  if (e instanceof IntegrationNotConnectedError) return '事務所が freee と連携していません';
  if (e instanceof IntegrationRevokedError) return 'freee 連携が解除されています — 再連携が必要';
  if (e instanceof TokenRefreshError) return 'freee トークン更新に失敗しました — 再連携が必要';
  if (e instanceof RateLimitError)
    return `freee のレート制限中です (${e.retryAfterSec}秒後に再試行)`;
  return e instanceof Error ? e.message : '接続テストに失敗しました';
}
