/**
 * MoveFuel portion-range estimator with reliability-aware evidence fusion.
 *
 * The estimator is evidence-first and deliberately refuses false precision:
 *  - manual/package mass outranks every visual estimate;
 *  - a plate diameter, bounding box, mask area, side image or raw depth map is
 *    scale/context evidence only and cannot become grams by itself;
 *  - volume becomes mass only with explicit food/preparation density provenance;
 *  - piece/serving counts require a reviewed gram conversion;
 *  - behavioral history is a prior, not a measurement;
 *  - held-out calibration may widen/correct intervals but cannot rescue missing
 *    physical evidence.
 */

import type { ConfidenceLevel, FoodTypeKind } from "../algorithm/contracts.ts";
import type { DensityRange } from "./densityLibrary.ts";
import { applyCalibrationProfile, type PortionCalibrationProfile } from "../confidence/intervalCalibration.ts";
import {
  DEFAULT_PORTION_EVIDENCE_POLICY,
  type PortionEvidencePolicy,
  type PortionEvidenceRecord,
  type PortionEvidenceType,
  validateEvidenceRecord,
} from "./portionEvidence.ts";
import { fuseMassHypotheses, type MassDistribution, type PhysicalEvidenceGraph } from "./physicalEvidenceGraph.ts";

export const PORTION_ESTIMATOR_VERSION = "3.1.0";

export type GramConversionRange = {
  minimumGrams: number;
  centralGrams: number;
  maximumGrams: number;
  sourceId: string;
  sourceRevision?: string;
};

export type PortionEstimate = {
  minimumGrams: number;
  centralGrams: number;
  maximumGrams: number;
  confidence: ConfidenceLevel;
  evidenceUsed: readonly PortionEvidenceType[];
  evidenceRejected: readonly PortionEvidenceType[];
  assumptions: readonly string[];
  uncertainties: readonly string[];
  estimatorVersion: string;
  requiresClarification: boolean;
  requiresUserConfirmation: boolean;
  rangeCalibrated: boolean;
  calibrationProfileId: string | null;
  /** Canonical mass-posterior summary. */
  massDistribution?: MassDistribution;
  /** Evidence graph used to create the posterior; no pixels or nutrients are stored here. */
  physicalEvidenceGraph?: PhysicalEvidenceGraph;
  fusionMethod?: "NONE" | "DIRECT_AUTHORITY" | "SINGLE_EVIDENCE" | "ROBUST_PRECISION_FUSION" | "PRIOR_ONLY";
};

export type PortionEstimatorInput = {
  itemType: FoodTypeKind;
  evidence: readonly PortionEvidenceRecord[];
  /** Legacy scalar; accepted only when explicitly supplied. No default exists. */
  /** Preferred versioned density interval from DensityLibrary. */
  volumeDensityRange?: DensityRange;
  /** Verified gram weight per piece. */
  pieceWeightGrams?: number;
  pieceWeightRangeGrams?: GramConversionRange;
  /** Label/barcode grams per serving. */
  servingSizeGrams?: number;
  servingSizeRangeGrams?: GramConversionRange;
  /** Optional held-out benchmark calibration profile for this evidence class. */
  calibrationProfile?: PortionCalibrationProfile | null;
  /** Set when the candidate name indicates a piece-based food. */
  pieceBased?: boolean;
};

export type PortionEstimatorPolicy = {
  version: number;
  evidencePolicy: PortionEvidencePolicy;
  manualGramsWidth: number;
  packageLabelWidth: number;
  barcodeServingWidth: number;
  pieceCountWidth: number;
  recipeServingWidth: number;
  priorWidthFloor: number;
};

export const DEFAULT_PORTION_ESTIMATOR_POLICY: PortionEstimatorPolicy = {
  version: 3,
  evidencePolicy: DEFAULT_PORTION_EVIDENCE_POLICY,
  manualGramsWidth: 0.01,
  packageLabelWidth: 0.02,
  barcodeServingWidth: 0.05,
  pieceCountWidth: 0.08,
  recipeServingWidth: 0.15,
  priorWidthFloor: 0.2,
};

type EvidenceGrams = {
  minimumGrams: number;
  centralGrams: number;
  maximumGrams: number;
  assumptions: readonly string[];
  uncertainties: readonly string[];
};

type PrimaryEvidence = { record: PortionEvidenceRecord; grams: EvidenceGrams };

const round3 = (value: number): number => Math.round(value * 1000) / 1000;
const MASS_UNITS = new Set(["g", "gram", "grams", "kg", "oz"]);
const VOLUME_UNITS = new Set(["ml", "milliliter", "milliliters", "l", "liter", "liters"]);

function massUnitToGrams(value: number, unit: string): number | null {
  switch (unit.toLowerCase()) {
    case "g":
    case "gram":
    case "grams":
      return value;
    case "kg":
      return value * 1000;
    case "oz":
      return value * 28.349523125;
    default:
      return null;
  }
}

function volumeUnitToMl(value: number, unit: string): number | null {
  switch (unit.toLowerCase()) {
    case "ml":
    case "milliliter":
    case "milliliters":
      return value;
    case "l":
    case "liter":
    case "liters":
      return value * 1000;
    default:
      return null;
  }
}

function rangeAround(central: number, width: number): EvidenceGrams {
  return {
    minimumGrams: round3(Math.max(0, central * (1 - width))),
    centralGrams: round3(Math.max(0, central)),
    maximumGrams: round3(Math.max(0, central * (1 + width))),
    assumptions: [],
    uncertainties: [],
  };
}

function recordMassRange(record: PortionEvidenceRecord, width: number): EvidenceGrams | null {
  const central = massUnitToGrams(record.suppliedValue, record.unit);
  if (central === null) return null;
  if (record.minimumValue === undefined && record.maximumValue === undefined) return rangeAround(central, width);
  const minimum = massUnitToGrams(record.minimumValue ?? record.suppliedValue, record.unit);
  const maximum = massUnitToGrams(record.maximumValue ?? record.suppliedValue, record.unit);
  if (minimum === null || maximum === null || minimum > central || central > maximum) return null;
  return {
    minimumGrams: round3(minimum),
    centralGrams: round3(central),
    maximumGrams: round3(maximum),
    assumptions: [],
    uncertainties: [],
  };
}

function conversionRange(
  explicit: GramConversionRange | undefined,
  scalar: number | undefined,
  defaultWidth: number,
  sourceId: string,
): GramConversionRange | null {
  if (explicit) {
    if (
      !Number.isFinite(explicit.minimumGrams) || !Number.isFinite(explicit.centralGrams) || !Number.isFinite(explicit.maximumGrams) ||
      explicit.minimumGrams <= 0 || explicit.minimumGrams > explicit.centralGrams || explicit.centralGrams > explicit.maximumGrams ||
      !explicit.sourceId.trim()
    ) return null;
    return explicit;
  }
  if (scalar === undefined || !Number.isFinite(scalar) || scalar <= 0) return null;
  return {
    minimumGrams: scalar * (1 - defaultWidth),
    centralGrams: scalar,
    maximumGrams: scalar * (1 + defaultWidth),
    sourceId,
  };
}

function densityRange(input: PortionEstimatorInput): DensityRange | null {
  if (input.volumeDensityRange) {
    const d = input.volumeDensityRange;
    if (
      Number.isFinite(d.minimumGPerMl) && Number.isFinite(d.centralGPerMl) && Number.isFinite(d.maximumGPerMl) &&
      d.minimumGPerMl > 0 && d.minimumGPerMl <= d.centralGPerMl && d.centralGPerMl <= d.maximumGPerMl &&
      d.densityId.trim() && d.sourceId.trim() && d.sourceRevision.trim()
    ) return d;
    return null;
  }
  return null;
}

function volumeToMass(record: PortionEvidenceRecord, input: PortionEstimatorInput): EvidenceGrams | null {
  const density = densityRange(input);
  if (!density) return null;
  const centralMl = volumeUnitToMl(record.suppliedValue, record.unit);
  const minMl = volumeUnitToMl(record.minimumValue ?? record.suppliedValue, record.unit);
  const maxMl = volumeUnitToMl(record.maximumValue ?? record.suppliedValue, record.unit);
  if (centralMl === null || minMl === null || maxMl === null || minMl > centralMl || centralMl > maxMl) return null;
  return {
    minimumGrams: round3(Math.max(0, minMl * density.minimumGPerMl)),
    centralGrams: round3(Math.max(0, centralMl * density.centralGPerMl)),
    maximumGrams: round3(Math.max(0, maxMl * density.maximumGPerMl)),
    assumptions: [`density ${density.densityId} (${density.sourceId}@${density.sourceRevision}) matched to food/preparation`],
    uncertainties: density.evidenceQuality === "EXPERIMENTAL" ? ["density evidence is experimental"] : [],
  };
}

function countToMass(record: PortionEvidenceRecord, conversion: GramConversionRange | null): EvidenceGrams | null {
  if (!conversion || record.suppliedValue < 0) return null;
  const countMin = record.minimumValue ?? record.suppliedValue;
  const countMax = record.maximumValue ?? record.suppliedValue;
  if (countMin < 0 || countMin > record.suppliedValue || countMax < record.suppliedValue) return null;
  return {
    minimumGrams: round3(countMin * conversion.minimumGrams),
    centralGrams: round3(record.suppliedValue * conversion.centralGrams),
    maximumGrams: round3(countMax * conversion.maximumGrams),
    assumptions: [`count-to-mass conversion from ${conversion.sourceId}${conversion.sourceRevision ? `@${conversion.sourceRevision}` : ""}`],
    uncertainties: [],
  };
}

function gramsFromEvidence(record: PortionEvidenceRecord, input: PortionEstimatorInput, policy: PortionEstimatorPolicy): EvidenceGrams | null {
  if (record.validationState === "REJECTED") return null;
  switch (record.evidenceType) {
    case "MANUAL_GRAMS":
      return recordMassRange(record, policy.manualGramsWidth);
    case "PACKAGE_LABEL":
      return recordMassRange(record, policy.packageLabelWidth);
    case "BARCODE_SERVING":
      return countToMass(record, conversionRange(input.servingSizeRangeGrams, input.servingSizeGrams, policy.barcodeServingWidth, "explicit-serving-size"));
    case "PIECE_COUNT":
      return countToMass(record, conversionRange(input.pieceWeightRangeGrams, input.pieceWeightGrams, policy.pieceCountWidth, "explicit-piece-weight"));
    case "CALIBRATED_VOLUME":
    case "CALIBRATED_DEPTH_VOLUME":
    case "CONTAINER_FILL_VOLUME":
      return volumeToMass(record, input);
    case "RECIPE_SERVING":
      return recordMassRange(record, policy.recipeServingWidth);
    case "PREVIOUS_CONFIRMED_PORTION":
    case "VISUAL_MODEL_PORTION_PRIOR":
    case "USER_SELECTED_SERVING": {
      const direct = recordMassRange(record, policy.priorWidthFloor);
      if (!direct) return null;
      const central = direct.centralGrams;
      const floorMin = central * (1 - policy.priorWidthFloor);
      const floorMax = central * (1 + policy.priorWidthFloor);
      return {
        ...direct,
        minimumGrams: round3(Math.min(direct.minimumGrams, Math.max(0, floorMin))),
        maximumGrams: round3(Math.max(direct.maximumGrams, floorMax)),
        uncertainties: [record.evidenceType === "VISUAL_MODEL_PORTION_PRIOR"
          ? "single-photo visual portion is an uncalibrated prior, not a physical measurement"
          : "behavioral serving history is a prior, not a physical measurement"],
      };
    }
    // These are useful upstream for scale/depth reconstruction, but this
    // estimator will not convert them to grams without an explicit calibrated
    // volume record.
    case "KNOWN_PLATE_DIAMETER":
    case "KNOWN_BOWL_VOLUME":
    case "REFERENCE_CARD":
    case "SECOND_IMAGE":
    case "SIDE_IMAGE":
    case "DEVICE_DEPTH":
    case "SEGMENTATION_AREA":
    case "BOUNDING_BOX_AREA":
    case "NO_SCALE_REFERENCE":
      return null;
  }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function fusePrimary(primary: readonly PrimaryEvidence[]): { grams: EvidenceGrams; conflicting: boolean } {
  if (primary.length === 0) {
    return {
      grams: { minimumGrams: 0, centralGrams: 0, maximumGrams: 0, assumptions: [], uncertainties: ["no evidence can be converted to mass"] },
      conflicting: false,
    };
  }
  if (primary.length === 1) return { grams: primary[0]!.grams, conflicting: false };

  const central = median(primary.map((entry) => entry.grams.centralGrams));
  const intersectionMin = Math.max(...primary.map((entry) => entry.grams.minimumGrams));
  const intersectionMax = Math.min(...primary.map((entry) => entry.grams.maximumGrams));
  const assumptions = primary.flatMap((entry) => entry.grams.assumptions);
  const uncertainties = primary.flatMap((entry) => entry.grams.uncertainties);

  if (intersectionMin <= intersectionMax) {
    return {
      grams: {
        minimumGrams: round3(intersectionMin),
        centralGrams: round3(Math.min(intersectionMax, Math.max(intersectionMin, central))),
        maximumGrams: round3(intersectionMax),
        assumptions,
        uncertainties,
      },
      conflicting: false,
    };
  }

  return {
    grams: {
      minimumGrams: round3(Math.min(...primary.map((entry) => entry.grams.minimumGrams))),
      centralGrams: round3(central),
      maximumGrams: round3(Math.max(...primary.map((entry) => entry.grams.maximumGrams))),
      assumptions,
      uncertainties: [...uncertainties, "same-tier portion evidence conflicts; interval widened to contain all evidence"],
    },
    conflicting: true,
  };
}

function lowerConfidence(level: ConfidenceLevel): ConfidenceLevel {
  switch (level) {
    case "HIGH": return "MEDIUM";
    case "MEDIUM": return "LOW";
    case "LOW": return "INSUFFICIENT";
    case "INSUFFICIENT": return "INSUFFICIENT";
  }
}

export class PortionEstimator {
  private readonly policy: PortionEstimatorPolicy;

  constructor(policy: PortionEstimatorPolicy = DEFAULT_PORTION_ESTIMATOR_POLICY) {
    this.policy = policy;
  }

  estimate(input: PortionEstimatorInput): PortionEstimate {
    const evidenceRejected: PortionEvidenceType[] = [];
    const invalid: string[] = [];
    const withGrams: PrimaryEvidence[] = [];

    for (const record of input.evidence) {
      const errors = validateEvidenceRecord(record, this.policy.evidencePolicy);
      if (errors.length > 0) {
        evidenceRejected.push(record.evidenceType);
        invalid.push(`${record.evidenceType}(${errors.join("|")})`);
        continue;
      }
      const grams = gramsFromEvidence(record, input, this.policy);
      if (grams) withGrams.push({ record, grams });
      else evidenceRejected.push(record.evidenceType);
    }

    const fused = fuseMassHypotheses(withGrams.map((entry) => ({
      record: entry.record,
      minimumGrams: entry.grams.minimumGrams,
      centralGrams: entry.grams.centralGrams,
      maximumGrams: entry.grams.maximumGrams,
      assumptions: entry.grams.assumptions,
      uncertainties: entry.grams.uncertainties,
    })));
    const used = fused.used.map((hypothesis) => ({
      record: hypothesis.record,
      grams: {
        minimumGrams: hypothesis.minimumGrams,
        centralGrams: hypothesis.centralGrams,
        maximumGrams: hypothesis.maximumGrams,
        assumptions: hypothesis.assumptions,
        uncertainties: hypothesis.uncertainties,
      },
    }));
    for (const rejected of fused.rejected) evidenceRejected.push(rejected.record.evidenceType);

    const profile = input.calibrationProfile && input.calibrationProfile.portionEstimatorVersion === PORTION_ESTIMATOR_VERSION
      ? input.calibrationProfile
      : null;
    const fusedRange = {
      minimumGrams: fused.minimumGrams,
      centralGrams: fused.centralGrams,
      maximumGrams: fused.maximumGrams,
      assumptions: fused.assumptions,
      uncertainties: fused.uncertainties,
    };
    const calibrated = applyCalibrationProfile(fusedRange, profile);
    let confidence = this.confidenceFor(used, fused.conflicting);

    if (profile && profile.sampleCount < 30) confidence = lowerConfidence(confidence);
    const directOnly = used.length > 0 && used.every((entry) => entry.record.evidenceType === "MANUAL_GRAMS" || entry.record.evidenceType === "PACKAGE_LABEL");
    if (profile && directOnly) {
      // Never bias directly measured/labelled mass with a visual-model profile.
      calibrated.minimumGrams = fused.minimumGrams;
      calibrated.centralGrams = fused.centralGrams;
      calibrated.maximumGrams = fused.maximumGrams;
      calibrated.calibrated = false;
    }

    const types = used.map((entry) => entry.record.evidenceType);
    const unresolvedPhysicalEvidence = input.evidence.some((record) => [
      "KNOWN_PLATE_DIAMETER", "KNOWN_BOWL_VOLUME", "REFERENCE_CARD", "SECOND_IMAGE", "SIDE_IMAGE", "DEVICE_DEPTH", "SEGMENTATION_AREA", "BOUNDING_BOX_AREA",
    ].includes(record.evidenceType)) && used.length === 0;

    const uncertainties = [
      ...fused.uncertainties,
      ...(invalid.length > 0 ? [`invalid evidence rejected: ${invalid.join(", ")}`] : []),
      ...(unresolvedPhysicalEvidence ? ["visual/scale evidence exists but no calibrated volume-to-mass conversion is available"] : []),
      ...(input.itemType === "MIXED_DISH" ? ["mixed-dish composition can change calorie density even when portion mass is known"] : []),
      ...(input.itemType === "LIQUID" && used.length === 0 ? ["liquid requires measured mass or calibrated fill volume plus matched density"] : []),
      ...(input.calibrationProfile && !profile ? ["calibration profile version does not match this estimator and was not applied"] : []),
    ];

    const requiresClarification = this.requiresClarification(input, used, confidence);
    return {
      minimumGrams: round3(calibrated.minimumGrams),
      centralGrams: round3(calibrated.centralGrams),
      maximumGrams: round3(calibrated.maximumGrams),
      confidence,
      evidenceUsed: [...new Set(types)],
      evidenceRejected: [...new Set(evidenceRejected)],
      assumptions: fused.assumptions,
      uncertainties: [...new Set(uncertainties)],
      estimatorVersion: PORTION_ESTIMATOR_VERSION,
      requiresClarification,
      requiresUserConfirmation: this.requiresUserConfirmation(used, confidence),
      rangeCalibrated: calibrated.calibrated,
      calibrationProfileId: calibrated.calibrated ? profile?.profileId ?? null : null,
      massDistribution: {
        ...fused.distribution,
        ...(calibrated.calibrated ? {
          p10Grams: round3(calibrated.minimumGrams),
          p50Grams: round3(calibrated.centralGrams),
          p90Grams: round3(calibrated.maximumGrams),
        } : {}),
      },
      physicalEvidenceGraph: fused.graph,
      fusionMethod: fused.fusionMethod,
    };
  }

  private confidenceFor(primary: readonly PrimaryEvidence[], conflicting: boolean): ConfidenceLevel {
    if (primary.length === 0) return "INSUFFICIENT";
    const tier = Math.min(...primary.map((entry) => entry.record.reliabilityTier));
    let confidence: ConfidenceLevel = tier <= 2 ? "HIGH" : tier <= 4 ? "MEDIUM" : tier === 5 ? "LOW" : "INSUFFICIENT";
    if (primary.some((entry) => (entry.record.validationState === "ESTIMATED" || entry.record.validationState === "UNVERIFIED") && entry.record.evidenceType !== "VISUAL_MODEL_PORTION_PRIOR")) {
      confidence = lowerConfidence(confidence);
    }
    if (conflicting) confidence = lowerConfidence(confidence);
    return confidence;
  }

  private requiresClarification(input: PortionEstimatorInput, primary: readonly PrimaryEvidence[], confidence: ConfidenceLevel): boolean {
    if (confidence === "INSUFFICIENT") return true;
    const types = primary.map((entry) => entry.record.evidenceType);
    if (input.itemType === "PACKAGED" && !types.some((type) => type === "PACKAGE_LABEL" || type === "BARCODE_SERVING" || type === "MANUAL_GRAMS")) return true;
    if (input.pieceBased && !types.some((type) => type === "PIECE_COUNT" || type === "MANUAL_GRAMS" || type === "PACKAGE_LABEL")) return true;
    if (input.itemType === "LIQUID" && !types.some((type) => type === "MANUAL_GRAMS" || type === "PACKAGE_LABEL" || type === "CALIBRATED_VOLUME" || type === "CALIBRATED_DEPTH_VOLUME" || type === "CONTAINER_FILL_VOLUME")) return true;
    if (types.every((type) => type === "PREVIOUS_CONFIRMED_PORTION" || type === "VISUAL_MODEL_PORTION_PRIOR" || type === "USER_SELECTED_SERVING")) return true;
    return false;
  }

  private requiresUserConfirmation(primary: readonly PrimaryEvidence[], confidence: ConfidenceLevel): boolean {
    if (confidence !== "HIGH") return true;
    return primary.some((entry) => entry.record.validationState !== "CONFIRMED" && entry.record.validationState !== "REVIEWED");
  }
}

export class PortionEstimatorError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "PortionEstimatorError";
  }
}

/** Exposed for validation/telemetry, not for end-user display. */
export function isMassUnit(unit: string): boolean {
  return MASS_UNITS.has(unit.toLowerCase());
}

export function isVolumeUnit(unit: string): boolean {
  return VOLUME_UNITS.has(unit.toLowerCase());
}
