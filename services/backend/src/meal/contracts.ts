import type {
  FoodIdentity,
  NutritionSnapshot,
  PortionEvidence,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

export const MEAL_SCHEMA_VERSION = 1 as const;

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type MealSourceType = "camera" | "photo_picker" | "barcode" | "manual" | "sample";
export type MealDraftState = "DRAFT" | "ANALYZING" | "NEEDS_REVIEW" | "CONFIRMED";
export type MealAnalysisState = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type MealProviderName = "local_deterministic" | "gemini" | "open_food_facts";

export type MealMediaRef = {
  objectId: string;
  checksum?: string;
  mediaType?: "image/jpeg" | "image/png" | "image/webp";
};

/**
 * Compatibility DTO used by the existing meal runtime. Canonical Food
 * contracts are embedded directly rather than redefined. Optional nutrients
 * use null for unknown; zero is reserved for a known measured/reported zero.
 */
export type NutritionItem = {
  itemId: string;
  displayName: string;
  portionGrams: number;
  energyKcal: number;
  proteinGrams: number;
  carbGrams: number | null;
  fatGrams: number | null;
  fiberGrams: number | null;
  confidence: "low" | "medium" | "high";
  energyRangeKcal: { min: number; max: number };
  foodIdentity?: FoodIdentity;
  portionEvidence?: PortionEvidence;
  nutritionSnapshot?: NutritionSnapshot;
};

export type AggregateNutrientCode = "CARBOHYDRATE" | "FAT" | "FIBER";

/**
 * Legacy projections require additive numeric totals. `unknownNutrients`
 * records when a numeric aggregate is only the sum of known observations and
 * therefore must not be presented as a complete measured value. Canonical
 * per-item/snapshot truth remains nullable.
 */
export type NutritionTotals = {
  energyKcal: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
  unknownNutrients?: readonly AggregateNutrientCode[];
};

export type MealDraft = {
  draftId: string;
  userId: string;
  localDate: string;
  mealType: MealType;
  sourceType: MealSourceType;
  note?: string;
  state: MealDraftState;
  activeRevision: number;
  imageRef?: MealMediaRef;
  analysisRequestId?: string;
  createdAtEpochMillis: number;
  updatedAtEpochMillis: number;
};

export type MealDraftRevision = {
  draftRevisionId: string;
  draftId: string;
  userId: string;
  revision: number;
  items: NutritionItem[];
  totals: NutritionTotals;
  source: "capture" | "analysis" | "user_correction" | "barcode";
  createdAtEpochMillis: number;
};

export type MealAnalysis = {
  analysisId: string;
  requestId: string;
  draftId: string;
  userId: string;
  draftRevision: number;
  state: MealAnalysisState;
  provider: MealProviderName;
  providerVersion: string;
  items: NutritionItem[];
  totals: NutritionTotals;
  createdAtEpochMillis: number;
  completedAtEpochMillis?: number;
  errorCode?: "provider_not_configured" | "provider_not_implemented" | "invalid_provider_response" | "provider_unavailable" | "provider_rate_limited" | "provider_timeout" | "analysis_cancelled";
};

export type MealAnalysisRequest = {
  requestId: string;
  userId: string;
  draftId: string;
  idempotencyKey: string;
  provider: MealProviderName;
  state: MealAnalysisState;
  activeAttempt: number;
  createdAtEpochMillis: number;
  completedAtEpochMillis?: number;
  errorCode?: "provider_not_configured" | "provider_not_implemented" | "invalid_provider_response" | "provider_unavailable" | "provider_rate_limited" | "provider_timeout" | "analysis_cancelled";
  result?: MealAnalysis;
};

export type ConfirmedMeal = {
  mealId: string;
  userId: string;
  localDate: string;
  mealType: MealType;
  status: "CONFIRMED" | "DELETED";
  currentRevision: number;
  sourceDraftId: string;
  items: NutritionItem[];
  totals: NutritionTotals;
  confirmedAtEpochMillis: number;
  createdAtEpochMillis: number;
  updatedAtEpochMillis: number;
  deletedAtEpochMillis?: number;
};

export type SavedMealItem = {
  savedMealItemId: string;
  savedMealId: string;
  userId: string;
  sortOrder: number;
  foodRef?: string;
  displayName: string;
  grams?: number;
  portionJson: Record<string, unknown>;
  nutrientsJson: NutritionTotals;
};

export type SavedMeal = {
  savedMealId: string;
  userId: string;
  name: string;
  currentRevision: number;
  totalEnergyKcal: number;
  totalProteinG: number;
  items: SavedMealItem[];
  createdAtEpochMillis: number;
  updatedAtEpochMillis: number;
  deletedAtEpochMillis?: number;
};

export type DailyMealTotals = NutritionTotals & { localDate: string; confirmedMealCount: number };

export type MealCreateDraftInput = {
  localDate: string;
  mealType: MealType;
  sourceType: MealSourceType;
  note?: string;
  imageRef?: MealMediaRef | string;
};

export type SaveMealInput = { idempotencyKey: string; name: string; items: unknown };

export type MealReviseDraftInput = {
  expectedRevision?: number;
  items: Array<Partial<NutritionItem> & Pick<NutritionItem, "displayName" | "portionGrams" | "energyKcal" | "proteinGrams">>;
  note?: string;
};

export type MealAnalysisInput = { draft: MealDraft; draftRevision?: MealDraftRevision };

export type MealProviderResult = {
  state: "COMPLETED" | "FAILED";
  provider: MealProviderName;
  providerVersion: string;
  items: NutritionItem[];
  totals: NutritionTotals;
  errorCode?: "provider_not_configured" | "provider_not_implemented" | "invalid_provider_response" | "provider_unavailable" | "provider_rate_limited" | "provider_timeout";
};

export type MealAnalyzerProvider = {
  readonly name: MealProviderName;
  readonly version: string;
  analyze(input: MealAnalysisInput): Promise<MealProviderResult>;
};

export type MealErrorCode =
  | "invalid_user_id" | "invalid_local_date" | "invalid_meal_type" | "invalid_source_type" | "invalid_note" | "invalid_image_ref"
  | "draft_not_found" | "analysis_not_found" | "meal_not_found" | "invalid_idempotency_key" | "idempotency_key_reused"
  | "draft_already_confirmed" | "draft_revision_conflict" | "analysis_required" | "analysis_failed" | "analysis_not_retryable"
  | "analysis_already_completed" | "analysis_cancelled" | "confirmation_required" | "meal_already_deleted" | "invalid_items"
  | "untrusted_nutrition_authority" | "provider_not_configured" | "provider_not_implemented" | "invalid_provider_response"
  | "provider_unavailable" | "provider_rate_limited" | "provider_timeout" | "invalid_saved_meal_name" | "saved_meal_not_found"
  | "saved_meal_persistence_incomplete" | "meal_persistence_incomplete";

export class MealContractError extends Error {
  public readonly code: MealErrorCode;
  public readonly retryable: boolean;
  constructor(code: MealErrorCode, message: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.name = "MealContractError";
  }
}
