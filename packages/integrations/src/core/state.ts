import crypto from 'node:crypto';
import { signHmac } from '@zeiro/core/security';

export type OAuthState = {
  provider: string;
  firmId: string;
  nonce: string;
  codeVerifier?: string;
};

// The OAuth `state` round-trips through the provider and back to our callback
// unauthenticated, so anything inside it (notably firmId, and the PKCE
// codeVerifier) must be tamper-proof: a forged firmId here would let one firm's
// OAuth grant be written onto another firm's integration row (税理士法 §38).
// We HMAC-SHA256 sign the encoded payload and reject any mismatch on decode.
//
// Secret: an HKDF subkey of the existing ENCRYPTION_KEY (64 hex / 32 bytes),
// labelled 'oauth-state' (see @zeiro/core security/hmac-key.ts) — already
// required in the web env where both encode (authorize route) and decode
// (callback) run, so no new prod secret, and the per-purpose label keeps this
// key independent of the firm-token HMAC and the AES-GCM data-encryption use.
// State is not encrypted (the provider may log it), so the codeVerifier's
// protection here is integrity + the callback's own firm-context check, not
// confidentiality; PKCE's security rests on the verifier never leaving our
// backend, which holds: we never put it in a client-visible URL.

type StatePayload = OAuthState;

function sign(payloadB64: string): string {
  return signHmac('oauth-state', payloadB64);
}

export function encodeState(state: OAuthState): string {
  const payload: StatePayload = state;
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function decodeState(encoded: string): OAuthState {
  const dot = encoded.indexOf('.');
  if (dot <= 0 || dot === encoded.length - 1) {
    throw new Error('invalid OAuth state: unsigned or malformed');
  }
  const payloadB64 = encoded.slice(0, dot);
  const sigB64 = encoded.slice(dot + 1);

  const expected = Buffer.from(sign(payloadB64), 'utf8');
  const actual = Buffer.from(sigB64, 'utf8');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error('invalid OAuth state: signature mismatch');
  }

  const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid OAuth state');
  const s = parsed as Record<string, unknown>;
  if (
    typeof s.provider !== 'string' ||
    typeof s.firmId !== 'string' ||
    typeof s.nonce !== 'string'
  ) {
    throw new Error('invalid OAuth state shape');
  }
  return {
    provider: s.provider,
    firmId: s.firmId,
    nonce: s.nonce,
    ...(typeof s.codeVerifier === 'string' ? { codeVerifier: s.codeVerifier } : {}),
  };
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}
