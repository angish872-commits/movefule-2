import type { FoodIdentity, NutritionSnapshot, PortionEvidence } from "../../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { NutritionItem } from "../../meal/contracts.ts";
import type { PackagedFoodLookupResult, PackagedFoodRecord } from "./openFoodFactsClient.ts";
import { normalizeBarcode } from "./barcode.ts";

export type PackagedFoodCandidate = {
  status: "NEEDS_REVIEW";
  barcode: string;
  item: NutritionItem;
  sourceRecord: PackagedFoodRecord;
};

export type PackagedFoodResolution =
  | PackagedFoodCandidate
  | { status: "MANUAL_FALLBACK"; barcode: string; reason: "NOT_FOUND" | "MALFORMED" | "PROVIDER_UNAVAILABLE" | "PROVIDER_RATE_LIMITED" | "PROVIDER_TIMEOUT" };

const round = (value: number): number => Math.round(value * 100) / 100;
const scale = (value: number | null, grams: number): number | null => value === null ? null : round(value * grams / 100);

/**
 * Turns an exact provider lookup into a review candidate. It never confirms the
 * meal. If serving grams are not known, the caller must collect a user-reviewed
 * portion before a confirmable item can be produced.
 */
export function packagedFoodCandidateFromLookup(
  result: PackagedFoodLookupResult,
  reviewedGrams?: number,
): PackagedFoodResolution {
  if (result.status === "NOT_FOUND") return { status: "MANUAL_FALLBACK", barcode: result.barcode, reason: "NOT_FOUND" };
  if (result.status === "MALFORMED") return { status: "MANUAL_FALLBACK", barcode: result.barcode, reason: "MALFORMED" };
  if (result.status === "UNAVAILABLE") {
    return {
      status: "MANUAL_FALLBACK",
      barcode: result.barcode,
      reason: result.reason === "RATE_LIMITED" ? "PROVIDER_RATE_LIMITED" : result.reason === "TIMEOUT" ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
    };
  }

  const source = result.record;
  const grams = reviewedGrams ?? source.servingGrams;
  if (grams === null || grams === undefined || !Number.isFinite(grams) || grams <= 0) {
    return { status: "MANUAL_FALLBACK", barcode: source.barcode, reason: "MALFORMED" };
  }
  const identity: FoodIdentity = {
    schemaVersion: 1,
    identityId: `barcode:${source.barcode}:identity`,
    canonicalName: source.productName,
    preparationCode: null,
    sourceType: "OPEN_FOOD_FACTS",
    sourceReference: source.sourceReference,
    aliasCodes: source.brand ? [source.brand] : [],
    confidence: "HIGH",
    reasonCodes: ["EXACT_BARCODE_MATCH"],
  };
  const portion: PortionEvidence = {
    schemaVersion: 1,
    evidenceId: `barcode:${source.barcode}:portion`,
    method: reviewedGrams !== undefined ? "MANUAL_GRAMS" : "PACKAGE_LABEL",
    estimatedGrams: grams,
    minimumGrams: grams,
    maximumGrams: grams,
    physicalEvidence: reviewedGrams !== undefined,
    sourceReference: reviewedGrams !== undefined ? "user-reviewed-grams" : source.sourceReference,
    confidence: "HIGH",
    reasonCodes: [reviewedGrams !== undefined ? "USER_REVIEWED_GRAMS" : "PACKAGE_SERVING_GRAMS"],
  };
  const nutrients = source.nutrientsPer100g;
  const snapshot: NutritionSnapshot = {
    schemaVersion: 1,
    snapshotId: `barcode:${source.barcode}:candidate`,
    sourceType: source.sourceType,
    sourceReference: source.sourceReference,
    sourceRevision: source.sourceRevision,
    portionGrams: grams,
    nutrients: {
      energyKcal: scale(nutrients.energyKcal, grams),
      proteinGrams: scale(nutrients.proteinG, grams),
      carbGrams: scale(nutrients.carbG, grams),
      fatGrams: scale(nutrients.fatG, grams),
      fiberGrams: scale(nutrients.fiberG, grams),
      sodiumMg: scale(nutrients.sodiumMg, grams),
    },
    dataQuality: "HIGH",
    limitations: [...source.limitations],
    createdAt: new Date(0).toISOString(),
  };
  const energy = scale(nutrients.energyKcal, grams)!;
  const item: NutritionItem = {
    itemId: `barcode:${source.barcode}`,
    displayName: source.productName,
    portionGrams: grams,
    energyKcal: energy,
    proteinGrams: scale(nutrients.proteinG, grams)!,
    carbGrams: scale(nutrients.carbG, grams),
    fatGrams: scale(nutrients.fatG, grams),
    fiberGrams: scale(nutrients.fiberG, grams),
    confidence: "high",
    energyRangeKcal: { min: energy, max: energy },
    foodIdentity: identity,
    portionEvidence: portion,
    nutritionSnapshot: snapshot,
  };
  return { status: "NEEDS_REVIEW", barcode: source.barcode, item, sourceRecord: source };
}
