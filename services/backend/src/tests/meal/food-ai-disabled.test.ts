import assert from "node:assert/strict";
import test from "node:test";
import { MealStore } from "../../meal/store.ts";

test("reviewed manual meal confirms without any AI provider", () => {
  let id = 0;
  const store = new MealStore({ now: () => 1000, idFactory: () => `id-${++id}` });
  const draft = store.createDraft("user-a", { localDate: "2026-08-30", mealType: "lunch", sourceType: "manual" });
  const revised = store.reviseDraft("user-a", draft.draftId, {
    expectedRevision: 1,
    items: [{ displayName: "Reviewed food", portionGrams: 100, energyKcal: 120, proteinGrams: 6, carbGrams: null, fatGrams: 2, fiberGrams: null }],
  });
  const result = store.confirmMeal("user-a", { draftId: draft.draftId, idempotencyKey: "confirm-manual", confirmed: true, expectedRevision: revised.activeRevision });
  assert.equal(result.status, "CONFIRMED");
  assert.equal(result.meal.items[0]!.nutritionSnapshot?.sourceType, "USER_REVIEWED_MANUAL");
  assert.equal(result.meal.items[0]!.carbGrams, null);
  assert.equal((result.meal.items[0]!.nutritionSnapshot?.nutrients as Record<string, unknown>).carbGrams, null);
  assert.deepEqual(result.meal.totals.unknownNutrients, ["CARBOHYDRATE", "FIBER"]);
});
