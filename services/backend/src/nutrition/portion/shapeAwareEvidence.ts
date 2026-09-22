/**
 * Shape-aware physical evidence builder for the canonical portion pipeline.
 *
 * This module does not guess nutrients. It decides which portion evidence is
 * admissible for a food geometry and converts only physically grounded inputs
 * into the evidence types understood by PortionEstimator.
 */

import type { FoodTypeKind } from "../algorithm/contracts.ts";
import type { PortionEvidenceRecord } from "./portionEvidence.ts";
import { DEFAULT_PORTION_EVIDENCE_POLICY } from "./portionEvidence.ts";
import type { DepthScaleAdapter, DepthScaleRequest } from "./depthScaleAdapter.ts";
import { collectCalibratedVolumeEvidence } from "./depthScaleAdapter.ts";

export const SHAPE_AWARE_EVIDENCE_VERSION = "1.0.0";

export type PortionGeometryFamily = "DIRECT_MASS" | "PIECE" | "LIQUID_CONTAINER" | "PHYSICAL_VOLUME" | "RECIPE" | "PRIOR_ONLY";

export type ShapeAwareEvidenceInput = DepthScaleRequest & {
  itemType: FoodTypeKind;
  pieceCount?: number;
  knownContainerVolumeMl?: number;
  containerFillFraction?: number;
  manualGrams?: number;
  packageGrams?: number;
  previousConfirmedGrams?: number;
};

function record(
  evidenceType: PortionEvidenceRecord["evidenceType"],
  value: number,
  unit: string,
  source: string,
  validationState: PortionEvidenceRecord["validationState"],
  assumptions: readonly string[] = [],
  minimumValue?: number,
  maximumValue?: number,
): PortionEvidenceRecord {
  return {
    evidenceType,
    suppliedValue: value,
    ...(minimumValue !== undefined ? { minimumValue } : {}),
    ...(maximumValue !== undefined ? { maximumValue } : {}),
    unit,
    source,
    reliabilityTier: DEFAULT_PORTION_EVIDENCE_POLICY.tier[evidenceType],
    collectedAt: new Date().toISOString(),
    assumptions,
    validationState,
  };
}

export function geometryFamilyFor(input: ShapeAwareEvidenceInput): PortionGeometryFamily {
  if (Number.isFinite(input.manualGrams) && (input.manualGrams ?? 0) > 0) return "DIRECT_MASS";
  if (Number.isFinite(input.packageGrams) && (input.packageGrams ?? 0) > 0) return "DIRECT_MASS";
  if (Number.isFinite(input.pieceCount) && (input.pieceCount ?? 0) > 0) return "PIECE";
  if (input.itemType === "LIQUID" && Number.isFinite(input.knownContainerVolumeMl) && Number.isFinite(input.containerFillFraction)) {
    return "LIQUID_CONTAINER";
  }
  return "PHYSICAL_VOLUME";
}

export class ShapeAwareEvidenceCollector {
  private readonly depthScale: DepthScaleAdapter | null;

  constructor(depthScale: DepthScaleAdapter | null) {
    this.depthScale = depthScale;
  }

  async collect(input: ShapeAwareEvidenceInput): Promise<PortionEvidenceRecord[]> {
    const evidence: PortionEvidenceRecord[] = [];
    if (Number.isFinite(input.manualGrams) && (input.manualGrams ?? 0) > 0) {
      evidence.push(record("MANUAL_GRAMS", input.manualGrams!, "g", "user", "CONFIRMED"));
      return evidence;
    }
    if (Number.isFinite(input.packageGrams) && (input.packageGrams ?? 0) > 0) {
      evidence.push(record("PACKAGE_LABEL", input.packageGrams!, "g", "package-label", "REVIEWED"));
      return evidence;
    }
    if (Number.isFinite(input.pieceCount) && (input.pieceCount ?? 0) > 0) {
      evidence.push(record("PIECE_COUNT", input.pieceCount!, "count", "visible-or-user-confirmed-piece-count", "ESTIMATED"));
    }
    if (
      input.itemType === "LIQUID" &&
      Number.isFinite(input.knownContainerVolumeMl) && (input.knownContainerVolumeMl ?? 0) > 0 &&
      Number.isFinite(input.containerFillFraction) && (input.containerFillFraction ?? -1) >= 0 && (input.containerFillFraction ?? 2) <= 1
    ) {
      const central = input.knownContainerVolumeMl! * input.containerFillFraction!;
      const width = 0.08 + (1 - input.containerFillFraction!) * 0.05;
      evidence.push(record(
        "CONTAINER_FILL_VOLUME",
        central,
        "ml",
        "known-container-fill",
        "REVIEWED",
        ["container volume must correspond to the photographed vessel"],
        Math.max(0, central * (1 - width)),
        central * (1 + width),
      ));
    } else if (this.depthScale) {
      evidence.push(...await collectCalibratedVolumeEvidence(this.depthScale, input));
    }
    const visual = input.region.visualPortionEstimate;
    if (visual) {
      evidence.push(record(
        "VISUAL_MODEL_PORTION_PRIOR",
        visual.centralGrams,
        "g",
        `vision:${visual.method}`,
        "ESTIMATED",
        [
          "single-photo model prior; not a physical measurement",
          "user confirmation required before meal history is updated",
          ...visual.assumptions,
        ],
        visual.minimumGrams,
        visual.maximumGrams,
      ));
    }
    if (Number.isFinite(input.previousConfirmedGrams) && (input.previousConfirmedGrams ?? 0) > 0) {
      evidence.push(record("PREVIOUS_CONFIRMED_PORTION", input.previousConfirmedGrams!, "g", "user-history", "CONFIRMED"));
    }
    return evidence;
  }
}
