import assert from "node:assert/strict";
import test from "node:test";
import {
  BasisError,
  calculateNutrient,
  calculateNutrientRange,
  calculateNutrientRounded,
} from "../../nutrition/nutrients/nutrientCalculator.ts";

test("calculateNutrient scales by basis ratio", () => {
  const result = calculateNutrient({ amount: 350, unit: "kcal", basisGrams: 100 }, 240);
  assert.equal(result.missing, false);
  if (!result.missing) {
    assert.equal(result.amount, 840);
    assert.equal(result.unit, "kcal");
    assert.equal(result.selectedGrams, 240);
    assert.equal(result.formulaVersion, 1);
  }
});

test("calculateNutrientRounded applies presentation rounding", () => {
  const value = calculateNutrientRounded({ amount: 21, unit: "g", basisGrams: 100 }, 150, 1);
  assert.equal(value, 31.5);
});

test("calculateNutrientRange produces min/central/max", () => {
  const range = calculateNutrientRange(
    { amount: 12, unit: "g", basisGrams: 100 },
    { minimumGrams: 200, centralGrams: 240, maximumGrams: 300 },
  );
  assert.deepEqual(range, { minimum: 24, central: 28.8, maximum: 36 });
});



test("zero source nutrient amount is valid", () => {
  const result = calculateNutrient({ amount: 0, unit: "g", basisGrams: 100 }, 250);
  assert.equal(result.missing, false);
  if (!result.missing) assert.equal(result.amount, 0);
});

test("zero selected grams is allowed (empty portion)", () => {
  const result = calculateNutrient({ amount: 5, unit: "g", basisGrams: 100 }, 0);
  assert.equal(result.missing, false);
  if (!result.missing) assert.equal(result.amount, 0);
});

test("invalid basis throws", () => {
  assert.throws(
    () => calculateNutrient({ amount: 5, unit: "g", basisGrams: 0 }, 100),
    (error: unknown) => error instanceof BasisError && error.code === "invalid_basis",
  );
  assert.throws(
    () => calculateNutrient({ amount: -1, unit: "g", basisGrams: 100 }, 100),
    (error: unknown) => error instanceof BasisError && error.code === "invalid_amount",
  );
});

test("non-finite selected grams throws", () => {
  assert.throws(
    () => calculateNutrient({ amount: 5, unit: "g", basisGrams: 100 }, Number.NaN),
    (error: unknown) => error instanceof BasisError && error.code === "invalid_selected_grams",
  );
});
