import { env } from './env';

export function verifyInboundRequest(request: Request): boolean {
  const expected = env.SENDGRID_INBOUND_WEBHOOK_SECRET;
  if (!expected) return false;
  const url = new URL(request.url);
  const provided = url.searchParams.get('secret');
  return provided !== null && provided === expected;
}
