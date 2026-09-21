import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateNutrientCoverage,
  type CoverageEntry,
} from "../../src/nutrition/coverage";

const vitaminC = "VITAMIN_C" as const;

function entry(amount: number | null): CoverageEntry {
  return {
    nutrients: [
      {
        nutrientId: vitaminC,
        amount,
      },
    ],
  };
}

test("coverage: 3 known entries is COMPLETE at 1.0", () => {
  const result = calculateNutrientCoverage(
    [entry(20), entry(30), entry(40)],
    vitaminC,
  );

  assert.equal(result.knownEntries, 3);
  assert.equal(result.unknownEntries, 0);
  assert.equal(result.totalRelevantEntries, 3);
  assert.equal(result.ratio, 1);
  assert.equal(result.state, "COMPLETE");
});

test("coverage: 2 of 3 known entries is PARTIAL", () => {
  const result = calculateNutrientCoverage(
    [entry(20), entry(null), entry(40)],
    vitaminC,
  );

  assert.equal(result.knownEntries, 2);
  assert.equal(result.unknownEntries, 1);
  assert.equal(result.totalRelevantEntries, 3);
  assert.ok(Math.abs(result.ratio - 2 / 3) < Number.EPSILON);
  assert.equal(result.state, "PARTIAL");
});

test("coverage: KNOWN ZERO is not UNKNOWN", () => {
  const result = calculateNutrientCoverage(
    [entry(0), entry(0), entry(0)],
    vitaminC,
  );

  assert.equal(result.knownEntries, 3);
  assert.equal(result.unknownEntries, 0);
  assert.equal(result.ratio, 1);
  assert.equal(result.state, "COMPLETE");
});

test("coverage: all unknown is NONE at zero coverage", () => {
  const result = calculateNutrientCoverage(
    [entry(null), entry(null), entry(null)],
    vitaminC,
  );

  assert.equal(result.knownEntries, 0);
  assert.equal(result.unknownEntries, 3);
  assert.equal(result.ratio, 0);
  assert.equal(result.state, "NONE");
});

test("coverage: mixed known, known-zero and unknown remains PARTIAL", () => {
  const result = calculateNutrientCoverage(
    [entry(12), entry(0), entry(null)],
    vitaminC,
  );

  assert.equal(result.knownEntries, 2);
  assert.equal(result.unknownEntries, 1);
  assert.ok(Math.abs(result.ratio - 2 / 3) < Number.EPSILON);
  assert.equal(result.state, "PARTIAL");
});

test("coverage: absent nutrient in an entry is UNKNOWN for that nutrient", () => {
  const entries: CoverageEntry[] = [
    entry(12),
    { nutrients: [] },
    entry(0),
  ];

  const result = calculateNutrientCoverage(entries, vitaminC);

  assert.equal(result.knownEntries, 2);
  assert.equal(result.unknownEntries, 1);
  assert.equal(result.state, "PARTIAL");
});
