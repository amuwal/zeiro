import { fetchResendInboundEmail, parseResendInbound } from '@zeiro/email';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { env } from '@/lib/env';
import { processInbound } from '@/lib/process-inbound';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyResendWebhook(rawBody);
  if (!verified) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Resend's email.received webhook only ships metadata (no text/html). We must
  // fetch the full message via GET /emails/:id/receiving before parsing — otherwise
  // body is empty and the downstream AI pipeline fails.
  if (!env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY required to fetch inbound email body' },
      { status: 503 },
    );
  }
  const emailId = readEmailId(json);
  if (!emailId) {
    return NextResponse.json({ error: 'missing email_id in webhook payload' }, { status: 400 });
  }
  const fullEmail = await fetchResendInboundEmail(env.RESEND_API_KEY, emailId);
  const message = parseResendInbound(fullEmail);
  const outcome = await processInbound(message);
  return NextResponse.json(outcome);
}

function readEmailId(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object') return null;
  // Webhook envelope: { type: 'email.received', data: { email_id, ... } }
  if ('data' in payload) {
    const data = (payload as { data: unknown }).data;
    if (data && typeof data === 'object' && 'email_id' in data) {
      const id = (data as { email_id: unknown }).email_id;
      if (typeof id === 'string') return id;
    }
  }
  // Direct shape (defensive — some legacy integrations send fields at top level)
  if ('email_id' in payload) {
    const id = (payload as { email_id: unknown }).email_id;
    if (typeof id === 'string') return id;
  }
  return null;
}

async function verifyResendWebhook(rawBody: string): Promise<boolean> {
  if (!env.RESEND_INBOUND_WEBHOOK_SECRET) return false;
  const h = await headers();
  const svixId = h.get('svix-id');
  const svixTimestamp = h.get('svix-timestamp');
  const svixSignature = h.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) return false;
  try {
    const wh = new Webhook(env.RESEND_INBOUND_WEBHOOK_SECRET);
    wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
    return true;
  } catch {
    return false;
  }
}
