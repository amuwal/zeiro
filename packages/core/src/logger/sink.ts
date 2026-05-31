export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogSinkRecord = {
  level: LogLevel;
  message: string;
  // Already key-dropped + (warn/error) PII-scrubbed before it reaches here.
  attributes: Record<string, unknown>;
};

export type LogSink = (record: LogSinkRecord) => void;

let sink: LogSink | null = null;

// The logger lives in @zeiro/core (edge-importable shape, Node-only subpath) and
// MUST NOT depend on Sentry. A Node app (web server / agents) registers a sink
// during its Sentry init so warn/error logs also land in Sentry Logs, tagged
// with requestId/firmId. No sink registered = pino-only (dev, tests, edge never
// reaches here because the subpath is Node-only).
export function setLogSink(next: LogSink | null): void {
  sink = next;
}

export function emitToSink(record: LogSinkRecord): void {
  if (!sink) return;
  try {
    sink(record);
  } catch {
    // A failing telemetry sink must never break the request path.
  }
}
