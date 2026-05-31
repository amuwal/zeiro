import crypto from 'node:crypto';
import { TenantIsolationError } from '../errors';
import { signHmac } from './hmac-key';

// Short-lived, HMAC-SHA256-signed bearer of the *verified* firmId (and optional
// inquiryId) for the web -> agents hop. The agents service has no Clerk session,
// so without this it can only trust an unsigned firmId in the body/query — a
// forgeable tenant boundary (税理士法 §38). Signing makes firmId un-tamperable:
// the agents service derives firmId FROM the token, never from the request.
//
// Token format (compact, dependency-free, JWS-like): `<payloadB64url>.<sigB64url>`
//   payload  = JSON { firmId, inquiryId?, exp }   (exp = unix epoch ms)
//   signature = base64url( HMAC-SHA256(payloadB64url, secret) )
//
// Secret source: an HKDF subkey of the existing ENCRYPTION_KEY (64 hex / 32
// bytes), labelled 'firm-token' (see security/hmac-key.ts). Already required in
// BOTH the web and agents env schemas — so no new prod secret is introduced —
// and the per-purpose HKDF label keeps this key independent of the OAuth-state
// HMAC and of the AES-GCM data-encryption use of the same root key.

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export type FirmTokenClaims = {
  firmId: string;
  inquiryId?: string;
};

type FirmTokenPayload = FirmTokenClaims & { exp: number };

function sign(payloadB64: string): string {
  try {
    return signHmac('firm-token', payloadB64);
  } catch {
    throw new TenantIsolationError(
      'ENCRYPTION_KEY missing or malformed; cannot sign/verify firm token',
    );
  }
}

export function signFirmToken(claims: FirmTokenClaims, ttlMs: number = DEFAULT_TTL_MS): string {
  const payload: FirmTokenPayload = {
    firmId: claims.firmId,
    ...(claims.inquiryId !== undefined ? { inquiryId: claims.inquiryId } : {}),
    exp: Date.now() + ttlMs,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

// Verifies signature + expiry and returns the claims. Throws TenantIsolationError
// on any tamper/missing/expired condition — never silently degrades to an
// untrusted firmId.
export function verifyFirmToken(token: string | null | undefined): FirmTokenClaims {
  if (!token || typeof token !== 'string') {
    throw new TenantIsolationError('firm token missing');
  }
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) {
    throw new TenantIsolationError('firm token malformed');
  }
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expected = Buffer.from(sign(payloadB64), 'utf8');
  const actual = Buffer.from(sigB64, 'utf8');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new TenantIsolationError('firm token signature mismatch');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new TenantIsolationError('firm token payload unreadable');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new TenantIsolationError('firm token payload invalid');
  }
  const p = parsed as Record<string, unknown>;
  if (typeof p.firmId !== 'string' || typeof p.exp !== 'number') {
    throw new TenantIsolationError('firm token claims invalid');
  }
  if (Date.now() > p.exp) {
    throw new TenantIsolationError('firm token expired');
  }
  return {
    firmId: p.firmId,
    ...(typeof p.inquiryId === 'string' ? { inquiryId: p.inquiryId } : {}),
  };
}

// Convenience for the agents service: verify the token AND assert it authorises
// the firmId/inquiryId the request is acting on. The agents service should call
// this and use the RETURNED firmId, not the one it derived from the URL/body.
export function verifyFirmTokenFor(
  token: string | null | undefined,
  expected: { firmId?: string | undefined; inquiryId?: string | undefined },
): FirmTokenClaims {
  const claims = verifyFirmToken(token);
  if (expected.firmId !== undefined && expected.firmId !== claims.firmId) {
    throw new TenantIsolationError('firm token does not match requested firm');
  }
  if (
    expected.inquiryId !== undefined &&
    claims.inquiryId !== undefined &&
    expected.inquiryId !== claims.inquiryId
  ) {
    throw new TenantIsolationError('firm token does not match requested inquiry');
  }
  return claims;
}

export const FIRM_TOKEN_HEADER = 'x-zeiro-firm-token';
