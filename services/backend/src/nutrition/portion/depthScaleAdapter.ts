/**
 * Provider-independent physical depth/height contract for the canonical portion pipeline.
 *
 * Relative monocular depth is not metric food height. A provider may return
 * usable volume evidence only when it also supplies a physical scale and
 * height-above-support samples with provenance.
 */

import type { SegmentationRegion } from "../vision/segmentationAdapter.ts";
import {
  reconstructPhysicalVolume,
  volumeResultToEvidence,
  validateHeightSample,
  validatePixelScale,
  type HeightSample,
  type PixelScaleCalibration,
  type VolumeReconstructionResult,
} from "./volumeReconstruction.ts";
import type { PortionEvidenceRecord } from "./portionEvidence.ts";

export const DEPTH_SCALE_ADAPTER_VERSION = 1 as const;

export type PhysicalDepthMethod =
  | "DEVICE_DEPTH"
  | "MONOCULAR_CALIBRATED"
  | "MULTIVIEW_CALIBRATED"
  | "KNOWN_REFERENCE_GEOMETRY";

export type DepthScaleRequest = {
  imageReference: string;
  mimeType?: string;
  widthPx?: number;
  heightPx?: number;
  checksum?: string;
  correlationId?: string;
  region: SegmentationRegion;
};

export type DepthScaleRegionResult = {
  status: "COMPLETED" | "INSUFFICIENT" | "UNAVAILABLE" | "FAILED";
  provider: string;
  providerVersion: string;
  regionId: string;
  method: PhysicalDepthMethod;
  scale: PixelScaleCalibration | null;
  heightSamples: readonly HeightSample[];
  validCoverageFraction: number;
  supportPlaneConfidence: number;
  warnings: readonly string[];
};

export interface DepthScaleAdapter {
  readonly name: string;
  analyzeRegion(input: DepthScaleRequest): Promise<DepthScaleRegionResult>;
}

const inUnit = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

export function validateDepthScaleResult(result: DepthScaleRegionResult): string[] {
  const errors: string[] = [];
  if (!result.provider.trim() || !result.providerVersion.trim() || !result.regionId.trim()) errors.push("missing_provenance");
  if (!["COMPLETED", "INSUFFICIENT", "UNAVAILABLE", "FAILED"].includes(result.status)) errors.push("invalid_status");
  if (!["DEVICE_DEPTH", "MONOCULAR_CALIBRATED", "MULTIVIEW_CALIBRATED", "KNOWN_REFERENCE_GEOMETRY"].includes(result.method)) errors.push("invalid_method");
  if (!inUnit(result.validCoverageFraction)) errors.push("invalid_coverage");
  if (!inUnit(result.supportPlaneConfidence)) errors.push("invalid_support_plane_confidence");
  if (result.status === "COMPLETED") {
    if (!result.scale || validatePixelScale(result.scale).length > 0) errors.push("invalid_or_missing_scale");
    if (result.heightSamples.length === 0 || result.heightSamples.some((sample) => validateHeightSample(sample).length > 0)) {
      errors.push("invalid_or_missing_height_samples");
    }
  }
  return errors;
}

export function depthScaleResultToVolume(result: DepthScaleRegionResult): VolumeReconstructionResult | null {
  if (validateDepthScaleResult(result).length > 0 || result.status !== "COMPLETED" || result.scale === null) return null;
  const volume = reconstructPhysicalVolume({
    samples: result.heightSamples,
    scale: result.scale,
    provider: result.provider,
    providerVersion: result.providerVersion,
    validCoverageFraction: result.validCoverageFraction,
  });
  if (!volume) return null;
  const uncertainties = [...volume.uncertainties];
  if (result.supportPlaneConfidence < 0.8) uncertainties.push("support plane confidence is below 0.8");
  if (result.warnings.length > 0) uncertainties.push(...result.warnings);
  return { ...volume, uncertainties };
}

export async function collectCalibratedVolumeEvidence(
  adapter: DepthScaleAdapter,
  input: DepthScaleRequest,
): Promise<PortionEvidenceRecord[]> {
  const result = await adapter.analyzeRegion(input);
  const volume = depthScaleResultToVolume(result);
  const evidence = volume ? volumeResultToEvidence(volume) : null;
  return evidence ? [evidence] : [];
}

/** Deterministic fixture adapter used by tests and benchmark replay. */
export class StaticDepthScaleAdapter implements DepthScaleAdapter {
  readonly name = "static-depth-scale";
  private readonly result: Omit<DepthScaleRegionResult, "regionId">;

  constructor(result: Omit<DepthScaleRegionResult, "regionId">) {
    this.result = result;
  }

  async analyzeRegion(input: DepthScaleRequest): Promise<DepthScaleRegionResult> {
    return { ...this.result, regionId: input.region.regionId };
  }
}
