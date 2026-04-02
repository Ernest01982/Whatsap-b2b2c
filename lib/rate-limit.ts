const rateLimit = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimit.get(identifier);

  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimit.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: config.maxRequests - record.count, resetTime: record.resetTime };
}

export function getRateLimitHeaders(remaining: number, resetTime: number): Record<string, string> {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
  };
}

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimit.entries());
  entries.forEach(([key, value]) => {
    if (now > value.resetTime) {
      rateLimit.delete(key);
    }
  });
}, 60000);
