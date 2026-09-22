import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  benchmarkKnownZero,
  buildGoldNutritionReferenceCases,
  preserveConflictingEvidence,
  type MeasuredNutritionSeed,
} from "../../nutrition/benchmark/gold-reference-benchmark.ts";

const seedFile = new URL("../../../../../research/nutrition-research/benchmark/v4/nutrition5k-ground-truth-15pct.json", import.meta.url);

type ExistingSeedFile = {
  sample_count: number;
  samples: Array<{
    sample_id: string;
    actual_calories_kcal: number;
    actual_protein_g: number;
    actual_carb_g: number;
    actual_fat_g: number;
    actual_mass_g: number;
  }>;
};

function measuredSeeds(): MeasuredNutritionSeed[] {
  const parsed = JSON.parse(readFileSync(seedFile, "utf8")) as ExistingSeedFile;
  assert.equal(parsed.sample_count, 10, "Gold v1 intentionally starts from the ten repository-measured Nutrition5k seeds");
  return parsed.samples.map((sample) => ({
    sampleId: sample.sample_id,
    energyKcal: sample.actual_calories_kcal,
    proteinG: sample.actual_protein_g,
    carbG: sample.actual_carb_g,
    fatG: sample.actual_fat_g,
    massG: sample.actual_mass_g,
  }));
}

test("Gold v1 expands ten measured seeds into exactly 100 reviewed reference cases without fabricating extra nutrient values", () => {
  const seeds = measuredSeeds();
  const gold = buildGoldNutritionReferenceCases(seeds);
  assert.equal(gold.length, 100);
  assert.equal(new Set(gold.map((entry) => entry.caseId)).size, 100);
  for (const entry of gold) {
    assert.equal(entry.sourceId, "NUTRITION5K");
    assert.equal(entry.useClass, "BENCHMARK_ONLY");
    assert.equal(entry.reviewerStatus, "REVIEWED_SEED_DERIVATION");
    assert.equal(entry.licence, "CC BY 4.0");
  }

  for (const seed of seeds) {
    const sourceValues = new Set([seed.energyKcal, seed.proteinG, seed.carbG, seed.fatG]);
    for (const entry of gold.filter((candidate) => candidate.sourceRecordId === seed.sampleId)) {
      for (const nutrient of [entry.nutrients.energyKcal, entry.nutrients.proteinG, entry.nutrients.carbG, entry.nutrients.fatG]) {
        if (nutrient.state === "KNOWN") assert.ok(sourceValues.has(nutrient.value!), `${entry.caseId} introduced a non-seed nutrient value`);
        else assert.equal(nutrient.value, null);
      }
    }
  }
});

test("Gold benchmark preserves UNKNOWN, NOT_REPORTED and NOT_APPLICABLE distinctly", () => {
  const gold = buildGoldNutritionReferenceCases(measuredSeeds());
  const states = new Set(gold.flatMap((entry) => [
    entry.nutrients.energyKcal.state,
    entry.nutrients.proteinG.state,
    entry.nutrients.carbG.state,
    entry.nutrients.fatG.state,
    entry.nutrients.fiberG.state,
    entry.nutrients.sodiumMg.state,
  ]));
  assert.ok(states.has("KNOWN"));
  assert.ok(states.has("UNKNOWN"));
  assert.ok(states.has("NOT_REPORTED"));
  assert.ok(states.has("NOT_APPLICABLE"));
});

test("known numeric zero is different from unknown", () => {
  const knownZero = benchmarkKnownZero("g");
  assert.deepEqual(knownZero, { state: "KNOWN", value: 0, unit: "g" });
  const unknownCase = buildGoldNutritionReferenceCases(measuredSeeds()).find((entry) => entry.caseId.endsWith(":PROTEIN_UNKNOWN"));
  assert.ok(unknownCase);
  assert.deepEqual(unknownCase.nutrients.proteinG, { state: "UNKNOWN", value: null, unit: "g" });
  assert.notDeepEqual(knownZero, unknownCase.nutrients.proteinG);
});

test("conflicting evidence is preserved as separate observations and never blindly averaged", () => {
  const left = Object.freeze({ sourceRecordId: "source-a", nutrient: "energyKcal", value: 100 });
  const right = Object.freeze({ sourceRecordId: "source-b", nutrient: "energyKcal", value: 200 });
  const preserved = preserveConflictingEvidence([left, right]);
  assert.equal(preserved.length, 2);
  assert.deepEqual(preserved.map((entry) => entry.value), [100, 200]);
  assert.ok(!preserved.some((entry) => entry.value === 150));
});
