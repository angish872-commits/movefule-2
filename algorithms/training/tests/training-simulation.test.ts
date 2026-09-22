import assert from "node:assert/strict";
import test from "node:test";

import { buildTrustedExerciseCatalog, normalizeExerciseRecord } from "../src/catalog.ts";
import type { ExerciseDefinition, PolicyBand, TrainingGoal, TrainingProfile } from "../src/contracts.ts";
import { generateTrainingPlan } from "../src/training-engine.ts";

function exercise(id: string, movement: string, equipment: readonly string[] = [], environmentCodes: readonly string[] = ["HOME", "GYM"]): ExerciseDefinition {
  const result = normalizeExerciseRecord({
    id, name: id, movementPattern: movement, equipment, environmentCodes, level: "beginner", fatigueCost: movement === "CARDIO" ? 0.55 : 0.4,
    progressionCompatibility: movement === "CARDIO" ? ["TIME"] : ["REPS", "RANGE"], substitutionGroup: `${movement}_${equipment.join("_") || "BODY"}`,
  }, { provider: "simulation-reviewed", sourceVersion: "1", license: "CC0-1.0", licenseReference: "https://example.test/cc0", licenseVerified: true });
  assert.equal(result.status, "TRUSTED");
  return result.exercise;
}

const catalog = buildTrustedExerciseCatalog("simulation-catalog-v1", [
  exercise("body-squat", "SQUAT"), exercise("dumbbell-squat", "SQUAT", ["DUMBBELL"]), exercise("barbell-squat", "SQUAT", ["BARBELL"], ["GYM"]),
  exercise("body-hinge", "HINGE"), exercise("dumbbell-hinge", "HINGE", ["DUMBBELL"]),
  exercise("pushup", "PUSH"), exercise("dumbbell-press", "PUSH", ["DUMBBELL"]),
  exercise("body-row", "PULL"), exercise("dumbbell-row", "PULL", ["DUMBBELL"]),
  exercise("body-lunge", "LUNGE"), exercise("carry-body", "CARRY"), exercise("plank", "CORE"),
  exercise("march", "CARDIO"), exercise("bike", "CARDIO", ["STATIONARY_BIKE"], ["GYM"]),
]);

const goals: readonly TrainingGoal[] = ["GENERAL_FITNESS", "STRENGTH", "MUSCLE", "ENDURANCE", "RETURN_TO_TRAINING", "YOUTH_FOUNDATION"];
const experiences = ["BEGINNER", "INTERMEDIATE"] as const;
const environments = ["HOME", "GYM"] as const;
const equipmentSets: readonly (readonly string[])[] = [[], ["DUMBBELL"], ["BARBELL", "DUMBBELL", "STATIONARY_BIKE"]];
const durations = [20, 35, 50] as const;
const readinessCases = [
  { energy: 9, sleepQuality: 9, motivation: 9, soreness: 1 },
  { energy: 6, sleepQuality: 6, motivation: 6, soreness: 4 },
  { energy: 3, sleepQuality: 4, motivation: 5, soreness: 7 },
] as const;
const misses = [0, 1, 3] as const;

function profile(goal: TrainingGoal, experience: string, environment: string, equipmentCodes: readonly string[], duration: number, policyBand: PolicyBand): TrainingProfile {
  return {
    schemaVersion: 1, userId: `sim-${goal}-${experience}-${environment}-${equipmentCodes.join("-") || "none"}-${duration}-${policyBand}`,
    goalCodes: [goal], experienceBand: experience, equipmentCodes, environmentCodes: [environment],
    availabilityMinutesByDay: { MONDAY: duration, WEDNESDAY: duration, FRIDAY: duration }, preferenceCodes: [], limitationCodes: [], unknownFields: [],
    revision: 1, updatedAt: "2026-08-30T00:00:00.000Z",
  };
}

function sessions(planSessions: readonly unknown[]): readonly Record<string, unknown>[] {
  return planSessions.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object" && !Array.isArray(item));
}

test("multi-week deterministic scenario matrix enforces Training Engine invariants", () => {
  let cases = 0;
  let ready = 0;
  let blocked = 0;
  let stopCases = 0;
  const policyBands: readonly PolicyBand[] = ["ADULT", "YOUTH"];

  for (const goal of goals) for (const experience of experiences) for (const environment of environments) for (const equipment of equipmentSets) for (const duration of durations) for (const readiness of readinessCases) for (const missed of misses) for (const policyBand of policyBands) {
    cases += 1;
    const history = Array.from({ length: missed }, (_, index) => ({ sessionId: `miss-${index}`, localDate: `2026-08-${String(27 + index).padStart(2, "0")}`, status: "MISSED" as const }));
    const availability = [
      { localDate: "2026-08-31", weekday: "MONDAY", availableMinutes: duration },
      { localDate: "2026-09-02", weekday: "WEDNESDAY", availableMinutes: duration },
      { localDate: "2026-09-04", weekday: "FRIDAY", availableMinutes: duration },
    ];
    const input = { profile: profile(goal, experience, environment, equipment, duration, policyBand), policyBand, readiness, history, availability, catalog, generatedAt: "2026-08-30T00:00:00.000Z", planRevision: 3 };
    const first = generateTrainingPlan(input);
    const second = generateTrainingPlan(input);
    assert.deepEqual(first, second, `non-deterministic output in simulation case ${cases}`);
    if (first.status === "BLOCKED") { blocked += 1; continue; }
    ready += 1;
    for (const session of sessions(first.plan.sessions)) {
      const expected = session.expectedDurationMinutes;
      assert.equal(typeof expected, "number");
      assert.ok((expected as number) <= duration, `duration overflow in case ${cases}`);
      const rawExercises = Array.isArray(session.exercises) ? session.exercises : [];
      const ids = new Set<string>();
      for (const raw of rawExercises) {
        assert.ok(raw && typeof raw === "object" && !Array.isArray(raw));
        const item = raw as Record<string, unknown>;
        const id = String(item.exerciseId);
        assert.equal(ids.has(id), false, `duplicate exercise in case ${cases}`);
        ids.add(id);
        const source = catalog.exercises.find((candidate) => candidate.exerciseId === id);
        assert.ok(source, `exercise missing from trusted catalog in case ${cases}`);
        for (const requiredEquipment of source!.equipmentCodes) assert.equal(equipment.includes(requiredEquipment), true, `missing equipment selected in case ${cases}`);
        assert.equal(source!.environmentCodes.includes("ANY") || source!.environmentCodes.includes(environment), true, `bad environment selected in case ${cases}`);
        assert.ok(Number(item.sets) <= (policyBand === "YOUTH" ? 3 : 4), `set cap violated in case ${cases}`);
      }
    }
    if (missed >= 2) {
      const noMiss = generateTrainingPlan({ ...input, history: [] });
      if (noMiss.status === "READY") {
        assert.ok(first.actionCandidates.length <= noMiss.actionCandidates.length, `repeated misses increased frequency in case ${cases}`);
      }
    }
  }

  for (const policyBand of policyBands) {
    stopCases += 1;
    const result = generateTrainingPlan({
      profile: profile("GENERAL_FITNESS", "BEGINNER", "HOME", [], 35, policyBand), policyBand, readiness: { painFlag: true }, history: [],
      availability: [{ localDate: "2026-08-31", weekday: "MONDAY", availableMinutes: 35 }], catalog, generatedAt: "2026-08-30T00:00:00.000Z", planRevision: 4,
    });
    assert.equal(result.status, "BLOCKED");
  }

  assert.equal(cases, 3888);
  assert.ok(ready > 0);
  assert.ok(blocked >= 0);
  assert.equal(stopCases, 2);
  console.log(JSON.stringify({ trainingSimulation: { cases, ready, blocked, stopCases, invariantChecks: "per-case" } }));
});
