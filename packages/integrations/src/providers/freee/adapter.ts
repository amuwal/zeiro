import { BaseIntegrationAdapter } from '../../core/base-adapter';
import type { AdapterConfig, TokenSet } from '../../core/types';

const FREEE_AUTHORIZE = 'https://accounts.secure.freee.co.jp/public_api/authorize';
const FREEE_TOKEN = 'https://accounts.secure.freee.co.jp/public_api/token';
const FREEE_API = 'https://api.freee.co.jp';

export class FreeeAdapter extends BaseIntegrationAdapter {
  readonly provider = 'freee';
  readonly config: AdapterConfig = {
    provider: 'freee',
    authorizationEndpoint: FREEE_AUTHORIZE,
    tokenEndpoint: FREEE_TOKEN,
    scope: 'read',
    usesPkce: true,
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

  async exchangeCodeForTokens(args: {
    code: string;
    codeVerifier?: string;
  }): Promise<TokenSet> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code: args.code,
    });
    if (args.codeVerifier) body.set('code_verifier', args.codeVerifier);
    return tokenRequest(body);
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });
    return tokenRequest(body);
  }

  // Pull the list of 事業所 the firm's freee account can access so the
  // per-client binding UI has something to populate its dropdown with.
  protected override async fetchConnectionMetadata(
    tokens: TokenSet,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${FREEE_API}/api/1/companies`, {
      headers: { authorization: `Bearer ${tokens.accessToken}`, accept: 'application/json' },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { companies?: Array<{ id: number; name: string; role: string }> };
    const companies = (json.companies ?? []).map((c) => ({
      id: String(c.id),
      name: c.name,
      role: c.role,
    }));
    return { companies, companiesFetchedAt: new Date().toISOString() };
  }
}

async function tokenRequest(body: URLSearchParams): Promise<TokenSet> {
  const res = await fetch(FREEE_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`freee token endpoint ${res.status}: ${text.slice(0, 200)}`);
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
