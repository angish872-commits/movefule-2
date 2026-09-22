import assert from "node:assert/strict";
import test from "node:test";
import type { ImageEstimateResult } from "../../nutrition/algorithm/imageEstimatePipeline.ts";
import { candidateEstimateItemsForConfirmation } from "../../meal/image-estimate-adapter.ts";
import { validateItems, validateServerOwnedItems } from "../../meal/nutrition.ts";

function result(evidenceUsed: readonly string[], fusionMethod?: "DIRECT_AUTHORITY" | "PRIOR_ONLY"): ImageEstimateResult {
  return {
    resultId: "result-1",
    state: "COMPLETED_NEEDS_CONFIRMATION",
    createdAt: "2026-08-30T00:00:00.000Z",
    items: [{
      itemId: "item-1",
      selectedCandidateIndex: 0,
      candidates: [{
        name: "Lentil soup",
        searchTerms: ["lentil soup", "dal"],
        foodType: "PREPARED",
        preparationCandidates: [],
        providerConfidence: 0.8,
        modelProviderVersion: "candidate-test",
        uncertaintyNotes: [],
      }],
      selectedPreparation: { label: "cooked", confidence: 0.9 },
      selectedSource: {
        source: "USDA_FDC",
        fdcId: 12345,
        recipeRevisionId: null,
        dataType: "FOUNDATION",
        description: "Lentil soup, cooked",
      },
      portion: {
        minimumGrams: 190,
        centralGrams: 200,
        maximumGrams: 210,
        confidence: "HIGH",
        evidenceUsed: evidenceUsed as any,
        evidenceRejected: [],
        assumptions: [],
        uncertainties: [],
        estimatorVersion: "test",
        requiresClarification: false,
        requiresUserConfirmation: true,
        rangeCalibrated: false,
        calibrationProfileId: null,
        fusionMethod: fusionMethod ?? (evidenceUsed.includes("MANUAL_GRAMS") ? "DIRECT_AUTHORITY" : "PRIOR_ONLY"),
      },
      nutrients: {
        energyKcal: { minimum: 180, central: 200, maximum: 220 },
        proteinG: { minimum: 10, central: 12, maximum: 14 },
        carbG: { minimum: null, central: null, maximum: null },
        fatG: { minimum: 2, central: 3, maximum: 4 },
        fiberG: { minimum: null, central: null, maximum: null },
        sodiumMg: { minimum: null, central: null, maximum: null },
      },
      uncertainties: ["carbohydrate not reported by selected source"],
      confidence: { overall: "HIGH" },
    }],
  } as unknown as ImageEstimateResult;
}

test("image adapter preserves trusted nutrient provenance and unknown optional nutrients", () => {
  const items = candidateEstimateItemsForConfirmation(result(["VISUAL_MODEL_PORTION_PRIOR"]));
  assert.ok(items);
  assert.equal(items[0]!.carbGrams, null);
  assert.equal(items[0]!.fiberGrams, null);
  assert.equal(items[0]!.nutritionSnapshot?.sourceType, "USDA_FDC");
  assert.equal(items[0]!.nutritionSnapshot?.sourceReference, "fdc:12345");
  assert.equal((items[0]!.nutritionSnapshot?.nutrients as any).carbGrams, null);
  assert.equal(items[0]!.portionEvidence?.physicalEvidence, false);
  assert.equal(items[0]!.foodIdentity?.sourceType, "VISION_CANDIDATE_REVIEW");
});

test("direct gram evidence is marked physical while visual evidence never is", () => {
  const direct = candidateEstimateItemsForConfirmation(result(["MANUAL_GRAMS"]));
  const visual = candidateEstimateItemsForConfirmation(result(["VISUAL_MODEL_PORTION_PRIOR"]));
  assert.equal(direct?.[0]?.portionEvidence?.physicalEvidence, true);
  assert.equal(direct?.[0]?.portionEvidence?.method, "MANUAL_GRAMS");
  assert.equal(visual?.[0]?.portionEvidence?.physicalEvidence, false);
});

test("legacy direct gram correction is persisted canonically as MANUAL_GRAMS", () => {
  const corrected = candidateEstimateItemsForConfirmation(result(["USER_SELECTED_SERVING"], "DIRECT_AUTHORITY"));
  assert.equal(corrected?.[0]?.portionEvidence?.method, "MANUAL_GRAMS");
  assert.equal(corrected?.[0]?.portionEvidence?.physicalEvidence, true);
  assert.ok(corrected?.[0]?.portionEvidence?.reasonCodes.includes("LEGACY_DIRECT_GRAM_CORRECTION_CANONICALIZED"));
});

test("weak selected serving remains a non-physical prior", () => {
  const prior = candidateEstimateItemsForConfirmation(result(["USER_SELECTED_SERVING"], "PRIOR_ONLY"));
  assert.equal(prior?.[0]?.portionEvidence?.method, "USER_SELECTED_SERVING");
  assert.equal(prior?.[0]?.portionEvidence?.physicalEvidence, false);
});

test("canonical metadata survives only the server-owned validation path", () => {
  const items = candidateEstimateItemsForConfirmation(result(["MANUAL_GRAMS"]))!;
  const generic = validateItems(items);
  const serverOwned = validateServerOwnedItems(items);
  assert.equal(generic[0]!.nutritionSnapshot, undefined);
  assert.equal(generic[0]!.portionEvidence, undefined);
  assert.equal(serverOwned[0]!.nutritionSnapshot?.sourceType, "USDA_FDC");
  assert.equal(serverOwned[0]!.portionEvidence?.method, "MANUAL_GRAMS");
});
