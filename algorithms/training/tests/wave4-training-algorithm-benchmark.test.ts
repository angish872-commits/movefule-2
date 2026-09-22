import assert from "node:assert/strict";
import test from "node:test";

import type {
  ExerciseCatalog,
  ExerciseDefinition,
  ExercisePrescription,
  GenerateTrainingPlanInput,
  TrainingGoal,
} from "../src/contracts.ts";
import { applyBoundedProgression, decideProgression } from "../src/progression.ts";
import { calculateReadiness } from "../src/readiness.ts";
import { generateTrainingPlan } from "../src/training-engine.ts";

const GENERATED_AT = "2026-09-06T12:00:00.000Z";
const MOVEMENTS = ["SQUAT", "HINGE", "PUSH", "PULL", "LUNGE", "CARRY", "CORE", "CARDIO"] as const;
type Movement = typeof MOVEMENTS[number];

type BenchmarkProfile = GenerateTrainingPlanInput["profile"];
type BenchmarkReadiness = GenerateTrainingPlanInput["readiness"];
type BenchmarkPolicyBand = GenerateTrainingPlanInput["policyBand"];

function exercise(
  movement: Movement,
  suffix: string,
  overrides: Partial<ExerciseDefinition> = {},
): ExerciseDefinition {
  return {
    exerciseId: `${movement.toLowerCase()}-${suffix}`,
    canonicalName: `${movement} ${suffix}`,
    aliases: [],
    movementPattern: movement,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipmentCodes: [],
    environmentCodes: ["HOME"],
    minimumExperience: "BEGINNER",
    skill: "FOUNDATION",
    progressionCompatibility: movement === "CARDIO" ? ["TIME"] : ["REPS"],
    substitutionGroup: `wave4-${movement.toLowerCase()}`,
    contraindicationCodes: [],
    fatigueCost: 0.35,
    source: {
      provider: "wave4-reviewed-fixture",
      recordId: `${movement.toLowerCase()}-${suffix}`,
      sourceVersion: "1",
      license: "CC0-1.0",
      licenseReference: "https://example.test/wave4-training-fixture",
    },
    ...overrides,
  };
}

function fullCatalog(): ExerciseCatalog {
  return {
    catalogVersion: "wave4-benchmark-v1",
    exercises: MOVEMENTS.flatMap((movement) => [
      exercise(movement, "home-a"),
      exercise(movement, "home-b"),
      exercise(movement, "advanced", {
        skill: "ADVANCED",
        minimumExperience: "ADVANCED",
        fatigueCost: 0.9,
      }),
    ]),
  };
}

function profile(
  goal: TrainingGoal = "GENERAL_FITNESS",
  overrides: Partial<BenchmarkProfile> = {},
): BenchmarkProfile {
  return {
    schemaVersion: 1,
    userId: "wave4-user",
    goalCodes: [goal],
    experienceBand: "BEGINNER",
    equipmentCodes: [],
    environmentCodes: ["HOME"],
    availabilityMinutesByDay: { MONDAY: 60, WEDNESDAY: 60, FRIDAY: 60 },
    preferenceCodes: [],
    limitationCodes: [],
    unknownFields: [],
    revision: 7,
    updatedAt: "2026-09-06T10:00:00.000Z",
    ...overrides,
  };
}

function availability(minutes: number): GenerateTrainingPlanInput["availability"] {
  return [
    { localDate: "2026-09-07", weekday: "MONDAY", availableMinutes: minutes },
    { localDate: "2026-09-09", weekday: "WEDNESDAY", availableMinutes: minutes },
    { localDate: "2026-09-11", weekday: "FRIDAY", availableMinutes: minutes },
  ];
}

function readinessFor(status: "FULL" | "REDUCED" | "RECOVERY"): BenchmarkReadiness {
  if (status === "FULL") return { sleepQuality: 8, energy: 8, motivation: 8, soreness: 2 };
  if (status === "REDUCED") return { sleepQuality: 6, energy: 6, motivation: 6, soreness: 4 };
  return { sleepQuality: 4, energy: 4, motivation: 4, soreness: 6 };
}

function input(
  goal: TrainingGoal,
  policyBand: BenchmarkPolicyBand,
  readiness: BenchmarkReadiness,
  minutes: number,
  overrides: Partial<GenerateTrainingPlanInput> = {},
): GenerateTrainingPlanInput {
  return {
    profile: profile(goal, { availabilityMinutesByDay: { MONDAY: minutes, WEDNESDAY: minutes, FRIDAY: minutes } }),
    policyBand,
    readiness,
    history: [],
    availability: availability(minutes),
    catalog: fullCatalog(),
    generatedAt: GENERATED_AT,
    planRevision: 3,
    seed: "wave4-deterministic-seed",
    ...overrides,
  };
}

function sessionRecords(result: ReturnType<typeof generateTrainingPlan>) {
  assert.equal(result.status, "READY");
  if (result.status !== "READY") return [];
  return result.plan.sessions as readonly Record<string, unknown>[];
}

function targetReadiness(score: number): BenchmarkReadiness {
  const value = score / 10;
  return {
    sleepQuality: value,
    energy: value,
    motivation: value,
    soreness: 10 - value,
  };
}

test("Wave-4 readiness boundary matrix preserves FULL/REDUCED/RECOVERY/STOP and unknown semantics", () => {
  const cases = [
    { score: 100, status: "FULL" },
    { score: 75, status: "FULL" },
    { score: 74, status: "REDUCED" },
    { score: 55, status: "REDUCED" },
    { score: 54, status: "RECOVERY" },
    { score: 0, status: "RECOVERY" },
  ] as const;
  for (const scenario of cases) {
    const result = calculateReadiness(targetReadiness(scenario.score));
    assert.equal(result.score, scenario.score, `readiness score ${scenario.score}`);
    assert.equal(result.status, scenario.status, `readiness status ${scenario.score}`);
  }

  const unknown = calculateReadiness({});
  assert.equal(unknown.score, null);
  assert.equal(unknown.status, "REDUCED");
  assert.equal(unknown.volumeMultiplier, 0.8);
  assert.ok(unknown.reasonCodes.includes("READINESS_DATA_UNKNOWN"));

  for (const stop of [{ painFlag: true }, { illnessFlag: true }]) {
    const result = calculateReadiness(stop);
    assert.equal(result.status, "STOP");
    assert.equal(result.volumeMultiplier, 0);
  }
});

const prior: ExercisePrescription = {
  exerciseId: "squat-home-a",
  exerciseName: "Squat",
  movementPattern: "SQUAT",
  sets: 3,
  repRange: { min: 8, max: 12 },
  durationSeconds: null,
  restSeconds: 75,
  substitutionExerciseIds: [],
  progressionContext: ["REPS"],
  reasonCodes: [],
};

test("Wave-4 progression matrix uses performed completion facts and never punishes misses", () => {
  const cases = [
    { completedSets: 0, prescribedSets: 3, decision: "BOUNDED_REDUCE" },
    { completedSets: 1, prescribedSets: 3, decision: "BOUNDED_REDUCE" },
    { completedSets: 2, prescribedSets: 3, decision: "REPEAT" },
    { completedSets: 3, prescribedSets: 3, targetRepsMet: false, decision: "REPEAT" },
    { completedSets: 3, prescribedSets: 3, targetRepsMet: true, effortRpe: 8, decision: "PROGRESS" },
    { completedSets: 3, prescribedSets: 3, targetRepsMet: true, effortRpe: 9.5, decision: "REPEAT" },
    { completedSets: 4, prescribedSets: 3, targetRepsMet: true, effortRpe: 8.5, decision: "PROGRESS" },
  ] as const;

  for (const scenario of cases) {
    const result = decideProgression({ prior, policyBand: "ADULT", ...scenario });
    assert.equal(result.decision, scenario.decision);
  }

  const missed = decideProgression({ prior, completedSets: 0, prescribedSets: 3, missedSession: true, policyBand: "ADULT" });
  assert.equal(missed.decision, "REPEAT");
  assert.ok(missed.reasonCodes.includes("MISSED_SESSION_NO_PUNISHMENT_PROGRESSION"));

  const safety = decideProgression({ prior, completedSets: 3, prescribedSets: 3, targetRepsMet: true, painOrSafetyConcern: true, policyBand: "ADULT" });
  assert.equal(safety.decision, "BOUNDED_REDUCE");

  const unknownPolicy = decideProgression({ prior, completedSets: 3, prescribedSets: 3, targetRepsMet: true, policyBand: "UNKNOWN" });
  assert.equal(unknownPolicy.decision, "MAINTAIN");

  const youth = applyBoundedProgression({ prior, completedSets: 3, prescribedSets: 3, targetRepsMet: true, effortRpe: 7, policyBand: "YOUTH" });
  assert.equal(youth.decision, "PROGRESS");
  assert.deepEqual(youth.repRange, { min: 8, max: 13 });

  const explicitZero = applyBoundedProgression({ prior, completedSets: 0, prescribedSets: 3, targetRepsMet: false, effortRpe: 0, policyBand: "ADULT" });
  assert.equal(explicitZero.decision, "BOUNDED_REDUCE");
  assert.equal(explicitZero.sets, 2);
});

test("Wave-4 Training Engine benchmark is deterministic and fail-closed across goals, readiness bands, and 15/30/60-minute budgets", () => {
  const goals: readonly TrainingGoal[] = [
    "GENERAL_FITNESS",
    "STRENGTH",
    "MUSCLE",
    "ENDURANCE",
    "RETURN_TO_TRAINING",
    "YOUTH_FOUNDATION",
  ];
  const readinessBands = ["FULL", "REDUCED", "RECOVERY"] as const;
  const durations = [15, 30, 60] as const;
  let scenarioCount = 0;
  let readyCount = 0;

  for (const goal of goals) {
    for (const readinessBand of readinessBands) {
      for (const minutes of durations) {
        scenarioCount += 1;
        const youthScenario = goal === "YOUTH_FOUNDATION";
        const policyBand = youthScenario ? ("YOUTH" as const) : ("ADULT" as const);
        const scenario = input(goal, policyBand, readinessFor(readinessBand), minutes);
        const definitions = new Map(scenario.catalog.exercises.map((definition) => [definition.exerciseId, definition]));
        const first = generateTrainingPlan(scenario);
        const second = generateTrainingPlan(structuredClone(scenario));
        assert.deepEqual(second, first, `${goal}/${readinessBand}/${minutes} must be deterministic`);

        if (first.status === "BLOCKED") {
          assert.ok(first.reasonCodes.length > 0, `${goal}/${readinessBand}/${minutes} blocked without an explicit reason`);
          continue;
        }

        readyCount += 1;
        assert.ok(first.plan.sessions.length >= 1);
        assert.equal(first.plan.profileRevision, scenario.profile.revision);
        assert.equal(first.plan.planRevision, scenario.planRevision);
        assert.equal(first.actionCandidates.length, first.plan.sessions.length);

        for (let index = 0; index < first.requirements.length; index += 1) {
          const requirement = first.requirements[index]!;
          const session = first.plan.sessions[index] as Record<string, unknown>;
          const expectedDurationMinutes = session.expectedDurationMinutes as number;
          const exercises = session.exercises as readonly Record<string, unknown>[];
          assert.ok(expectedDurationMinutes <= requirement.canonical.durationMinutes, "session exceeded authoritative time envelope");
          assert.ok(exercises.length <= Math.max(requirement.maxExercises, requirement.requiredMovements.length));
          assert.equal(new Set(exercises.map((selected) => selected.exerciseId)).size, exercises.length, "duplicate exercise selected");
          for (const required of requirement.requiredMovements) {
            assert.ok(
              exercises.some((selected) => definitions.get(String(selected.exerciseId))?.movementPattern === required),
              `missing required movement ${required}`,
            );
          }
          if (youthScenario) {
            assert.ok(
              exercises.every((selected) => definitions.get(String(selected.exerciseId))?.skill !== "ADVANCED"),
              "Youth plan admitted advanced/high-fatigue fixture",
            );
          }
        }
      }
    }
  }

  assert.equal(scenarioCount, 54);
  assert.ok(readyCount > 0, "benchmark fixture must exercise at least one emitted canonical plan");
});

test("Wave-4 hard-filter matrix blocks missing equipment, wrong location, STOP, missing profile, and bad availability", () => {
  const equipmentOnly: ExerciseCatalog = {
    catalogVersion: "equipment-only",
    exercises: MOVEMENTS.map((movement) => exercise(movement, "barbell", { equipmentCodes: ["BARBELL"] })),
  };
  const missingEquipment = generateTrainingPlan(input("GENERAL_FITNESS", "ADULT", readinessFor("FULL"), 30, { catalog: equipmentOnly }));
  assert.equal(missingEquipment.status, "BLOCKED");

  const gymOnly: ExerciseCatalog = {
    catalogVersion: "gym-only",
    exercises: MOVEMENTS.map((movement) => exercise(movement, "gym", { environmentCodes: ["GYM"] })),
  };
  const wrongLocation = generateTrainingPlan(input("GENERAL_FITNESS", "ADULT", readinessFor("FULL"), 30, { catalog: gymOnly }));
  assert.equal(wrongLocation.status, "BLOCKED");

  const stopInputs: readonly BenchmarkReadiness[] = [
    { sleepQuality: null, energy: null, motivation: null, soreness: null, painFlag: true },
    { sleepQuality: null, energy: null, motivation: null, soreness: null, illnessFlag: true },
  ];
  for (const stopReadiness of stopInputs) {
    const stopped = generateTrainingPlan(input("GENERAL_FITNESS", "ADULT", stopReadiness, 30));
    assert.equal(stopped.status, "BLOCKED");
    if (stopped.status === "BLOCKED") assert.ok(stopped.reasonCodes.some((reason) => reason.includes("FLAG")));
  }

  const missingProfile = generateTrainingPlan(input("GENERAL_FITNESS", "ADULT", readinessFor("FULL"), 30, {
    profile: profile("GENERAL_FITNESS", { unknownFields: ["equipmentCodes"] }),
  }));
  assert.equal(missingProfile.status, "BLOCKED");
  if (missingProfile.status === "BLOCKED") assert.ok(missingProfile.missingFields.includes("equipmentCodes"));

  const noWindow = generateTrainingPlan(input("GENERAL_FITNESS", "ADULT", readinessFor("FULL"), 30, {
    availability: availability(30).map((slot) => ({ ...slot, locked: true })),
  }));
  assert.equal(noWindow.status, "BLOCKED");
});

test("Wave-4 substitutions remain inside hard eligibility boundaries for an emitted plan", () => {
  const candidateScenarios = [
    input("GENERAL_FITNESS", "ADULT", readinessFor("FULL"), 60),
    input("STRENGTH", "ADULT", readinessFor("FULL"), 60),
    input("RETURN_TO_TRAINING", "ADULT", readinessFor("REDUCED"), 60),
    input("YOUTH_FOUNDATION", "YOUTH", readinessFor("FULL"), 60),
  ];
  const scenario = candidateScenarios.find((candidate) => generateTrainingPlan(candidate).status === "READY");
  assert.ok(scenario, "benchmark fixture must provide at least one READY plan for substitution validation");
  if (!scenario) return;

  const definitions = new Map(scenario.catalog.exercises.map((definition) => [definition.exerciseId, definition]));
  const result = generateTrainingPlan(scenario);
  const sessions = sessionRecords(result);
  for (const session of sessions) {
    const exercises = session.exercises as readonly Record<string, unknown>[];
    for (const selected of exercises) {
      const substitutions = selected.substitutionExerciseIds as readonly string[];
      for (const substitutionId of substitutions) {
        const definition = definitions.get(substitutionId);
        assert.ok(definition, `unknown substitution ${substitutionId}`);
        assert.ok(definition.environmentCodes.includes("HOME"), `substitution escaped HOME eligibility: ${substitutionId}`);
        assert.notEqual(definition.skill, "ADVANCED", `advanced substitution escaped hard eligibility: ${substitutionId}`);
      }
    }
  }
});
