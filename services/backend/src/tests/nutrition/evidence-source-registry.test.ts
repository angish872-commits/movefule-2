import assert from "node:assert/strict";
import test from "node:test";
import {
  NUTRITION_EVIDENCE_SOURCES,
  assertCanonicalNutritionAuthority,
  evidenceSource,
  mayUseAsCanonicalNutritionAuthority,
} from "../../nutrition/evidence/evidence-source-registry.ts";

test("USDA is the reviewed production nutrient authority", () => {
  const source = evidenceSource("USDA_FOODDATA_CENTRAL");
  assert.ok(source);
  assert.equal(source.role, "PRODUCTION_NUTRITION_AUTHORITY");
  assert.equal(source.rightsDecision, "APPROVED");
  assert.equal(source.mayStoreCanonicalFacts, true);
  assert.equal(mayUseAsCanonicalNutritionAuthority(source), true);
  assert.equal(assertCanonicalNutritionAuthority(source.sourceId).sourceId, source.sourceId);
});

test("Open Food Facts remains an isolated packaged lookup", () => {
  const source = evidenceSource("OPEN_FOOD_FACTS");
  assert.ok(source);
  assert.equal(source.role, "PACKAGED_LOOKUP");
  assert.equal(source.shareAlikeIsolationRequired, true);
  assert.equal(source.mayStoreCanonicalFacts, false);
  assert.equal(mayUseAsCanonicalNutritionAuthority(source), false);
  assert.throws(() => assertCanonicalNutritionAuthority(source.sourceId), /not_canonical_authority/);
});

test("South Asian regional tables remain rights-gated until explicit product reuse rights are verified", () => {
  for (const sourceId of ["NEPAL_DFTQC_FCT_2017", "INDIA_IFCT_2017", "BANGLADESH_FCT_2013"]) {
    const source = evidenceSource(sourceId);
    assert.ok(source);
    assert.equal(source.role, "REGIONAL_REFERENCE");
    assert.equal(source.rightsDecision, "REVIEW_REQUIRED");
    assert.equal(source.mayStoreCanonicalFacts, false);
    assert.equal(mayUseAsCanonicalNutritionAuthority(source), false);
  }
});

test("unknown evidence source fails closed", () => {
  assert.equal(evidenceSource("UNREVIEWED_INTERNET_DATASET"), null);
  assert.equal(mayUseAsCanonicalNutritionAuthority(null), false);
  assert.throws(() => assertCanonicalNutritionAuthority("UNREVIEWED_INTERNET_DATASET"), /not_canonical_authority/);
});

test("no source with unknown or review-required rights is marked canonical", () => {
  for (const source of NUTRITION_EVIDENCE_SOURCES) {
    if (source.rightsDecision !== "APPROVED") {
      assert.equal(mayUseAsCanonicalNutritionAuthority(source), false, source.sourceId);
    }
  }
});
