/**
 * Robust personal serving prior derived only from user-confirmed portions.
 * This is a behavioral prior, never a physical measurement and never allowed
 * to outrank manual/package/calibrated physical evidence.
 */

export type ConfirmedServingObservation = {
  grams: number;
  confirmedAt: string;
};

export type PersonalServingPrior = {
  sampleCount: number;
  medianGrams: number;
  minimumGrams: number;
  maximumGrams: number;
  madGrams: number;
  lastConfirmedAt: string;
};

function quantile(sorted: readonly number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, p * (sorted.length - 1)));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export function buildPersonalServingPrior(
  observations: readonly ConfirmedServingObservation[],
  minimumSamples = 5,
): PersonalServingPrior | null {
  const valid = observations
    .filter((observation) => Number.isFinite(observation.grams) && observation.grams > 0 && !Number.isNaN(Date.parse(observation.confirmedAt)))
    .sort((a, b) => a.grams - b.grams);
  if (valid.length < minimumSamples) return null;
  const grams = valid.map((entry) => entry.grams);
  const median = quantile(grams, 0.5);
  const deviations = grams.map((value) => Math.abs(value - median)).sort((a, b) => a - b);
  return {
    sampleCount: grams.length,
    medianGrams: median,
    minimumGrams: quantile(grams, 0.1),
    maximumGrams: quantile(grams, 0.9),
    madGrams: quantile(deviations, 0.5),
    lastConfirmedAt: valid.map((entry) => entry.confirmedAt).sort().at(-1)!,
  };
}
