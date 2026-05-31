import { fetchResendInboundEmail, parseResendInbound } from '@zeiro/email';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { env } from '@/lib/env';
import { processInbound } from '@/lib/process-inbound';
import { runWithRequestContext } from '@/lib/request-context';
import { applyEvents } from '@/lib/resend-events';

// Mint a correlation id at this inbound boundary (or adopt an upstream
// x-request-id) so every log + Inngest event for this webhook shares one id.
export function POST(request: Request): Promise<Response> {
  return runWithRequestContext(
    { requestId: request.headers.get('x-request-id') ?? undefined },
    () => handle(request),
  );
}

async function handle(request: Request): Promise<Response> {
  if (!env.RESEND_EVENT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'resend not configured' }, { status: 503 });
  }
  const rawBody = await request.text();
  const verified = await verifySignature(rawBody);
  if (!verified) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const events = Array.isArray(payload) ? payload : [payload];
  const inboundResults: unknown[] = [];
  const statusEvents: unknown[] = [];
  for (const evt of events) {
    if (isReceivedEvent(evt)) {
      // Resend's email.received webhook only includes metadata (no text/html). The
      // body lives behind GET /emails/:id/receiving and must be fetched separately.
      if (!env.RESEND_API_KEY) {
        return NextResponse.json(
          { error: 'RESEND_API_KEY required to fetch inbound email body' },
          { status: 503 },
        );
      }
      const emailId = readEmailId(evt);
      if (!emailId) {
        inboundResults.push({ kind: 'malformed_event', reason: 'missing email_id' });
        continue;
      }
      const fullEmail = await fetchResendInboundEmail(env.RESEND_API_KEY, emailId);
      const message = parseResendInbound(fullEmail);
      inboundResults.push(await processInbound(message));
    } else {
      statusEvents.push(evt);
    }
  }
  const statusResult = statusEvents.length > 0 ? await applyEvents(statusEvents) : null;
  return NextResponse.json({ inbound: inboundResults, status: statusResult });
}

function isReceivedEvent(evt: unknown): boolean {
  return (
    evt !== null &&
    typeof evt === 'object' &&
    'type' in evt &&
    (evt as { type: unknown }).type === 'email.received'
  );
}

function readEmailId(evt: unknown): string | null {
  if (evt === null || typeof evt !== 'object' || !('data' in evt)) return null;
  const data = (evt as { data: unknown }).data;
  if (data === null || typeof data !== 'object' || !('email_id' in data)) return null;
  const id = (data as { email_id: unknown }).email_id;
  return typeof id === 'string' ? id : null;
}

async function verifySignature(rawBody: string): Promise<boolean> {
  const h = await headers();
  const svixId = h.get('svix-id');
  const svixTimestamp = h.get('svix-timestamp');
  const svixSignature = h.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) return false;
  if (!env.RESEND_EVENT_WEBHOOK_SECRET) return false;
  try {
    const wh = new Webhook(env.RESEND_EVENT_WEBHOOK_SECRET);
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
