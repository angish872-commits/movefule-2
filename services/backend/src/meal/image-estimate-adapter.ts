import type {
  DataQuality,
  FoodIdentity,
  NutritionSnapshot,
  PortionEvidence,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { ImageEstimateItem, ImageEstimateResult } from "../nutrition/algorithm/imageEstimatePipeline.ts";
import type { PortionEvidenceType } from "../nutrition/portion/portionEvidence.ts";
import type { NutritionItem } from "./contracts.ts";

const PHYSICAL_PORTION_EVIDENCE = new Set<PortionEvidenceType>([
  "MANUAL_GRAMS",
  "PACKAGE_LABEL",
  "BARCODE_SERVING",
  "PIECE_COUNT",
  "CALIBRATED_VOLUME",
  "CALIBRATED_DEPTH_VOLUME",
  "CONTAINER_FILL_VOLUME",
]);

function finiteNonNegative(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function quality(item: ImageEstimateItem): DataQuality {
  return item.confidence.overall === "HIGH" ? "HIGH" : item.confidence.overall === "MEDIUM" ? "MEDIUM" : "LOW";
}

function sourceReference(item: ImageEstimateItem): string | null {
  const source = item.selectedSource;
  if (!source) return null;
  if (source.source === "USDA_FDC" && source.fdcId !== null) return `fdc:${source.fdcId}`;
  if (source.source === "MOVEFUEL_RECIPE" && source.recipeRevisionId) return `recipe:${source.recipeRevisionId}`;
  return null;
}

function identityFor(result: ImageEstimateResult, item: ImageEstimateItem, itemIndex: number): FoodIdentity {
  const selectedIndex = item.selectedCandidateIndex ?? 0;
  const candidate = item.candidates[selectedIndex] ?? item.candidates[0];
  return {
    schemaVersion: 1,
    identityId: `${result.resultId}:${item.itemId}:candidate`,
    canonicalName: item.selectedSource?.description?.trim() || candidate?.name?.trim() || `Reviewed food item ${itemIndex + 1}`,
    preparationCode: item.selectedPreparation?.label ?? null,
    sourceType: "VISION_CANDIDATE_REVIEW",
    sourceReference: result.resultId,
    aliasCodes: candidate?.searchTerms ? [...candidate.searchTerms] : [],
    confidence: quality(item),
    reasonCodes: ["USER_CONFIRMATION_REQUIRED", "IDENTITY_CANDIDATE_ONLY"],
  };
}

/**
 * Older image-estimate revisions represented an explicit reviewed gram
 * correction as USER_SELECTED_SERVING even though the posterior was tagged
 * DIRECT_AUTHORITY. Canonical persistence fixes that semantic mismatch at the
 * compatibility boundary: a direct gram correction is MANUAL_GRAMS, while an
 * ordinary selected serving remains a weak prior.
 */
export function canonicalPortionEvidenceMethod(item: ImageEstimateItem): string {
  const portion = item.portion;
  if (!portion) return "UNKNOWN";
  const first = portion.evidenceUsed[0] ?? "UNKNOWN";
  if (first === "USER_SELECTED_SERVING" && portion.fusionMethod === "DIRECT_AUTHORITY") return "MANUAL_GRAMS";
  return first;
}

function portionFor(result: ImageEstimateResult, item: ImageEstimateItem): PortionEvidence | null {
  const portion = item.portion;
  if (!portion) return null;
  const method = canonicalPortionEvidenceMethod(item);
  const physical = method === "MANUAL_GRAMS" || portion.evidenceUsed.some((evidence) => PHYSICAL_PORTION_EVIDENCE.has(evidence));
  return {
    schemaVersion: 1,
    evidenceId: `${result.resultId}:${item.itemId}:portion`,
    method,
    estimatedGrams: finiteNonNegative(portion.centralGrams),
    minimumGrams: finiteNonNegative(portion.minimumGrams),
    maximumGrams: finiteNonNegative(portion.maximumGrams),
    physicalEvidence: physical,
    sourceReference: result.resultId,
    confidence: quality(item),
    reasonCodes: [
      ...portion.evidenceUsed.map((evidence) => `EVIDENCE_${evidence}`),
      ...(method !== (portion.evidenceUsed[0] ?? "UNKNOWN") ? ["LEGACY_DIRECT_GRAM_CORRECTION_CANONICALIZED"] : []),
      ...(physical ? ["PHYSICAL_OR_DECLARED_PORTION_EVIDENCE"] : ["PORTION_REMAINS_ESTIMATED"]),
    ],
  };
}

function nutritionFor(result: ImageEstimateResult, item: ImageEstimateItem, grams: number): NutritionSnapshot | null {
  const source = item.selectedSource;
  const nutrients = item.nutrients;
  if (!source || !nutrients) return null;
  const energy = finiteNonNegative(nutrients.energyKcal.central);
  const protein = finiteNonNegative(nutrients.proteinG.central);
  if (energy === null || protein === null) return null;
  const carb = finiteNonNegative(nutrients.carbG.central);
  const fat = finiteNonNegative(nutrients.fatG.central);
  const fiber = finiteNonNegative(nutrients.fiberG.central);
  const limitations = new Set<string>(item.uncertainties);
  if (carb === null) limitations.add("CARBOHYDRATE_UNKNOWN");
  if (fat === null) limitations.add("FAT_UNKNOWN");
  if (fiber === null) limitations.add("FIBER_UNKNOWN");
  return {
    schemaVersion: 1,
    snapshotId: `${result.resultId}:${item.itemId}:nutrition-source`,
    sourceType: source.source,
    sourceReference: sourceReference(item),
    sourceRevision: source.source === "MOVEFUEL_RECIPE" ? source.recipeRevisionId : null,
    portionGrams: grams,
    nutrients: {
      energyKcal: energy,
      proteinGrams: protein,
      carbGrams: carb,
      fatGrams: fat,
      fiberGrams: fiber,
    },
    dataQuality: quality(item),
    limitations: [...limitations],
    createdAt: result.createdAt,
  };
}

/**
 * Server-only adapter from candidate estimate output to the legacy meal DTO.
 * The client cannot supply or upgrade these authority fields. Unknown optional
 * nutrients remain null; trusted nutrient provenance is copied from the
 * resolver-selected source before the immutable confirmation snapshot is cut.
 */
export function candidateEstimateItemsForConfirmation(result: ImageEstimateResult): NutritionItem[] | null {
  if (result.state !== "COMPLETED_NEEDS_CONFIRMATION" || result.items.length === 0) return null;
  const items: NutritionItem[] = [];
  for (const [index, item] of result.items.entries()) {
    const grams = finiteNonNegative(item.portion?.centralGrams);
    const energy = finiteNonNegative(item.nutrients?.energyKcal.central);
    const protein = finiteNonNegative(item.nutrients?.proteinG.central);
    const energyMin = finiteNonNegative(item.nutrients?.energyKcal.minimum);
    const energyMax = finiteNonNegative(item.nutrients?.energyKcal.maximum);
    if (grams === null || grams <= 0 || energy === null || protein === null || energyMin === null || energyMax === null || !item.selectedSource) return null;
    const carb = finiteNonNegative(item.nutrients?.carbG.central);
    const fat = finiteNonNegative(item.nutrients?.fatG.central);
    const fiber = finiteNonNegative(item.nutrients?.fiberG.central);
    const foodIdentity = identityFor(result, item, index);
    const portionEvidence = portionFor(result, item);
    const nutritionSnapshot = nutritionFor(result, item, grams);
    if (!portionEvidence || !nutritionSnapshot) return null;
    items.push({
      itemId: item.itemId,
      displayName: foodIdentity.canonicalName,
      portionGrams: grams,
      energyKcal: energy,
      proteinGrams: protein,
      carbGrams: carb,
      fatGrams: fat,
      fiberGrams: fiber,
      confidence: item.confidence.overall === "HIGH" ? "high" : item.confidence.overall === "MEDIUM" ? "medium" : "low",
      energyRangeKcal: { min: energyMin, max: energyMax },
      foodIdentity,
      portionEvidence,
      nutritionSnapshot,
    });
  }
  return items;
}
