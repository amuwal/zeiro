import { recordAudit } from '@zeiro/db';
import { completeOAuthFlow, registerFreee } from '@zeiro/integrations';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

ensureFreeeRegistered();

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
    const integration = await completeOAuthFlow({ code, state });
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

function ensureFreeeRegistered(): void {
  if (env.FREEE_CLIENT_ID && env.FREEE_CLIENT_SECRET && env.FREEE_REDIRECT_URI) {
    registerFreee({
      clientId: env.FREEE_CLIENT_ID,
      clientSecret: env.FREEE_CLIENT_SECRET,
      redirectUri: env.FREEE_REDIRECT_URI,
    });
  }
}
