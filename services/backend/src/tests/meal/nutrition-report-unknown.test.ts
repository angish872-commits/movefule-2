import assert from "node:assert/strict";
import test from "node:test";
import { buildNutritionReport } from "../../meal/nutrition-report.ts";
import type { ConfirmedMeal } from "../../meal/contracts.ts";

const meal: ConfirmedMeal = {
  mealId: "m", userId: "u", localDate: "2026-08-30", mealType: "lunch", status: "CONFIRMED", currentRevision: 1,
  sourceDraftId: "d", items: [], totals: { energyKcal: 100, proteinGrams: 5, carbGrams: 0, fatGrams: 2, fiberGrams: 0, unknownNutrients: ["CARBOHYDRATE"] },
  confirmedAtEpochMillis: 1, createdAtEpochMillis: 1, updatedAtEpochMillis: 1,
};

test("confirmed report marks incomplete nutrients instead of presenting zero as complete truth", () => {
  const report = buildNutritionReport([meal], "2026-08-30", "2026-08-30", 1);
  assert.equal(report.days[0]!.carbGrams, 0);
  assert.deepEqual(report.days[0]!.unknownNutrients, ["CARBOHYDRATE"]);
  assert.deepEqual(report.totals.unknownNutrients, ["CARBOHYDRATE"]);
});
