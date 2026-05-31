import { redactPIIDeep } from '../pii/mask';

// Keys whose VALUE is dropped (remove:true) from EVERY log line at the pino
// redact layer — cheap, allocation-free, runs on info too. 守秘義務 (税理士法
// §38): client email content, names, My Number, and auth secrets must never
// reach a log sink. `*.x` covers one level of nesting (the common
// `{ inquiry: { body } }` / `{ message: { subject } }` shapes); the bare key
// covers top-level fields.
export const DROP_PATHS = [
  // client content
  'body',
  '*.body',
  'subject',
  '*.subject',
  'sentBody',
  '*.sentBody',
  'email',
  '*.email',
  'myNumber',
  '*.myNumber',
  // client / company / person names — NOT regex-detectable, so drop the key
  // value outright (§38 lists names as never-log).
  'name',
  '*.name',
  'clientName',
  '*.clientName',
  'companyName',
  '*.companyName',
  'senderName',
  '*.senderName',
  'from',
  '*.from',
  'to',
  '*.to',
  'replyTo',
  '*.replyTo',
  // auth secrets
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
  'token',
  '*.token',
  'secret',
  '*.secret',
  'password',
  '*.password',
  '["x-zeiro-firm-token"]',
  '*["x-zeiro-firm-token"]',
];

const WARN_LEVEL = 40;

// Bare sensitive key names (without pino's wildcard/bracket path syntax). pino's
// `redact` config drops these inside ITS serializer — but a sink (Sentry Logs)
// reads the merging object BEFORE that runs, so the sink path must drop the same
// keys itself, recursively, before forwarding.
const SENSITIVE_KEYS = new Set([
  'body',
  'subject',
  'sentbody',
  'email',
  'mynumber',
  'name',
  'clientname',
  'companyname',
  'sendername',
  'from',
  'to',
  'replyto',
  'authorization',
  'cookie',
  'token',
  'secret',
  'password',
  'x-zeiro-firm-token',
]);

export function dropSensitiveKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropSensitiveKeysDeep);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !SENSITIVE_KEYS.has(k.toLowerCase()))
        .map(([k, v]) => [k, dropSensitiveKeysDeep(v)]),
    );
  }
  return value;
}

// `redactPIIDeep` walks objects via Object.entries, which would reduce an Error
// to `{}` (its message/stack are non-enumerable) — losing the very detail a
// warn/error log exists to capture. Normalise Error instances to a plain object
// FIRST so name/message/stack survive the recursive scrub (and get PII-masked
// like any other field).
function normalizeErrors(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(value.stack ? { stack: value.stack } : {}),
    };
  }
  if (Array.isArray(value)) return value.map(normalizeErrors);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeErrors(v)]),
    );
  }
  return value;
}

// pino's `redact` path globs (`*.body`) only reach ONE level of nesting and skip
// array-wrapped keys, so a `{ inquiry: { client: { body } } }` or
// `{ inquiries: [{ body }] }` shape would leak the raw value to stdout. Run the
// recursive key-drop on EVERY level (info included — this is cheap, allocation
// of dropped subtrees only) so the stdout path is as deep as the sink path and
// the two egresses stay symmetric.
export function dropSensitiveArgs(args: unknown[]): unknown[] {
  return args.map((arg) =>
    arg !== null && typeof arg === 'object' ? dropSensitiveKeysDeep(arg) : arg,
  );
}

// Heavy recursive PII scrub (My Number / email / phone / token patterns inside
// free text) — only worth running when a log is going to be kept and read by a
// human: warn / error / fatal. The per-line `redact` (+ `dropSensitiveArgs`)
// already dropped known sensitive KEYS; this catches PII that leaked into a
// message string or an unexpected field on the way to an error report. Returns
// the input unchanged below WARN so info-level throughput pays nothing.
export function scrubArgsAboveWarn(args: unknown[], level: number): unknown[] {
  if (level < WARN_LEVEL) return args;
  return args.map((arg) =>
    typeof arg === 'string' || (arg !== null && typeof arg === 'object')
      ? redactPIIDeep(normalizeErrors(arg))
      : arg,
  );
}

// Belt-and-braces scrub for the optional sink (Sentry Logs): drop sensitive keys
// AND run the free-text PII pass, since the sink bypasses pino's own `redact`.
export function scrubForSink(value: Record<string, unknown>): Record<string, unknown> {
  return dropSensitiveKeysDeep(redactPIIDeep(normalizeErrors(value))) as Record<string, unknown>;
}
