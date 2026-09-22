import assert from "node:assert/strict";
import test from "node:test";
import { KnowledgeNutritionResolver, type NutritionRecord } from "../../nutrition/identity/knowledgeNutritionResolver.ts";
import type { RegionFoodCandidate } from "../../nutrition/vision/candidateProviderAdapter.ts";

const riceCandidate: RegionFoodCandidate = {
  name: "Rice, white, cooked",
  searchTerms: ["rice white cooked"],
  foodType: "BASIC",
  preparationCandidates: [{ label: "cooked", confidence: 0.95 }],
  providerConfidence: 0.95,
  modelProviderVersion: "fixture@1",
  uncertaintyNotes: [],
};

const completeRice: NutritionRecord = {
  fdcId: 1001,
  dataType: "FNDDS",
  description: "Rice, white, cooked",
  normalizedName: "rice white cooked",
  nutrientIds: [1008, 1003, 1005, 1004, 1079],
  energyKcal: 130,
  proteinG: 2.7,
  carbG: 28.2,
  fatG: 0.3,
  fiberG: 0.4,
  sodiumMg: 1,
};

test("automatic resolution accepts a complete trusted USDA row", () => {
  const resolver = new KnowledgeNutritionResolver({ search: () => [completeRice] });
  const result = resolver.resolve([riceCandidate], "BASIC");
  assert.equal(result.source?.fdcId, 1001);
  assert.equal(result.per100g?.fiberG, 0.4);
});

test("automatic resolution rejects an incomplete row instead of converting unknown macros to zero", () => {
  const resolver = new KnowledgeNutritionResolver({ search: () => [{ ...completeRice, fiberG: null }] });
  const result = resolver.resolve([riceCandidate], "BASIC");
  assert.equal(result.source, null);
  assert.equal(result.per100g, undefined);
});
