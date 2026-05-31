import * as Sentry from '@sentry/node';
import { type LogSinkRecord, setLogSink } from '@zeiro/core/logger';

// Forwards warn/error pino logs into Sentry Logs (enableLogs). The pino logger
// already dropped sensitive keys and PII-scrubbed message + attributes before
// the sink fires, so no client content is re-introduced here. Records carry the
// requestId/firmId bound by the Hono request middleware, so an agents log line
// is searchable by the same id threaded from web.
export function registerSentryLogBridge(): void {
  setLogSink((record: LogSinkRecord) => {
    const attributes = record.attributes as Record<string, unknown>;
    if (record.level === 'fatal') {
      Sentry.logger.fatal(record.message, attributes);
    } else if (record.level === 'error') {
      Sentry.logger.error(record.message, attributes);
    } else {
      Sentry.logger.warn(record.message, attributes);
    }
  });
}
