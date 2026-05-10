import { parseSendGridInbound } from '@zeiro/email';
import { NextResponse } from 'next/server';
import { verifyInboundRequest } from '@/lib/inbound-auth';
import { processInbound } from '@/lib/process-inbound';

export async function POST(request: Request) {
  if (!verifyInboundRequest(request)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  const formData = await request.formData();
  const message = await parseSendGridInbound(formData);
  const outcome = await processInbound(message);
  return NextResponse.json(outcome);
}
