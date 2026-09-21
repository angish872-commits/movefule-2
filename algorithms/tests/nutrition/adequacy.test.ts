import assert from "node:assert/strict";
import { test } from "node:test";

import {
  evaluateNutrientAdequacy,
  type AdequacyPolicy,
} from "../../src/nutrition/adequacy";
import type { DailyNutrientAggregate } from "../../src/nutrition/dailyNutrientAggregator";
import type { NutrientCoverage } from "../../src/nutrition/coverage";
import type {
  NutrientReference,
  ReferenceProfile,
} from "../../src/nutrition/referenceEngine";
import { COVERAGE_POLICY_VERSION } from "../../src/core/versions";

const profile: ReferenceProfile = {
  ageYears: 30,
  applicableCategory: "GENERAL",
};

const policy: AdequacyPolicy = {
  minimumCoverage: 0.8,
};

function coverage(
  nutrientId: "VITAMIN_C" | "VITAMIN_D" | "CALCIUM",
  ratio: number,
): NutrientCoverage {
  const total = 10;
  const known = Math.round(total * ratio);
  return {
    nutrientId,
    knownEntries: known,
    unknownEntries: total - known,
    totalRelevantEntries: total,
    ratio,
    state: known === 0 ? "NONE" : known === total ? "COMPLETE" : "PARTIAL",
    policyVersion: COVERAGE_POLICY_VERSION,
  };
}

function aggregate(
  nutrientId: "VITAMIN_C" | "VITAMIN_D" | "CALCIUM",
  knownAmount: number | null,
  unit: "mg" | "ug",
  ratio = 1,
): DailyNutrientAggregate {
  const c = coverage(nutrientId, ratio);
  return {
    nutrientId,
    knownAmount,
    unit,
    coverage: c,
    knownEntryCount: c.knownEntries,
    totalEntryCount: c.totalRelevantEntries,
    entryCoverage: c.ratio,
    complete: c.state === "COMPLETE",
  };
}

function reference(
  nutrientId: "VITAMIN_C" | "VITAMIN_D" | "CALCIUM",
  referenceType: NutrientReference["referenceType"],
  amount: number,
  unit: "mg" | "ug",
  sourceVersion = "ref-v1",
): NutrientReference {
  return {
    nutrientId,
    referenceType,
    amount,
    unit,
    ageMinYears: 19,
    ageMaxYears: 50,
    applicableCategory: "GENERAL",
    source: "fixture",
    sourceVersion,
  };
}

test("adequacy: incomplete Vitamin C coverage never produces a fake percentage", () => {
  const c = coverage("VITAMIN_C", 0.4);
  const result = evaluateNutrientAdequacy(
    profile,
    [aggregate("VITAMIN_C", 25, "mg", 0.4)],
    [c],
    [reference("VITAMIN_C", "RDA", 75, "mg")],
    policy,
  )[0]!;

  assert.equal(result.consumedKnown, 25);
  assert.equal(result.coverage.ratio, 0.4);
  assert.equal(result.percentOfReference, null);
  assert.equal(result.dataStatus, "INCOMPLETE_DATA");
  assert.ok(result.reasonCodes.includes("NUTRIENT_COVERAGE_BELOW_POLICY"));
});

test("adequacy: RDA is selected ahead of AI and UL remains separate", () => {
  const c = coverage("VITAMIN_C", 1);
  const result = evaluateNutrientAdequacy(
    profile,
    [aggregate("VITAMIN_C", 80, "mg")],
    [c],
    [
      reference("VITAMIN_C", "AI", 70, "mg"),
      reference("VITAMIN_C", "RDA", 75, "mg"),
      reference("VITAMIN_C", "UL", 2000, "mg"),
    ],
    policy,
  )[0]!;

  assert.equal(result.referenceType, "RDA");
  assert.equal(result.referenceAmount, 75);
  assert.ok(result.percentOfReference !== null);
  assert.equal(result.upperLimit, 2000);
  assert.equal(result.upperLimitState, "BELOW_OR_EQUAL");
});

test("adequacy: AI is used when no RDA exists", () => {
  const c = coverage("VITAMIN_D", 1);
  const result = evaluateNutrientAdequacy(
    profile,
    [aggregate("VITAMIN_D", 10, "ug")],
    [c],
    [reference("VITAMIN_D", "AI", 15, "ug")],
    policy,
  )[0]!;

  assert.equal(result.referenceType, "AI");
  assert.equal(result.referenceAmount, 15);
  assert.ok(result.percentOfReference !== null);
});

test("adequacy: UL is evaluated independently from the primary reference", () => {
  const c = coverage("CALCIUM", 1);
  const result = evaluateNutrientAdequacy(
    profile,
    [aggregate("CALCIUM", 2600, "mg")],
    [c],
    [
      reference("CALCIUM", "RDA", 1000, "mg"),
      reference("CALCIUM", "UL", 2500, "mg"),
    ],
    policy,
  )[0]!;

  assert.equal(result.referenceType, "RDA");
  assert.equal(result.upperLimitState, "ABOVE");
  assert.equal(result.upperLimit, 2500);
});

test("adequacy: EAR and AMDR records are retained rather than collapsed", () => {
  const c = coverage("VITAMIN_C", 1);
  const refs = [
    reference("VITAMIN_C", "RDA", 75, "mg"),
    reference("VITAMIN_C", "EAR", 60, "mg"),
    reference("VITAMIN_C", "AMDR", 50, "mg"),
  ];

  const result = evaluateNutrientAdequacy(
    profile,
    [aggregate("VITAMIN_C", 75, "mg")],
    [c],
    refs,
    policy,
  )[0]!;

  assert.equal(result.referenceType, "RDA");
  assert.deepEqual(
    result.applicableReferences.map((item) => item.referenceType).sort(),
    ["AMDR", "EAR", "RDA"],
  );
});

test("adequacy: missing reference is NO_REFERENCE", () => {
  const c = coverage("VITAMIN_C", 1);
  const result = evaluateNutrientAdequacy(
    profile,
    [aggregate("VITAMIN_C", 20, "mg")],
    [c],
    [],
    policy,
  )[0]!;

  assert.equal(result.dataStatus, "NO_REFERENCE");
  assert.equal(result.percentOfReference, null);
  assert.equal(result.referenceType, null);
});

test("adequacy: wrong unit is rejected", () => {
  const c = coverage("VITAMIN_C", 1);

  assert.throws(
    () =>
      evaluateNutrientAdequacy(
        profile,
        [aggregate("VITAMIN_C", 25, "mg")],
        [c],
        [reference("VITAMIN_C", "RDA", 75, "ug")],
        policy,
      ),
    /REFERENCE_UNIT_MISMATCH/,
  );
});

test("adequacy: mixed reference versions are rejected deterministically", () => {
  const c = coverage("VITAMIN_C", 1);

  assert.throws(
    () =>
      evaluateNutrientAdequacy(
        profile,
        [aggregate("VITAMIN_C", 25, "mg")],
        [c],
        [
          reference("VITAMIN_C", "RDA", 75, "mg", "ref-v1"),
          reference("VITAMIN_C", "UL", 2000, "mg", "ref-v2"),
        ],
        policy,
      ),
    /MIXED_REFERENCE_VERSIONS/,
  );
});
