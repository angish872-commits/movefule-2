/**
 * Versioned benchmark metrics (Phase 7).
 *
 * A metric is only computed when the required ground truth exists. When it
 * does not, the result is NOT_MEASURABLE, never zero. Zero is reserved for a
 * genuine measurement of zero. All denominators are guarded.
 */

import type { NormalizedBBox } from "../vision/segmentationAdapter.ts";
import type { FoodTypeKind } from "../algorithm/contracts.ts";
import { METRICS_VERSION } from "./benchmarkContracts.ts";

export type MetricResult =
  | { measurable: true; value: number }
  | { measurable: false; reason: string };

export const notMeasurable = (reason: string): MetricResult => ({ measurable: false, reason });

export const metric = (value: number): MetricResult => ({ measurable: true, value });

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/** 0 < percentile <= 100; linear interpolation between closest ranks. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  if (p <= 0) return Math.min(...values);
  if (p >= 100) return Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const rank = ((values.length - 1) * p) / 100;
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower]!;
  const fraction = rank - lower;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * fraction;
}

/** IoU over axis-aligned boxes in a shared coordinate space. */
export function iou(a: NormalizedBBox, b: NormalizedBBox): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const interWidth = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const interHeight = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const intersection = interWidth * interHeight;
  const union = a.width * a.height + b.width * b.height - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

/** Greedy box matching at a minimum IoU. Returns predicted index -> matched ground-truth index. */
export function matchBoxes(
  predicted: readonly NormalizedBBox[],
  groundTruth: readonly NormalizedBBox[],
  minIoU: number,
): Map<number, number> {
  const matches = new Map<number, number>();
  const usedGroundTruth = new Set<number>();
  for (let predIndex = 0; predIndex < predicted.length; predIndex += 1) {
    let bestIndex = -1;
    let bestIoU = minIoU;
    for (let gtIndex = 0; gtIndex < groundTruth.length; gtIndex += 1) {
      if (usedGroundTruth.has(gtIndex)) continue;
      const overlap = iou(predicted[predIndex]!, groundTruth[gtIndex]!);
      if (overlap >= bestIoU) {
        bestIoU = overlap;
        bestIndex = gtIndex;
      }
    }
    if (bestIndex >= 0) {
      matches.set(predIndex, bestIndex);
      usedGroundTruth.add(bestIndex);
    }
  }
  return matches;
}

/** Region precision: matched predicted regions / predicted regions. */
export function regionPrecision(
  predicted: readonly NormalizedBBox[],
  groundTruth: readonly NormalizedBBox[],
  minIoU = 0.5,
): MetricResult {
  if (predicted.length === 0) return notMeasurable("no predicted regions to score");
  const matches = matchBoxes(predicted, groundTruth, minIoU);
  return metric(matches.size / predicted.length);
}

/** Region recall: matched ground-truth regions / ground-truth regions. */
export function regionRecall(
  predicted: readonly NormalizedBBox[],
  groundTruth: readonly NormalizedBBox[],
  minIoU = 0.5,
): MetricResult {
  if (groundTruth.length === 0) return notMeasurable("no ground-truth regions to score");
  const matches = matchBoxes(predicted, groundTruth, minIoU);
  return metric(matches.size / groundTruth.length);
}

/** Missed-food rate: unmatched ground-truth regions / ground-truth regions. */
export function missedFoodRate(
  predicted: readonly NormalizedBBox[],
  groundTruth: readonly NormalizedBBox[],
  minIoU = 0.5,
): MetricResult {
  if (groundTruth.length === 0) return notMeasurable("no ground-truth regions to score");
  const matches = matchBoxes(predicted, groundTruth, minIoU);
  return metric((groundTruth.length - matches.size) / groundTruth.length);
}

/**
 * Duplicate-region rate: predicted regions whose best ground-truth match is a
 * ground-truth region already matched by another predicted region, divided by
 * the number of predicted regions.
 */
export function duplicateRegionRate(
  predicted: readonly NormalizedBBox[],
  groundTruth: readonly NormalizedBBox[],
  minIoU = 0.5,
): MetricResult {
  if (predicted.length === 0) return notMeasurable("no predicted regions to score");
  const bestGroundTruthByPredicted: number[] = [];
  for (const box of predicted) {
    let bestIndex = -1;
    let bestIoU = minIoU;
    for (let gtIndex = 0; gtIndex < groundTruth.length; gtIndex += 1) {
      const overlap = iou(box, groundTruth[gtIndex]!);
      if (overlap >= bestIoU) {
        bestIoU = overlap;
        bestIndex = gtIndex;
      }
    }
    bestGroundTruthByPredicted.push(bestIndex);
  }
  const counts = new Map<number, number>();
  for (const gtIndex of bestGroundTruthByPredicted) {
    if (gtIndex >= 0) counts.set(gtIndex, (counts.get(gtIndex) ?? 0) + 1);
  }
  const duplicates = [...counts.values()].reduce((sum, count) => sum + (count - 1), 0);
  return metric(duplicates / predicted.length);
}

const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");

export type GroundTruthIdentity = {
  foodNames: readonly string[];
  foodType?: FoodTypeKind | null;
};

export function top1Accuracy(
  predicted: readonly ProviderPredictionCandidateView[],
  groundTruth: GroundTruthIdentity,
): MetricResult {
  if (groundTruth.foodNames.length === 0) return notMeasurable("no ground-truth food names");
  if (predicted.length === 0) return metric(0);
  const names = new Set(groundTruth.foodNames.map(normalizeName));
  return metric(names.has(normalizeName(predicted[0]!.name)) ? 1 : 0);
}

export function top3Accuracy(
  predicted: readonly ProviderPredictionCandidateView[],
  groundTruth: GroundTruthIdentity,
): MetricResult {
  if (groundTruth.foodNames.length === 0) return notMeasurable("no ground-truth food names");
  if (predicted.length === 0) return metric(0);
  const names = new Set(groundTruth.foodNames.map(normalizeName));
  const hit = predicted.slice(0, 3).some((candidate) => names.has(normalizeName(candidate.name)));
  return metric(hit ? 1 : 0);
}

export type ProviderPredictionCandidateView = { name: string; foodType?: string | null; confidence?: number };

export function unknownFoodHandling(
  predicted: readonly ProviderPredictionCandidateView[],
  unknownReported: boolean,
  groundTruth: GroundTruthIdentity,
): MetricResult {
  const hasGroundTruthNames = groundTruth.foodNames.length > 0;
  if (hasGroundTruthNames && predicted.length === 0) return metric(0);
  if (!hasGroundTruthNames) {
    // True unknown food: reporting UNKNOWN (no candidates) is the correct call.
    return metric(unknownReported && predicted.length === 0 ? 1 : 0);
  }
  return notMeasurable("ground truth names present; unknown handling only applies to empty ground truth");
}

export function foodTypeAccuracy(
  predicted: readonly ProviderPredictionCandidateView[],
  groundTruth: GroundTruthIdentity,
): MetricResult {
  if (groundTruth.foodType === undefined || groundTruth.foodType === null) {
    return notMeasurable("no ground-truth food type");
  }
  if (predicted.length === 0) return metric(0);
  return metric(predicted[0]!.foodType === groundTruth.foodType ? 1 : 0);
}

/** Mean absolute error between predicted central values and ground truth. */
export function meanAbsoluteError(predicted: readonly number[], groundTruth: readonly number[]): MetricResult {
  if (predicted.length === 0 || groundTruth.length === 0) return notMeasurable("no paired values");
  return metric(mean(predicted.map((value, index) => Math.abs(value - groundTruth[index]!))));
}

export function medianAbsoluteError(predicted: readonly number[], groundTruth: readonly number[]): MetricResult {
  if (predicted.length === 0 || groundTruth.length === 0) return notMeasurable("no paired values");
  return metric(median(predicted.map((value, index) => Math.abs(value - groundTruth[index]!))));
}

/**
 * Mean absolute percentage error. Samples whose ground truth is not a valid
 * positive denominator are dropped; if none remain the metric is NOT_MEASURABLE.
 */
export function meanAbsolutePercentageError(predicted: readonly number[], groundTruth: readonly number[]): MetricResult {
  if (predicted.length === 0) return notMeasurable("no predicted values");
  const ratios: number[] = [];
  for (let index = 0; index < predicted.length; index += 1) {
    const actual = groundTruth[index];
    if (typeof actual === "number" && actual > 0) {
      ratios.push(Math.abs(predicted[index]! - actual) / actual);
    }
  }
  if (ratios.length === 0) return notMeasurable("no valid positive ground-truth denominators");
  return metric(mean(ratios));
}

/** Mean signed difference (central - ground truth); positive means over-estimation. */
export function centralBias(predicted: readonly number[], groundTruth: readonly number[]): MetricResult {
  if (predicted.length === 0 || groundTruth.length === 0) return notMeasurable("no paired values");
  return metric(mean(predicted.map((value, index) => value - groundTruth[index]!)));
}

/** Fraction of samples whose ground truth falls inside [minimum, maximum]. */
export function intervalCoverage(
  intervals: readonly { minimum: number; maximum: number }[],
  groundTruth: readonly number[],
): MetricResult {
  if (intervals.length === 0 || groundTruth.length === 0) return notMeasurable("no paired intervals");
  if (intervals.length !== groundTruth.length) return notMeasurable("interval/ground-truth count mismatch");
  const covered = intervals.filter((interval, index) => {
    const actual = groundTruth[index]!;
    return actual >= interval.minimum && actual <= interval.maximum;
  }).length;
  return metric(covered / intervals.length);
}
