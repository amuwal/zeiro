import * as Sentry from '@sentry/nextjs';
import { registerSentryLogBridge } from '@/lib/sentry-log-bridge';
import { scrubEvent, scrubLog } from '@/lib/sentry-scrub';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
    sendDefaultPii: false,
    enableLogs: true,
    beforeSend: scrubEvent,
    // Logs (enableLogs) bypass beforeSend — beforeSendLog is their scrub hook.
    beforeSendLog: scrubLog,
  });
  // Node runtime only — the pino logger + its Sentry sink import node:* and must
  // never load in the Edge / client configs.
  registerSentryLogBridge();
}
