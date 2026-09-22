/**
 * Physical volume reconstruction core for the canonical MoveFuel nutrition engine.
 *
 * This module intentionally starts AFTER a depth/height provider has been
 * calibrated into physical units. It will not infer scale from a raw mask or
 * an uncalibrated monocular depth map. Each sampled mask cell contributes
 * physical area (px * cm/px^2) times food height (cm), yielding cm^3 == mL.
 * Min/central/max paths preserve calibration and height uncertainty.
 */

import type { ConfidenceLevel } from "../algorithm/contracts.ts";
import {
  DEFAULT_PORTION_EVIDENCE_POLICY,
  type PortionEvidenceRecord,
} from "./portionEvidence.ts";

export const VOLUME_RECONSTRUCTION_VERSION = "1.0.0";

export type PhysicalCalibrationQuality = "MEASURED" | "REVIEWED" | "DERIVED" | "EXPERIMENTAL";

export type PixelScaleCalibration = {
  calibrationId: string;
  sourceId: string;
  sourceRevision: string;
  minimumCmPerPixel: number;
  centralCmPerPixel: number;
  maximumCmPerPixel: number;
  quality: PhysicalCalibrationQuality;
};

/**
 * One depth/height sample covering `pixelArea` original-image pixels.
 * Height is food height above the supporting surface, not camera depth.
 */
export type HeightSample = {
  pixelArea: number;
  minimumHeightCm: number;
  centralHeightCm: number;
  maximumHeightCm: number;
  confidence?: number;
};

export type VolumeReconstructionInput = {
  samples: readonly HeightSample[];
  scale: PixelScaleCalibration;
  provider: string;
  providerVersion: string;
  /** Fraction of the visible region represented by valid physical samples. */
  validCoverageFraction?: number;
};

export type VolumeReconstructionResult = {
  minimumMl: number;
  centralMl: number;
  maximumMl: number;
  confidence: ConfidenceLevel;
  sampleCount: number;
  validCoverageFraction: number;
  calibrationId: string;
  sourceId: string;
  sourceRevision: string;
  provider: string;
  providerVersion: string;
  algorithmVersion: string;
  uncertainties: readonly string[];
};

const round3 = (value: number): number => Math.round(value * 1000) / 1000;
const finitePositive = (value: number): boolean => Number.isFinite(value) && value > 0;
const inUnit = (value: number): boolean => Number.isFinite(value) && value >= 0 && value <= 1;

export function validatePixelScale(scale: PixelScaleCalibration): string[] {
  const errors: string[] = [];
  if (!scale.calibrationId.trim() || !scale.sourceId.trim() || !scale.sourceRevision.trim()) errors.push("missing_scale_provenance");
  if (![scale.minimumCmPerPixel, scale.centralCmPerPixel, scale.maximumCmPerPixel].every(finitePositive)) errors.push("invalid_scale");
  if (!(scale.minimumCmPerPixel <= scale.centralCmPerPixel && scale.centralCmPerPixel <= scale.maximumCmPerPixel)) errors.push("unordered_scale");
  if (!["MEASURED", "REVIEWED", "DERIVED", "EXPERIMENTAL"].includes(scale.quality)) errors.push("invalid_scale_quality");
  return errors;
}

export function validateHeightSample(sample: HeightSample): string[] {
  const errors: string[] = [];
  if (!finitePositive(sample.pixelArea)) errors.push("invalid_pixel_area");
  const heights = [sample.minimumHeightCm, sample.centralHeightCm, sample.maximumHeightCm];
  if (heights.some((value) => !Number.isFinite(value) || value < 0)) errors.push("invalid_height");
  if (!(sample.minimumHeightCm <= sample.centralHeightCm && sample.centralHeightCm <= sample.maximumHeightCm)) errors.push("unordered_height");
  if (sample.confidence !== undefined && !inUnit(sample.confidence)) errors.push("invalid_sample_confidence");
  return errors;
}

function confidenceFor(input: VolumeReconstructionInput, coverage: number): ConfidenceLevel {
  const qualityScore: Record<PhysicalCalibrationQuality, number> = {
    MEASURED: 1,
    REVIEWED: 0.9,
    DERIVED: 0.65,
    EXPERIMENTAL: 0.4,
  };
  const sampleConfidence = input.samples.length > 0
    ? input.samples.reduce((sum, sample) => sum + (sample.confidence ?? 0.6), 0) / input.samples.length
    : 0;
  // Scale quality is deliberately the limiting factor: a confident depth model
  // cannot make uncalibrated pixels physically meaningful.
  const score = Math.min(qualityScore[input.scale.quality], sampleConfidence, coverage);
  if (score >= 0.85) return "HIGH";
  if (score >= 0.65) return "MEDIUM";
  if (score >= 0.4) return "LOW";
  return "INSUFFICIENT";
}

export function reconstructPhysicalVolume(input: VolumeReconstructionInput): VolumeReconstructionResult | null {
  if (validatePixelScale(input.scale).length > 0) return null;
  if (!input.provider.trim() || !input.providerVersion.trim()) return null;
  if (input.samples.length === 0 || input.samples.some((sample) => validateHeightSample(sample).length > 0)) return null;

  const coverage = input.validCoverageFraction ?? 1;
  if (!inUnit(coverage) || coverage <= 0) return null;

  const sMin2 = input.scale.minimumCmPerPixel ** 2;
  const sCentral2 = input.scale.centralCmPerPixel ** 2;
  const sMax2 = input.scale.maximumCmPerPixel ** 2;
  let minimum = 0;
  let central = 0;
  let maximum = 0;
  for (const sample of input.samples) {
    minimum += sample.pixelArea * sMin2 * sample.minimumHeightCm;
    central += sample.pixelArea * sCentral2 * sample.centralHeightCm;
    maximum += sample.pixelArea * sMax2 * sample.maximumHeightCm;
  }

  // Do not divide by coverage to fabricate hidden/occluded food volume. Coverage
  // lowers confidence and is surfaced to the caller instead.
  const confidence = confidenceFor(input, coverage);
  const uncertainties: string[] = [];
  if (coverage < 0.9) uncertainties.push("physical depth coverage is incomplete; hidden volume is not invented");
  if (input.scale.quality === "DERIVED") uncertainties.push("physical scale is derived rather than directly measured");
  if (input.scale.quality === "EXPERIMENTAL") uncertainties.push("physical scale calibration is experimental");
  if (input.samples.some((sample) => (sample.confidence ?? 0.6) < 0.5)) uncertainties.push("some depth/height samples have low confidence");

  return {
    minimumMl: round3(Math.max(0, Math.min(minimum, central, maximum))),
    centralMl: round3(Math.max(0, central)),
    maximumMl: round3(Math.max(minimum, central, maximum)),
    confidence,
    sampleCount: input.samples.length,
    validCoverageFraction: coverage,
    calibrationId: input.scale.calibrationId,
    sourceId: input.scale.sourceId,
    sourceRevision: input.scale.sourceRevision,
    provider: input.provider,
    providerVersion: input.providerVersion,
    algorithmVersion: VOLUME_RECONSTRUCTION_VERSION,
    uncertainties,
  };
}

/**
 * Converts a physical volume result into evidence understood by PortionEstimator.
 * Insufficient reconstructions are deliberately not promotable to tier-3 mass
 * evidence; callers must fall back to review/manual input instead.
 */
export function volumeResultToEvidence(
  result: VolumeReconstructionResult,
  collectedAt = new Date().toISOString(),
): PortionEvidenceRecord | null {
  if (result.confidence === "INSUFFICIENT" || result.centralMl <= 0) return null;
  return {
    evidenceType: "CALIBRATED_DEPTH_VOLUME",
    suppliedValue: result.centralMl,
    minimumValue: result.minimumMl,
    maximumValue: result.maximumMl,
    unit: "ml",
    source: `${result.provider}@${result.providerVersion}`,
    reliabilityTier: DEFAULT_PORTION_EVIDENCE_POLICY.tier.CALIBRATED_DEPTH_VOLUME,
    calibrationId: result.calibrationId,
    sourceRevision: result.sourceRevision,
    collectedAt,
    assumptions: [
      `scale=${result.sourceId}@${result.sourceRevision}`,
      `physical-depth-volume=${result.algorithmVersion}`,
      ...result.uncertainties,
    ],
    validationState: result.confidence === "HIGH" ? "REVIEWED" : "ESTIMATED",
  };
}
