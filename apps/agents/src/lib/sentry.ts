import * as Sentry from '@sentry/node';
import { registerSentryLogBridge } from './sentry-log-bridge';
import { scrubEvent, scrubLog } from './sentry-scrub';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    ...(process.env.NODE_ENV ? { environment: process.env.NODE_ENV } : {}),
    initialScope: { tags: { service: 'agents' } },
    // Per-request tag isolation (requestId/firmId set on getIsolationScope())
    // depends on httpIntegration forking a fresh isolation scope per request.
    // Do NOT pass defaultIntegrations:[] or disable httpIntegration — that
    // collapses every request onto the global scope and bleeds firmId across
    // tenants.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
    sendDefaultPii: false,
    enableLogs: true,
    beforeSend: scrubEvent,
    // Logs (enableLogs) bypass beforeSend — beforeSendLog is their scrub hook.
    beforeSendLog: scrubLog,
  });
  registerSentryLogBridge();
}
