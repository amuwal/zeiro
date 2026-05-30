import {
  type IntegrationRow,
  findIntegration,
  markIntegrationStatus,
  updateIntegrationMetadata,
  updateIntegrationTokens,
  upsertIntegration,
} from '@zeiro/db';
import { decrypt, encrypt } from './encryption';
import {
  IntegrationNotConnectedError,
  IntegrationRevokedError,
  TokenRefreshError,
} from './errors';
import { generateCodeChallenge, generateCodeVerifier } from './state';
import type { AdapterConfig, TokenSet } from './types';

export abstract class BaseIntegrationAdapter {
  abstract readonly provider: string;
  abstract readonly config: AdapterConfig;
  protected abstract readonly clientId: string;
  protected abstract readonly clientSecret: string;
  protected abstract readonly redirectUri: string;

  abstract exchangeCodeForTokens(args: {
    code: string;
    codeVerifier?: string;
  }): Promise<TokenSet>;

  abstract refreshAccessToken(refreshToken: string): Promise<TokenSet>;

  // Override to fetch provider-side metadata (e.g. visible 事業所 list)
  // immediately after a successful connect / refresh.
  protected async fetchConnectionMetadata(
    _tokens: TokenSet,
  ): Promise<Record<string, unknown>> {
    return {};
  }

  protected async revokeAtProvider(_accessToken: string): Promise<void> {}

  getAuthorizationUrl(args: { state: string; codeChallenge?: string }): string {
    const url = new URL(this.config.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('scope', this.config.scope);
    url.searchParams.set('state', args.state);
    if (this.config.usesPkce && args.codeChallenge) {
      url.searchParams.set('code_challenge', args.codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
    }
    for (const [k, v] of Object.entries(this.config.extraAuthParams ?? {})) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  }

  // Re-fetch provider-side metadata (e.g. the 事業所 list) for an already-
  // connected firm without re-doing OAuth. Refreshes the token if needed.
  async refreshMetadata(firmId: string): Promise<Record<string, unknown>> {
    const accessToken = await this.getAccessToken(firmId);
    const metadata = await this.safeFetchMetadata({ accessToken });
    const row = await this.requireIntegration(firmId);
    await updateIntegrationMetadata(firmId, row.id, metadata);
    return metadata;
  }

  generatePkcePair(): { verifier: string; challenge: string } {
    const verifier = generateCodeVerifier();
    return { verifier, challenge: generateCodeChallenge(verifier) };
  }

  async handleCallback(args: {
    firmId: string;
    code: string;
    codeVerifier?: string;
  }): Promise<IntegrationRow> {
    const exchangeArgs: { code: string; codeVerifier?: string } = { code: args.code };
    if (args.codeVerifier !== undefined) exchangeArgs.codeVerifier = args.codeVerifier;
    const tokens = await this.exchangeCodeForTokens(exchangeArgs);
    const metadata = await this.safeFetchMetadata(tokens);
    return upsertIntegration({
      firmId: args.firmId,
      provider: this.provider,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
      tokenType: tokens.tokenType ?? 'Bearer',
      scope: tokens.scope ?? null,
      expiresAt: tokens.expiresInSec ? new Date(Date.now() + tokens.expiresInSec * 1000) : null,
      metadata,
    });
  }

  async getAccessToken(firmId: string): Promise<string> {
    const row = await this.requireIntegration(firmId);
    if (row.status === 'revoked') throw new IntegrationRevokedError(row.id, this.provider);
    if (this.shouldRefresh(row)) {
      const refreshed = await this.refreshTokensFor(row);
      return decrypt(refreshed.accessToken);
    }
    return decrypt(row.accessToken);
  }

  async disconnect(firmId: string): Promise<void> {
    const row = await findIntegration(firmId, this.provider);
    if (!row) return;
    try {
      await this.revokeAtProvider(decrypt(row.accessToken));
    } catch {
      // best-effort: provider revoke endpoint may not exist or token already invalid
    }
    const { deleteIntegration } = await import('@zeiro/db');
    await deleteIntegration(firmId, this.provider);
  }

  protected async requireIntegration(firmId: string): Promise<IntegrationRow> {
    const row = await findIntegration(firmId, this.provider);
    if (!row) throw new IntegrationNotConnectedError(firmId, this.provider);
    return row;
  }

  protected shouldRefresh(row: IntegrationRow): boolean {
    if (!row.refreshToken || !row.expiresAt) return false;
    const safetyMs = this.config.refreshSafetyWindowSec * 1000;
    return row.expiresAt.getTime() - Date.now() < safetyMs;
  }

  protected async refreshTokensFor(row: IntegrationRow): Promise<IntegrationRow> {
    if (!row.refreshToken) throw new TokenRefreshError(row.id, this.provider);
    let tokens: TokenSet;
    try {
      tokens = await this.refreshAccessToken(decrypt(row.refreshToken));
    } catch (error) {
      await markIntegrationStatus(
        row.firmId,
        row.id,
        'needs_reconnect',
        error instanceof Error ? error.message : String(error),
      );
      throw new TokenRefreshError(row.id, this.provider, error);
    }
    const updateArgs: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date | null;
      scope?: string | null;
    } = {
      accessToken: encrypt(tokens.accessToken),
    };
    if (tokens.refreshToken) updateArgs.refreshToken = encrypt(tokens.refreshToken);
    if (tokens.expiresInSec !== undefined) {
      updateArgs.expiresAt = new Date(Date.now() + tokens.expiresInSec * 1000);
    }
    if (tokens.scope !== undefined) updateArgs.scope = tokens.scope;
    await updateIntegrationTokens(row.firmId, row.id, updateArgs);
    const refreshed = await this.requireIntegration(row.firmId);
    return refreshed;
  }

  protected async safeFetchMetadata(tokens: TokenSet): Promise<Record<string, unknown>> {
    try {
      return await this.fetchConnectionMetadata(tokens);
    } catch {
      return {};
    }
  }
}
