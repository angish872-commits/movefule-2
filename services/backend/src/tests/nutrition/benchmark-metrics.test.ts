import assert from "node:assert/strict";
import test from "node:test";
import {
  iou,
  regionPrecision,
  regionRecall,
  missedFoodRate,
  duplicateRegionRate,
  top1Accuracy,
  top3Accuracy,
  unknownFoodHandling,
  foodTypeAccuracy,
  meanAbsoluteError,
  medianAbsoluteError,
  meanAbsolutePercentageError,
  centralBias,
  intervalCoverage,
  notMeasurable,
  metric,
} from "../../nutrition/benchmark/benchmarkMetrics.ts";
import type { MetricResult } from "../../nutrition/benchmark/benchmarkMetrics.ts";

function value(result: MetricResult): number {
  assert.equal(result.measurable, true, (result as { reason?: string }).reason ?? "expected a measurable metric");
  return (result as { value: number }).value;
}

test("IoU computes exact overlap as 1 and disjoint boxes as 0", () => {
  assert.equal(iou({ x: 0, y: 0, width: 1, height: 1 }, { x: 0, y: 0, width: 1, height: 1 }), 1);
  assert.equal(iou({ x: 0, y: 0, width: 1, height: 1 }, { x: 2, y: 2, width: 1, height: 1 }), 0);
  assert.ok(iou({ x: 0, y: 0, width: 1, height: 1 }, { x: 0.5, y: 0, width: 1, height: 1 }) > 0.33);
  assert.ok(iou({ x: 0, y: 0, width: 1, height: 1 }, { x: 0.5, y: 0, width: 1, height: 1 }) < 0.34);
});

test("region precision, recall, missed and duplicate rates", () => {
  const predicted = [
    { x: 0, y: 0, width: 0.4, height: 0.4 },
    { x: 0.5, y: 0, width: 0.4, height: 0.4 },
    { x: 0, y: 0, width: 0.4, height: 0.4 }, // duplicate of the first box
  ];
  const groundTruth = [
    { x: 0, y: 0, width: 0.4, height: 0.4 },
    { x: 0.5, y: 0, width: 0.4, height: 0.4 },
  ];
  assert.equal(value(regionPrecision(predicted, groundTruth)), 2 / 3);
  assert.equal(value(regionRecall(predicted, groundTruth)), 1);
  assert.equal(value(missedFoodRate(predicted, groundTruth)), 0);
  assert.ok(value(duplicateRegionRate(predicted, groundTruth)) > 0);
});

test("region metrics are NOT_MEASURABLE without ground-truth regions", () => {
  assert.equal(regionRecall([], []).measurable, false);
  assert.equal(missedFoodRate([{ x: 0, y: 0, width: 0.5, height: 0.5 }], []).measurable, false);
  assert.equal(regionPrecision([], [{ x: 0, y: 0, width: 0.5, height: 0.5 }]).measurable, false);
});

test("top-1 and top-3 accuracy", () => {
  const groundTruth = { foodNames: ["Steamed Momo"] };
  const hit = [{ name: "Steamed Momo", confidence: 0.9 }, { name: "Dumpling", confidence: 0.05 }];
  assert.equal(value(top1Accuracy(hit, groundTruth)), 1);
  assert.equal(value(top3Accuracy(hit, groundTruth)), 1);
  const miss = [{ name: "Fried chicken", confidence: 0.9 }, { name: "Rice", confidence: 0.05 }, { name: "Banana", confidence: 0.01 }];
  assert.equal(value(top1Accuracy(miss, groundTruth)), 0);
  assert.equal(value(top3Accuracy(miss, groundTruth)), 0);
  const top3Hit = [{ name: "Wrong", confidence: 0.9 }, { name: "Steamed Momo", confidence: 0.1 }, { name: "Other", confidence: 0.01 }];
  assert.equal(value(top3Accuracy(top3Hit, groundTruth)), 1);
  assert.equal(value(top1Accuracy([], groundTruth)), 0);
  assert.equal(top1Accuracy(hit, { foodNames: [] }).measurable, false);
});

test("unknown-food handling rewards UNKNOWN for empty ground truth", () => {
  assert.equal(value(unknownFoodHandling([], true, { foodNames: [] })), 1);
  assert.equal(value(unknownFoodHandling([{ name: "Made up", confidence: 0.5 }], false, { foodNames: [] })), 0);
  assert.equal(value(unknownFoodHandling([], true, { foodNames: ["Rice"] })), 0);
  assert.equal(unknownFoodHandling([{ name: "Rice", confidence: 0.9 }], false, { foodNames: ["Rice"] }).measurable, false);
});

test("food-type classification accuracy", () => {
  const groundTruth: { foodNames: readonly string[]; foodType: "PREPARED" } = { foodNames: ["Dal"], foodType: "PREPARED" };
  assert.equal(value(foodTypeAccuracy([{ name: "Dal", foodType: "PREPARED" }], groundTruth)), 1);
  assert.equal(value(foodTypeAccuracy([{ name: "Dal", foodType: "BASIC" }], groundTruth)), 0);
  assert.equal(foodTypeAccuracy([{ name: "Dal" }], { foodNames: ["Dal"] }).measurable, false);
});

test("MAE and median absolute error", () => {
  assert.equal(value(meanAbsoluteError([200, 210], [200, 220])), 5);
  assert.equal(value(medianAbsoluteError([200, 210], [200, 220])), 5);
  assert.equal(meanAbsoluteError([], []).measurable, false);
});

test("MAPE drops invalid denominators and is NOT_MEASURABLE with none left", () => {
  assert.equal(value(meanAbsolutePercentageError([210], [200])), 0.05);
  assert.equal(value(meanAbsolutePercentageError([100, 0], [200, 0])), 0.5);
  assert.equal(meanAbsolutePercentageError([50], [0]).measurable, false);
  assert.equal(meanAbsolutePercentageError([50], []).measurable, false);
});

test("central bias sign and magnitude", () => {
  assert.equal(value(centralBias([210, 220], [200, 200])), 15);
  assert.equal(value(centralBias([190], [200])), -10);
});

test("interval coverage", () => {
  const intervals = [
    { minimum: 190, maximum: 210 },
    { minimum: 195, maximum: 205 },
  ];
  assert.equal(value(intervalCoverage(intervals, [200, 300])), 0.5);
  assert.equal(value(intervalCoverage(intervals, [200, 198])), 1);
  assert.equal(intervalCoverage([], []).measurable, false);
});

test("notMeasurable is distinct from a zero metric", () => {
  assert.equal(notMeasurable("missing ground truth").measurable, false);
  assert.equal(metric(0).measurable, true);
  assert.equal(value(metric(0)), 0);
});
