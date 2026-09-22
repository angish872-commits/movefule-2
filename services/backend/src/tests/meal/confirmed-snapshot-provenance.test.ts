import assert from "node:assert/strict";
import test from "node:test";
import { ConfirmedMealProjection } from "../../meal/confirmed-meal-projection.ts";
import type { ConfirmedMeal } from "../../meal/contracts.ts";

function mealWithTrustedSource(): ConfirmedMeal {
  return {
    mealId: "meal-off", userId: "owner-a", localDate: "2026-08-30", mealType: "snack", status: "CONFIRMED", currentRevision: 1, sourceDraftId: "draft-off",
    items: [{
      itemId: "barcode:3017624010701", displayName: "Packaged item", portionGrams: 50, energyKcal: 100, proteinGrams: 5, carbGrams: null, fatGrams: 2.5, fiberGrams: 0, confidence: "high", energyRangeKcal: { min: 100, max: 100 },
      nutritionSnapshot: { schemaVersion: 1, snapshotId: "candidate", sourceType: "OPEN_FOOD_FACTS", sourceReference: "barcode:3017624010701", sourceRevision: "rev:1", portionGrams: 50, nutrients: { energyKcal: 100, proteinGrams: 5, carbGrams: null, fatGrams: 2.5, fiberGrams: 0 }, dataQuality: "HIGH", limitations: ["CARBOHYDRATE_UNKNOWN"], createdAt: "2026-08-30T00:00:00.000Z" },
    }],
    totals: { energyKcal: 100, proteinGrams: 5, carbGrams: 0, fatGrams: 2.5, fiberGrams: 0, unknownNutrients: ["CARBOHYDRATE"] },
    confirmedAtEpochMillis: 1000, createdAtEpochMillis: 1000, updatedAtEpochMillis: 1000,
  };
}

test("confirmation reissues immutable snapshot id while retaining validated source provenance", () => {
  const projection = new ConfirmedMealProjection(() => 1000);
  projection.add(mealWithTrustedSource());
  const meal = projection.get("owner-a", "meal-off");
  const frozen = meal.items[0]!.nutritionSnapshot!;
  assert.equal(frozen.snapshotId, "meal-off:1:barcode:3017624010701:nutrition");
  assert.equal(frozen.sourceType, "OPEN_FOOD_FACTS");
  assert.equal(frozen.sourceRevision, "rev:1");
  assert.equal((frozen.nutrients as Record<string, unknown>).carbGrams, null);
  assert.deepEqual(meal.totals.unknownNutrients, ["CARBOHYDRATE"]);
});

test("AI-labeled nutrition snapshot is rejected at canonical confirmation", () => {
  const projection = new ConfirmedMealProjection(() => 1000);
  const meal = mealWithTrustedSource();
  meal.items[0]!.nutritionSnapshot = { ...meal.items[0]!.nutritionSnapshot!, sourceType: "VISION_AI" };
  assert.throws(() => projection.add(meal), /not permitted as canonical nutrient authority/);
  assert.equal(projection.list("owner-a").length, 0);
});
