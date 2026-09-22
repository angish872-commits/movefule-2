import assert from "node:assert/strict";
import test from "node:test";

import { buildTrustedExerciseCatalog, normalizeExerciseRecord } from "../src/catalog.ts";
import type { ExerciseDefinition, TrainingProfile } from "../src/contracts.ts";
import { generateTrainingPlan } from "../src/training-engine.ts";
import { normalizeTrainingProfile } from "../src/profile.ts";
import { reconstructProgramState } from "../src/program-state.ts";
import { buildWeeklyTrainingIntent } from "../src/program-engine.ts";
import { buildSessionRequirements } from "../src/session-requirement.ts";
import { calculateReadiness } from "../src/readiness.ts";
import { eligibleExercises } from "../src/policy.ts";
import { scoreEligibleExercises } from "../src/scoring.ts";
import { generateSession } from "../src/session-generator.ts";
import { validateSession } from "../src/validator.ts";

function profile(overrides: Partial<TrainingProfile> = {}): TrainingProfile {
  return {
    schemaVersion: 1, userId: "u1", goalCodes: ["GENERAL_FITNESS"], experienceBand: "BEGINNER",
    equipmentCodes: [], environmentCodes: ["HOME"], availabilityMinutesByDay: { MONDAY: 40, WEDNESDAY: 40, FRIDAY: 30 },
    preferenceCodes: [], limitationCodes: [], unknownFields: [], revision: 2, updatedAt: "2026-08-30T00:00:00.000Z", ...overrides,
  };
}

function exercise(id: string, movementPattern: string, extra: Record<string, unknown> = {}): ExerciseDefinition {
  const result = normalizeExerciseRecord({
    id, name: id.replaceAll("-", " "), movementPattern, environmentCodes: ["HOME", "GYM"], level: "beginner",
    fatigueCost: 0.4, progressionCompatibility: movementPattern === "CARDIO" ? ["TIME"] : ["REPS", "RANGE"],
    substitutionGroup: `${movementPattern}_FOUNDATION`, ...extra,
  }, {
    provider: "test-reviewed", sourceVersion: "1", license: "CC0-1.0", licenseReference: "https://example.test/license", licenseVerified: true,
  });
  assert.equal(result.status, "TRUSTED");
  return result.exercise;
}

function catalog() {
  return buildTrustedExerciseCatalog("reviewed-catalog-v1", [
    exercise("squat-a", "SQUAT"), exercise("hinge-a", "HINGE"), exercise("push-a", "PUSH"), exercise("push-b", "PUSH"),
    exercise("pull-a", "PULL"), exercise("lunge-a", "LUNGE"), exercise("core-a", "CORE"), exercise("carry-a", "CARRY"), exercise("cardio-a", "CARDIO"),
  ]);
}

const availability = [
  { localDate: "2026-08-31", weekday: "MONDAY", availableMinutes: 40 },
  { localDate: "2026-09-02", weekday: "WEDNESDAY", availableMinutes: 40 },
  { localDate: "2026-09-04", weekday: "FRIDAY", availableMinutes: 30 },
];

test("same canonical history reconstructs identical ProgramState and stable snapshot hash", () => {
  const history = [
    { sessionId: "s2", localDate: "2026-08-28", status: "MISSED" as const, planRevisionId: "p2" },
    { sessionId: "s1", localDate: "2026-08-26", status: "COMPLETED" as const, planRevisionId: "p1", exerciseIds: ["test_reviewed__push_a"], totalSets: 3 },
  ];
  const first = reconstructProgramState(history, catalog(), "GENERAL_FITNESS", "2026-08-30T00:00:00.000Z");
  const second = reconstructProgramState([...history].reverse(), catalog(), "GENERAL_FITNESS", "2026-08-30T00:00:00.000Z");
  assert.deepEqual(first, second);
  assert.equal(first.completedSessions, 1);
  assert.equal(first.missedSessions, 1);
});

test("Program Engine bounds frequency by explicit availability and repeated misses", () => {
  const normalized = normalizeTrainingProfile(profile(), "ADULT").normalized;
  const state = reconstructProgramState([
    { sessionId: "m1", localDate: "2026-08-27", status: "MISSED" },
    { sessionId: "m2", localDate: "2026-08-29", status: "MISSED" },
  ], catalog(), "GENERAL_FITNESS", "2026-08-30T00:00:00.000Z");
  const intent = buildWeeklyTrainingIntent(normalized, state);
  assert.equal(intent.frequency, 2);
});

test("SessionRequirement intersects Calendar window with profile time and bounded readiness", () => {
  const normalized = normalizeTrainingProfile(profile({ availabilityMinutesByDay: { MONDAY: 25, WEDNESDAY: 40, FRIDAY: 30 } }), "ADULT").normalized;
  const state = reconstructProgramState([], catalog(), "GENERAL_FITNESS", "2026-08-30T00:00:00.000Z");
  const intent = buildWeeklyTrainingIntent(normalized, state);
  const requirements = buildSessionRequirements(intent, normalized, availability, calculateReadiness({ energy: 6, sleepQuality: 6, motivation: 6, soreness: 4 }));
  assert.equal(requirements[0]?.canonical.durationMinutes, 25);
  assert.ok((requirements[0]?.volumeMultiplier ?? 2) <= 0.8);
});

test("home profile never receives equipment it does not own", () => {
  const c = buildTrustedExerciseCatalog("v", [...catalog().exercises, exercise("barbell-squat", "SQUAT", { equipment: ["BARBELL"], environmentCodes: ["GYM"] })]);
  const normalized = normalizeTrainingProfile(profile(), "ADULT").normalized;
  const state = reconstructProgramState([], c, "GENERAL_FITNESS", "2026-08-30T00:00:00.000Z");
  const req = buildSessionRequirements(buildWeeklyTrainingIntent(normalized, state), normalized, availability, calculateReadiness({ energy: 8, sleepQuality: 8 }))[0]!;
  const eligible = eligibleExercises(c.exercises, normalized, req, calculateReadiness({ energy: 8, sleepQuality: 8 }));
  assert.equal(eligible.some((item) => item.source.recordId === "barbell-squat"), false);
});

test("eligible exercise scoring is deterministic with stable tie breaking", () => {
  const c = catalog();
  const normalized = normalizeTrainingProfile(profile(), "ADULT").normalized;
  const state = reconstructProgramState([], c, "GENERAL_FITNESS", "2026-08-30T00:00:00.000Z");
  const readiness = calculateReadiness({ energy: 8, sleepQuality: 8, motivation: 8, soreness: 2 });
  const req = buildSessionRequirements(buildWeeklyTrainingIntent(normalized, state), normalized, availability, readiness)[0]!;
  const eligible = eligibleExercises(c.exercises, normalized, req, readiness);
  const a = scoreEligibleExercises(eligible, req, normalized, state, []);
  const b = scoreEligibleExercises([...eligible].reverse(), req, normalized, state, []);
  assert.deepEqual(a.map((entry) => [entry.exercise.exerciseId, entry.score]), b.map((entry) => [entry.exercise.exerciseId, entry.score]));
});

test("generator publishes only a validator-green deterministic session", () => {
  const c = catalog();
  const normalized = normalizeTrainingProfile(profile(), "ADULT").normalized;
  const state = reconstructProgramState([], c, "GENERAL_FITNESS", "2026-08-30T00:00:00.000Z");
  const readiness = calculateReadiness({ energy: 8, sleepQuality: 8, motivation: 8, soreness: 2 });
  const req = buildSessionRequirements(buildWeeklyTrainingIntent(normalized, state), normalized, availability, readiness)[0]!;
  const eligible = eligibleExercises(c.exercises, normalized, req, readiness);
  const scores = scoreEligibleExercises(eligible, req, normalized, state, []);
  const session = generateSession(req, scores, normalized);
  assert.ok(session);
  assert.equal(validateSession(session!, req, normalized, readiness, c).valid, true);
  assert.ok(session!.expectedDurationMinutes <= req.canonical.durationMinutes);
});

test("Training Engine emits deterministic versioned plan envelope and action candidates", () => {
  const input = {
    profile: profile(), policyBand: "ADULT" as const, readiness: { energy: 8, sleepQuality: 8, motivation: 8, soreness: 2 },
    history: [], availability, catalog: catalog(), generatedAt: "2026-08-30T00:00:00.000Z", planRevision: 1,
  };
  const first = generateTrainingPlan(input);
  const second = generateTrainingPlan(input);
  assert.deepEqual(first, second);
  assert.equal(first.status, "READY");
  if (first.status === "READY") {
    assert.equal(first.plan.exerciseCatalogVersion, "reviewed-catalog-v1");
    assert.equal(first.plan.planRevision, 1);
    assert.equal(first.actionCandidates.length, 3);
    assert.equal(first.actionCandidates.every((candidate) => candidate.userId === "u1"), true);
  }
});

test("STOP readiness never publishes a plan", () => {
  const result = generateTrainingPlan({
    profile: profile(), policyBand: "ADULT", readiness: { painFlag: true }, history: [], availability, catalog: catalog(),
    generatedAt: "2026-08-30T00:00:00.000Z", planRevision: 1,
  });
  assert.equal(result.status, "BLOCKED");
  if (result.status === "BLOCKED") assert.equal(result.reasonCodes.includes("PAIN_FLAG"), true);
});
