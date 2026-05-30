import { isProviderId } from '@zeiro/core';
import { recordAudit } from '@zeiro/db';
import { hasAdapter, registerIntegrations, startOAuthFlow } from '@zeiro/integrations';
import { NextResponse } from 'next/server';
import { ctxCan } from '@/lib/authz';
import { env } from '@/lib/env';
import { requireFirmContext } from '@/lib/firm-context';

registerIntegrations(env);

export async function POST(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const { provider } = await context.params;
  const ctx = await requireFirmContext();
  if (!ctxCan(ctx, 'integration.manage')) {
    return NextResponse.json({ error: '権限がありません (所長のみ)' }, { status: 403 });
  }

  if (!isProviderId(provider) || !hasAdapter(provider)) {
    return NextResponse.json({ error: `unknown provider: ${provider}` }, { status: 400 });
  }
  if (
    provider === 'freee' &&
    (!env.FREEE_CLIENT_ID || !env.FREEE_CLIENT_SECRET || !env.FREEE_REDIRECT_URI)
  ) {
    return NextResponse.json(
      { error: 'freee app credentials not configured on the server' },
      { status: 503 },
    );
  }

  const { authorizationUrl } = await startOAuthFlow({ provider, firmId: ctx.firmId });

  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId: null,
    action: 'integration.oauth_started',
    metadata: { provider },
  });

  return NextResponse.json({ authorizationUrl });
}
