import { registerFreee } from './providers/freee';

export type IntegrationEnv = {
  FREEE_CLIENT_ID?: string | undefined;
  FREEE_CLIENT_SECRET?: string | undefined;
  FREEE_REDIRECT_URI?: string | undefined;
  // MoneyForward (and future providers) read their creds here too.
};

// Single registration entry point for every OAuth data provider. Replaces the
// per-call-site `ensureFreeeRegistered` copies (two web routes + the agents
// bootstrap). Registration is idempotent (registerAdapter overwrites by id), and
// freee is registered even with empty creds so the agents' read-only
// personal-token path keeps working without OAuth credentials — refresh is the
// only operation that needs them, and the web routes guard creds separately
// before starting a flow.
export function registerIntegrations(env: IntegrationEnv): void {
  registerFreee({
    clientId: env.FREEE_CLIENT_ID ?? '',
    clientSecret: env.FREEE_CLIENT_SECRET ?? '',
    redirectUri: env.FREEE_REDIRECT_URI ?? '',
  });
}
