export type AdapterConfig = {
  provider: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint?: string;
  scope: string;
  usesPkce: boolean;
  refreshSafetyWindowSec: number;
  // Extra static query params appended to the authorization URL. freee uses
  // `prompt=select_company` to force the 事業所 picker on every connect.
  extraAuthParams?: Record<string, string>;
};

export type TokenSet = {
  accessToken: string;
  refreshToken?: string | null;
  expiresInSec?: number;
  tokenType?: string;
  scope?: string;
};

export type ConnectionContext = {
  firmId: string;
};
