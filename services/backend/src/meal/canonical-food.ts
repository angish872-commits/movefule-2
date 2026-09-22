import type {
  DataQuality,
  FoodIdentity,
  NutritionSnapshot,
  PortionEvidence,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import { MealContractError, type NutritionItem } from "./contracts.ts";

const AI_AUTHORITY_MARKERS = ["AI", "GEMINI", "VISION", "MODEL_PREDICTION", "LLM"] as const;
const TRUSTED_NUTRIENT_SOURCES = new Set([
  "USDA_FDC",
  "MOVEFUEL_RECIPE",
  "OPEN_FOOD_FACTS",
  "PERSONAL_FOOD",
  "USER_REVIEWED_MANUAL",
  "USER_CORRECTION",
]);

export type CanonicalFreezeContext = {
  mealId: string;
  revision: number;
  sourceDraftId: string;
  createdAtEpochMillis: number;
  correction?: boolean;
};

function quality(confidence: NutritionItem["confidence"]): DataQuality {
  return confidence === "high" ? "HIGH" : confidence === "medium" ? "MEDIUM" : "LOW";
}

export function isTrustedNutrientSource(sourceType: string): boolean {
  const normalized = sourceType.trim().toUpperCase();
  if (!normalized || AI_AUTHORITY_MARKERS.some((marker) => normalized.includes(marker))) return false;
  return TRUSTED_NUTRIENT_SOURCES.has(normalized);
}

export function assertTrustedNutritionSnapshot(snapshot: NutritionSnapshot): void {
  if (!isTrustedNutrientSource(snapshot.sourceType)) {
    throw new MealContractError(
      "untrusted_nutrition_authority",
      `Nutrition snapshot source ${snapshot.sourceType || "UNKNOWN"} is not permitted as canonical nutrient authority.`,
    );
  }
  if (!Number.isFinite(snapshot.portionGrams) || snapshot.portionGrams <= 0) {
    throw new MealContractError("invalid_items", "Canonical nutrition snapshot requires a positive portionGrams value.");
  }
  if (!snapshot.nutrients || typeof snapshot.nutrients !== "object" || Array.isArray(snapshot.nutrients)) {
    throw new MealContractError("invalid_items", "Canonical nutrition snapshot requires structured nutrients.");
  }
}

function userIdentity(item: NutritionItem, context: CanonicalFreezeContext): FoodIdentity {
  return {
    schemaVersion: 1,
    identityId: `${context.mealId}:${context.revision}:${item.itemId}:identity`,
    canonicalName: item.displayName,
    preparationCode: null,
    sourceType: context.correction ? "USER_CORRECTION" : "USER_REVIEWED",
    sourceReference: context.sourceDraftId,
    aliasCodes: [],
    confidence: quality(item.confidence),
    reasonCodes: [context.correction ? "USER_CORRECTED_IDENTITY" : "USER_REVIEWED_IDENTITY"],
  };
}

function userPortion(item: NutritionItem, context: CanonicalFreezeContext): PortionEvidence {
  return {
    schemaVersion: 1,
    evidenceId: `${context.mealId}:${context.revision}:${item.itemId}:portion`,
    method: "MANUAL_GRAMS",
    estimatedGrams: item.portionGrams,
    minimumGrams: item.portionGrams,
    maximumGrams: item.portionGrams,
    physicalEvidence: true,
    sourceReference: context.sourceDraftId,
    confidence: quality(item.confidence),
    reasonCodes: [context.correction ? "USER_CORRECTED_GRAMS" : "USER_REVIEWED_GRAMS"],
  };
}

function snapshotFromItem(item: NutritionItem, context: CanonicalFreezeContext): NutritionSnapshot {
  const prior = item.nutritionSnapshot;
  if (prior) assertTrustedNutritionSnapshot(prior);
  const sourceType = prior?.sourceType ?? (context.correction ? "USER_CORRECTION" : "USER_REVIEWED_MANUAL");
  const sourceReference = prior?.sourceReference ?? context.sourceDraftId;
  const sourceRevision = prior?.sourceRevision ?? null;
  if (!isTrustedNutrientSource(sourceType)) {
    throw new MealContractError("untrusted_nutrition_authority", "AI/candidate output cannot be frozen as canonical nutrient authority.");
  }
  const limitations = new Set(prior?.limitations ?? []);
  if (item.carbGrams === null) limitations.add("CARBOHYDRATE_UNKNOWN");
  if (item.fatGrams === null) limitations.add("FAT_UNKNOWN");
  if (item.fiberGrams === null) limitations.add("FIBER_UNKNOWN");
  if (!prior) limitations.add(context.correction ? "USER_CORRECTED_NUTRIENTS" : "USER_REVIEWED_NUTRIENTS");
  return {
    schemaVersion: 1,
    snapshotId: `${context.mealId}:${context.revision}:${item.itemId}:nutrition`,
    sourceType,
    sourceReference,
    sourceRevision,
    portionGrams: item.portionGrams,
    nutrients: {
      energyKcal: item.energyKcal,
      proteinGrams: item.proteinGrams,
      carbGrams: item.carbGrams,
      fatGrams: item.fatGrams,
      fiberGrams: item.fiberGrams,
    },
    dataQuality: prior?.dataQuality ?? quality(item.confidence),
    limitations: [...limitations],
    createdAt: new Date(context.createdAtEpochMillis).toISOString(),
  };
}

/**
 * Re-issues canonical identity/evidence/snapshot IDs for every accepted meal
 * revision. Existing source provenance may be carried forward, but the frozen
 * nutrient values are copied from the accepted reviewed item so later provider
 * changes cannot mutate historical truth.
 */
export function freezeCanonicalFoodItems(
  items: readonly NutritionItem[],
  context: CanonicalFreezeContext,
): NutritionItem[] {
  return items.map((item) => {
    const priorPortion = item.portionEvidence;
    const portionEvidence: PortionEvidence = priorPortion ? {
      ...priorPortion,
      schemaVersion: 1,
      evidenceId: `${context.mealId}:${context.revision}:${item.itemId}:portion`,
      sourceReference: priorPortion.sourceReference ?? context.sourceDraftId,
      reasonCodes: [...priorPortion.reasonCodes, context.correction ? "ACCEPTED_CORRECTION_REVISION" : "ACCEPTED_CONFIRMATION_REVISION"],
    } : userPortion(item, context);
    const foodIdentity: FoodIdentity = item.foodIdentity ? {
      ...item.foodIdentity,
      schemaVersion: 1,
      identityId: `${context.mealId}:${context.revision}:${item.itemId}:identity`,
      sourceReference: item.foodIdentity.sourceReference ?? context.sourceDraftId,
    } : userIdentity(item, context);
    const nutritionSnapshot = snapshotFromItem(item, context);
    return { ...item, foodIdentity, portionEvidence, nutritionSnapshot };
  });
}
