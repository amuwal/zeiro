'use server';

import { recordAudit } from '@zeiro/db';
import { getAdapter, registerFreee } from '@zeiro/integrations';
import { revalidatePath } from 'next/cache';
import { requireCan } from '@/lib/authz';
import { env } from '@/lib/env';

ensureFreeeRegistered();

export async function disconnectFreee(): Promise<void> {
  const { firmId, userId } = await requireCan('integration.manage');
  const adapter = getAdapter('freee');
  await adapter.disconnect(firmId);
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'integration.disconnected',
    metadata: { provider: 'freee' },
  });
  revalidatePath('/settings');
}

// Re-pull the firm's accessible 事業所 from freee without re-doing OAuth — for
// when a firm adds/removes a company in freee after connecting.
export async function refreshFreeeCompanies(): Promise<void> {
  const { firmId, userId } = await requireCan('integration.manage');
  const adapter = getAdapter('freee');
  const metadata = await adapter.refreshMetadata(firmId);
  const companies = Array.isArray((metadata as { companies?: unknown[] }).companies)
    ? ((metadata as { companies: unknown[] }).companies as unknown[]).length
    : 0;
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'integration.refreshed',
    metadata: { provider: 'freee', op: 'companies', companies },
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
