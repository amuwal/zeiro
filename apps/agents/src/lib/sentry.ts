import * as Sentry from '@sentry/node';
import { redactPII } from '@zeiro/core';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.message) event.message = redactPII(event.message);
      event.exception?.values?.forEach((ex) => {
        if (ex.value) ex.value = redactPII(ex.value);
      });
      event.breadcrumbs?.forEach((b) => {
        if (b.message) b.message = redactPII(b.message);
      });
      return event;
    },
  });
}
