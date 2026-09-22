/**
 * Canonical portion-evidence model for physical and declared serving evidence.
 *
 * Evidence is collected from sources with very different reliability. The
 * ranking is versioned configuration, not scientific truth. A record may carry
 * an interval when the upstream measurement itself is uncertain. Crucially,
 * scale/reference observations do not become grams until a calibrated physical
 * conversion exists.
 */

export const PORTION_EVIDENCE_POLICY_VERSION = 4 as const;
export const PORTION_EVIDENCE_PROVENANCE_SCHEMA_VERSION = 1 as const;

export type PortionEvidenceType =
  | "MANUAL_GRAMS"
  | "PACKAGE_LABEL"
  | "BARCODE_SERVING"
  | "PIECE_COUNT"
  | "CALIBRATED_VOLUME"
  | "CALIBRATED_DEPTH_VOLUME"
  | "CONTAINER_FILL_VOLUME"
  | "KNOWN_PLATE_DIAMETER"
  | "KNOWN_BOWL_VOLUME"
  | "REFERENCE_CARD"
  | "SECOND_IMAGE"
  | "SIDE_IMAGE"
  | "DEVICE_DEPTH"
  | "SEGMENTATION_AREA"
  | "BOUNDING_BOX_AREA"
  | "PREVIOUS_CONFIRMED_PORTION"
  | "VISUAL_MODEL_PORTION_PRIOR"
  | "USER_SELECTED_SERVING"
  | "RECIPE_SERVING"
  | "NO_SCALE_REFERENCE";

/** 1 = most reliable. Decreasing confidence as the number grows. */
export type ReliabilityTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ValidationState = "CONFIRMED" | "REVIEWED" | "ESTIMATED" | "UNVERIFIED" | "REJECTED";

/**
 * Authority class is deliberately separate from the numeric reliability tier:
 * it describes what kind of claim the evidence is allowed to make. A visual
 * prior can be useful while still being prohibited from masquerading as a
 * physical measurement.
 */
export type PortionAuthorityClass =
  | "DIRECT"
  | "DECLARED"
  | "CALIBRATED_PHYSICAL"
  | "CONVERSION"
  | "BEHAVIORAL_PRIOR"
  | "VISUAL_PRIOR"
  | "UNSCALED_CONTEXT";

export type PortionEvidenceProvenance = {
  schemaVersion: typeof PORTION_EVIDENCE_PROVENANCE_SCHEMA_VERSION;
  evidenceId: string;
  mealItemId: string;
  authorityClass: PortionAuthorityClass;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  deviceId?: string;
  calibrationId?: string;
  provider?: string;
  providerModel?: string;
  algorithmVersion?: string;
  sourceRevision?: string;
  limitations: readonly string[];
};

export type PortionEvidenceRecord = {
  evidenceType: PortionEvidenceType;
  /** Central/non-negative supplied value in `unit`. */
  suppliedValue: number;
  /** Optional upstream measurement interval in the same unit. */
  minimumValue?: number;
  maximumValue?: number;
  unit: string;
  source: string;
  reliabilityTier: ReliabilityTier;
  /** Legacy convenience fields retained while runtime callers migrate. */
  calibrationId?: string;
  sourceRevision?: string;
  /** Canonical persisted provenance. Runtime-only legacy evidence may omit it. */
  provenance?: PortionEvidenceProvenance;
  /** ISO-8601 collection timestamp. */
  collectedAt: string;
  assumptions: readonly string[];
  validationState: ValidationState;
};

/** Versioned reliability ranking. Configuration, not scientific fact. */
export type PortionEvidencePolicy = {
  version: number;
  tier: Record<PortionEvidenceType, ReliabilityTier>;
};

export const DEFAULT_PORTION_EVIDENCE_POLICY: PortionEvidencePolicy = {
  version: PORTION_EVIDENCE_POLICY_VERSION,
  tier: {
    // Direct observed/declared mass.
    MANUAL_GRAMS: 1,
    PACKAGE_LABEL: 1,
    // Verified serving/piece mass can be strong when the conversion record is reviewed.
    BARCODE_SERVING: 2,
    PIECE_COUNT: 2,
    // Physical volume is useful only when calibration and density provenance exist.
    CALIBRATED_VOLUME: 3,
    CALIBRATED_DEPTH_VOLUME: 3,
    CONTAINER_FILL_VOLUME: 3,
    // These are scale/context observations, not mass by themselves.
    KNOWN_PLATE_DIAMETER: 3,
    KNOWN_BOWL_VOLUME: 3,
    REFERENCE_CARD: 3,
    SECOND_IMAGE: 4,
    SIDE_IMAGE: 4,
    DEVICE_DEPTH: 4,
    RECIPE_SERVING: 4,
    // Behavioral priors.
    PREVIOUS_CONFIRMED_PORTION: 5,
    VISUAL_MODEL_PORTION_PRIOR: 5,
    USER_SELECTED_SERVING: 5,
    // Uncalibrated visual geometry cannot be authoritative mass evidence.
    SEGMENTATION_AREA: 6,
    BOUNDING_BOX_AREA: 6,
    NO_SCALE_REFERENCE: 7,
  },
};

export function reliabilityTierOf(
  evidenceType: PortionEvidenceType,
  policy: PortionEvidencePolicy = DEFAULT_PORTION_EVIDENCE_POLICY,
): ReliabilityTier {
  return policy.tier[evidenceType];
}

export function authorityClassOf(evidenceType: PortionEvidenceType): PortionAuthorityClass {
  switch (evidenceType) {
    case "MANUAL_GRAMS": return "DIRECT";
    case "PACKAGE_LABEL": return "DECLARED";
    case "BARCODE_SERVING":
    case "PIECE_COUNT":
    case "RECIPE_SERVING": return "CONVERSION";
    case "CALIBRATED_VOLUME":
    case "CALIBRATED_DEPTH_VOLUME":
    case "CONTAINER_FILL_VOLUME": return "CALIBRATED_PHYSICAL";
    case "PREVIOUS_CONFIRMED_PORTION": return "BEHAVIORAL_PRIOR";
    case "VISUAL_MODEL_PORTION_PRIOR":
    case "USER_SELECTED_SERVING": return "VISUAL_PRIOR";
    case "KNOWN_PLATE_DIAMETER":
    case "KNOWN_BOWL_VOLUME":
    case "REFERENCE_CARD":
    case "SECOND_IMAGE":
    case "SIDE_IMAGE":
    case "DEVICE_DEPTH":
    case "SEGMENTATION_AREA":
    case "BOUNDING_BOX_AREA":
    case "NO_SCALE_REFERENCE": return "UNSCALED_CONTEXT";
  }
}

const VALIDATION_STATES: readonly ValidationState[] = ["CONFIRMED", "REVIEWED", "ESTIMATED", "UNVERIFIED", "REJECTED"];
const CONFIDENCE_LEVELS = new Set(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"]);

const isValidationState = (value: unknown): value is ValidationState =>
  typeof value === "string" && VALIDATION_STATES.some((state) => state === value);

/** Returns error strings; an empty array means the legacy-compatible record is valid. */
export function validateEvidenceRecord(
  record: unknown,
  policy: PortionEvidencePolicy = DEFAULT_PORTION_EVIDENCE_POLICY,
): string[] {
  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    return ["invalid_record"];
  }
  const value = record as Record<string, unknown>;
  const errors: string[] = [];
  const knownTypes = Object.keys(policy.tier);
  const evidenceType = String(value.evidenceType) as PortionEvidenceType;
  if (!knownTypes.includes(evidenceType)) errors.push("invalid_evidence_type");
  if (typeof value.suppliedValue !== "number" || !Number.isFinite(value.suppliedValue) || value.suppliedValue < 0) errors.push("invalid_supplied_value");
  const min = value.minimumValue;
  const max = value.maximumValue;
  if (min !== undefined && (typeof min !== "number" || !Number.isFinite(min) || min < 0)) errors.push("invalid_minimum_value");
  if (max !== undefined && (typeof max !== "number" || !Number.isFinite(max) || max < 0)) errors.push("invalid_maximum_value");
  if (typeof value.suppliedValue === "number" && Number.isFinite(value.suppliedValue)) {
    if (typeof min === "number" && min > value.suppliedValue) errors.push("minimum_above_central");
    if (typeof max === "number" && max < value.suppliedValue) errors.push("maximum_below_central");
  }
  if (typeof min === "number" && typeof max === "number" && min > max) errors.push("unordered_value_range");
  if (typeof value.unit !== "string") errors.push("invalid_unit");
  const tier = value.reliabilityTier;
  if (typeof tier !== "number" || !Number.isInteger(tier) || tier < 1 || tier > 7) {
    errors.push("invalid_reliability_tier");
  } else if (knownTypes.includes(evidenceType) && tier !== policy.tier[evidenceType]) {
    errors.push("reliability_tier_mismatch");
  }
  if (typeof value.source !== "string" || value.source.trim().length === 0) errors.push("invalid_source");
  if (typeof value.collectedAt !== "string" || Number.isNaN(Date.parse(value.collectedAt))) errors.push("invalid_collected_at");
  if (!isValidationState(value.validationState)) errors.push("invalid_validation_state");
  if (!Array.isArray(value.assumptions)) errors.push("assumptions_must_be_array");
  return errors;
}

/**
 * Strict validator for evidence that is about to become persisted canonical
 * provenance. It intentionally does not make provenance mandatory for older
 * runtime evidence objects; adapters can migrate those without breaking the
 * estimator itself.
 */
export function validateCanonicalEvidenceRecord(
  record: unknown,
  policy: PortionEvidencePolicy = DEFAULT_PORTION_EVIDENCE_POLICY,
): string[] {
  const errors = validateEvidenceRecord(record, policy);
  if (typeof record !== "object" || record === null || Array.isArray(record)) return errors;
  const value = record as Record<string, unknown>;
  const provenance = value.provenance;
  if (typeof provenance !== "object" || provenance === null || Array.isArray(provenance)) {
    return [...errors, "provenance_required"];
  }
  const p = provenance as Record<string, unknown>;
  if (p.schemaVersion !== PORTION_EVIDENCE_PROVENANCE_SCHEMA_VERSION) errors.push("invalid_provenance_schema_version");
  if (typeof p.evidenceId !== "string" || !p.evidenceId.trim()) errors.push("invalid_provenance_evidence_id");
  if (typeof p.mealItemId !== "string" || !p.mealItemId.trim()) errors.push("invalid_provenance_meal_item_id");
  if (!Array.isArray(p.limitations) || p.limitations.some((item) => typeof item !== "string")) errors.push("invalid_provenance_limitations");
  if (typeof p.confidence !== "string" || !CONFIDENCE_LEVELS.has(p.confidence)) errors.push("invalid_provenance_confidence");
  const evidenceType = typeof value.evidenceType === "string" ? value.evidenceType as PortionEvidenceType : null;
  if (evidenceType && Object.hasOwn(policy.tier, evidenceType) && p.authorityClass !== authorityClassOf(evidenceType)) {
    errors.push("provenance_authority_mismatch");
  }
  return errors;
}

export class PortionEvidenceError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "PortionEvidenceError";
  }
}
