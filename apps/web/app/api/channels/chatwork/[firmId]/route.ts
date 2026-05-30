import { getFirmChannel } from '@zeiro/db';
import { NextResponse } from 'next/server';
import { chatworkWebhookBodySchema, parseChatworkConfig } from '@/lib/chatwork/parse';
import { processChatworkEvent } from '@/lib/chatwork/process';
import { verifyChatworkSignature } from '@/lib/chatwork/verify';

type Params = { firmId: string };

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { firmId } = await params;
  const channel = await getFirmChannel(firmId, 'chatwork');
  if (!channel?.enabled) {
    return NextResponse.json({ error: 'channel not configured' }, { status: 404 });
  }
  const config = parseChatworkConfig(channel.config);
  if (!config) {
    return NextResponse.json({ error: 'channel config invalid' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-chatworkwebhooksignature');
  if (!verifyChatworkSignature(config.webhookToken, rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const parsed = chatworkWebhookBodySchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const outcome = await processChatworkEvent(firmId, parsed.data, config.botAccountId);
  return NextResponse.json({ outcome });
}
