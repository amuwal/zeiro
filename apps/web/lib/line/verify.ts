import crypto from 'node:crypto';

export function verifyLineSignature(
  channelSecret: string,
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64');
  const expBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(signature);
  if (expBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expBuf, sigBuf);
}
