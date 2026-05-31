import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentry-scrub';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    initialScope: { tags: { service: 'web' } },
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}
