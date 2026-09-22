import assert from "node:assert/strict";
import test from "node:test";
import { ConfirmedMealProjection } from "../../meal/confirmed-meal-projection.ts";
import type { ConfirmedMeal } from "../../meal/contracts.ts";

const meal = (): ConfirmedMeal => ({
  mealId: "meal-1", userId: "owner", localDate: "2026-08-30", mealType: "dinner", status: "CONFIRMED", currentRevision: 1,
  sourceDraftId: "draft-1", confirmedAtEpochMillis: 1, createdAtEpochMillis: 1, updatedAtEpochMillis: 1,
  items: [{ itemId: "i1", displayName: "Food", portionGrams: 100, energyKcal: 100, proteinGrams: 5, carbGrams: 10, fatGrams: 2, fiberGrams: 1, confidence: "high", energyRangeKcal: { min: 100, max: 100 } }],
  totals: { energyKcal: 100, proteinGrams: 5, carbGrams: 10, fatGrams: 2, fiberGrams: 1 },
});

test("correction creates new revision and leaves captured old revision object unchanged", () => {
  let now = 1;
  const projection = new ConfirmedMealProjection(() => now);
  projection.add(meal());
  const old = projection.get("owner", "meal-1");
  now = 2;
  const next = projection.revise("owner", {
    mealId: "meal-1", expectedRevision: 1, idempotencyKey: "rev-2",
    items: [{ itemId: "i1", displayName: "Food", portionGrams: 80, energyKcal: 80, proteinGrams: 4, carbGrams: 8, fatGrams: 1.6, fiberGrams: 0.8, confidence: "high", energyRangeKcal: { min: 80, max: 80 } }],
  });
  assert.equal(old.currentRevision, 1);
  assert.equal(old.items[0]!.portionGrams, 100);
  assert.equal(next.currentRevision, 2);
  assert.equal(next.items[0]!.portionGrams, 80);
  assert.notEqual(old.items[0]!.nutritionSnapshot?.snapshotId, next.items[0]!.nutritionSnapshot?.snapshotId);
  assert.throws(() => projection.revise("owner", { mealId: "meal-1", expectedRevision: 1, idempotencyKey: "stale", items: next.items }), /stale/);
});
