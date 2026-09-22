import test from "node:test";
import assert from "node:assert/strict";
import { AnalysisRateLimitError, MealAnalysisRateLimiter } from "../../meal/analysis-rate-limit.ts";

test("AI meal limiter enforces concurrency and releases slots", () => {
  const limiter = new MealAnalysisRateLimiter({ perMinute: 10, perHour: 10, maxConcurrent: 1, now: () => 1_000 });
  const release = limiter.enter("user-a");
  assert.throws(() => limiter.enter("user-a"), (error: unknown) => error instanceof AnalysisRateLimitError && error.code === "rate_limited");
  release();
  const secondRelease = limiter.enter("user-a");
  secondRelease();
});

test("AI meal limiter isolates users and enforces rolling request windows", () => {
  let now = 1_000;
  const limiter = new MealAnalysisRateLimiter({ perMinute: 2, perHour: 3, maxConcurrent: 2, now: () => now });
  limiter.enter("user-a")();
  limiter.enter("user-a")();
  assert.throws(() => limiter.enter("user-a"), AnalysisRateLimitError);
  limiter.enter("user-b")();
  now += 61_000;
  limiter.enter("user-a")();
  now += 61_000;
  assert.throws(() => limiter.enter("user-a"), AnalysisRateLimitError);
});
