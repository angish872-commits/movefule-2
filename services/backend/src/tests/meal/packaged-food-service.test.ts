import assert from "node:assert/strict";
import test from "node:test";
import { packagedFoodCandidateFromLookup } from "../../nutrition/packaged/packagedFoodService.ts";

const found = {
  status: "FOUND",
  record: {
    barcode: "3017624010701",
    productName: "Product",
    brand: "Brand",
    sourceType: "OPEN_FOOD_FACTS",
    sourceReference: "barcode:3017624010701",
    sourceRevision: "rev:7",
    nutrientsPer100g: { energyKcal: 200, proteinG: 10, carbG: null, fatG: 5, fiberG: 0, sodiumMg: null },
    servingGrams: 50,
    servingLabel: "50 g",
    quantityLabel: "200 g",
    limitations: ["CARBOHYDRATE_UNKNOWN", "SODIUM_UNKNOWN"],
  },
} as const;

test("exact barcode source creates review candidate, never confirmed state", () => {
  const result = packagedFoodCandidateFromLookup(found);
  assert.equal(result.status, "NEEDS_REVIEW");
  if (result.status !== "NEEDS_REVIEW") return;
  assert.equal(result.item.energyKcal, 100);
  assert.equal(result.item.carbGrams, null);
  assert.equal(result.item.fiberGrams, 0);
  assert.equal(result.item.nutritionSnapshot?.sourceType, "OPEN_FOOD_FACTS");
  assert.equal(result.item.portionEvidence?.method, "PACKAGE_LABEL");
});

test("unknown package serving requires manual fallback rather than assumed grams", () => {
  const result = packagedFoodCandidateFromLookup({
    ...found,
    record: { ...found.record, servingGrams: null },
  });
  assert.equal(result.status, "MANUAL_FALLBACK");
});

test("reviewed manual grams may scale source nutrients without changing provider provenance", () => {
  const result = packagedFoodCandidateFromLookup({ ...found, record: { ...found.record, servingGrams: null } }, 25);
  assert.equal(result.status, "NEEDS_REVIEW");
  if (result.status !== "NEEDS_REVIEW") return;
  assert.equal(result.item.energyKcal, 50);
  assert.equal(result.item.nutritionSnapshot?.sourceType, "OPEN_FOOD_FACTS");
  assert.equal(result.item.portionEvidence?.method, "MANUAL_GRAMS");
});
