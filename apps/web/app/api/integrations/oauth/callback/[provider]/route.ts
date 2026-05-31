import { recordAudit } from '@zeiro/db';
import { completeOAuthFlow, registerIntegrations } from '@zeiro/integrations';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { requireFirmContext } from '@/lib/firm-context';

registerIntegrations(env);

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const { provider } = await context.params;
  const url = new URL(request.url);

  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return redirectToSettings(request, {
      integration: provider,
      status: 'error',
      message: oauthError,
    });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return redirectToSettings(request, {
      integration: provider,
      status: 'error',
      message: 'missing_code_or_state',
    });
  }

  try {
    // The callback runs inside the firm's authenticated session. Bind the grant
    // to THIS firm: completeOAuthFlow rejects unless the HMAC-verified state
    // firmId equals the session firmId, so a tampered/replayed state can't write
    // one firm's OAuth tokens onto another firm's integration row.
    const { firmId } = await requireFirmContext();
    const integration = await completeOAuthFlow({ code, state, expectedFirmId: firmId });
    await recordAudit({
      firmId: integration.firmId,
      actorId: '00000000-0000-0000-0000-000000000000',
      inquiryId: null,
      action: 'integration.connected',
      metadata: { provider, integrationId: integration.id },
    });
    return redirectToSettings(request, { integration: provider, status: 'connected' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return redirectToSettings(request, {
      integration: provider,
      status: 'error',
      message: message.slice(0, 200),
    });
  }
}

function redirectToSettings(request: Request, params: Record<string, string>): Response {
  const url = new URL('/settings', request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}
