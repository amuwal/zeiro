import crypto from 'node:crypto';

// Both signed-firmId surfaces (the web -> agents firm token, and the OAuth state
// blob) derive their HMAC key from the single shared ENCRYPTION_KEY. Using the
// raw key for two different HMAC purposes — and alongside its AES-GCM
// data-encryption use — is a key-reuse smell. HKDF-Expand with a per-purpose
// `info` label gives each surface an independent 32-byte subkey, so a future
// change to one surface (or adding a third) never collides with another and we
// never need to provision a separate prod secret.
//
// The cross-platform invariant is unchanged: web (Vercel) and agents (Render)
// must hold a byte-identical ENCRYPTION_KEY, since the subkey is deterministic
// in that input. See selfTestVector() for a startup/health agreement check.

const SUBKEY_BYTES = 32;
const SALT = Buffer.from('zeiro/hmac-subkey/v1', 'utf8');

function rawKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error('ENCRYPTION_KEY missing or malformed (expected 64 hex chars / 32 bytes)');
  }
  return Buffer.from(raw, 'hex');
}

export type HmacPurpose = 'firm-token' | 'oauth-state';

export function deriveHmacKey(purpose: HmacPurpose): Buffer {
  const derived = crypto.hkdfSync(
    'sha256',
    rawKey(),
    SALT,
    Buffer.from(purpose, 'utf8'),
    SUBKEY_BYTES,
  );
  return Buffer.from(derived);
}

export function signHmac(purpose: HmacPurpose, message: string): string {
  return crypto.createHmac('sha256', deriveHmacKey(purpose)).update(message).digest('base64url');
}

// Deterministic test vector over a fixed message. Two deploys that hold the same
// ENCRYPTION_KEY produce the same value for a given purpose; a divergent key
// produces a different one. A health endpoint can surface this so a key
// mismatch between web and agents is diagnosable instead of presenting as a
// silent 100%-of-drafts 401 outage.
export function selfTestVector(purpose: HmacPurpose): string {
  return signHmac(purpose, 'zeiro/selftest');
}
