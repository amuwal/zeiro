import crypto from 'node:crypto';

// Chatwork signs each webhook with HMAC-SHA256 over the raw request body, using
// the webhook token *base64-decoded* as the key, and sends the result
// base64-encoded in `X-ChatWorkWebhookSignature`.
// https://developer.chatwork.com/docs/webhook
export function verifyChatworkSignature(
  webhookToken: string,
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const key = Buffer.from(webhookToken, 'base64');
  const expected = crypto.createHmac('sha256', key).update(rawBody).digest('base64');
  const expBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(signature);
  if (expBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expBuf, sigBuf);
}
