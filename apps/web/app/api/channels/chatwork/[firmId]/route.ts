import { getFirmChannel } from '@zeiro/db';
import { NextResponse } from 'next/server';
import { chatworkChannelAdapter } from '@/lib/channels/chatwork';
import { processInbound } from '@/lib/channels/process-inbound';

type Params = { firmId: string };

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { firmId } = await params;
  const channel = await getFirmChannel(firmId, chatworkChannelAdapter.id);
  if (!channel?.enabled) {
    return NextResponse.json({ error: 'channel not configured' }, { status: 404 });
  }
  const config = chatworkChannelAdapter.parseConfig(channel.config);
  if (!config) {
    return NextResponse.json({ error: 'channel config invalid' }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!chatworkChannelAdapter.verifySignature({ rawBody, headers: request.headers, config })) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let msgs;
  try {
    msgs = chatworkChannelAdapter.parseEvents({ rawBody, config });
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const outcome = await processInbound(firmId, chatworkChannelAdapter, msgs);
  return NextResponse.json(outcome);
}
