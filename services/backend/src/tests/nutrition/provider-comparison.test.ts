import assert from "node:assert/strict";
import test from "node:test";
import {
  ProviderComparisonHarness,
  buildSampleInputView,
  ProviderComparisonError,
} from "../../nutrition/validation/providerComparison.ts";
import { BenchmarkEvaluator } from "../../nutrition/benchmark/benchmarkEvaluator.ts";
import { mockDescriptor } from "../../nutrition/validation/providerRegistry.ts";
import type { BenchmarkSample, ProviderRunner, SampleInputView } from "../../nutrition/benchmark/benchmarkContracts.ts";
import type { MetricResult } from "../../nutrition/benchmark/benchmarkMetrics.ts";

function value(result: MetricResult): number {
  assert.equal(result.measurable, true, (result as { reason?: string }).reason ?? "expected a measurable metric");
  return (result as { value: number }).value;
}

function makeSample(sampleId: string, overrides: Partial<BenchmarkSample> = {}): BenchmarkSample {
  return {
    sampleId,
    mealId: `meal-${sampleId}`,
    region: "NPL",
    category: "MIXED",
    foodNames: ["Dal Bhat"],
    images: { front: `ref://${sampleId}/front.jpg`, widthPx: 1920, heightPx: 1080 },
    reviewStatus: "REVIEWED",
    privacyConsent: "CONSENTED",
    portionServedWeightG: 400,
    groundTruthRegions: [{ regionId: "gt-1", bbox: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 }, foodNames: ["Dal Bhat"] }],
    groundTruthSource: { fdcId: 1102047 },
    groundTruthNutrients: { energyKcal: 400, proteinG: 16 },
    ...overrides,
  };
}

function makeRunner(providerId: string, overrides: Partial<ProviderRunner> = {}): ProviderRunner {
  return {
    providerId,
    providerVersion: "1.0.0",
    costPerImageUsd: 0.01,
    run: async (input: SampleInputView) => ({
      providerId,
      sampleId: input.sampleId,
      candidates: [{ name: "Dal Bhat", confidence: 0.9 }],
      regions: [{ bbox: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 }, confidence: 0.9 }],
      source: { fdcId: 1102047 },
    }),
    normalize: (rawOutput: unknown) => {
      const output = rawOutput as { candidates?: { name: string }[]; regions?: { bbox: unknown }[]; source?: { fdcId: number } };
      return {
        candidates: output.candidates?.map((candidate) => ({ name: candidate.name, confidence: 0.9 })) ?? [],
        regions: output.regions?.map((region) => ({ bbox: region.bbox as { x: number; y: number; width: number; height: number }, confidence: 0.9 })) ?? [],
        selectedSource: output.source ? { fdcId: output.source.fdcId } : null,
      };
    },
    ...overrides,
  };
}

test("buildSampleInputView strips ground truth from provider input", () => {
  const sample = makeSample("s1");
  const input = buildSampleInputView(sample);
  const serialized = JSON.stringify(input);
  assert.equal(serialized.includes("groundTruth"), false);
  assert.equal(serialized.includes("foodNames"), false);
  assert.equal(serialized.includes("portionServedWeightG"), false);
  assert.equal(serialized.includes("1102047"), false);
  assert.equal(input.sampleId, "s1");
});

test("identical sample set is enforced across providers", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1"), makeSample("s2")];
  const run = await harness.run(samples, [makeRunner("a"), makeRunner("b")]);
  harness.assertIdenticalSampleSet(run, samples.map((sample) => sample.sampleId));

  const fabricated = {
    ...run,
    runs: [...run.runs, { ...run.runs[0]!, sampleId: "s3" }],
  };
  assert.throws(
    () => harness.assertIdenticalSampleSet(fabricated, samples.map((sample) => sample.sampleId)),
    (error: unknown) => error instanceof ProviderComparisonError && error.code === "mismatched_sample_set",
  );
});

test("no cross-provider output leakage", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1")];
  const seen = new Map<string, SampleInputView>();
  const runnerA = makeRunner("a", {
    run: async (input: SampleInputView) => {
      seen.set(`a:${input.sampleId}`, input);
      return { name: "a-output" };
    },
  });
  const runnerB = makeRunner("b", {
    run: async (input: SampleInputView) => {
      seen.set(`b:${input.sampleId}`, input);
      return { name: "b-output" };
    },
  });
  const run = await harness.run(samples, [runnerA, runnerB]);
  harness.assertNoCrossProviderLeakage(run, seen);
  assert.ok(seen.has("a:s1"));
  assert.ok(seen.has("b:s1"));
});

test("deterministic benchmark replay", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1"), makeSample("s2")];
  const first = await harness.run(samples, [makeRunner("a"), makeRunner("b")], { replayKey: "replay-1", seed: 7 });
  const second = await harness.run(samples, [makeRunner("a"), makeRunner("b")], { replayKey: "replay-1", seed: 7 });
  assert.equal(first.replayKey, second.replayKey);
  harness.assertDeterministicReplay(first, second);
});

test("malformed provider output is recorded and scored", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1"), makeSample("s2")];
  const malformedRunner = makeRunner("bad", {
    run: async () => ({ unexpected: "shape" }),
    validateOutput: (rawOutput: unknown) => ((rawOutput as { unexpected?: string }).unexpected === "shape" ? ["missing_candidates"] : []),
    normalize: () => null,
  });
  const run = await harness.run(samples, [malformedRunner]);
  assert.equal(run.runs.every((providerRun) => providerRun.status === "MALFORMED"), true);
  const result = new BenchmarkEvaluator().evaluate(samples, run.runs, [], [mockDescriptor("bad", "Bad", "COMBINED")]);
  assert.equal(value(result.providerMetrics[0]!.operational.malformedResponseRate), 1);
  assert.equal(value(result.providerMetrics[0]!.operational.schemaValidOutputRate), 0);
});

test("failed provider call is recorded and scored", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1"), makeSample("s2")];
  const failingRunner = makeRunner("down", {
    run: async () => {
      throw new Error("provider unavailable");
    },
  });
  const run = await harness.run(samples, [failingRunner], { maxAttempts: 1 });
  assert.equal(run.runs.every((providerRun) => providerRun.status === "FAILED"), true);
  assert.equal(run.runs.every((providerRun) => providerRun.attempts === 1), true);
  const result = new BenchmarkEvaluator().evaluate(samples, run.runs, [], [mockDescriptor("down", "Down", "COMBINED")]);
  assert.equal(value(result.providerMetrics[0]!.operational.providerFailureRate), 1);
});

test("latency and cost aggregation", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1"), makeSample("s2")];
  const run = await harness.run(samples, [makeRunner("a", { costPerImageUsd: 0.02 })]);
  const result = new BenchmarkEvaluator().evaluate(samples, run.runs, [], [mockDescriptor("a", "A", "COMBINED")]);
  assert.ok(value(result.providerMetrics[0]!.operational.latencyMedianMs) >= 0);
  assert.equal(value(result.providerMetrics[0]!.operational.costPerImageUsd), 0.02);
  const withConfirmed = new BenchmarkEvaluator().evaluate(samples, run.runs, [], [mockDescriptor("a", "A", "COMBINED")], { confirmedMealCount: 2 });
  assert.equal(value(withConfirmed.providerMetrics[0]!.operational.costPerConfirmedMealUsd), 0.02);
});

test("sample exclusion removes excluded samples from metrics", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [
    makeSample("s1"),
    makeSample("s2", { reviewStatus: "EXCLUDED" }),
    makeSample("s3", { privacyConsent: "DECLINED" }),
  ];
  const run = await harness.run(samples, [makeRunner("a")]);
  const result = new BenchmarkEvaluator().evaluate(samples, run.runs, [], [mockDescriptor("a", "A", "COMBINED")]);
  assert.deepEqual([...result.excludedSampleIds].sort(), ["s2", "s3"]);
  // Identity top-1 is aggregated over the one included sample only.
  assert.equal(value(result.providerMetrics[0]!.identity.top1), 1);
});

test("missing ground truth reports NOT_MEASURABLE, not zero", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1", { groundTruthNutrients: undefined })];
  const run = await harness.run(samples, [makeRunner("a")]);
  const result = new BenchmarkEvaluator().evaluate(samples, run.runs, [], [mockDescriptor("a", "A", "COMBINED")]);
  assert.equal(result.providerMetrics[0]!.nutrition.energyKcal.absoluteError.measurable, false);
  assert.equal(result.providerMetrics[0]!.portion.gramMae.measurable, false);
});

test("portion interval metrics from pipeline predictions", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1")];
  const run = await harness.run(samples, [makeRunner("a")]);
  const pipelinePredictions = [{ sampleId: "s1", portionInterval: { minimumGrams: 390, maximumGrams: 410 } }];
  const result = new BenchmarkEvaluator().evaluate(samples, run.runs, pipelinePredictions, [mockDescriptor("a", "A", "COMBINED")]);
  const portion = result.providerMetrics[0]!.portion;
  assert.equal(value(result.providerMetrics[0]!.portion.gramMae), 0);
  assert.equal(value(result.providerMetrics[0]!.portion.intervalCoverage), 1);
});

test("nutrition metrics are NOT_MEASURABLE when predictions carry no nutrients", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1")];
  const run = await harness.run(samples, [makeRunner("a")]);
  const result = new BenchmarkEvaluator().evaluate(samples, run.runs, [], [mockDescriptor("a", "A", "COMBINED")]);
  assert.equal(result.providerMetrics[0]!.nutrition.energyKcal.percentageError.measurable, false);
});

test("result serializes and round-trips through JSON", async () => {
  const harness = new ProviderComparisonHarness();
  const samples = [makeSample("s1")];
  const run = await harness.run(samples, [makeRunner("a")]);
  const result = new BenchmarkEvaluator().evaluate(samples, run.runs, [], [mockDescriptor("a", "A", "COMBINED")], { replayKey: run.replayKey });
  const roundTrip = JSON.parse(JSON.stringify(result)) as typeof result;
  assert.equal(roundTrip.schemaVersion, 1);
  assert.equal(roundTrip.comparison.sameSampleSetForAllProviders, true);
  assert.equal(roundTrip.comparison.noCrossProviderLeakage, true);
  assert.equal(roundTrip.comparison.replayKey, run.replayKey);
  assert.equal(roundTrip.providerMetrics.length, 1);
  assert.equal(roundTrip.providerMetrics[0]!.providerId, "a");
});
