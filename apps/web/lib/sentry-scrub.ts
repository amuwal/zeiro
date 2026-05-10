import type { ErrorEvent, EventHint } from '@sentry/nextjs';
import { redactPII } from '@zeiro/core';

export function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.message) event.message = redactPII(event.message);

  event.exception?.values?.forEach((ex) => {
    if (ex.value) ex.value = redactPII(ex.value);
  });

  event.breadcrumbs?.forEach((b) => {
    if (b.message) b.message = redactPII(b.message);
    if (b.data && typeof b.data === 'object') {
      for (const [k, v] of Object.entries(b.data)) {
        if (typeof v === 'string') b.data[k] = redactPII(v);
      }
    }
  });

  if (event.request?.data && typeof event.request.data === 'string') {
    event.request.data = redactPII(event.request.data);
  }

  return event;
}
