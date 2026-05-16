import crypto from 'node:crypto';

export type OAuthState = {
  provider: string;
  firmId: string;
  nonce: string;
  codeVerifier?: string;
};

export function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

export function decodeState(encoded: string): OAuthState {
  const json = Buffer.from(encoded, 'base64url').toString('utf8');
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
