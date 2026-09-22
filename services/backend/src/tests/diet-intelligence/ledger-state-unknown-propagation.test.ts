import assert from "node:assert/strict";
import test from "node:test";
import type { ConfirmedMeal, NutritionTotals } from "../../meal/contracts.ts";
import { ConfirmedNutritionLedgerReader, projectNutritionState } from "../../diet-intelligence/ledger-state.ts";

const LOCAL_DATE = "2026-09-01";
const NOW = new Date("2026-09-01T12:00:00.000Z");

function meal(overrides: Partial<ConfirmedMeal> = {}): ConfirmedMeal {
  return {
    mealId: "meal-a",
    userId: "user-a",
    localDate: LOCAL_DATE,
    mealType: "lunch",
    status: "CONFIRMED",
    currentRevision: 1,
    sourceDraftId: "draft-a",
    items: [],
    totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 20, fatGrams: 5, fiberGrams: 3 },
    confirmedAtEpochMillis: NOW.getTime() - 60_000,
    createdAtEpochMillis: NOW.getTime() - 120_000,
    updatedAtEpochMillis: NOW.getTime() - 60_000,
    ...overrides,
  };
}

function ledger(rows: ConfirmedMeal[], userId = "user-a") {
  return new ConfirmedNutritionLedgerReader().read({ list: () => rows.map((row) => structuredClone(row)) }, userId, LOCAL_DATE);
}

function projected(rows: ConfirmedMeal[], userId = "user-a") {
  const snapshot = ledger(rows, userId);
  const state = projectNutritionState({
    userId,
    localDate: LOCAL_DATE,
    ledger: snapshot,
    profile: {
      schemaVersion: 1,
      userId,
      dietaryPatternCodes: [],
      allergenCodes: [],
      religiousRestrictionCodes: [],
      budgetBand: null,
      cookingCapabilityCodes: [],
      unknownFields: [],
      revision: 1,
      updatedAt: NOW.toISOString(),
    },
    targetState: null,
    revision: 1,
    now: NOW,
  });
  return { snapshot, state, totals: state.totals as unknown as { recorded: NutritionTotals | null } };
}

test("confirmed ledger preserves one meal carbohydrate unknown and NutritionState reports the limitation", () => {
  const { snapshot, state, totals } = projected([meal({ totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 0, fatGrams: 5, fiberGrams: 3, unknownNutrients: ["CARBOHYDRATE"] } })]);

  assert.equal(totals.recorded?.carbGrams, 0);
  assert.deepEqual(snapshot.totals?.unknownNutrients, ["CARBOHYDRATE"]);
  assert.deepEqual(totals.recorded?.unknownNutrients, ["CARBOHYDRATE"]);
  assert.ok(state.dataQuality.limitationCodes.includes("NUTRIENT_UNKNOWN:CARBOHYDRATE"));
});

test("explicit nutrient zero remains known zero without an unknown marker", () => {
  const { snapshot, state, totals } = projected([meal({ totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 0, fatGrams: 0, fiberGrams: 0 } })]);

  assert.equal(snapshot.totals?.carbGrams, 0);
  assert.equal(totals.recorded?.carbGrams, 0);
  assert.equal(totals.recorded?.unknownNutrients, undefined);
  assert.ok(!state.dataQuality.limitationCodes.includes("NUTRIENT_UNKNOWN:CARBOHYDRATE"));
});

test("multiple confirmed meals union unknown nutrients deterministically without duplicates", () => {
  const { snapshot, totals } = projected([
    meal({ mealId: "meal-a", totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 0, fatGrams: 5, fiberGrams: 3, unknownNutrients: ["CARBOHYDRATE", "CARBOHYDRATE"] } }),
    meal({ mealId: "meal-b", totals: { energyKcal: 200, proteinGrams: 20, carbGrams: 30, fatGrams: 0, fiberGrams: 4, unknownNutrients: ["FAT"] } }),
    meal({ mealId: "meal-c" }),
  ]);

  assert.deepEqual(snapshot.totals?.unknownNutrients, ["CARBOHYDRATE", "FAT"]);
  assert.deepEqual(totals.recorded?.unknownNutrients, ["CARBOHYDRATE", "FAT"]);
});

test("fiber unknown propagates like every other optional nutrient", () => {
  const { snapshot, state, totals } = projected([meal({ totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 20, fatGrams: 5, fiberGrams: 0, unknownNutrients: ["FIBER"] } })]);

  assert.deepEqual(snapshot.totals?.unknownNutrients, ["FIBER"]);
  assert.deepEqual(totals.recorded?.unknownNutrients, ["FIBER"]);
  assert.ok(state.dataQuality.limitationCodes.includes("NUTRIENT_UNKNOWN:FIBER"));
});

test("carbohydrate, fat, and fiber unknown markers survive the full projection", () => {
  const { snapshot, totals, state } = projected([meal({ totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 0, fatGrams: 0, fiberGrams: 0, unknownNutrients: ["FIBER", "CARBOHYDRATE", "FAT"] } })]);

  assert.deepEqual(snapshot.totals?.unknownNutrients, ["CARBOHYDRATE", "FAT", "FIBER"]);
  assert.deepEqual(totals.recorded?.unknownNutrients, ["CARBOHYDRATE", "FAT", "FIBER"]);
  assert.deepEqual(
    state.dataQuality.limitationCodes.filter((code) => code.startsWith("NUTRIENT_UNKNOWN:")),
    ["NUTRIENT_UNKNOWN:CARBOHYDRATE", "NUTRIENT_UNKNOWN:FAT", "NUTRIENT_UNKNOWN:FIBER"],
  );
});

test("correction replaces an unknown revision and clears its current marker", () => {
  const { snapshot, state, totals } = projected([
    meal({ currentRevision: 1, totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 0, fatGrams: 5, fiberGrams: 3, unknownNutrients: ["CARBOHYDRATE"] }, updatedAtEpochMillis: NOW.getTime() - 2_000 }),
    meal({ currentRevision: 2, totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 24, fatGrams: 5, fiberGrams: 3 }, updatedAtEpochMillis: NOW.getTime() }),
  ]);

  assert.equal(snapshot.meals[0]?.currentRevision, 2);
  assert.equal(totals.recorded?.carbGrams, 24);
  assert.equal(totals.recorded?.unknownNutrients, undefined);
  assert.ok(!state.dataQuality.limitationCodes.includes("NUTRIENT_UNKNOWN:CARBOHYDRATE"));
});

test("deleting the only meal carrying an unknown marker removes it from current NutritionState", () => {
  const { snapshot, state, totals } = projected([
    meal({ currentRevision: 1, totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 0, fatGrams: 5, fiberGrams: 3, unknownNutrients: ["CARBOHYDRATE"] }, updatedAtEpochMillis: NOW.getTime() - 2_000 }),
    meal({ currentRevision: 2, status: "DELETED", updatedAtEpochMillis: NOW.getTime() }),
  ]);

  assert.deepEqual(snapshot.meals, []);
  assert.equal(snapshot.totals, null);
  assert.equal(totals.recorded, null);
  assert.ok(!state.dataQuality.limitationCodes.includes("NUTRIENT_UNKNOWN:CARBOHYDRATE"));
});

test("latest confirmed revision controls unknown state over older revisions", () => {
  const { snapshot, totals } = projected([
    meal({ currentRevision: 1, totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 0, fatGrams: 5, fiberGrams: 3, unknownNutrients: ["CARBOHYDRATE"] }, updatedAtEpochMillis: NOW.getTime() }),
    meal({ currentRevision: 2, totals: { energyKcal: 110, proteinGrams: 11, carbGrams: 22, fatGrams: 5, fiberGrams: 3 }, updatedAtEpochMillis: NOW.getTime() - 1_000 }),
  ]);

  assert.equal(snapshot.meals[0]?.currentRevision, 2);
  assert.equal(totals.recorded?.carbGrams, 22);
  assert.equal(totals.recorded?.unknownNutrients, undefined);
});

test("cross-user unknown markers cannot enter another owner's ledger", () => {
  assert.throws(
    () => ledger([meal({ userId: "user-a", totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 0, fatGrams: 5, fiberGrams: 3, unknownNutrients: ["CARBOHYDRATE"] } })], "user-b"),
    /LEDGER_CROSS_USER_ROW_REJECTED/,
  );
});

test("no confirmed meals retain null totals and do not invent nutrient markers", () => {
  const { snapshot, state, totals } = projected([]);

  assert.equal(snapshot.totals, null);
  assert.equal(totals.recorded, null);
  assert.equal(state.dataQuality.limitationCodes.some((code) => code.startsWith("NUTRIENT_UNKNOWN:")), false);
});
