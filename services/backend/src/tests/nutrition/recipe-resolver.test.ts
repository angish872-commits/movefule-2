import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeNutrientRows } from "../../nutrition/nutrients/nutrientNormalizer.ts";
import { ReviewedRecipeCalculator, recipeNutrientRange } from "../../nutrition/identity/reviewedRecipeCalculator.ts";

const ENERGY = { nutrientId: 1008, amount: 350 };
const PROTEIN = { nutrientId: 1003, amount: 21 };
const CARB = { nutrientId: 1005, amount: 45 };
const FAT = { nutrientId: 1004, amount: 12 };
const FIBER = { nutrientId: 1079, amount: 4 };
const SODIUM = { nutrientId: 1093, amount: 280 };

test("normalizeNutrientRows maps canonical FDC ids", () => {
  const normalized = normalizeNutrientRows([ENERGY, PROTEIN, CARB, FAT, FIBER, SODIUM]);
  assert.equal(normalized.energyKcal?.amount, 350);
  assert.equal(normalized.energyKcal?.unit, "kcal");
  assert.equal(normalized.proteinG?.amount, 21);
  assert.equal(normalized.sodiumMg?.unit, "mg");
});

test("normalizeNutrientRows picks first canonical variant (Atwater energy)", () => {
  const normalized = normalizeNutrientRows([{ nutrientId: 2047, amount: 340 }, ENERGY]);
  assert.equal(normalized.energyKcal?.amount, 340);
});

test("normalizeNutrientRows ignores unknown nutrient ids", () => {
  const normalized = normalizeNutrientRows([{ nutrientId: 99999, amount: 1 }]);
  assert.deepEqual(normalized, {});
});

const momo = {
  recipeId: "recipe-momo-steamed-chicken-v0",
  name: "Steamed chicken momo",
  aliases: ["momo", "chicken momo"],
  regionTags: ["Nepal", "South Asia"],
  ingredients: [
    { fdcId: 2646170, name: "chicken breast, raw", rawGrams: 400, nutrientRows: [ENERGY, PROTEIN, CARB, FAT, FIBER, SODIUM] },
    { fdcId: 789890, name: "wheat flour, all-purpose", rawGrams: 300, nutrientRows: [ENERGY, PROTEIN, CARB, FAT] },
    { fdcId: 790646, name: "onions, yellow, raw", rawGrams: 80, nutrientRows: [ENERGY, PROTEIN, CARB, FAT, FIBER] },
  ],
  cookingMethod: "steamed",
  addedWaterGrams: 30,
  addedOilGheeGrams: 0,
  finalCookedWeightGrams: 700,
  servings: 8,
  evidence: "benchmark candidate",
};

const resolver = () => new ReviewedRecipeCalculator(() => []);

test("identical inputs produce identical results (deterministic)", () => {
  const a = resolver().resolve(momo);
  const b = resolver().resolve(momo);
  assert.deepEqual(a.per100g, b.per100g);
  assert.deepEqual(a.totals, b.totals);
  assert.deepEqual(a.portionPerServing, b.portionPerServing);
  assert.deepEqual(a.ingredients, b.ingredients);
});

test("ingredient FDC IDs and provenance are retained", () => {
  const resolved = resolver().resolve(momo);
  assert.equal(resolved.ingredients.length, 3);
  assert.deepEqual(
    resolved.ingredients.map((i) => i.fdcId),
    [2646170, 789890, 790646],
  );
  assert.equal(resolved.ingredients[0]!.name, "chicken breast, raw");
  assert.equal(resolved.ingredients[0]!.matched, true);
  assert.equal(resolved.source.source, "MOVEFUEL_RECIPE");
  assert.equal(resolved.source.recipeRevisionId, "recipe-momo-steamed-chicken-v0");
});

test("recipe total nutrients are computed before cooked-weight division", () => {
  const resolved = resolver().resolve(momo);
  // chicken 350*4=1400, flour 350*3=1050, onion 350*0.8=280
  assert.equal(resolved.totals.energyKcal, 2730);
  // protein 21*4 + 21*3 + 21*0.8 = 163.8
  assert.equal(Math.abs(resolved.totals.proteinG! - 163.8) < 1e-12, true);
});

test("final cooked-weight normalization uses cooked weight for per-100g", () => {
  const resolved = resolver().resolve(momo);
  // energy total 2730 over 700g cooked = 390 per 100g
  assert.equal(Math.abs(resolved.per100g.energyKcal! - 390) < 1e-9, true);
});

test("per-100g output matches manual calculation", () => {
  const resolved = resolver().resolve(momo);
  const expected = (2730 / 700) * 100;
  assert.equal(Math.abs(resolved.per100g.energyKcal! - expected) < 1e-9, true);
});

test("serving calculation splits cooked weight across servings", () => {
  const resolved = resolver().resolve(momo);
  assert.equal(resolved.servings, 8);
  assert.equal(resolved.portionPerServing.centralGrams, 87.5);
  assert.equal(resolved.portionPerServing.pieces, 1);
});

test("minimum/central/maximum variants use configured multipliers", () => {
  const resolved = resolver().resolve(momo);
  assert.equal(resolved.portionPerServing.minimumGrams, 87.5 * 0.85);
  assert.equal(resolved.portionPerServing.centralGrams, 87.5);
  assert.equal(resolved.portionPerServing.maximumGrams, 87.5 * 1.2);
  const range = recipeNutrientRange(resolved.per100g, resolved.portionPerServing, "energyKcal");
  assert.equal(range.minimum! <= range.central!, true);
  assert.equal(range.central! <= range.maximum!, true);
  assert.equal(range.central, 390 * 87.5 / 100);
});

test("missing ingredient source: no rows resolves to matched=false and contributes nothing", () => {
  const resolved = resolver().resolve({
    ...momo,
    ingredients: [
      { fdcId: 999999, name: "unknown ingredient", rawGrams: 100, nutrientRows: [] },
    ],
  });
  assert.equal(resolved.ingredients[0]!.matched, false);
  assert.deepEqual(resolved.per100g, {});
  assert.deepEqual(resolved.totals, {});
});

test("no generic nutrient fallback: missing nutrients stay undefined", () => {
  const resolved = resolver().resolve({
    ...momo,
    ingredients: [{ fdcId: 789890, name: "flour", rawGrams: 100, nutrientRows: [ENERGY, PROTEIN, CARB, FAT] }],
  });
  assert.equal("fiberG" in resolved.per100g, false);
  assert.equal("sodiumMg" in resolved.per100g, false);
  assert.equal("energyKcal" in resolved.per100g, true);
});

test("invalid or zero final cooked weight throws", () => {
  assert.throws(
    () => resolver().resolve({ ...momo, finalCookedWeightGrams: 0 }),
    /final weight must be positive/,
  );
  assert.throws(
    () => resolver().resolve({ ...momo, finalCookedWeightGrams: -5 }),
    /final weight must be positive/,
  );
});

test("fallback weight = ingredients + added water when cooked weight unknown", () => {
  const resolved = resolver().resolve({ ...momo, finalCookedWeightGrams: undefined });
  const fallbackWeight = 400 + 300 + 80 + 30;
  // Python parity: total_weight excludes added_oil_ghee_grams.
  assert.equal(resolved.finalCookedWeightGrams, null);
  assert.equal(Math.abs(resolved.per100g.energyKcal! - (2730 / fallbackWeight) * 100) < 1e-9, true);
});

test("decimal precision: non-terminating values are carried unrounded", () => {
  // 1.0 kcal per 100g, 100g raw, 300g cooked -> 1/300*100 = 0.3333... unrounded.
  const resolved = resolver().resolve({
    ...momo,
    ingredients: [
      { fdcId: 789890, name: "flour", rawGrams: 100, nutrientRows: [{ nutrientId: 1008, amount: 1 }] },
    ],
    finalCookedWeightGrams: 300,
  });
  assert.equal(resolved.per100g.energyKcal, (1 * 100) / 100 / 300 * 100);
  assert.equal(Number.isInteger(resolved.per100g.energyKcal!), false);
  assert.equal(resolved.per100g.energyKcal!.toFixed(4), "0.3333");
});

test("oil/ghee ingredient contributes fat and weight", () => {
  const oil = { nutrientId: 1004, amount: 100 };
  const resolved = resolver().resolve({
    ...momo,
    ingredients: [
      { fdcId: 172337, name: "oil, mustard", rawGrams: 15, nutrientRows: [oil] },
    ],
    finalCookedWeightGrams: 700,
  });
  // 100g fat per 100g oil -> 15g fat total -> 15/700*100 = 2.142857 per 100g
  assert.equal(Math.abs(resolved.per100g.fatG! - (100 * 15 / 100 / 700 * 100)) < 1e-9, true);
});

test("oil/ghee added weight is NOT added to total weight (Python parity)", () => {
  const withOil = resolver().resolve({ ...momo, addedOilGheeGrams: 15 });
  const withoutOil = resolver().resolve({ ...momo, addedOilGheeGrams: 0 });
  assert.deepEqual(withOil.per100g, withoutOil.per100g);
});

// ---------------------------------------------------------------------------
// Cross-language parity fixture (Python reference implementation).
// ---------------------------------------------------------------------------

type Fixture = {
  ingredients: Record<string, Array<[number, number]>>;
  recipe: {
    recipeId: string;
    name: string;
    ingredients: Array<{ fdcId: number; name: string; rawGrams: number }>;
    addedWaterGrams: number;
    addedOilGheeGrams: number;
    finalCookedWeightGrams: number;
    servings: number;
    minimumVariantMultiplier: number;
    maximumVariantMultiplier: number;
  };
  expectedPer100g: Record<string, number>;
};

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../research/nutrition-research/schemas/recipe-parity.fixture.json",
);

function loadFixture(): Fixture {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
}

test("TypeScript/Python parity: resolver reproduces Python per-100g exactly", () => {
  const fixture = loadFixture();
  const nutrientRowsFor = (fdcId: number) =>
    (fixture.ingredients[String(fdcId)] ?? []).map(([nutrientId, amount]) => ({ nutrientId, amount }));

  const resolved = resolver().resolve({
    recipeId: fixture.recipe.recipeId,
    name: fixture.recipe.name,
    ingredients: fixture.recipe.ingredients.map((i) => ({
      fdcId: i.fdcId,
      name: i.name,
      rawGrams: i.rawGrams,
      nutrientRows: nutrientRowsFor(i.fdcId),
    })),
    addedWaterGrams: fixture.recipe.addedWaterGrams,
    addedOilGheeGrams: fixture.recipe.addedOilGheeGrams,
    finalCookedWeightGrams: fixture.recipe.finalCookedWeightGrams,
    servings: fixture.recipe.servings,
    minimumVariantMultiplier: fixture.recipe.minimumVariantMultiplier,
    maximumVariantMultiplier: fixture.recipe.maximumVariantMultiplier,
  });

  const actual: Record<string, number> = {};
  for (const [name, value] of Object.entries(resolved.per100g)) {
    actual[name] = value!;
  }

  for (const [name, expected] of Object.entries(fixture.expectedPer100g)) {
    assert.ok(name in actual, `missing ${name}`);
    assert.equal(
      actual[name],
      expected,
      `parity mismatch on ${name}: TS=${actual[name]} Python=${expected}`,
    );
  }
});

test("TypeScript/Python parity: portion multipliers match fixture", () => {
  const fixture = loadFixture();
  const resolved = resolver().resolve({
    recipeId: fixture.recipe.recipeId,
    name: fixture.recipe.name,
    ingredients: fixture.recipe.ingredients.map((i) => ({
      fdcId: i.fdcId,
      name: i.name,
      rawGrams: i.rawGrams,
      nutrientRows: (fixture.ingredients[String(i.fdcId)] ?? []).map(([nutrientId, amount]) => ({
        nutrientId,
        amount,
      })),
    })),
    addedWaterGrams: fixture.recipe.addedWaterGrams,
    finalCookedWeightGrams: fixture.recipe.finalCookedWeightGrams,
    servings: fixture.recipe.servings,
    minimumVariantMultiplier: fixture.recipe.minimumVariantMultiplier,
    maximumVariantMultiplier: fixture.recipe.maximumVariantMultiplier,
  });
  const central = fixture.recipe.finalCookedWeightGrams / fixture.recipe.servings;
  assert.equal(resolved.portionPerServing.centralGrams, central);
  assert.equal(resolved.portionPerServing.minimumGrams, central * fixture.recipe.minimumVariantMultiplier);
  assert.equal(resolved.portionPerServing.maximumGrams, central * fixture.recipe.maximumVariantMultiplier);
});
