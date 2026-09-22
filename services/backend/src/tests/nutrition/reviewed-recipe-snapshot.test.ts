import assert from "node:assert/strict";
import test from "node:test";
import {
  REVIEWED_RECIPE_SNAPSHOT_FORMAT,
  createReviewedRecipeSnapshotResolver,
  productionReviewedRecipes,
  reviewedRecipeChecksum,
  type ReviewedRecipeRecord,
} from "../../nutrition/identity/reviewedRecipeSnapshot.ts";

function reviewedRecord(overrides: Partial<ReviewedRecipeRecord> = {}): ReviewedRecipeRecord {
  const withoutChecksum = {
    recipeRevisionId: "recipe-momo-chicken-r1",
    name: "Steamed chicken momo",
    aliases: ["chicken momo"],
    preparationLabels: ["steamed"],
    regionTags: ["Nepal"],
    effectiveDate: "2026-08-17",
    reviewerStatus: "REVIEWED_RECIPE_ESTIMATE" as const,
    evidence: "Human-reviewed weighed batch r1",
    per100g: { energyKcal: 210, proteinG: 13, carbG: 25, fatG: 6, fiberG: 1.5, sodiumMg: 330 },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== "checksum")),
  };
  return { ...withoutChecksum, checksum: overrides.checksum ?? reviewedRecipeChecksum(withoutChecksum) } as ReviewedRecipeRecord;
}

function snapshot(record: ReviewedRecipeRecord) {
  return {
    format: REVIEWED_RECIPE_SNAPSHOT_FORMAT,
    snapshotVersion: "recipes-2026-08-r1",
    generatedAt: "2026-08-17T00:00:00Z",
    records: [record],
  };
}

test("reviewed recipe snapshot accepts only checksum-valid reviewed records", () => {
  const good = reviewedRecord();
  assert.equal(productionReviewedRecipes(snapshot(good)).length, 1);
  assert.equal(productionReviewedRecipes(snapshot({ ...good, checksum: "0".repeat(64) })).length, 0);
  assert.equal(productionReviewedRecipes({ ...snapshot(good), records: [{ ...good, reviewerStatus: "UNREVIEWED_RECIPE_ESTIMATE" }] }).length, 0);
});

test("reviewed recipe snapshot resolves exact reviewed identity without trusting vision for nutrients", () => {
  const resolve = createReviewedRecipeSnapshotResolver(snapshot(reviewedRecord()));
  const result = resolve({
    name: "Chicken momo",
    searchTerms: ["momo"],
    foodType: "MIXED_DISH",
    preparationCandidates: [{ label: "steamed", confidence: 0.95 }],
    providerConfidence: 0.93,
    modelProviderVersion: "test",
    uncertaintyNotes: [],
  });
  assert.equal(result?.source.recipeRevisionId, "recipe-momo-chicken-r1");
  assert.equal(result?.source.dataType, "REVIEWED_RECIPE_ESTIMATE");
  assert.equal(result?.per100g.energyKcal, 210);
});

test("reviewed recipe snapshot does not fuzzy-match an unrelated mixed dish", () => {
  const resolve = createReviewedRecipeSnapshotResolver(snapshot(reviewedRecord()));
  assert.equal(resolve({
    name: "Chicken curry",
    searchTerms: ["curry"],
    foodType: "MIXED_DISH",
    preparationCandidates: [{ label: "stewed", confidence: 0.9 }],
    providerConfidence: 0.9,
    modelProviderVersion: "test",
    uncertaintyNotes: [],
  }), null);
});
