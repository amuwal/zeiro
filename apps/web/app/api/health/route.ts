import { selfTestVector } from '@zeiro/core/security';
import { NextResponse } from 'next/server';

// `firmTokenKey` is HMAC(fixed message) under the derived firm-token subkey, not
// the key itself. web (Vercel) and agents (Render) MUST report an identical
// value — a mismatch means a divergent ENCRYPTION_KEY, which silently 401s every
// draft + chat. Lets an operator diff the two /api/health responses to diagnose
// it instead of guessing. Returns null (never throws) if the key is unset.
function firmTokenKeyFingerprint(): string | null {
  try {
    return selfTestVector('firm-token');
  } catch {
    return null;
  }
}

export function GET() {
  return NextResponse.json({ status: 'ok', firmTokenKey: firmTokenKeyFingerprint() });
}
