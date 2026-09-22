import assert from "node:assert/strict";
import test from "node:test";
import { candidateNutritionQueries, nutritionLookupIndex, nutritionSearchFromIndex, parseBlindInferenceManifest, sourceBoundDensityResolver } from "../../nutrition/benchmark/blindRuntimeSupport.ts";

const candidate = {
  name: "chicken curry", searchTerms: ["curry chicken", "chicken curry"], foodType: "MIXED_DISH" as const,
  preparationCandidates: [{ label: "cooked", confidence: .8 }], providerConfidence: .9,
  modelProviderVersion: "test", uncertaintyNotes: [],
};

test("blind inference manifest rejects any unapproved or ground-truth field", () => {
  const good = { schema: "movefuel-blind-inference-manifest-v1", sample_count: 1, samples: [{ sample_id: "s", category: "mixed", image_path: "/tmp/a.png", mime_type: "image/png", width_px: 640, height_px: 480, checksum: null, dataset: "Nutrition5k", dish_id: "dish_1" }] };
  assert.equal(parseBlindInferenceManifest(good).samples[0]?.sample_id, "s");
  assert.throws(() => parseBlindInferenceManifest({ ...good, samples: [{ ...good.samples[0], actual_kcal: 200 }] }), /ground_truth_field_rejected/);
  assert.throws(() => parseBlindInferenceManifest({ ...good, samples: [{ ...good.samples[0], note: "secret label" }] }), /unapproved_field_rejected/);
});

test("candidate nutrition queries include candidate/preparation and provider aliases deterministically", () => {
  assert.deepEqual(candidateNutritionQueries([candidate]), ["chicken curry cooked", "chicken curry", "curry chicken"]);
});

test("runtime lookup index is synchronous and bounded", () => {
  const index = nutritionLookupIndex({ results: { "chicken curry": [{ fdcId: 1, dataType: "FNDDS", description: "Chicken curry", normalizedName: "chicken curry", energyKcal: 150, proteinG: 10 }] } });
  assert.equal(nutritionSearchFromIndex(index)("CHICKEN CURRY", 1)[0]?.fdcId, 1);
});

test("density resolver uses the exact FDC id selected for nutrition", () => {
  const resolve = sourceBoundDensityResolver({ density_records: [{ density_id: "d", source_id: "usda_fdc", source_version: "2026", food_name: "Chicken curry", preparation: "any", physical_form: "any", density_central_g_ml: 1, density_min_g_ml: .9, density_max_g_ml: 1.1, evidence_quality: "DERIVED", source_reference: "FoodData Central fdcId 77" }] });
  assert.equal(resolve({ source: { source: "USDA_FDC", fdcId: 77, recipeRevisionId: null, dataType: "FNDDS", description: "Chicken curry" }, per100g: { energyKcal: 150, proteinG: 10, carbG: null, fatG: null, fiberG: null, sodiumMg: null } })?.centralGPerMl, 1);
  assert.equal(resolve({ source: { source: "USDA_FDC", fdcId: 78, recipeRevisionId: null, dataType: "FNDDS", description: "Other" }, per100g: { energyKcal: 1, proteinG: 1, carbG: null, fatG: null, fiberG: null, sodiumMg: null } }), null);
});


test("density resolver binds reviewed recipe density to the exact recipe revision", () => {
  const resolve = sourceBoundDensityResolver({ density_records: [{
    density_id: "recipe-density", source_id: "movefuel_regional_reviewed", source_version: "2026-08-r1",
    food_name: "Steamed chicken momo", preparation: "steamed", physical_form: "piece",
    density_central_g_ml: 1.05, density_min_g_ml: 0.95, density_max_g_ml: 1.15, evidence_quality: "REVIEWED",
    source_reference: "MoveFuel reviewed batch; recipeRevisionId recipe-momo-chicken-r1",
  }] });
  const exact = resolve({ source: { source: "MOVEFUEL_RECIPE", fdcId: null, recipeRevisionId: "recipe-momo-chicken-r1", dataType: "REVIEWED_RECIPE_ESTIMATE", description: "Steamed chicken momo" }, per100g: { energyKcal: 210, proteinG: 13, carbG: 25, fatG: 6, fiberG: 1.5, sodiumMg: 330 } });
  const wrong = resolve({ source: { source: "MOVEFUEL_RECIPE", fdcId: null, recipeRevisionId: "recipe-momo-chicken-r2", dataType: "REVIEWED_RECIPE_ESTIMATE", description: "Steamed chicken momo" }, per100g: { energyKcal: 210, proteinG: 13, carbG: 25, fatG: 6, fiberG: 1.5, sodiumMg: 330 } });
  assert.equal(exact?.centralGPerMl, 1.05);
  assert.equal(wrong, null);
});
