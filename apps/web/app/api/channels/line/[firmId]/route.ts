import { getFirmChannel } from '@zeiro/db';
import { NextResponse } from 'next/server';
import { lineWebhookBodySchema, parseLineConfig } from '@/lib/line/parse';
import { processLineEvents } from '@/lib/line/process';
import { verifyLineSignature } from '@/lib/line/verify';

type Params = { firmId: string };

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { firmId } = await params;
  const channel = await getFirmChannel(firmId, 'line');
  if (!channel?.enabled) {
    return NextResponse.json({ error: 'channel not configured' }, { status: 404 });
  }
  const config = parseLineConfig(channel.config);
  if (!config) {
    return NextResponse.json({ error: 'channel config invalid' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature');
  if (!verifyLineSignature(config.channelSecret, rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const parsed = lineWebhookBodySchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const result = await processLineEvents(firmId, parsed.data.events);
  return NextResponse.json(result);
}
