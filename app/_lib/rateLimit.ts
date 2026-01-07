type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type TokenBucketEntry = {
  tokens: number;
  lastRefill: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const tokenBucketStore = new Map<string, TokenBucketEntry>();

export function getVerifyRateLimitConfig() {
  const limit = Number.parseInt(process.env.VERIFY_RATE_LIMIT ?? "5", 10);
  const windowSeconds = Number.parseInt(
    process.env.VERIFY_RATE_WINDOW_SECONDS ?? "60",
    10
  );

  return {
    limit: Number.isFinite(limit) ? limit : 5,
    windowMs: (Number.isFinite(windowSeconds) ? windowSeconds : 60) * 1000,
  };
}

export function getHelpdeskRateLimitConfig() {
  const limit = Number.parseInt(process.env.HELPDESK_RATE_LIMIT ?? "10", 10);
  const windowSeconds = Number.parseInt(
    process.env.HELPDESK_RATE_WINDOW_SECONDS ?? "60",
    10
  );

  return {
    limit: Number.isFinite(limit) ? limit : 10,
    windowMs: (Number.isFinite(windowSeconds) ? windowSeconds : 60) * 1000,
  };
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    const nextEntry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, nextEntry);
    return {
      allowed: true,
      remaining: Math.max(limit - nextEntry.count, 0),
      resetAt: nextEntry.resetAt,
    };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(limit - entry.count, 0),
    resetAt: entry.resetAt,
  };
}

export function checkTokenBucket(
  key: string,
  capacity: number,
  windowMs: number
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const safeCapacity = Math.max(1, capacity);
  const safeWindowMs = Math.max(1000, windowMs);
  const refillRate = safeCapacity / safeWindowMs;
  const now = Date.now();

  const entry = tokenBucketStore.get(key) ?? {
    tokens: safeCapacity,
    lastRefill: now,
  };

  const elapsed = now - entry.lastRefill;
  const refilled = Math.min(safeCapacity, entry.tokens + elapsed * refillRate);
  const allowed = refilled >= 1;
  const remaining = allowed ? refilled - 1 : refilled;

  tokenBucketStore.set(key, {
    tokens: remaining,
    lastRefill: now,
  });

  const resetAt = now + Math.ceil((safeCapacity - remaining) / refillRate);

  return {
    allowed,
    remaining: Math.max(Math.floor(remaining), 0),
    resetAt,
  };
}
