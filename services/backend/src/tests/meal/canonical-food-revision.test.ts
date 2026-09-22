import assert from "node:assert/strict";
import test from "node:test";
import { ConfirmedMealProjection } from "../../meal/confirmed-meal-projection.ts";
import type { ConfirmedMeal } from "../../meal/contracts.ts";

function baseMeal(): ConfirmedMeal {
  return {
    mealId: "meal-1", userId: "user-a", localDate: "2026-08-30", mealType: "lunch", status: "CONFIRMED", currentRevision: 1,
    sourceDraftId: "draft-1",
    items: [{ itemId: "item-1", displayName: "Rice", portionGrams: 100, energyKcal: 130, proteinGrams: 2.5, carbGrams: 28, fatGrams: 0.3, fiberGrams: null, confidence: "medium", energyRangeKcal: { min: 130, max: 130 } }],
    totals: { energyKcal: 130, proteinGrams: 2.5, carbGrams: 28, fatGrams: 0.3, fiberGrams: 0, unknownNutrients: ["FIBER"] },
    confirmedAtEpochMillis: 1_000, createdAtEpochMillis: 1_000, updatedAtEpochMillis: 1_000,
  };
}

test("confirmation freezes canonical snapshot and correction creates a distinct immutable snapshot", () => {
  let now = 1_000;
  const projection = new ConfirmedMealProjection(() => now);
  projection.add(baseMeal());
  const revision1 = projection.get("user-a", "meal-1");
  assert.equal(revision1.items[0]!.nutritionSnapshot?.snapshotId, "meal-1:1:item-1:nutrition");
  assert.equal((revision1.items[0]!.nutritionSnapshot?.nutrients as Record<string, unknown>).fiberGrams, null);
  assert.deepEqual(revision1.totals.unknownNutrients, ["FIBER"]);
  now = 2_000;
  const revision2 = projection.revise("user-a", { mealId: "meal-1", expectedRevision: 1, idempotencyKey: "correct-1", items: [{ itemId: "item-1", displayName: "Rice", portionGrams: 120, energyKcal: 156, proteinGrams: 3, carbGrams: 33.6, fatGrams: 0.36, fiberGrams: null, confidence: "high", energyRangeKcal: { min: 156, max: 156 } }] });
  assert.equal(revision2.currentRevision, 2);
  assert.equal(revision2.items[0]!.nutritionSnapshot?.snapshotId, "meal-1:2:item-1:nutrition");
  assert.equal(revision2.items[0]!.nutritionSnapshot?.sourceType, "USER_CORRECTION");
  assert.equal(revision1.items[0]!.nutritionSnapshot?.snapshotId, "meal-1:1:item-1:nutrition");
  assert.equal(revision1.items[0]!.portionGrams, 100);
});

test("tombstone excludes deleted meal while preserving historical snapshot on tombstone revision", () => {
  let now = 1_000;
  const projection = new ConfirmedMealProjection(() => now);
  projection.add(baseMeal());
  now = 3_000;
  const deleted = projection.delete("user-a", { mealId: "meal-1", expectedRevision: 1, idempotencyKey: "delete-1" });
  assert.equal(deleted.status, "DELETED");
  assert.ok(deleted.items[0]!.nutritionSnapshot);
  assert.equal(projection.list("user-a").length, 0);
  assert.equal(projection.getDailyTotals("user-a", "2026-08-30").confirmedMealCount, 0);
});
