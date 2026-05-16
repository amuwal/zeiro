import { registerFreee } from '@zeiro/integrations';

// Agents need the freee adapter so the lookup-freee-books tool can call
// `getAccessToken`. Client ID / secret are only used when refreshing tokens —
// for slice 2's read-only personal-token path (no refresh) they're optional.
// When the web side does real OAuth, agents will need the same creds in env
// so it can refresh expired tokens itself.
registerFreee({
  clientId: process.env.FREEE_CLIENT_ID ?? '',
  clientSecret: process.env.FREEE_CLIENT_SECRET ?? '',
  redirectUri: process.env.FREEE_REDIRECT_URI ?? '',
});
