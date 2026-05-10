import { env } from './env';

export function verifyInboundRequest(request: Request): boolean {
  const url = new URL(request.url);
  const provided = url.searchParams.get('secret');
  return provided !== null && provided === env.SENDGRID_INBOUND_WEBHOOK_SECRET;
}
