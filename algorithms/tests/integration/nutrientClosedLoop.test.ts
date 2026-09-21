import assert from "node:assert/strict";
import { test } from "node:test";

import type { AlgorithmContext } from "../../src/core/contracts";
import {
  calculateTrustedNutrients,
  type FoodAuthorityRecord,
} from "../../src/nutrition/nutrientEngine";
import {
  aggregateDailyNutrients,
  type ConfirmedFoodNutrientEntry,
} from "../../src/nutrition/dailyNutrientAggregator";
import {
  calculateCoverageForEntries,
} from "../../src/nutrition/coverage";
import {
  evaluateNutrientAdequacy,
} from "../../src/nutrition/adequacy";
import type {
  NutrientReference,
  ReferenceProfile,
} from "../../src/nutrition/referenceEngine";

const context: AlgorithmContext = {
  userId: "integration-user",
  now: "2026-09-21T12:30:00+05:45",
  requestId: "integration-request",
  versions: {
    algorithmVersion: "integration-test",
  },
};

const profile: ReferenceProfile = {
  ageYears: 30,
  applicableCategory: "GENERAL",
};

function record(
  foodId: string,
  nutrientId: "VITAMIN_C" | "VITAMIN_D",
  amountPer100g: number | null,
  unit: "mg" | "ug",
  verified: boolean,
): FoodAuthorityRecord {
  return {
    foodId,
    source: "MOVEFUEL_VERIFIED",
    sourceReference: `fixture:${foodId}`,
    sourceRevision: "fixture-v1",
    verified,
    nutrients: [
      {
        nutrientId,
        amount: amountPer100g,
        unit,
        basis: {
          kind: "MASS",
          amount: 100,
          unit: "g",
        },
      },
    ],
  };
}

function toEntry(
  entryId: string,
  result: ReturnType<typeof calculateTrustedNutrients>,
): ConfirmedFoodNutrientEntry {
  assert.ok(result.output);

  return {
    entryId,
    nutrients: result.output.nutrients.map((nutrient) => ({
      nutrientId: nutrient.nutrientId,
      amount: nutrient.amount,
      unit: nutrient.unit,
    })),
  };
}

function nutrientReference(
  nutrientId: "VITAMIN_C" | "VITAMIN_D",
  type: NutrientReference["referenceType"],
  amount: number,
  unit: "mg" | "ug",
): NutrientReference {
  return {
    nutrientId,
    referenceType: type,
    amount,
    unit,
    ageMinYears: 19,
    ageMaxYears: 50,
    applicableCategory: "GENERAL",
    source: "integration-fixture",
    sourceVersion: "reference-v1",
  };
}

test("closed loop A: full Vitamin C vectors -> 3/3 coverage -> reference assessment", () => {
  const consumed = { kind: "MASS" as const, amount: 100, unit: "g" as const };

  const entries = [
    toEntry(
      "food-a",
      calculateTrustedNutrients(
        context,
        record("food-a", "VITAMIN_C", 10, "mg", true),
        consumed,
      ),
    ),
    toEntry(
      "food-b",
      calculateTrustedNutrients(
        context,
        record("food-b", "VITAMIN_C", 20, "mg", true),
        consumed,
      ),
    ),
    toEntry(
      "food-c",
      calculateTrustedNutrients(
        context,
        record("food-c", "VITAMIN_C", 30, "mg", true),
        consumed,
      ),
    ),
  ];

  const aggregates = aggregateDailyNutrients(entries);
  const coverage = calculateCoverageForEntries(entries);
  const assessments = evaluateNutrientAdequacy(
    profile,
    aggregates,
    coverage,
    [nutrientReference("VITAMIN_C", "RDA", 75, "mg")],
    { minimumCoverage: 0.8 },
  );

  const vitaminC = assessments.find(
    (assessment) => assessment.nutrientId === "VITAMIN_C",
  )!;

  assert.equal(
    aggregates.find((item) => item.nutrientId === "VITAMIN_C")?.knownAmount,
    60,
  );
  assert.equal(vitaminC.coverage.knownEntries, 3);
  assert.equal(vitaminC.coverage.totalRelevantEntries, 3);
  assert.equal(vitaminC.coverage.ratio, 1);
  assert.equal(vitaminC.dataStatus, "OK");
  assert.equal(vitaminC.referenceType, "RDA");
  assert.equal(vitaminC.percentOfReference, 80);
});

test("closed loop B: Vitamin D missing in 2/3 -> INCOMPLETE_DATA -> no fake percentage", () => {
  const consumed = { kind: "MASS" as const, amount: 100, unit: "g" as const };

  const entries = [
    toEntry(
      "food-a",
      calculateTrustedNutrients(
        context,
        record("food-a", "VITAMIN_D", 10, "ug", false),
        consumed,
      ),
    ),
    toEntry(
      "food-b",
      calculateTrustedNutrients(
        context,
        record("food-b", "VITAMIN_D", null, "ug", false),
        consumed,
      ),
    ),
    toEntry(
      "food-c",
      calculateTrustedNutrients(
        context,
        record("food-c", "VITAMIN_D", null, "ug", false),
        consumed,
      ),
    ),
  ];

  const aggregates = aggregateDailyNutrients(entries);
  const coverage = calculateCoverageForEntries(entries);
  const assessments = evaluateNutrientAdequacy(
    profile,
    aggregates,
    coverage,
    [nutrientReference("VITAMIN_D", "RDA", 15, "ug")],
    { minimumCoverage: 0.8 },
  );

  const vitaminD = assessments.find(
    (assessment) => assessment.nutrientId === "VITAMIN_D",
  )!;

  assert.equal(vitaminD.consumedKnown, 10);
  assert.equal(vitaminD.coverage.knownEntries, 1);
  assert.equal(vitaminD.coverage.totalRelevantEntries, 3);
  assert.ok(Math.abs(vitaminD.coverage.ratio - 1 / 3) < Number.EPSILON);
  assert.equal(vitaminD.dataStatus, "INCOMPLETE_DATA");
  assert.equal(vitaminD.percentOfReference, null);
  assert.ok(
    vitaminD.reasonCodes.includes("NUTRIENT_COVERAGE_BELOW_POLICY"),
  );
});
