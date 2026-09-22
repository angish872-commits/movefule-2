import assert from "node:assert/strict";
import test from "node:test";
import { buildProgressEnvelope } from "../../progress/progress.ts";
import type { ConfirmedMeal } from "../../meal/contracts.ts";
import type { HealthSampleSummary } from "../../health/health-store.ts";
import type { WorkoutSession } from "../../sync/types.ts";

const meal = (id: string, date: string, energy: number, protein: number): ConfirmedMeal => ({
  mealId: id,
  userId: "user-a",
  localDate: date,
  mealType: "lunch",
  status: "CONFIRMED",
  currentRevision: 1,
  sourceDraftId: `draft-${id}`,
  items: [],
  totals: { energyKcal: energy, proteinGrams: protein, carbGrams: 50, fatGrams: 20, fiberGrams: 8 },
  confirmedAtEpochMillis: Date.parse(`${date}T12:00:00Z`),
  createdAtEpochMillis: Date.parse(`${date}T12:00:00Z`),
  updatedAtEpochMillis: Date.parse(`${date}T12:00:00Z`),
});

const health = (id: string, date: string, dataType: string, value: number, unit: string): HealthSampleSummary => ({
  summaryId: id,
  userId: "user-a",
  localDate: date,
  dataType,
  value,
  unit,
  sourcePlatform: "android_health_connect",
  provenanceHash: id,
  revision: 1,
  measuredStart: `${date}T00:00:00.000Z`,
  measuredEnd: `${date}T23:59:59.000Z`,
});

test("progress uses confirmed observations and keeps missing days distinct from zero", () => {
  const workout: WorkoutSession = {
    sessionId: "workout-1",
    authorityDeviceId: "phone",
    workoutType: "Upper body strength",
    state: "COMPLETED",
    currentRevision: 4,
    startedAtEpochMillis: Date.parse("2026-08-06T08:00:00Z"),
    endedAtEpochMillis: Date.parse("2026-08-06T08:45:00Z"),
    createdAtEpochMillis: Date.parse("2026-08-06T08:00:00Z"),
    elapsedSeconds: 2700,
  };
  const result = buildProgressEnvelope({
    periodStart: "2026-08-05",
    periodEnd: "2026-08-07",
    meals: [meal("meal-1", "2026-08-06", 620, 42)],
    workouts: [workout],
    health: [
      health("steps-1", "2026-08-06", "steps", 8400, "count"),
      health("weight-1", "2026-08-06", "weight_kg", 75.4, "kg"),
    ],
  });
  assert.equal(result.coverage.totalDays, 3);
  assert.equal(result.coverage.mealObservedDays, 1);
  assert.equal(result.coverage.stepObservedDays, 1);
  assert.equal(result.totals.completedWorkouts, 1);
  assert.equal(result.days[0]?.steps, null);
  assert.equal(result.days[1]?.energyKcal, 620);
  assert.equal(result.averages.recordedEnergyKcal, 620);
  assert.deepEqual(result.weightTrend.map((point) => point.kilograms), [75.4]);
});
