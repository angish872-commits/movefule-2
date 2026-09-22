import assert from "node:assert/strict";
import test from "node:test";
import { decideSourceUse, sortSourcesForUse, type KnowledgeSourcePolicy } from "../../nutrition/validation/knowledgeSourcePolicy.ts";

const usda: KnowledgeSourcePolicy = {
  sourceId: "usda_fdc",
  role: "canonical_nutrition",
  authorityTier: 10,
  status: "approved",
  commercialUse: "allowed",
  licence: "CC0-1.0",
  region: "US/global-reference",
};
const fao: KnowledgeSourcePolicy = {
  sourceId: "fao_infoods_density_v2",
  role: "volume_to_mass_density",
  authorityTier: 20,
  status: "reference_and_validation_only_until_exact_terms_review",
  commercialUse: "legal_review_required_for_product_integration",
  licence: "CC-BY-4.0-with-FAO-database-terms",
  region: "global",
};
const n5k: KnowledgeSourcePolicy = {
  sourceId: "nutrition5k",
  role: "benchmark_ground_truth",
  authorityTier: 30,
  status: "approved_for_benchmark",
  commercialUse: "allowed_with_attribution",
  licence: "CC-BY-4.0",
  region: "California cafeteria dataset",
};
const nepal: KnowledgeSourcePolicy = {
  sourceId: "nepal_food_composition_2017",
  role: "regional_food_composition_reference",
  authorityTier: 15,
  status: "reference_only_until_licence_and_quality_review",
  commercialUse: "hold_until_rights_review",
  licence: "source-specific-review-required",
  region: "Nepal",
};

test("USDA is nutrition authority but not density evidence", () => {
  assert.deepEqual(decideSourceUse(usda, "NUTRITION_AUTHORITY"), { allowed: true, reason: "ROLE_MATCH_APPROVED" });
  assert.equal(decideSourceUse(usda, "DENSITY_EVIDENCE").allowed, false);
});

test("FAO density is research-valid but production density is rights-gated", () => {
  assert.deepEqual(decideSourceUse(fao, "DENSITY_EVIDENCE"), { allowed: false, reason: "RIGHTS_REVIEW_REQUIRED" });
  assert.deepEqual(decideSourceUse(fao, "DENSITY_VALIDATION_REFERENCE"), { allowed: true, reason: "ROLE_MATCH_APPROVED" });
  assert.equal(decideSourceUse(fao, "NUTRITION_AUTHORITY").allowed, false);
});

test("Nutrition5k cannot silently become production nutrition truth", () => {
  assert.deepEqual(decideSourceUse(n5k, "NUTRITION_AUTHORITY"), { allowed: false, reason: "BENCHMARK_NOT_NUTRITION_AUTHORITY" });
  assert.equal(decideSourceUse(n5k, "BENCHMARK_GROUND_TRUTH").allowed, true);
});

test("regional publication is held until rights review", () => {
  assert.deepEqual(decideSourceUse(nepal, "REGIONAL_REFERENCE"), { allowed: false, reason: "RIGHTS_REVIEW_REQUIRED" });
});

test("source ordering is deterministic and role-filtered", () => {
  const sorted = sortSourcesForUse([n5k, fao, usda], "NUTRITION_AUTHORITY");
  assert.deepEqual(sorted.map((source) => source.sourceId), ["usda_fdc"]);
});
