import assert from "node:assert/strict";
import test from "node:test";

import { buildTrustedExerciseCatalog, normalizeExerciseRecord } from "../src/catalog.ts";
import type { ExerciseDefinition, ExperienceBand, PolicyBand, TrainingGoal, TrainingHistorySession, TrainingProfile } from "../src/contracts.ts";
import { generateTrainingPlan } from "../src/training-engine.ts";

function exercise(id: string, movementPattern: string, extra: Record<string, unknown> = {}): ExerciseDefinition {
  const normalized = normalizeExerciseRecord({
    id,
    name: id,
    movementPattern,
    environmentCodes: ["HOME", "GYM"],
    level: "beginner",
    fatigueCost: 0.35,
    progressionCompatibility: movementPattern === "CARDIO" ? ["TIME"] : ["REPS", "RANGE"],
    substitutionGroup: `${movementPattern}_SIM`,
    ...extra,
  }, {
    provider: "simulation-reviewed",
    sourceVersion: "1",
    license: "CC0-1.0",
    licenseReference: "https://example.test/simulation-license",
    licenseVerified: true,
  });
  assert.equal(normalized.status, "TRUSTED");
  return normalized.exercise;
}

const CATALOG = buildTrustedExerciseCatalog("training-simulation-v1", [
  exercise("sim-squat", "SQUAT"),
  exercise("sim-hinge", "HINGE"),
  exercise("sim-push", "PUSH"),
  exercise("sim-pull", "PULL"),
  exercise("sim-lunge", "LUNGE"),
  exercise("sim-core", "CORE"),
  exercise("sim-carry", "CARRY"),
  exercise("sim-cardio", "CARDIO"),
]);

const POLICY_BANDS: readonly Exclude<PolicyBand, "UNKNOWN">[] = ["YOUTH", "ADULT", "OLDER_ADULT"];
const GOALS: readonly TrainingGoal[] = ["GENERAL_FITNESS", "STRENGTH", "MUSCLE", "RETURN_TO_TRAINING"];
const EXPERIENCES: readonly Exclude<ExperienceBand, "UNKNOWN">[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const READINESS = Object.freeze([
  Object.freeze({ energy: 9, sleepQuality: 9, motivation: 8, soreness: 1 }),
  Object.freeze({ energy: 5, sleepQuality: 5, motivation: 5, soreness: 5 }),
  Object.freeze({ energy: 7, sleepQuality: 7, painFlag: true }),
] as const);
const DURATIONS = Object.freeze([20, 40, 60] as const);
const HISTORIES: readonly (readonly TrainingHistorySession[])[] = Object.freeze([
  Object.freeze([]),
  Object.freeze([{ sessionId: "completed-1", localDate: "2026-08-26", status: "COMPLETED", planRevisionId: "plan-1", totalSets: 8 }]),
  Object.freeze([
    { sessionId: "missed-1", localDate: "2026-08-25", status: "MISSED", planRevisionId: "plan-1" },
    { sessionId: "missed-2", localDate: "2026-08-28", status: "MISSED", planRevisionId: "plan-2" },
  ]),
]);
const CALENDAR_PATTERNS = Object.freeze([
  Object.freeze(["MONDAY", "WEDNESDAY", "FRIDAY"]),
  Object.freeze(["MONDAY", "THURSDAY", "SATURDAY"]),
  Object.freeze(["TUESDAY", "THURSDAY", "SUNDAY"]),
  Object.freeze(["WEDNESDAY", "FRIDAY", "SUNDAY"]),
] as const);

function localDateFor(day: string, slot: number): string {
  const dates: Record<string, string> = {
    MONDAY: "2026-08-31",
    TUESDAY: "2026-09-01",
    WEDNESDAY: "2026-09-02",
    THURSDAY: "2026-09-03",
    FRIDAY: "2026-09-04",
    SATURDAY: "2026-09-05",
    SUNDAY: "2026-09-06",
  };
  return dates[day] ?? `2026-09-${String(slot + 1).padStart(2, "0")}`;
}

function profile(goal: TrainingGoal, experience: Exclude<ExperienceBand, "UNKNOWN">, duration: number, weekdays: readonly string[], userId: string): TrainingProfile {
  return {
    schemaVersion: 1,
    userId,
    goalCodes: [goal],
    experienceBand: experience,
    equipmentCodes: [],
    environmentCodes: ["HOME"],
    availabilityMinutesByDay: Object.fromEntries(weekdays.map((day) => [day, duration])),
    preferenceCodes: [],
    limitationCodes: [],
    unknownFields: [],
    revision: 1,
    updatedAt: "2026-08-30T00:00:00.000Z",
  };
}

test("Training Engine 5 executes 3,888 deterministic policy/safety simulations without bypassing validation", () => {
  let simulations = 0;
  let ready = 0;
  let blocked = 0;
  let stopBlocked = 0;

  for (const policyBand of POLICY_BANDS) {
    for (const goal of GOALS) {
      for (const experience of EXPERIENCES) {
        for (const readiness of READINESS) {
          for (const duration of DURATIONS) {
            for (const history of HISTORIES) {
              for (let calendarIndex = 0; calendarIndex < CALENDAR_PATTERNS.length; calendarIndex += 1) {
                const weekdays = CALENDAR_PATTERNS[calendarIndex]!;
                const userId = `sim-${simulations}`;
                const availability = weekdays.map((weekday, slot) => ({
                  localDate: localDateFor(weekday, slot),
                  weekday,
                  availableMinutes: duration,
                }));
                const input = {
                  profile: profile(goal, experience, duration, weekdays, userId),
                  policyBand,
                  readiness,
                  history,
                  availability,
                  catalog: CATALOG,
                  generatedAt: "2026-08-30T00:00:00.000Z",
                  planRevision: 1,
                  seed: `matrix-${simulations}`,
                } as const;

                const result = generateTrainingPlan(input);
                simulations += 1;

                if (result.status === "READY") {
                  ready += 1;
                  assert.equal(result.plan.planRevision, 1);
                  assert.equal(result.plan.exerciseCatalogVersion, CATALOG.catalogVersion);
                  assert.equal(result.plan.profileRevision, input.profile.revision);
                  assert.ok(result.plan.sessions.length > 0);
                  assert.ok(result.actionCandidates.length > 0);
                  assert.ok(result.actionCandidates.every((candidate) => candidate.userId === userId));
                  assert.ok(result.actionCandidates.every((candidate) => candidate.sourcePlanId === result.plan.planId));
                  assert.ok(result.actionCandidates.every((candidate) => candidate.sourcePlanRevision === result.plan.planRevision));
                } else {
                  blocked += 1;
                  assert.ok(result.reasonCodes.length > 0);
                  if (readiness.painFlag === true) {
                    stopBlocked += 1;
                    assert.ok(result.reasonCodes.includes("PAIN_FLAG"));
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  assert.equal(simulations, 3_888);
  assert.equal(ready + blocked, 3_888);
  assert.ok(ready > 0, "matrix must exercise publishable plans");
  assert.ok(blocked > 0, "matrix must exercise fail-closed paths");
  assert.equal(stopBlocked, 1_296, "every pain-flag scenario must remain blocked");
});
