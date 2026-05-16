import { recordAudit } from '@zeiro/db';
import { registerFreee, startOAuthFlow } from '@zeiro/integrations';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { requireAdminFirm } from '@/lib/team-guard';

ensureFreeeRegistered();

export async function POST(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const { provider } = await context.params;
  const guard = await requireAdminFirm();
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });

  if (provider !== 'freee') {
    return NextResponse.json({ error: `unknown provider: ${provider}` }, { status: 400 });
  }
  if (!env.FREEE_CLIENT_ID || !env.FREEE_CLIENT_SECRET || !env.FREEE_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'freee app credentials not configured on the server' },
      { status: 503 },
    );
  }

  const { authorizationUrl } = await startOAuthFlow({
    provider,
    firmId: guard.ctx.firmId,
  });

  await recordAudit({
    firmId: guard.ctx.firmId,
    actorId: guard.ctx.userId,
    inquiryId: null,
    action: 'integration.oauth_started',
    metadata: { provider },
  });

  return NextResponse.json({ authorizationUrl });
}

// Idempotent — base adapter constructor is cheap; we just need it in the
// registry by the time the request handler runs.
function ensureFreeeRegistered(): void {
  if (env.FREEE_CLIENT_ID && env.FREEE_CLIENT_SECRET && env.FREEE_REDIRECT_URI) {
    registerFreee({
      clientId: env.FREEE_CLIENT_ID,
      clientSecret: env.FREEE_CLIENT_SECRET,
      redirectUri: env.FREEE_REDIRECT_URI,
    });
  }
}
