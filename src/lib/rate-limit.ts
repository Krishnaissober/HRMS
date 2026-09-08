export interface RateLimiter {
  check(key: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit = 60,
    private readonly windowMs = 60_000,
  ) {}

  async check(key: string) {
    const now = Date.now();
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true };
    }
    if (current.count >= this.limit)
      return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
    current.count += 1;
    return { allowed: true };
  }
}
