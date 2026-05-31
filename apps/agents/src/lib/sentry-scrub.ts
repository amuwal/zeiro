import type { ErrorEvent, EventHint, Log } from '@sentry/node';
import { redactPII, scrubPIIDeep } from '@zeiro/core';

// Parity with apps/web/lib/sentry-scrub.ts: scrub message, exception values,
// breadcrumb messages + breadcrumb.data (deep, type-agnostic), and the request
// body before any event leaves the agents service. 守秘義務 (税理士法 §38) —
// client email content, names, My Number must never reach Sentry.
export function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.message) event.message = redactPII(event.message);

  event.exception?.values?.forEach((ex) => {
    if (ex.value) ex.value = redactPII(ex.value);
  });

  event.breadcrumbs?.forEach((b) => {
    if (b.message) b.message = redactPII(b.message);
    if (b.data && typeof b.data === 'object') {
      b.data = scrubPIIDeep(b.data) as typeof b.data;
    }
  });

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

// Sentry Logs (enableLogs) bypass beforeSend; their hook is beforeSendLog. The
// pino sink already scrubs before forwarding — this is the redundant second
// layer that brings the Logs egress to parity with the error egress (§38).
export function scrubLog(log: Log): Log {
  if (log.message) log.message = redactPII(log.message);
  if (log.attributes) {
    log.attributes = scrubPIIDeep(log.attributes) as Record<string, unknown>;
  }
  return log;
}
