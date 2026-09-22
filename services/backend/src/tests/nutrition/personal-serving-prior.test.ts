import assert from "node:assert/strict";
import test from "node:test";
import { buildPersonalServingPrior } from "../../nutrition/personalization/personalServingPrior.ts";

test("personal serving prior requires enough confirmed history", () => {
  assert.equal(buildPersonalServingPrior([{ grams: 100, confirmedAt: "2026-08-01T00:00:00Z" }]), null);
});

test("personal serving prior uses robust median and percentile range", () => {
  const observations = [100, 105, 110, 115, 120, 1000].map((grams, i) => ({ grams, confirmedAt: `2026-08-0${i + 1}T00:00:00Z` }));
  const prior = buildPersonalServingPrior(observations, 5);
  assert.ok(prior);
  assert.equal(prior?.sampleCount, 6);
  assert.ok((prior?.medianGrams ?? 0) < 200, "outlier must not dominate median");
  assert.ok((prior?.maximumGrams ?? 0) < 1000, "p90 should be more robust than max");
});
