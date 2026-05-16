'use server';

import { recordAudit } from '@zeiro/db';
import { getAdapter, registerFreee } from '@zeiro/integrations';
import { revalidatePath } from 'next/cache';
import { env } from '@/lib/env';
import { requireAdminFirm } from '@/lib/team-guard';

ensureFreeeRegistered();

export async function disconnectFreee(): Promise<void> {
  const guard = await requireAdminFirm();
  if (!guard.ok) throw new Error(guard.message);
  const adapter = getAdapter('freee');
  await adapter.disconnect(guard.ctx.firmId);
  await recordAudit({
    firmId: guard.ctx.firmId,
    actorId: guard.ctx.userId,
    inquiryId: null,
    action: 'integration.disconnected',
    metadata: { provider: 'freee' },
  });
  revalidatePath('/settings');
}

function ensureFreeeRegistered(): void {
  if (env.FREEE_CLIENT_ID && env.FREEE_CLIENT_SECRET && env.FREEE_REDIRECT_URI) {
    registerFreee({
      clientId: env.FREEE_CLIENT_ID,
      clientSecret: env.FREEE_CLIENT_SECRET,
      redirectUri: env.FREEE_REDIRECT_URI,
    });
  }
}
