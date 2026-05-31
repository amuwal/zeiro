import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { type Prisma, PrismaClient } from '@prisma/client';

let cached: PrismaClient | undefined;

// Prisma's `log: ['query']` echoes the FULL SQL — including bound parameters
// (client email bodies, names, My Number) — to stdout, which Cloud Run / Vercel
// ship to their log sinks. That is a §38 守秘義務 leak, so it is FORBIDDEN in
// production: query logging is only ever enabled in non-prod, and only when
// PRISMA_LOG_QUERY is explicitly set. `warn`/`error` (no parameter values) are
// always on.
function logLevels(): Prisma.LogLevel[] {
  const base: Prisma.LogLevel[] = ['warn', 'error'];
  if (process.env.NODE_ENV !== 'production' && process.env.PRISMA_LOG_QUERY === '1') {
    base.push('query');
  }
  return base;
}

export function getPrisma(): PrismaClient {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');

  const adapter = isNeon(url)
    ? new PrismaNeon({ connectionString: url })
    : new PrismaPg({ connectionString: url });
  cached = new PrismaClient({ adapter, log: logLevels() });
  return cached;
}

function isNeon(url: string): boolean {
  return url.includes('.neon.tech');
}

// Wakes a scale-to-zero Neon compute before a fragile consumer connects. Neon
// suspends after ~5min idle; Mastra's @mastra/pg TCP pool then throws
// "Authentication timed out" on the stale socket when it hits a still-resuming
// compute. This SELECT 1 goes through the resilient serverless adapter (which
// waits out the resume), so by the time it returns the compute is awake and the
// pg pool connects cleanly. Best-effort — callers swallow failures, since a real
// outage will surface on the actual query.
export async function pingDatabase(): Promise<void> {
  await getPrisma().$queryRaw`SELECT 1`;
}
