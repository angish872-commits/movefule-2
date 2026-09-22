import { ContractError } from "../shared/contracts.ts";
import type { ConfirmedMeal } from "../meal/contracts.ts";
import type { HealthSampleSummary } from "../health/health-store.ts";
import type { WorkoutSession } from "../sync/types.ts";

export type ProgressDay = {
  localDate: string;
  confirmedMealCount: number;
  energyKcal: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
  steps: number | null;
  activeEnergyKcal: number | null;
  completedWorkouts: number;
  workoutMinutes: number;
  completedSets: number;
  trainingVolumeKg: number;
};

export type WeightPoint = {
  localDate: string;
  kilograms: number;
  sourcePlatform: string;
};

export type ProgressEnvelope = {
  periodStart: string;
  periodEnd: string;
  days: ProgressDay[];
  totals: {
    confirmedMeals: number;
    completedWorkouts: number;
    workoutMinutes: number;
    completedSets: number;
    trainingVolumeKg: number;
    steps: number | null;
    activeEnergyKcal: number | null;
  };
  averages: {
    recordedEnergyKcal: number | null;
    recordedProteinGrams: number | null;
    recordedCarbGrams: number | null;
    recordedFatGrams: number | null;
    recordedFiberGrams: number | null;
    steps: number | null;
  };
  coverage: {
    totalDays: number;
    mealObservedDays: number;
    stepObservedDays: number;
    workoutObservedDays: number;
  };
  weightTrend: WeightPoint[];
};

function parseDate(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ContractError(`invalid_${field}`, `${field} must use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ContractError(`invalid_${field}`, `${field} is not a valid calendar date.`);
  }
  return parsed;
}

function dateRange(start: string, end: string): string[] {
  const from = parseDate(start, "from");
  const to = parseDate(end, "to");
  if (from > to) throw new ContractError("invalid_progress_range", "from must not be after to.");
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (days > 366) throw new ContractError("progress_range_too_large", "Progress range cannot exceed 366 days.");
  return Array.from({ length: days }, (_, index) => new Date(from.getTime() + index * 86_400_000).toISOString().slice(0, 10));
}

const round = (value: number): number => Math.round(value * 10) / 10;
const average = (values: number[]): number | null => values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
const sumOrNull = (values: number[]): number | null => values.length ? round(values.reduce((sum, value) => sum + value, 0)) : null;

function healthValues(summaries: HealthSampleSummary[], localDate: string, names: string[]): number[] {
  const keys = new Set(names.map((name) => name.toLowerCase()));
  return summaries
    .filter((sample) => sample.localDate === localDate && keys.has(sample.dataType.toLowerCase()))
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value >= 0);
}

function workoutDate(session: WorkoutSession): string | null {
  const timestamp = session.endedAtEpochMillis ?? session.startedAtEpochMillis ?? session.createdAtEpochMillis;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Deterministic progress projection. Confirmed meals, completed workouts and
 * approved health summaries are the only inputs; missing data remains null.
 */
export function buildProgressEnvelope(input: {
  periodStart: string;
  periodEnd: string;
  meals: ConfirmedMeal[];
  workouts: WorkoutSession[];
  health: HealthSampleSummary[];
}): ProgressEnvelope {
  const dates = dateRange(input.periodStart, input.periodEnd);
  const allowedDates = new Set(dates);
  const meals = input.meals.filter((meal) => meal.status === "CONFIRMED" && allowedDates.has(meal.localDate));
  const workouts = input.workouts.filter((session) => session.state === "COMPLETED" && workoutDate(session) !== null && allowedDates.has(workoutDate(session)!));

  const days = dates.map((localDate): ProgressDay => {
    const dayMeals = meals.filter((meal) => meal.localDate === localDate);
    const dayWorkouts = workouts.filter((session) => workoutDate(session) === localDate);
    const stepValues = healthValues(input.health, localDate, ["steps", "steps_total", "step_count"]);
    const activeEnergyValues = healthValues(input.health, localDate, ["active_energy", "active_calories", "active_energy_kcal"]);
    return {
      localDate,
      confirmedMealCount: dayMeals.length,
      energyKcal: Math.round(dayMeals.reduce((sum, meal) => sum + meal.totals.energyKcal, 0)),
      proteinGrams: round(dayMeals.reduce((sum, meal) => sum + meal.totals.proteinGrams, 0)),
      carbGrams: round(dayMeals.reduce((sum, meal) => sum + meal.totals.carbGrams, 0)),
      fatGrams: round(dayMeals.reduce((sum, meal) => sum + meal.totals.fatGrams, 0)),
      fiberGrams: round(dayMeals.reduce((sum, meal) => sum + meal.totals.fiberGrams, 0)),
      steps: sumOrNull(stepValues),
      activeEnergyKcal: sumOrNull(activeEnergyValues),
      completedWorkouts: dayWorkouts.length,
      workoutMinutes: Math.round(dayWorkouts.reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60),
      completedSets: Math.round(dayWorkouts.reduce((sum, session) => sum + (typeof session.summary?.completedSets === "number" ? session.summary.completedSets : 0), 0)),
      trainingVolumeKg: round(dayWorkouts.reduce((sum, session) => sum + (typeof session.summary?.totalVolumeKg === "number" ? session.summary.totalVolumeKg : 0), 0)),
    };
  });

  const mealDays = days.filter((day) => day.confirmedMealCount > 0);
  const stepDays = days.filter((day) => day.steps !== null);
  const workoutDays = days.filter((day) => day.completedWorkouts > 0);
  const weightTrend: WeightPoint[] = input.health
    .filter((sample) => allowedDates.has(sample.localDate) && ["weight", "weight_kg", "body_weight"].includes(sample.dataType.toLowerCase()))
    .map((sample) => ({
      localDate: sample.localDate,
      kilograms: sample.unit.toLowerCase() === "g" ? round(sample.value / 1000) : round(sample.value),
      sourcePlatform: sample.sourcePlatform,
    }))
    .sort((left, right) => left.localDate.localeCompare(right.localDate));

  return {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    days,
    totals: {
      confirmedMeals: meals.length,
      completedWorkouts: workouts.length,
      workoutMinutes: Math.round(workouts.reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60),
      completedSets: Math.round(workouts.reduce((sum, session) => sum + (typeof session.summary?.completedSets === "number" ? session.summary.completedSets : 0), 0)),
      trainingVolumeKg: round(workouts.reduce((sum, session) => sum + (typeof session.summary?.totalVolumeKg === "number" ? session.summary.totalVolumeKg : 0), 0)),
      steps: sumOrNull(stepDays.map((day) => day.steps!)),
      activeEnergyKcal: sumOrNull(days.flatMap((day) => day.activeEnergyKcal === null ? [] : [day.activeEnergyKcal])),
    },
    averages: {
      recordedEnergyKcal: average(mealDays.map((day) => day.energyKcal)),
      recordedProteinGrams: average(mealDays.map((day) => day.proteinGrams)),
      recordedCarbGrams: average(mealDays.map((day) => day.carbGrams)),
      recordedFatGrams: average(mealDays.map((day) => day.fatGrams)),
      recordedFiberGrams: average(mealDays.map((day) => day.fiberGrams)),
      steps: average(stepDays.map((day) => day.steps!)),
    },
    coverage: {
      totalDays: days.length,
      mealObservedDays: mealDays.length,
      stepObservedDays: stepDays.length,
      workoutObservedDays: workoutDays.length,
    },
    weightTrend,
  };
}
