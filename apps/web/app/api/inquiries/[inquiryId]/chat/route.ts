import { ctxCan } from '@/lib/authz';
import { env } from '@/lib/env';
import { requireFirmContext } from '@/lib/firm-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = Promise<{ inquiryId: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { inquiryId } = await params;
  const ctx = await requireFirmContext();
  if (!ctxCan(ctx, 'inquiry.draft')) return new Response('forbidden', { status: 403 });
  const { firmId } = ctx;
  const url = `${env.AGENTS_BASE_URL}/api/inquiries/${encodeURIComponent(inquiryId)}/chat?firmId=${encodeURIComponent(firmId)}`;
  const upstream = await fetch(url);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request, { params }: { params: Params }) {
  const { inquiryId } = await params;
  const ctx = await requireFirmContext();
  if (!ctxCan(ctx, 'inquiry.draft')) return new Response('forbidden', { status: 403 });
  const { firmId } = ctx;
  const body = await req.text();
  const url = `${env.AGENTS_BASE_URL}/api/inquiries/${encodeURIComponent(inquiryId)}/chat?firmId=${encodeURIComponent(firmId)}`;
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  // Stream the SSE response straight through. Disable any buffering so chunks
  // hit the browser as they arrive.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
