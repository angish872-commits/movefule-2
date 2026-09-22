import assert from "node:assert/strict";
import test from "node:test";

import type { ExercisePrescription } from "../src/contracts.ts";
import { decideMissedWorkout } from "../src/missed-workout.ts";
import { applyBoundedProgression, decideProgression } from "../src/progression.ts";
import { calculateReadiness } from "../src/readiness.ts";

const prior: ExercisePrescription = {
  exerciseId: "ex-1", exerciseName: "Squat", movementPattern: "SQUAT", sets: 3,
  repRange: { min: 8, max: 12 }, durationSeconds: null, restSeconds: 75,
  substitutionExerciseIds: [], progressionContext: ["REPS"], reasonCodes: [],
};

test("safety concern can never trigger harder progression", () => {
  const result = decideProgression({ prior, completedSets: 3, prescribedSets: 3, targetRepsMet: true, effortRpe: 6, painOrSafetyConcern: true, policyBand: "ADULT" });
  assert.equal(result.decision, "BOUNDED_REDUCE");
});

test("missed workout repeats rather than creates punishment progression", () => {
  const result = decideProgression({ prior, completedSets: 0, prescribedSets: 3, targetRepsMet: false, missedSession: true, policyBand: "ADULT" });
  assert.equal(result.decision, "REPEAT");
  assert.equal(result.reasonCodes.includes("MISSED_SESSION_NO_PUNISHMENT_PROGRESSION"), true);
});

test("adult rep progression is capped at two reps and does not invent sets or load", () => {
  const next = applyBoundedProgression({ prior, completedSets: 3, prescribedSets: 3, targetRepsMet: true, effortRpe: 7, policyBand: "ADULT" });
  assert.equal(next.decision, "PROGRESS");
  assert.equal(next.sets, 3);
  assert.deepEqual(next.repRange, { min: 8, max: 14 });
});

test("youth progression is smaller and conservative", () => {
  const next = applyBoundedProgression({ prior, completedSets: 3, prescribedSets: 3, targetRepsMet: true, effortRpe: 7, policyBand: "YOUTH" });
  assert.equal(next.decision, "PROGRESS");
  assert.deepEqual(next.repRange, { min: 8, max: 13 });
  assert.equal(next.sets, prior.sets);
});

test("unknown policy band does not progress", () => {
  const result = decideProgression({ prior, completedSets: 3, prescribedSets: 3, targetRepsMet: true, effortRpe: 6, policyBand: "UNKNOWN" });
  assert.equal(result.decision, "MAINTAIN");
});

test("missed workout engine never doubles or compensates volume", () => {
  const full = calculateReadiness({ energy: 8, sleepQuality: 8, motivation: 8, soreness: 2 });
  assert.equal(decideMissedWorkout({ futureAvailableWindow: true, consecutiveMisses: 1, readiness: full, policyBand: "ADULT" }).action, "RESCHEDULE_IF_AVAILABLE");
  assert.equal(decideMissedWorkout({ futureAvailableWindow: false, consecutiveMisses: 3, readiness: full, policyBand: "ADULT" }).action, "SHORTEN_NEXT_IF_NEEDED");
});

test("STOP readiness does not reschedule a missed workout into a hidden hard session", () => {
  const stop = calculateReadiness({ painFlag: true });
  const result = decideMissedWorkout({ futureAvailableWindow: true, consecutiveMisses: 1, readiness: stop, policyBand: "ADULT" });
  assert.equal(result.action, "CONTINUE_PROGRAM");
});
