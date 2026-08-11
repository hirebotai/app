type KeyedTimestamps = Map<string, number[]>;

class RateLimiter {
  private hits: KeyedTimestamps = new Map();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  /** Returns true if the request is allowed, false if the limit was exceeded. */
  check(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= this.limit) {
      this.hits.set(key, timestamps);
      return false;
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return true;
  }

  /** Drops expired entries to keep memory bounded. */
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of Array.from(this.hits.entries())) {
      const fresh = timestamps.filter((t: number) => t > now - this.windowMs);
      if (fresh.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, fresh);
      }
    }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** 5 attempts per minute per IP + email (brute-force protection). */
export const loginLimiter = new RateLimiter(5, 60_000);

/** 10 mutating requests per minute per IP (admin feedback triage, contact form). */
export const writeLimiter = new RateLimiter(10, 60_000);

/** 300 requests per minute per IP (license activation and telemetry from the desktop app). */
export const publicLimiter = new RateLimiter(300, 60_000);
