/**
 * Segmentation adapter contracts (Phase 6, provider-independent).
 *
 * Segmentation identifies regions that may contain food. It never identifies
 * food identity and never carries nutrient values. Bounding boxes are weaker
 * evidence than masks; pixel area is not physical food area; segmentation
 * confidence is not food-identity confidence. A missing region must never
 * create an invented food.
 */

import { ImageQualityError } from "./qualityAssessment.ts";

export const SEGMENTATION_POLICY_VERSION = 1 as const;

/** Normalized bounding box; all coordinates in the [0,1] unit square. */
export type NormalizedBBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OverlapState = "NONE" | "PARTIAL" | "HEAVY";

export type SegmentationStatus = "COMPLETED" | "FAILED" | "UNAVAILABLE";

/**
 * Non-authoritative one-photo portion prior proposed by the vision model.
 * It exists to power an editable consumer estimate while physical scale/depth
 * is unavailable. It must never be presented as measured mass and is always
 * superseded by direct, package, piece, container or calibrated-depth evidence.
 */
export type VisualPortionEstimate = {
  method: "MONOCULAR_MODEL_PRIOR";
  minimumGrams: number;
  centralGrams: number;
  maximumGrams: number;
  confidence: number;
  assumptions: readonly string[];
};

export type SegmentationRegion = {
  regionId: string;
  bbox: NormalizedBBox;
  /** Optional reference to a stored mask object (never raw image bytes). */
  maskReference?: string;
  /** Optional normalized contour polygon. Points are [x,y] in [0,1]. */
  maskPolygon?: readonly (readonly [number, number])[];
  /** Optional editable visual estimate; never physical measurement evidence. */
  visualPortionEstimate?: VisualPortionEstimate;
  /** Segmentation confidence (0..1). Not food-identity confidence. */
  segmentationConfidence: number;
  overlapState: OverlapState;
  warnings: readonly string[];
};

export type SegmentationAnalysis = {
  provider: string;
  providerVersion: string;
  status: SegmentationStatus;
  regions: readonly SegmentationRegion[];
  latencyMs: number;
  warnings: readonly string[];
};

export type SegmentationRequest = {
  imageReference: string;
  mimeType?: string;
  widthPx?: number;
  heightPx?: number;
  checksum?: string;
  correlationId?: string;
  ownerUserId?: string;
};

export interface SegmentationAdapter {
  readonly name: string;
  segment(input: SegmentationRequest): Promise<SegmentationAnalysis>;
}

const isFiniteInUnit = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

/** Returns an error string, or null when the bbox is valid. */
export function validateNormalizedBBox(bbox: NormalizedBBox): string | null {
  if (!isFiniteInUnit(bbox.x) || !isFiniteInUnit(bbox.y)) {
    return "bbox origin must be within [0,1]";
  }
  if (!isFiniteInUnit(bbox.width) || !isFiniteInUnit(bbox.height)) {
    return "bbox size must be within [0,1]";
  }
  if (bbox.width <= 0 || bbox.height <= 0) {
    return "bbox size must be positive";
  }
  if (bbox.x + bbox.width > 1 + 1e-9 || bbox.y + bbox.height > 1 + 1e-9) {
    return "bbox must not extend outside the unit square";
  }
  return null;
}

export function validateSegmentationAnalysis(analysis: unknown): string[] {
  if (typeof analysis !== "object" || analysis === null || Array.isArray(analysis)) {
    return ["invalid_analysis"];
  }
  const record = analysis as Record<string, unknown>;
  const errors: string[] = [];
  if (!["COMPLETED", "FAILED", "UNAVAILABLE"].includes(String(record.status))) {
    errors.push("invalid_status");
  }
  if (!Array.isArray(record.regions)) {
    errors.push("regions_must_be_array");
    return errors;
  }
  const regions = record.regions as unknown[];
  const seen = new Set<string>();
  for (const [index, rawRegion] of regions.entries()) {
    if (typeof rawRegion !== "object" || rawRegion === null || Array.isArray(rawRegion)) {
      errors.push(`regions[${index}].invalid_region`);
      continue;
    }
    const region = rawRegion as Record<string, unknown>;
    if (typeof region.regionId !== "string" || region.regionId.length === 0) {
      errors.push(`regions[${index}].blank_region_id`);
    } else if (seen.has(region.regionId)) {
      errors.push(`regions[${index}].duplicate_region_id`);
    } else {
      seen.add(region.regionId as string);
    }
    if (typeof region.bbox === "object" && region.bbox !== null && !Array.isArray(region.bbox)) {
      const bboxError = validateNormalizedBBox(region.bbox as NormalizedBBox);
      if (bboxError) errors.push(`regions[${index}].invalid_bbox`);
    } else {
      errors.push(`regions[${index}].missing_bbox`);
    }
    if (region.maskPolygon !== undefined) {
      if (!Array.isArray(region.maskPolygon) || region.maskPolygon.length < 3) {
        errors.push(`regions[${index}].invalid_mask_polygon`);
      } else {
        for (const point of region.maskPolygon as unknown[]) {
          if (!Array.isArray(point) || point.length !== 2 || !isFiniteInUnit(point[0]) || !isFiniteInUnit(point[1])) {
            errors.push(`regions[${index}].invalid_mask_point`);
            break;
          }
        }
      }
    }
    if (region.visualPortionEstimate !== undefined) {
      const portion = region.visualPortionEstimate as Record<string, unknown>;
      const minimum = portion.minimumGrams;
      const central = portion.centralGrams;
      const maximum = portion.maximumGrams;
      if (portion.method !== "MONOCULAR_MODEL_PRIOR") errors.push(`regions[${index}].invalid_visual_portion_method`);
      if (
        typeof minimum !== "number" || !Number.isFinite(minimum) || minimum <= 0 ||
        typeof central !== "number" || !Number.isFinite(central) || central <= 0 ||
        typeof maximum !== "number" || !Number.isFinite(maximum) || maximum <= 0 ||
        minimum > central || central > maximum || maximum > 5_000
      ) errors.push(`regions[${index}].invalid_visual_portion_range`);
      if (!isFiniteInUnit(portion.confidence)) errors.push(`regions[${index}].invalid_visual_portion_confidence`);
      if (!Array.isArray(portion.assumptions)) errors.push(`regions[${index}].invalid_visual_portion_assumptions`);
    }
    if (
      typeof region.segmentationConfidence !== "number" ||
      !Number.isFinite(region.segmentationConfidence) ||
      region.segmentationConfidence < 0 ||
      region.segmentationConfidence > 1
    ) {
      errors.push(`regions[${index}].invalid_confidence`);
    }
    if (region.overlapState !== undefined && !["NONE", "PARTIAL", "HEAVY"].includes(String(region.overlapState))) {
      errors.push(`regions[${index}].invalid_overlap_state`);
    }
  }
  return errors;
}

export class SegmentationAdapterError extends ImageQualityError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "SegmentationAdapterError";
  }
}
