import assert from "node:assert/strict";
import test from "node:test";

import { adaptRequirementToCalendarWindow } from "../../../../../algorithms/training/src/calendar-adaptation.ts";
import { buildTrustedExerciseCatalog, normalizeExerciseRecord } from "../../../../../algorithms/training/src/catalog.ts";
import type { ExerciseDefinition, InternalSessionRequirement, TrainingProfile } from "../../../../../algorithms/training/src/contracts.ts";
import { generateTrainingPlan } from "../../../../../algorithms/training/src/training-engine.ts";
import { eligibleExercises } from "../../../../../algorithms/training/src/policy.ts";
import { normalizeTrainingProfile } from "../../../../../algorithms/training/src/profile.ts";
import { calculateReadiness } from "../../../../../algorithms/training/src/readiness.ts";
import { scoreEligibleExercises } from "../../../../../algorithms/training/src/scoring.ts";
import { generateSession } from "../../../../../algorithms/training/src/session-generator.ts";
import { reconstructProgramState } from "../../../../../algorithms/training/src/program-state.ts";
import { validateSession } from "../../../../../algorithms/training/src/validator.ts";
import { toDailyTrainingCandidate } from "../../training/today-adapter.ts";

function exercise(id: string, movement: string): ExerciseDefinition {
  const result = normalizeExerciseRecord({ id, name: id, movementPattern: movement, environmentCodes: ["HOME"], level: "beginner", fatigueCost: 0.4, progressionCompatibility: ["REPS"], substitutionGroup: movement }, {
    provider: "boundary-test", sourceVersion: "1", license: "CC0-1.0", licenseReference: "https://example.test/license", licenseVerified: true,
  });
  assert.equal(result.status, "TRUSTED");
  return result.exercise;
}

const profile: TrainingProfile = {
  schemaVersion: 1, userId: "u1", goalCodes: ["GENERAL_FITNESS"], experienceBand: "BEGINNER", equipmentCodes: [], environmentCodes: ["HOME"], availabilityMinutesByDay: { MONDAY: 45 }, preferenceCodes: [], limitationCodes: [], unknownFields: [], revision: 1, updatedAt: "2026-08-30T00:00:00.000Z",
};

const requirement: InternalSessionRequirement = {
  canonical: { schemaVersion: 1, requirementId: "req", semanticSessionId: "session", movementTargets: { required: ["SQUAT", "PUSH", "PULL"] }, volumeTargets: { multiplier: 1 }, durationMinutes: 45, equipmentCodes: [], constraintCodes: [], reasonCodes: [] },
  localDate: "2026-08-31", purpose: "FULL_BODY", requiredMovements: ["SQUAT", "PUSH", "PULL"], optionalMovements: ["CORE"], maxExercises: 5, volumeMultiplier: 1,
};

test("Calendar adaptation only constrains Training requirement and cannot increase volume", () => {
  const adapted = adaptRequirementToCalendarWindow(requirement, 20);
  assert.ok(adapted);
  assert.equal(adapted!.canonical.durationMinutes, 20);
  assert.ok(adapted!.volumeMultiplier <= requirement.volumeMultiplier);
  assert.deepEqual(adapted!.requiredMovements, requirement.requiredMovements);
  assert.equal(adaptRequirementToCalendarWindow(requirement, 5), null);
});

test("shorter Calendar window is regenerated and validated by Training instead of direct Calendar prescription edits", () => {
  const catalog = buildTrustedExerciseCatalog("v1", [exercise("squat", "SQUAT"), exercise("push", "PUSH"), exercise("pull", "PULL"), exercise("core", "CORE")]);
  const normalized = normalizeTrainingProfile(profile, "ADULT").normalized;
  const readiness = calculateReadiness({ energy: 8, sleepQuality: 8, motivation: 8, soreness: 2 });
  const adapted = adaptRequirementToCalendarWindow(requirement, 25)!;
  const state = reconstructProgramState([], catalog, "GENERAL_FITNESS", "2026-08-30T00:00:00.000Z");
  const eligible = eligibleExercises(catalog.exercises, normalized, adapted, readiness);
  const scores = scoreEligibleExercises(eligible, adapted, normalized, state, []);
  const session = generateSession(adapted, scores, normalized);
  assert.ok(session);
  assert.equal(validateSession(session!, adapted, normalized, readiness, catalog).valid, true);
  assert.ok(session!.expectedDurationMinutes <= 25);
});

test("Training candidate converts to canonical Today boundary with revision provenance", () => {
  const candidate = toDailyTrainingCandidate({
    candidateId: "tc1", userId: "u1", type: "TRAINING_SESSION", score: 100, sourcePlanId: "plan1", sourcePlanRevision: 4,
    semanticSessionId: "session1", reasonCodes: ["VALID_TRAINING_SESSION"], validFrom: "2026-08-30T00:00:00.000Z", expiresAt: "2026-08-31T00:00:00.000Z",
  });
  assert.equal(candidate.domain, "TRAINING");
  assert.equal(candidate.sourceObjectId, "plan1");
  assert.equal(candidate.sourceRevision, "4");
  assert.equal(candidate.semanticActionKey, "training:TRAINING_SESSION:session1");
});

test("Training session candidate without canonical plan provenance fails closed", () => {
  assert.throws(() => toDailyTrainingCandidate({
    candidateId: "tc1", userId: "u1", type: "TRAINING_SESSION", score: 100, sourcePlanId: null, sourcePlanRevision: null,
    semanticSessionId: null, reasonCodes: [], validFrom: "2026-08-30T00:00:00.000Z", expiresAt: "2026-08-31T00:00:00.000Z",
  }), /requires source plan/);
});

test("Food-domain context cannot change Training prescription or create punishment exercise", () => {
  const catalog = buildTrustedExerciseCatalog("food-boundary-v1", [
    exercise("squat-food-boundary", "SQUAT"),
    exercise("push-food-boundary", "PUSH"),
    exercise("pull-food-boundary", "PULL"),
    exercise("core-food-boundary", "CORE"),
  ]);
  const baseInput = {
    profile,
    policyBand: "ADULT" as const,
    readiness: { energy: 7, sleepQuality: 7, motivation: 7, soreness: 2 },
    history: [],
    availability: [{ localDate: "2026-08-31", weekday: "MONDAY", availableMinutes: 45 }],
    catalog,
    generatedAt: "2026-08-30T00:00:00.000Z",
    planRevision: 9,
  };
  const noMealsContext = { ...baseInput, foodContext: { confirmedMealCount: 0, foodRevision: 1 } };
  const manyMealsContext = { ...baseInput, foodContext: { confirmedMealCount: 6, foodRevision: 99 } };
  const withoutFood = generateTrainingPlan(baseInput);
  const withNoMeals = generateTrainingPlan(noMealsContext);
  const withManyMeals = generateTrainingPlan(manyMealsContext);
  assert.deepEqual(withNoMeals, withoutFood);
  assert.deepEqual(withManyMeals, withoutFood);
});
