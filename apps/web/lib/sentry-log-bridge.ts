import * as Sentry from '@sentry/nextjs';
import { type LogSinkRecord, setLogSink } from '@zeiro/core/logger';

// Forwards warn/error pino logs into Sentry Logs (enableLogs). The pino logger
// already dropped sensitive keys and PII-scrubbed the message + attributes
// before calling the sink, so nothing here re-introduces client content. Each
// record carries requestId/firmId/userId from the correlated child logger, so a
// Sentry log line is searchable by the same id threaded across services.
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
