/**
 * Held-out empirical interval calibration for portion mass estimates.
 *
 * Calibration profiles are learned from weighed meals and applied only to
 * estimates produced by the same evidence class / algorithm version. This is
 * deliberately separate from provider confidence. It does not manufacture
 * certainty when there are too few calibration samples.
 */

export const PORTION_CALIBRATION_VERSION = 1 as const;

export type CalibrationSample = {
  predictedCentralGrams: number;
  actualGrams: number;
};

export type PortionCalibrationProfile = {
  profileId: string;
  scopeKey: string;
  portionEstimatorVersion: string;
  targetCoverage: number;
  lowerMultiplier: number;
  upperMultiplier: number;
  medianMultiplier: number;
  sampleCount: number;
  benchmarkVersion: string;
  calibratedAt: string;
};

export function validatePortionCalibrationProfile(profile: PortionCalibrationProfile): string[] {
  const errors: string[] = [];
  if (!profile.profileId?.trim()) errors.push("blank_profile_id");
  if (!profile.scopeKey?.trim()) errors.push("blank_scope_key");
  if (!profile.portionEstimatorVersion?.trim()) errors.push("blank_portion_estimator_version");
  if (!(Number.isFinite(profile.targetCoverage) && profile.targetCoverage > 0.5 && profile.targetCoverage < 1)) errors.push("invalid_target_coverage");
  for (const [name, value] of [["lower", profile.lowerMultiplier], ["median", profile.medianMultiplier], ["upper", profile.upperMultiplier]] as const) {
    if (!(Number.isFinite(value) && value >= 0)) errors.push(`invalid_${name}_multiplier`);
  }
  if (!(profile.lowerMultiplier <= profile.medianMultiplier && profile.medianMultiplier <= profile.upperMultiplier)) errors.push("unordered_multipliers");
  if (!Number.isInteger(profile.sampleCount) || profile.sampleCount < 1) errors.push("invalid_sample_count");
  if (!profile.benchmarkVersion?.trim()) errors.push("blank_benchmark_version");
  if (Number.isNaN(Date.parse(profile.calibratedAt))) errors.push("invalid_calibrated_at");
  return errors;
}

export function normalizePortionCalibrationProfile(value: unknown): PortionCalibrationProfile | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const version = typeof row.portionEstimatorVersion === "string"
    ? row.portionEstimatorVersion
    : typeof row.algorithmVersion === "string"
      ? row.algorithmVersion
      : "";
  const profile: PortionCalibrationProfile = {
    profileId: typeof row.profileId === "string" ? row.profileId : "",
    scopeKey: typeof row.scopeKey === "string" ? row.scopeKey : "",
    portionEstimatorVersion: version,
    targetCoverage: Number(row.targetCoverage),
    lowerMultiplier: Number(row.lowerMultiplier),
    upperMultiplier: Number(row.upperMultiplier),
    medianMultiplier: Number(row.medianMultiplier),
    sampleCount: Number(row.sampleCount),
    benchmarkVersion: typeof row.benchmarkVersion === "string" ? row.benchmarkVersion : "",
    calibratedAt: typeof row.calibratedAt === "string" ? row.calibratedAt : "",
  };
  return validatePortionCalibrationProfile(profile).length === 0 ? profile : null;
}

function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new Error("quantile_requires_samples");
  const clamped = Math.min(1, Math.max(0, p));
  const index = clamped * (sorted.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo]!;
  const weight = index - lo;
  return sorted[lo]! * (1 - weight) + sorted[hi]! * weight;
}

export function fitEmpiricalCalibration(input: {
  profileId: string;
  scopeKey: string;
  portionEstimatorVersion: string;
  targetCoverage?: number;
  benchmarkVersion: string;
  samples: readonly CalibrationSample[];
  minimumSamples?: number;
  calibratedAt?: string;
}): PortionCalibrationProfile | null {
  const targetCoverage = input.targetCoverage ?? 0.9;
  const minimumSamples = input.minimumSamples ?? 30;
  if (!(targetCoverage > 0.5 && targetCoverage < 1)) throw new Error("invalid_target_coverage");
  const ratios = input.samples
    .filter((sample) => Number.isFinite(sample.predictedCentralGrams) && sample.predictedCentralGrams > 0 && Number.isFinite(sample.actualGrams) && sample.actualGrams >= 0)
    .map((sample) => sample.actualGrams / sample.predictedCentralGrams)
    .filter((ratio) => Number.isFinite(ratio) && ratio >= 0)
    .sort((a, b) => a - b);
  if (ratios.length < minimumSamples) return null;
  const alpha = 1 - targetCoverage;
  return {
    profileId: input.profileId,
    scopeKey: input.scopeKey,
    portionEstimatorVersion: input.portionEstimatorVersion,
    targetCoverage,
    lowerMultiplier: quantile(ratios, alpha / 2),
    upperMultiplier: quantile(ratios, 1 - alpha / 2),
    medianMultiplier: quantile(ratios, 0.5),
    sampleCount: ratios.length,
    benchmarkVersion: input.benchmarkVersion,
    calibratedAt: input.calibratedAt ?? new Date().toISOString(),
  };
}

export function applyCalibrationProfile(
  estimate: { minimumGrams: number; centralGrams: number; maximumGrams: number },
  profile: PortionCalibrationProfile | null | undefined,
): { minimumGrams: number; centralGrams: number; maximumGrams: number; calibrated: boolean } {
  if (!profile || estimate.centralGrams <= 0) return { ...estimate, calibrated: false };
  const central = estimate.centralGrams * profile.medianMultiplier;
  const minimum = Math.min(estimate.minimumGrams, estimate.centralGrams * profile.lowerMultiplier, central);
  const maximum = Math.max(estimate.maximumGrams, estimate.centralGrams * profile.upperMultiplier, central);
  return {
    minimumGrams: Math.max(0, minimum),
    centralGrams: Math.max(0, central),
    maximumGrams: Math.max(0, maximum),
    calibrated: true,
  };
}
