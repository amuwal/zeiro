import { getFirmChannel } from '@zeiro/db';
import { NextResponse } from 'next/server';
import { lineChannelAdapter } from '@/lib/channels/line';
import { processInbound } from '@/lib/channels/process-inbound';

type Params = { firmId: string };

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { firmId } = await params;
  const channel = await getFirmChannel(firmId, lineChannelAdapter.id);
  if (!channel?.enabled) {
    return NextResponse.json({ error: 'channel not configured' }, { status: 404 });
  }
  const config = lineChannelAdapter.parseConfig(channel.config);
  if (!config) {
    return NextResponse.json({ error: 'channel config invalid' }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!lineChannelAdapter.verifySignature({ rawBody, headers: request.headers, config })) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let msgs;
  try {
    msgs = lineChannelAdapter.parseEvents({ rawBody, config });
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const result = await processInbound(firmId, lineChannelAdapter, msgs);
  return NextResponse.json(result);
}
