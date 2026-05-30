import { registerIntegrations } from '@zeiro/integrations';

// Agents need the data-integration adapters registered so the lookup-*-books
// tools can call `getAccessToken`. registerIntegrations tolerates empty creds:
// the read-only personal-token path doesn't need OAuth client id/secret (only
// token refresh does). When the web side does real OAuth, agents need the same
// creds in env so it can refresh expired tokens itself.
registerIntegrations({
  FREEE_CLIENT_ID: process.env.FREEE_CLIENT_ID,
  FREEE_CLIENT_SECRET: process.env.FREEE_CLIENT_SECRET,
  FREEE_REDIRECT_URI: process.env.FREEE_REDIRECT_URI,
});
