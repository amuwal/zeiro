import type { IntegrationRow } from '@zeiro/db';
import { getAdapter } from './core/registry';
import { decodeState, encodeState, generateNonce } from './core/state';

export type StartFlowResult = {
  authorizationUrl: string;
};

export async function startOAuthFlow(args: {
  provider: string;
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
}): Promise<IntegrationRow> {
  const parsed = decodeState(args.state);
  const adapter = getAdapter(parsed.provider);
  const callbackArgs: { firmId: string; code: string; codeVerifier?: string } = {
    firmId: parsed.firmId,
    code: args.code,
  };
  if (parsed.codeVerifier !== undefined) callbackArgs.codeVerifier = parsed.codeVerifier;
  return adapter.handleCallback(callbackArgs);
}
