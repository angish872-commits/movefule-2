import assert from "node:assert/strict";
import test from "node:test";
import { ConfirmedMealProjection } from "../../meal/confirmed-meal-projection.ts";

test("empty confirmed day is known zero while unknown nutrients in a meal remain null", () => {
  const projection = new ConfirmedMealProjection(() => 1);
  assert.deepEqual(projection.getDailyTotals("u", "2026-08-30"), {
    localDate: "2026-08-30", energyKcal: 0, proteinGrams: 0, carbGrams: 0, fatGrams: 0, fiberGrams: 0, confirmedMealCount: 0,
  });
});
