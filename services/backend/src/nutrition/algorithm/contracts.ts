/**
 * MoveFuel nutrition-estimation contracts (schema version 1).
 *
 * These are strict, versioned types shared across the nutrition resolution
 * and calculation services. They deliberately separate:
 *  - identity (candidates) from nutrients (source resolution), and
 *  - portion range from confirmed values.
 */

export const NUTRITION_SCHEMA_VERSION = 1 as const;

export type FoodDataType =
  | "FOUNDATION"
  | "FNDDS"
  | "BRANDED"
  | "SR_LEGACY"
  | "EXPERIMENTAL"
  | "REVIEWED_RECIPE_ESTIMATE"
  | "UNREVIEWED_RECIPE_ESTIMATE";

export type FoodTypeKind = "BASIC" | "PACKAGED" | "PREPARED" | "MIXED_DISH" | "LIQUID" | "UNCLEAR";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

export type ImageQualityState = "ACCEPTABLE" | "REJECTED";

export type SourceResolutionStatus = "RESOLVED" | "NEEDS_USER_REVIEW";

/** A resolved nutrition source (FDC record or MoveFuel reviewed recipe). */
export type NutritionSource = {
  source: "USDA_FDC" | "MOVEFUEL_RECIPE";
  fdcId: number | null;
  recipeRevisionId: string | null;
  dataType: FoodDataType;
  description: string;
};

export type PortionRange = {
  pieces: number | null;
  minimumGrams: number;
  centralGrams: number;
  maximumGrams: number;
  evidence: readonly string[];
  confidence: ConfidenceLevel;
};

export type NutrientRange = {
  minimum: number | null;
  central: number | null;
  maximum: number | null;
};

export type FoodCandidate = {
  name: string;
  providerConfidence: number;
  searchTerms: readonly string[];
};

export type NutritionEstimateItem = {
  itemId: string;
  regionId: string | null;
  foodType: FoodTypeKind;
  candidates: readonly FoodCandidate[];
  selectedSource: NutritionSource | null;
  portion: PortionRange | null;
  nutrients: {
    energyKcal: NutrientRange;
    proteinG: NutrientRange;
    carbG: NutrientRange;
    fatG: NutrientRange;
    fiberG: NutrientRange;
    sodiumMg: NutrientRange;
  };
  uncertainties: readonly string[];
  requiresUserConfirmation: boolean;
};

export type ClarificationQuestion = {
  questionId: string;
  itemId: string;
  prompt: string;
  options?: readonly string[];
};

export type NutritionEstimate = {
  schemaVersion: typeof NUTRITION_SCHEMA_VERSION;
  estimateId: string;
  status: "NEEDS_REVIEW" | "RESOLVED" | "INSUFFICIENT";
  imageQuality: {
    state: ImageQualityState;
    issues: readonly string[];
  };
  items: readonly NutritionEstimateItem[];
  clarificationQuestions: readonly ClarificationQuestion[];
  requiresUserConfirmation: boolean;
};

/** Output when a source cannot be resolved. Never uses generic fallbacks. */
export function nutritionSourceUnresolved(): { status: SourceResolutionStatus; reason: "NUTRITION_SOURCE_NOT_RESOLVED" } {
  return { status: "NEEDS_USER_REVIEW", reason: "NUTRITION_SOURCE_NOT_RESOLVED" };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function validateNutritionEstimate(value: unknown): string[] {
  if (!isRecord(value)) return ["invalid_estimate"];
  const errors: string[] = [];
  if (value.schemaVersion !== NUTRITION_SCHEMA_VERSION) errors.push("unsupported_schema_version");
  if (!Array.isArray(value.items)) errors.push("items_must_be_array");
  const items = value.items as unknown[];
  for (const [index, rawItem] of items.entries()) {
    if (!isRecord(rawItem)) {
      errors.push(`items[${index}].invalid_item`);
      continue;
    }
    if (typeof rawItem.itemId !== "string" || rawItem.itemId.length === 0) {
      errors.push(`items[${index}].blank_item_id`);
    }
    const portion = rawItem.portion;
    if (portion !== null && portion !== undefined && isRecord(portion)) {
      const numeric = ["minimumGrams", "centralGrams", "maximumGrams"] as const;
      for (const field of numeric) {
        if (!isFiniteNonNegative(portion[field])) {
          errors.push(`items[${index}].portion.${field}`);
        }
      }
      if (
        isFiniteNonNegative(portion.minimumGrams) &&
        isFiniteNonNegative(portion.maximumGrams) &&
        (portion.minimumGrams as number) > (portion.maximumGrams as number)
      ) {
        errors.push(`items[${index}].portion.min_greater_than_max`);
      }
    }
  }
  return errors;
}

export class NutritionContractError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "NutritionContractError";
  }
}
