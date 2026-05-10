import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { applyEvents, readSignatureHeaders, verifySignature } from '@/lib/sendgrid-events';

export async function POST(request: Request) {
  if (!env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY) {
    return NextResponse.json({ error: 'sendgrid not configured' }, { status: 503 });
  }
  const rawBody = await request.text();
  const headers = readSignatureHeaders(request.headers);
  if (!headers) return NextResponse.json({ error: 'missing signature' }, { status: 401 });

  const valid = verifySignature(
    rawBody,
    headers.signature,
    headers.timestamp,
    env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY,
  );
  if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

  const events = JSON.parse(rawBody);
  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'expected array' }, { status: 400 });
  }
  const result = await applyEvents(events);
  return NextResponse.json(result);
}
