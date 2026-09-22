import assert from "node:assert/strict";
import test from "node:test";
import { buildNutritionReport } from "../../meal/nutrition-report.ts";
import type { ConfirmedMeal } from "../../meal/contracts.ts";

const meal = (mealId: string, localDate: string, status: ConfirmedMeal["status"] = "CONFIRMED"): ConfirmedMeal => ({
  mealId,
  userId: "user-a",
  localDate,
  mealType: "lunch",
  status,
  currentRevision: 1,
  sourceDraftId: `draft-${mealId}`,
  items: [],
  totals: { energyKcal: 500, proteinGrams: 30, carbGrams: 40, fatGrams: 15, fiberGrams: 6 },
  confirmedAtEpochMillis: 1,
  createdAtEpochMillis: 1,
  updatedAtEpochMillis: 1,
});

test("nutrition report is daily, confirmed-only, and includes empty days", () => {
  const report = buildNutritionReport([
    meal("meal-1", "2026-08-01"),
    meal("meal-2", "2026-08-01"),
    meal("deleted", "2026-08-02", "DELETED"),
  ], "2026-08-01", "2026-08-03", 123);

  assert.deepEqual(report.days.map((day) => [day.localDate, day.confirmedMealCount]), [
    ["2026-08-01", 2],
    ["2026-08-02", 0],
    ["2026-08-03", 0],
  ]);
  assert.equal(report.totals.energyKcal, 1_000);
  assert.equal(report.totals.confirmedMealCount, 2);
  assert.equal(report.generatedAtEpochMillis, 123);
});

test("nutrition report rejects ranges that are too large", () => {
  assert.throws(
    () => buildNutritionReport([], "2025-01-01", "2026-01-02"),
    /report_range_too_large/,
  );
});
