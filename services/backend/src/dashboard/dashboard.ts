import type { ConfirmedMeal, NutritionTotals } from "../meal/contracts.ts";
import type { HealthSampleSummary } from "../health/health-store.ts";
import type { WorkoutSession } from "../sync/types.ts";
import type { ProfileResult } from "../foundation/profile.ts";
import type { DailyActionCandidate, DailyDecisionEnvelope } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

export type DashboardMeal = {
  mealId: string;
  mealType: ConfirmedMeal["mealType"];
  title: string;
  energyKcal: number;
  proteinGrams: number;
  imageRef?: string;
  confirmedAtEpochMillis: number;
};

export type DashboardEnvelope = {
  localDate: string;
  user: { displayName: string; timeZone: string; goal: string | null };
  targets: null | { energyKcal: number; proteinGrams: number; movementMinutes: number | null; formulaVersion: string };
  actual: NutritionTotals & { steps: number | null; completedWorkouts: number; workoutMinutes: number };
  remaining: null | { energyKcal: number; proteinGrams: number };
  meals: DashboardMeal[];
  /** Canonical Today authority only. The dashboard never ranks domain actions. */
  nextAction: DailyActionCandidate | null;
  freshness: { generatedAtEpochMillis: number; healthObserved: boolean };
};

const round = (value: number): number => Math.round(value * 10) / 10;

function titleForMeal(meal: ConfirmedMeal): string {
  const first = meal.items[0]?.displayName?.trim();
  if (first && meal.items.length === 1) return first;
  if (first && meal.items.length > 1) return `${first} + ${meal.items.length - 1}`;
  return meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1);
}

function mealImage(meal: ConfirmedMeal): string | undefined {
  const candidate = (meal as ConfirmedMeal & { imageRef?: unknown }).imageRef;
  if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  return undefined;
}

function stepsForDate(health: HealthSampleSummary[], localDate: string): number | null {
  const names = new Set(["steps", "steps_total", "step_count"]);
  const values = health
    .filter((sample) => sample.localDate === localDate && names.has(sample.dataType.toLowerCase()))
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value >= 0);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0)) : null;
}

function workoutDate(session: WorkoutSession): string | null {
  const timestamp = session.endedAtEpochMillis ?? session.startedAtEpochMillis ?? session.createdAtEpochMillis;
  return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp).toISOString().slice(0, 10) : null;
}

function targetFrom(profile: ProfileResult | null): DashboardEnvelope["targets"] {
  const target = profile?.target as Record<string, unknown> | null | undefined;
  const rawEnergy = target?.energyKcal;
  const rawProtein = target?.proteinG;
  const energyKcal = typeof rawEnergy === "number" ? rawEnergy : Number.NaN;
  const proteinGrams = typeof rawProtein === "number" ? rawProtein : Number.NaN;
  const rawMovement = target?.movementTarget;
  const movementMinutes = typeof rawMovement === "number" ? rawMovement : Number.NaN;
  if (target?.userConfirmed !== true || !Number.isFinite(energyKcal) || energyKcal <= 0 || !Number.isFinite(proteinGrams) || proteinGrams <= 0) return null;
  return {
    energyKcal: Math.round(energyKcal),
    proteinGrams: Math.round(proteinGrams),
    // Movement is not a substitute/default target.  It is optional product
    // state, so an absent or invalid value must remain unknown for Phone.
    movementMinutes: Number.isFinite(movementMinutes) && movementMinutes > 0 ? Math.round(movementMinutes) : null,
    formulaVersion: typeof target?.formulaVersion === "string" ? target.formulaVersion : "unknown",
  };
}

function canonicalAction(decision: DailyDecisionEnvelope | null | undefined, profile: ProfileResult | null, localDate: string): DailyActionCandidate | null {
  if (!decision?.primaryAction) return null;
  if (decision.localDate !== localDate) return null;
  if (profile?.userId && decision.userId !== profile.userId) return null;
  return decision.primaryAction;
}

export function buildDashboardEnvelope(input: {
  localDate: string;
  profile: ProfileResult | null;
  meals: ConfirmedMeal[];
  health: HealthSampleSummary[];
  workouts: WorkoutSession[];
  decision?: DailyDecisionEnvelope | null;
  nowEpochMillis?: number;
}): DashboardEnvelope {
  const dayMeals = input.meals
    .filter((meal) => meal.status === "CONFIRMED" && meal.localDate === input.localDate)
    .sort((left, right) => left.confirmedAtEpochMillis - right.confirmedAtEpochMillis);
  const totals = dayMeals.reduce((acc, meal) => ({
    energyKcal: acc.energyKcal + meal.totals.energyKcal,
    proteinGrams: acc.proteinGrams + meal.totals.proteinGrams,
    carbGrams: acc.carbGrams + meal.totals.carbGrams,
    fatGrams: acc.fatGrams + meal.totals.fatGrams,
    fiberGrams: acc.fiberGrams + meal.totals.fiberGrams,
  }), { energyKcal: 0, proteinGrams: 0, carbGrams: 0, fatGrams: 0, fiberGrams: 0 });
  const dayWorkouts = input.workouts.filter((workout) => workout.state === "COMPLETED" && workoutDate(workout) === input.localDate);
  const targets = targetFrom(input.profile);
  const profileRow = input.profile?.profile as Record<string, unknown> | undefined;
  const goalRow = input.profile?.goal as Record<string, unknown> | null | undefined;
  const displayName = typeof profileRow?.displayName === "string" && profileRow.displayName.trim() ? profileRow.displayName.trim() : "MoveFuel member";
  const timeZone = typeof profileRow?.timeZone === "string" && profileRow.timeZone.trim() ? profileRow.timeZone.trim() : "UTC";
  const goal = typeof goalRow?.goalType === "string" && goalRow.goalType.trim() ? goalRow.goalType.trim() : null;
  const meals: DashboardMeal[] = dayMeals.map((meal) => ({
    mealId: meal.mealId,
    mealType: meal.mealType,
    title: titleForMeal(meal),
    energyKcal: Math.round(meal.totals.energyKcal),
    proteinGrams: round(meal.totals.proteinGrams),
    ...(mealImage(meal) ? { imageRef: mealImage(meal) } : {}),
    confirmedAtEpochMillis: meal.confirmedAtEpochMillis,
  }));
  const steps = stepsForDate(input.health, input.localDate);
  const actual = {
    energyKcal: Math.round(totals.energyKcal),
    proteinGrams: round(totals.proteinGrams),
    carbGrams: round(totals.carbGrams),
    fatGrams: round(totals.fatGrams),
    fiberGrams: round(totals.fiberGrams),
    steps,
    completedWorkouts: dayWorkouts.length,
    workoutMinutes: Math.round(dayWorkouts.reduce((sum, workout) => sum + workout.elapsedSeconds, 0) / 60),
  };
  return {
    localDate: input.localDate,
    user: { displayName, timeZone, goal },
    targets,
    actual,
    remaining: targets ? {
      energyKcal: Math.max(0, targets.energyKcal - actual.energyKcal),
      proteinGrams: round(Math.max(0, targets.proteinGrams - actual.proteinGrams)),
    } : null,
    meals,
    nextAction: canonicalAction(input.decision, input.profile, input.localDate),
    freshness: {
      generatedAtEpochMillis: input.nowEpochMillis ?? Date.now(),
      healthObserved: steps !== null,
    },
  };
}
