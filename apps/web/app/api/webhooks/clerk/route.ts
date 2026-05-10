import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { applyClerkEvent, type ClerkEvent } from '@/lib/clerk-events';
import { env } from '@/lib/env';

export async function POST(request: Request) {
  const body = await request.text();
  const evt = await verify(body);
  if (!evt) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  await applyClerkEvent(evt);
  return NextResponse.json({ ok: true });
}

async function verify(rawBody: string): Promise<ClerkEvent | null> {
  const h = await headers();
  const svixId = h.get('svix-id');
  const svixTimestamp = h.get('svix-timestamp');
  const svixSignature = h.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) return null;

  try {
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    return wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkEvent;
  } catch {
    return null;
  }
}
