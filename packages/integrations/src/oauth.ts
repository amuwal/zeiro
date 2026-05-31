import { isProviderId, type ProviderId, TenantIsolationError } from '@zeiro/core';
import type { IntegrationRow } from '@zeiro/db';
import { getAdapter } from './core/registry';
import { decodeState, encodeState, generateNonce } from './core/state';

export type StartFlowResult = {
  authorizationUrl: string;
};

export async function startOAuthFlow(args: {
  provider: ProviderId;
  firmId: string;
}): Promise<StartFlowResult> {
  const adapter = getAdapter(args.provider);
  const nonce = generateNonce();
  const pkce = adapter.config.usesPkce ? adapter.generatePkcePair() : null;
  const state = encodeState({
    provider: args.provider,
    firmId: args.firmId,
    nonce,
    ...(pkce ? { codeVerifier: pkce.verifier } : {}),
  });
  const authArgs: { state: string; codeChallenge?: string } = { state };
  if (pkce) authArgs.codeChallenge = pkce.challenge;
  return { authorizationUrl: adapter.getAuthorizationUrl(authArgs) };
}

export async function completeOAuthFlow(args: {
  code: string;
  state: string;
  // The firmId of the *authenticated* session completing the callback. The
  // route MUST pass its requireFirmContext() firmId here; we refuse to bind the
  // grant unless the (HMAC-verified) state firmId matches it. This closes the
  // gap where a tampered/replayed state could write one firm's OAuth grant onto
  // another firm's integration row (税理士法 §38).
  expectedFirmId: string;
}): Promise<IntegrationRow> {
  const parsed = decodeState(args.state);
  if (parsed.firmId !== args.expectedFirmId) {
    throw new TenantIsolationError('OAuth state firm does not match authenticated firm');
  }
  if (!isProviderId(parsed.provider)) {
    throw new Error(`unknown provider in oauth state: ${parsed.provider}`);
  }
  const adapter = getAdapter(parsed.provider);
  const callbackArgs: { firmId: string; code: string; codeVerifier?: string } = {
    firmId: parsed.firmId,
    code: args.code,
  };
  if (parsed.codeVerifier !== undefined) callbackArgs.codeVerifier = parsed.codeVerifier;
  return adapter.handleCallback(callbackArgs);
}
