import type { ErrorEvent, EventHint, Log } from '@sentry/nextjs';
import { redactPII, scrubPIIDeep } from '@zeiro/core';

export function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.message) event.message = redactPII(event.message);

  event.exception?.values?.forEach((ex) => {
    if (ex.value) ex.value = redactPII(ex.value);
  });

  event.breadcrumbs?.forEach((b) => {
    if (b.message) b.message = redactPII(b.message);
    // Deep, type-agnostic: nested objects/arrays under breadcrumb.data were
    // skipped by the old string-only one-level walk (§38 surface).
    if (b.data && typeof b.data === 'object') {
      b.data = scrubPIIDeep(b.data) as typeof b.data;
    }
  });

  // request.data may be a parsed JSON object, not just a string — scrub it
  // regardless of type so an object body can't fall through unredacted.
  const request = event.request;
  if (request?.data != null) {
    request.data = scrubPIIDeep(request.data) as typeof request.data;
  }

  // Tag values are opaque ids by policy (requestId/firmId/userId/service), but
  // scrub them too so a future tag added without that discipline can't egress
  // PII as a searchable Issue tag (§38 defence-in-depth).
  if (event.tags) event.tags = scrubPIIDeep(event.tags) as typeof event.tags;

  return event;
}

// Sentry Logs (enableLogs) bypass beforeSend — they have their OWN hook,
// beforeSendLog. The pino sink already scrubs before forwarding, but this is the
// cheap redundant layer that makes the Logs egress two-layered like the error
// egress (§38 regulated surface). Mirror scrubEvent: PII-mask the message, deep
// key-drop + PII-mask the attributes.
export function scrubLog(log: Log): Log {
  if (log.message) log.message = redactPII(log.message);
  if (log.attributes) {
    log.attributes = scrubPIIDeep(log.attributes) as Record<string, unknown>;
  }
  return log;
}
