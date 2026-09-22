import assert from "node:assert/strict";
import test from "node:test";
import { confidenceFromComponents } from "../../nutrition/confidence/confidence.ts";
import { SourceResolver, type SearchableFood } from "../../nutrition/identity/foodResolver.ts";

const FOODS: SearchableFood[] = [
  {
    fdcId: 1,
    dataType: "FNDDS",
    description: "Rice, white, cooked",
    normalizedName: "rice white cooked",
    publicationDate: "2023-01-01",
  },
  {
    fdcId: 2,
    dataType: "BRANDED",
    description: "Branded Fried Rice",
    normalizedName: "branded fried rice",
    gtinUpc: "0012345678905",
    brandName: "Brand X",
    publicationDate: "2026-01-01",
  },
  {
    fdcId: 3,
    dataType: "FOUNDATION",
    description: "Rice, white, long-grain, raw",
    normalizedName: "rice white long grain raw",
  },
];

function resolver(): SourceResolver {
  return new SourceResolver((query, limit = 20) => {
    const q = query.trim().toLowerCase();
    return FOODS.filter(
      (food) =>
        food.normalizedName.includes(q) ||
        food.description.toLowerCase().includes(q) ||
        food.gtinUpc?.replace(/\D/g, "") === q.replace(/\D/g, ""),
    ).slice(0, limit);
  });
}

test("resolver ranks exact normalized name highest", () => {
  const result = resolver().rank("rice white cooked");
  assert.ok(result.length > 0);
  assert.equal(result[0]!.food.fdcId, 1);
  assert.equal(result[0]!.score, Math.max(...result.map((candidate) => candidate.score)));
});

test("resolver prefers requested data type when present", () => {
  const resolved = resolver().resolve("rice", "FNDDS");
  assert.equal(resolved.status, "RESOLVED");
  if (resolved.status === "RESOLVED") {
    assert.equal(resolved.source.fdcId, 1);
    assert.equal(resolved.source.dataType, "FNDDS");
  }
});

test("resolver resolves by barcode", () => {
  const source = resolver().resolveByBarcode("0012345678905");
  assert.ok(source !== null);
  assert.equal(source?.fdcId, 2);
  assert.equal(source?.dataType, "BRANDED");
});

test("resolver returns NEEDS_USER_REVIEW when nothing matches", () => {
  const result = resolver().resolve("nonexistent food xyz");
  assert.equal(result.status, "NEEDS_USER_REVIEW");
  if (result.status === "NEEDS_USER_REVIEW") {
    assert.equal(result.reason, "NUTRITION_SOURCE_NOT_RESOLVED");
  }
});

test("unresolved helper never produces generic values", () => {
  const unresolved = resolver().unresolved();
  assert.deepEqual(unresolved, {
    status: "NEEDS_USER_REVIEW",
    reason: "NUTRITION_SOURCE_NOT_RESOLVED",
  });
});

test("confidence levels map to categories", () => {
  const high = confidenceFromComponents({
    identity: 0.9, segmentationQuality: 0.9, portionEvidence: 0.9,
    preparationCertainty: 0.8, sourceMatchQuality: 0.9,
    recipeReviewStatus: 1, completeness: 0.9,
  });
  assert.equal(high.level, "HIGH");

  const low = confidenceFromComponents({
    identity: 0.3, segmentationQuality: 0.2, portionEvidence: 0.1,
    preparationCertainty: 0.2, sourceMatchQuality: 0.2,
    recipeReviewStatus: 0.2, completeness: 0.3,
  });
  assert.equal(low.level, "INSUFFICIENT");
});


test("resolver rejects unrelated high-quality source rows", () => {
  const unrelated = new SourceResolver(() => [{
    fdcId: 99,
    dataType: "FOUNDATION",
    description: "Beef, cooked",
    normalizedName: "beef cooked",
  }]);
  const result = unrelated.resolve("banana");
  assert.equal(result.status, "NEEDS_USER_REVIEW");
  assert.equal(unrelated.rank("banana").length, 0);
});

test("resolver asks for review when two weak text matches are effectively tied", () => {
  const ambiguous = new SourceResolver(() => [
    { fdcId: 11, dataType: "FOUNDATION", description: "Apple, raw", normalizedName: "green apple raw" },
    { fdcId: 12, dataType: "FOUNDATION", description: "Apple, raw", normalizedName: "red apple raw" },
  ]);
  const result = ambiguous.resolve("apple");
  assert.equal(result.status, "NEEDS_USER_REVIEW");
});
