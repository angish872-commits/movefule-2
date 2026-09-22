export class AnalysisRateLimitError extends Error {
  public readonly code = "rate_limited" as const;
  public readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
    this.name = "AnalysisRateLimitError";
  }
}

type UserWindow = {
  minute: number[];
  hour: number[];
  inFlight: number;
};

/**
 * In-process guard for expensive AI analysis. It provides a hard per-user
 * concurrency ceiling plus minute/hour request windows. Distributed
 * production deployments should put a shared gateway limiter in front too;
 * this guard remains a fail-closed application-layer backstop.
 */
export class MealAnalysisRateLimiter {
  private readonly users = new Map<string, UserWindow>();
  private readonly perMinute: number;
  private readonly perHour: number;
  private readonly maxConcurrent: number;
  private readonly now: () => number;

  constructor(options: {
    perMinute?: number;
    perHour?: number;
    maxConcurrent?: number;
    now?: () => number;
  } = {}) {
    this.perMinute = Math.max(1, Math.trunc(options.perMinute ?? 6));
    this.perHour = Math.max(this.perMinute, Math.trunc(options.perHour ?? 60));
    this.maxConcurrent = Math.max(1, Math.trunc(options.maxConcurrent ?? 2));
    this.now = options.now ?? (() => Date.now());
  }

  enter(userId: string): () => void {
    const now = this.now();
    const state = this.users.get(userId) ?? { minute: [], hour: [], inFlight: 0 };
    state.minute = state.minute.filter((timestamp) => now - timestamp < 60_000);
    state.hour = state.hour.filter((timestamp) => now - timestamp < 3_600_000);

    if (state.inFlight >= this.maxConcurrent) {
      throw new AnalysisRateLimitError("Too many meal analyses are already running.", 2);
    }
    if (state.minute.length >= this.perMinute) {
      const retryAt = state.minute[0]! + 60_000;
      throw new AnalysisRateLimitError("Meal analysis rate limit reached.", (retryAt - now) / 1000);
    }
    if (state.hour.length >= this.perHour) {
      const retryAt = state.hour[0]! + 3_600_000;
      throw new AnalysisRateLimitError("Hourly meal analysis limit reached.", (retryAt - now) / 1000);
    }

    state.minute.push(now);
    state.hour.push(now);
    state.inFlight += 1;
    this.users.set(userId, state);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = this.users.get(userId);
      if (current) current.inFlight = Math.max(0, current.inFlight - 1);
    };
  }
}
