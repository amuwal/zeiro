import type { Logger as PinoLogger } from 'pino';
import { pino } from 'pino';
import { DROP_PATHS, dropSensitiveArgs, scrubArgsAboveWarn, scrubForSink } from './redact';
import { emitToSink, type LogLevel } from './sink';

export type { LogLevel, LogSink, LogSinkRecord } from './sink';
export { setLogSink } from './sink';

export type RequestBindings = {
  requestId: string;
  firmId?: string;
  userId?: string;
};

export type Logger = PinoLogger;

const WARN_LEVEL = 40;
const LEVEL_LABELS: Record<number, LogLevel> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

// pino's first log arg is either a merging object or the message string. Pull a
// `{ message, attributes }` pair out of the (already scrubbed) args for the
// optional Sentry sink — without re-running any redaction.
function toSinkRecord(args: unknown[]): {
  message: string;
  attributes: Record<string, unknown>;
} {
  const [first, second] = args;
  if (typeof first === 'string') {
    return { message: first, attributes: {} };
  }
  if (first !== null && typeof first === 'object') {
    return {
      message: typeof second === 'string' ? second : '',
      attributes: first as Record<string, unknown>,
    };
  }
  return { message: '', attributes: {} };
}

// pino merges child `bindings` (requestId/firmId/userId) only at its own
// serialization step, so they are absent from the hook's `inputArgs`. To put
// the same correlation ids on the Sentry sink record, we track each child's
// bindings against the logger instance the hook runs as `this`.
const childBindings = new WeakMap<object, RequestBindings>();

const base: Logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  // Drop sensitive KEYS from every line (cheap). Heavy recursive PII scrub of
  // free text runs ONLY at warn+ via the hook below.
  redact: { paths: DROP_PATHS, remove: true },
  formatters: {
    level: (label) => ({ level: label }),
  },
  hooks: {
    logMethod(inputArgs, method, level) {
      // Key-drop at EVERY level + depth first (pino's path globs only reach one
      // nesting level), THEN the warn+ free-text PII pass.
      const args = scrubArgsAboveWarn(dropSensitiveArgs(inputArgs as unknown[]), level);
      if (level >= WARN_LEVEL) {
        const { message, attributes } = toSinkRecord(args);
        const bindings = childBindings.get(this as object) ?? {};
        emitToSink({
          level: LEVEL_LABELS[level] ?? 'error',
          message,
          // Child correlation ids (requestId/firmId/userId) live on the logger,
          // not in `args` — merge them so the sink record is searchable by the
          // same id as the stdout line. Scrub both together.
          attributes: scrubForSink({ ...bindings, ...attributes }),
        });
      }
      return method.apply(this, args as Parameters<typeof method>);
    },
  },
});

export const logger = base;

// One correlated child per inbound request. `requestId` threads web → Inngest →
// agents so a single failing user request is one searchable id end-to-end. The
// bindings are also recorded against the child instance so the Sentry sink can
// re-attach them (pino otherwise merges them only into its own stdout line).
export function child(bindings: RequestBindings): Logger {
  const c = base.child(bindings);
  childBindings.set(c, bindings);
  return c;
}
