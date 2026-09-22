import assert from "node:assert/strict";
import test from "node:test";

import { buildTrustedExerciseCatalog, normalizeExerciseRecord } from "../../../../../algorithms/training/src/catalog.ts";
import type { InternalSessionRequirement, TrainingProfile } from "../../../../../algorithms/training/src/contracts.ts";
import { evaluateExerciseEligibility } from "../../../../../algorithms/training/src/policy.ts";
import { normalizeTrainingProfile } from "../../../../../algorithms/training/src/profile.ts";
import { calculateReadiness } from "../../../../../algorithms/training/src/readiness.ts";

function profile(overrides: Partial<TrainingProfile> = {}): TrainingProfile {
  return {
    schemaVersion: 1,
    userId: "user-1",
    goalCodes: ["STRENGTH"],
    experienceBand: "BEGINNER",
    equipmentCodes: [],
    environmentCodes: ["HOME"],
    availabilityMinutesByDay: { MONDAY: 30, WEDNESDAY: 45 },
    preferenceCodes: [],
    limitationCodes: [],
    unknownFields: [],
    revision: 1,
    updatedAt: "2026-08-30T00:00:00.000Z",
    ...overrides,
  };
}

function requirement(): InternalSessionRequirement {
  return {
    canonical: {
      schemaVersion: 1,
      requirementId: "req-1",
      semanticSessionId: "session-1",
      movementTargets: { required: ["SQUAT", "PUSH"] },
      volumeTargets: { multiplier: 1 },
      durationMinutes: 30,
      equipmentCodes: [],
      constraintCodes: [],
      reasonCodes: [],
    },
    purpose: "FULL_BODY",
    requiredMovements: ["SQUAT", "PUSH"],
    optionalMovements: ["PULL", "CORE"],
    maxExercises: 5,
    volumeMultiplier: 1,
  };
}

function trustedExercise(overrides: Record<string, unknown> = {}) {
  const result = normalizeExerciseRecord({
    id: "bodyweight-squat",
    name: "Bodyweight Squat",
    movementPattern: "SQUAT",
    primaryMuscles: ["quadriceps"],
    equipment: "body only",
    environmentCodes: ["HOME", "GYM"],
    level: "beginner",
    fatigueCost: 0.45,
    progressionCompatibility: ["REPS", "RANGE"],
    substitutionGroup: "SQUAT_FOUNDATION",
    aliases: ["Air Squat", "Bodyweight Squat"],
    ...overrides,
  }, {
    provider: "free-exercise-db",
    sourceVersion: "79ca7b47",
    license: "Unlicense",
    licenseReference: "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
    licenseVerified: true,
  });
  assert.equal(result.status, "TRUSTED");
  return result.exercise;
}

test("profile normalization keeps unknown information unknown and does not invent equipment", () => {
  const result = normalizeTrainingProfile(profile({
    goalCodes: ["UNKNOWN_GOAL"],
    equipmentCodes: [],
    availabilityMinutesByDay: { MONDAY: 20 },
    preferenceCodes: ["BLOCK_EXERCISE:legacy-row-7"],
  }), "ADULT");
  assert.equal(result.normalized.goal, null);
  assert.equal(result.normalized.equipmentCodes.size, 0);
  assert.deepEqual(result.normalized.availabilityMinutesByDay, { MONDAY: 20 });
  assert.equal(result.normalized.blockedExerciseIds.has("legacy-row-7"), true);
  assert.equal(result.missingFields.includes("goalCodes"), true);
});

test("profile normalization requires explicit policy band", () => {
  const result = normalizeTrainingProfile(profile(), "UNKNOWN");
  assert.equal(result.normalized.policyBand, "UNKNOWN");
  assert.equal(result.missingFields.includes("policyBand"), true);
});

test("readiness stops conservatively for pain or explicit stop health context", () => {
  assert.equal(calculateReadiness({ painFlag: true, energy: 10 }).status, "STOP");
  assert.equal(calculateReadiness({ healthSignal: "STOP", energy: 10 }).status, "STOP");
});

test("readiness stays bounded and never increases because of workload", () => {
  const base = calculateReadiness({ sleepQuality: 9, energy: 9, motivation: 9, soreness: 1 });
  const elevated = calculateReadiness({ sleepQuality: 9, energy: 9, motivation: 9, soreness: 1, recentWorkloadRatio: 2.2 });
  assert.equal(base.status, "FULL");
  assert.ok(elevated.volumeMultiplier <= base.volumeMultiplier);
});

test("unknown readiness data is conservative rather than fabricated", () => {
  const result = calculateReadiness({});
  assert.equal(result.score, null);
  assert.equal(result.status, "REDUCED");
  assert.equal(result.confidence, "LOW");
});

test("catalog rejects records without verified license provenance", () => {
  const result = normalizeExerciseRecord({
    id: "squat",
    name: "Squat",
    movementPattern: "SQUAT",
    environmentCodes: ["HOME"],
    level: "beginner",
    fatigueCost: 0.4,
  }, {
    provider: "legacy-import",
    sourceVersion: "1",
    licenseVerified: false,
  });
  assert.equal(result.status, "REJECTED");
  assert.equal(result.reasonCodes.includes("SOURCE_LICENSE_NOT_VERIFIED"), true);
  assert.equal(result.reasonCodes.includes("SOURCE_LICENSE_MISSING"), true);
});

test("catalog normalization is deterministic and preserves source/license fields", () => {
  const exercise = trustedExercise();
  assert.equal(exercise.source.provider, "free-exercise-db");
  assert.equal(exercise.source.license, "Unlicense");
  assert.deepEqual(exercise.aliases, ["Air Squat"]);
  assert.equal(exercise.movementPattern, "SQUAT");
  assert.deepEqual(exercise.equipmentCodes, []);
});

test("trusted catalog deterministically deduplicates equivalent normalized records", () => {
  const first = trustedExercise({ id: "squat-a" });
  const second = trustedExercise({ id: "squat-b" });
  const catalog = buildTrustedExerciseCatalog("catalog-v1", [second, first]);
  assert.equal(catalog.exercises.length, 1);
  assert.equal(catalog.exercises[0]?.source.recordId, "squat-a");
});

test("hard policy blocks unavailable equipment and incompatible environments before scoring", () => {
  const normalized = normalizeTrainingProfile(profile(), "ADULT").normalized;
  const readiness = calculateReadiness({ sleepQuality: 8, energy: 8, motivation: 8, soreness: 2 });
  const gymOnly = trustedExercise({
    id: "barbell-squat",
    equipment: ["barbell"],
    environmentCodes: ["GYM"],
  });
  const result = evaluateExerciseEligibility(gymOnly, normalized, requirement(), readiness);
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCodes.includes("MISSING_EQUIPMENT:BARBELL"), true);
  assert.equal(result.reasonCodes.includes("ENVIRONMENT_INCOMPATIBLE"), true);
});

test("blocked exercise never passes hard policy", () => {
  const exercise = trustedExercise();
  const normalized = normalizeTrainingProfile(profile({ preferenceCodes: [`BLOCK_EXERCISE:${exercise.exerciseId}`] }), "ADULT").normalized;
  const result = evaluateExerciseEligibility(exercise, normalized, requirement(), calculateReadiness({ energy: 8, sleepQuality: 8 }));
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCodes.includes("EXERCISE_BLOCKED_BY_USER"), true);
});

test("STOP readiness yields no eligible exercise", () => {
  const exercise = trustedExercise();
  const normalized = normalizeTrainingProfile(profile(), "ADULT").normalized;
  const result = evaluateExerciseEligibility(exercise, normalized, requirement(), calculateReadiness({ painFlag: true }));
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCodes.includes("READINESS_STOP"), true);
});
