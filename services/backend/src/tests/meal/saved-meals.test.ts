import assert from "node:assert/strict";
import test from "node:test";
import { MealContractError } from "../../meal/contracts.ts";
import { SavedMealStore } from "../../meal/saved-meals.ts";

function store(): SavedMealStore {
  let nextId = 0;
  return new SavedMealStore({
    now: () => 1_700_000_000_000,
    idFactory: () => `saved-${++nextId}`,
  });
}

const items = [{
  displayName: "Rice bowl",
  portionGrams: 250,
  energyKcal: 400,
  proteinGrams: 12,
  carbGrams: 70,
  fatGrams: 8,
  fiberGrams: 4,
}];

test("saved meals are owner-scoped and idempotent", () => {
  const meals = store();
  const first = meals.create("user-a", { idempotencyKey: "save-1", name: "Weekday bowl", items });
  const duplicate = meals.create("user-a", { idempotencyKey: "save-1", name: "Weekday bowl", items });

  assert.equal(first.status, "CREATED");
  assert.equal(duplicate.status, "DUPLICATE");
  assert.equal(first.savedMeal.totalEnergyKcal, 400);
  assert.equal(first.savedMeal.items[0]?.portionJson.grams, 250);
  assert.equal(meals.list("user-a").length, 1);
  assert.equal(meals.list("user-b").length, 0);
  assert.equal(meals.list("user-a", "weekday")[0]?.name, "Weekday bowl");
  assert.throws(() => meals.get("user-b", first.savedMeal.savedMealId), (error: unknown) =>
    error instanceof MealContractError && error.code === "saved_meal_not_found");
});

test("saved meal idempotency keys cannot change the saved template", () => {
  const meals = store();
  meals.create("user-a", { idempotencyKey: "save-1", name: "Weekday bowl", items });
  assert.throws(() => meals.create("user-a", {
    idempotencyKey: "save-1",
    name: "Different bowl",
    items,
  }), (error: unknown) => error instanceof MealContractError && error.code === "idempotency_key_reused");
});

test("saved meal input is bounded and requires reviewed nutrition items", () => {
  const meals = store();
  assert.throws(() => meals.create("user-a", { idempotencyKey: "save-1", name: "", items }), (error: unknown) =>
    error instanceof MealContractError && error.code === "invalid_saved_meal_name");
  assert.throws(() => meals.create("user-a", { idempotencyKey: "save-2", name: "Empty", items: [] }), (error: unknown) =>
    error instanceof MealContractError && error.code === "invalid_items");
});
