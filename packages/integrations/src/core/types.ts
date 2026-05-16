export type AdapterConfig = {
  provider: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint?: string;
  scope: string;
  usesPkce: boolean;
  refreshSafetyWindowSec: number;
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
