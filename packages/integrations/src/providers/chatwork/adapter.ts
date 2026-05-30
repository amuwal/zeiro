import { BaseIntegrationAdapter } from '../../core/base-adapter';
import type { AdapterConfig, TokenSet } from '../../core/types';

const CHATWORK_AUTHORIZE = 'https://www.chatwork.com/packages/oauth2/login.php';
const CHATWORK_TOKEN = 'https://oauth.chatwork.com/token';
const CHATWORK_API = 'https://api.chatwork.com/v2';

// Least-privilege for Zeiro: read room/messages + post replies + read own
// profile (to auto-detect the connected account id we skip on ingest).
// offline_access yields the refresh token for a persistent server integration.
const CHATWORK_SCOPE =
  'offline_access rooms.info:read rooms.messages:read rooms.messages:write users.profile.me:read';

// Chatwork OAuth2 (authorization code). Unlike freee, the token endpoint
// authenticates the client via HTTP Basic (CLIENT_SECRET_BASIC), so the client
// id/secret go in the Authorization header, not the body.
export class ChatworkAdapter extends BaseIntegrationAdapter {
  readonly provider = 'chatwork';
  readonly config: AdapterConfig = {
    provider: 'chatwork',
    authorizationEndpoint: CHATWORK_AUTHORIZE,
    tokenEndpoint: CHATWORK_TOKEN,
    scope: CHATWORK_SCOPE,
    usesPkce: false,
    refreshSafetyWindowSec: 300,
  };

  protected readonly clientId: string;
  protected readonly clientSecret: string;
  protected readonly redirectUri: string;

  constructor(args: { clientId: string; clientSecret: string; redirectUri: string }) {
    super();
    this.clientId = args.clientId;
    this.clientSecret = args.clientSecret;
    this.redirectUri = args.redirectUri;
  }

  private basicAuth(): string {
    return `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
  }

  async exchangeCodeForTokens(args: { code: string; codeVerifier?: string }): Promise<TokenSet> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code: args.code,
    });
    return this.tokenRequest(body);
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    return this.tokenRequest(body);
  }

  // Capture the connected account's own id so the inbound pipeline can skip
  // messages this account posts (e.g. a draft we sent), without manual entry.
  protected override async fetchConnectionMetadata(
    tokens: TokenSet,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${CHATWORK_API}/me`, {
      headers: { authorization: `Bearer ${tokens.accessToken}`, accept: 'application/json' },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { account_id?: number; name?: string };
    return {
      accountId: json.account_id !== undefined ? String(json.account_id) : null,
      accountName: json.name ?? null,
      connectedAt: new Date().toISOString(),
    };
  }

  private async tokenRequest(body: URLSearchParams): Promise<TokenSet> {
    const res = await fetch(CHATWORK_TOKEN, {
      method: 'POST',
      headers: {
        authorization: this.basicAuth(),
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`chatwork token endpoint ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };
    const out: TokenSet = { accessToken: json.access_token };
    if (json.refresh_token !== undefined) out.refreshToken = json.refresh_token;
    if (json.expires_in !== undefined) out.expiresInSec = json.expires_in;
    if (json.token_type !== undefined) out.tokenType = json.token_type;
    if (json.scope !== undefined) out.scope = json.scope;
    return out;
  }
}
