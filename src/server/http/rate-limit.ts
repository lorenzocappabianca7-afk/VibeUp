import { NextResponse, type NextRequest } from "next/server";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

type RateLimitGlobal = typeof globalThis & {
  __vibeUpRateLimitBuckets?: Map<string, RateLimitBucket>;
};

const globalForRateLimit = globalThis as RateLimitGlobal;
const MAX_BUCKETS = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;

let lastCleanupAt = 0;

function getBuckets(): Map<string, RateLimitBucket> {
  if (!globalForRateLimit.__vibeUpRateLimitBuckets) {
    globalForRateLimit.__vibeUpRateLimitBuckets = new Map();
  }

  return globalForRateLimit.__vibeUpRateLimitBuckets;
}

function cleanupBuckets(buckets: Map<string, RateLimitBucket>, now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS && buckets.size < MAX_BUCKETS) {
    return;
  }

  lastCleanupAt = now;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now || buckets.size > MAX_BUCKETS) {
      buckets.delete(key);
    }
  }
}

function getClientKey(request: NextRequest, scope: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  return `${scope}:${ip}`;
}

export function rateLimit(
  request: NextRequest,
  options: { scope: string; limit: number; windowMs: number },
): NextResponse | null {
  const now = Date.now();
  const buckets = getBuckets();
  cleanupBuckets(buckets, now);

  const key = getClientKey(request, options.scope);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (bucket.count >= options.limit) {
    return NextResponse.json(
      {
        error: "Troppe richieste. Riprova tra qualche istante.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)),
        },
      },
    );
  }

  bucket.count += 1;
  return null;
}
