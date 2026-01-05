type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

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
