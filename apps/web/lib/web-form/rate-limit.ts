const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 10;
const MAX_ENTRIES = 50_000;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; resetIn: number };

export function rateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    if (buckets.size > MAX_ENTRIES) gc(now);
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1 };
  }

  if (bucket.count >= LIMIT) {
    return { allowed: false, resetIn: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, remaining: LIMIT - bucket.count };
}

function gc(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}
