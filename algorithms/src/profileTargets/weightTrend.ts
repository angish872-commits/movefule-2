import { WEIGHT_TREND_VERSION } from "../core/versions";
import {
  parseTargetGoal,
  type TargetGoal,
} from "./targetEngine";

export interface WeightObservation {
  localDate: string;
  weightKg: number;
}

export interface WeightTrendInput {
  goal: string | null;
  currentEnergyTargetKcal: number;
  observations: readonly WeightObservation[];
}

export interface WeightTrendGoalBand {
  min: number;
  max: number;
}

export type WeightTrendStatus = "READY" | "HOLD";

export interface WeightTrendProposal {
  status: WeightTrendStatus;
  eligible: boolean;
  observationCount: number;
  spanDays: number;
  slopeKgPerDay: number | null;
  observedWeeklyChangePercent: number | null;
  goalBand: WeightTrendGoalBand;
  proposedAdjustmentKcal: -100 | 0 | 100;
  proposedTargetKcal: number;
  requiresUserConfirmation: true;
  reasonCodes: string[];
  versions: {
    weightTrendVersion: typeof WEIGHT_TREND_VERSION;
  };
}

interface NormalizedObservation {
  day: number;
  weightKg: number;
}

function parseObservationDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(date.getTime() / 86_400_000);
}

/**
 * Invalid observations are ignored. Duplicate dates are collapsed by averaging
 * valid same-day measurements so input order cannot change the regression.
 */
export function normalizeWeightObservations(
  observations: readonly WeightObservation[],
): readonly NormalizedObservation[] {
  const byDay = new Map<number, number[]>();

  for (const observation of observations) {
    const day = parseObservationDate(observation.localDate);
    if (
      day === null ||
      !Number.isFinite(observation.weightKg) ||
      observation.weightKg <= 0
    ) {
      continue;
    }

    const weights = byDay.get(day) ?? [];
    weights.push(observation.weightKg);
    byDay.set(day, weights);
  }

  return [...byDay.entries()]
    .map(([day, weights]) => ({
      day,
      weightKg:
        weights.reduce((sum, weight) => sum + weight, 0) / weights.length,
    }))
    .sort((a, b) => a.day - b.day);
}

export function targetTrendBand(goal: TargetGoal): WeightTrendGoalBand {
  if (goal === "LOSE") return { min: -0.75, max: -0.25 };
  if (goal === "GAIN") return { min: 0.10, max: 0.40 };
  return { min: -0.20, max: 0.20 };
}

function regression(
  observations: readonly NormalizedObservation[],
): {
  slopeKgPerDay: number;
  averageWeightKg: number;
  spanDays: number;
} | null {
  if (observations.length < 7) return null;

  const first = observations[0]!;
  const last = observations.at(-1)!;
  const spanDays = last.day - first.day;
  if (spanDays < 13) return null;

  const x0 = first.day;
  const xs = observations.map((item) => item.day - x0);
  const ys = observations.map((item) => item.weightKg);
  const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;

  const numerator = xs.reduce(
    (sum, x, index) =>
      sum + (x - xMean) * (ys[index]! - yMean),
    0,
  );
  const denominator = xs.reduce(
    (sum, x) => sum + (x - xMean) ** 2,
    0,
  );

  if (denominator <= 0 || yMean <= 0) return null;

  return {
    slopeKgPerDay: numerator / denominator,
    averageWeightKg: yMean,
    spanDays,
  };
}

/**
 * Proposes a bounded recalibration from multi-week observations.
 *
 * This function never applies a target change. It only returns -100/0/+100
 * kcal proposals and always requires explicit confirmation by a later layer.
 */
export function proposeWeightTrendRecalibration(
  input: WeightTrendInput,
): WeightTrendProposal {
  const currentTarget = Math.max(
    1000,
    Math.round(input.currentEnergyTargetKcal),
  );
  const goal = parseTargetGoal(input.goal) ?? "GENERAL";
  const goalBand = targetTrendBand(goal);
  const normalized = normalizeWeightObservations(input.observations);
  const fit = regression(normalized);

  if (fit === null) {
    const spanDays =
      normalized.length >= 2
        ? normalized.at(-1)!.day - normalized[0]!.day
        : 0;

    return {
      status: "HOLD",
      eligible: false,
      observationCount: normalized.length,
      spanDays,
      slopeKgPerDay: null,
      observedWeeklyChangePercent: null,
      goalBand,
      proposedAdjustmentKcal: 0,
      proposedTargetKcal: currentTarget,
      requiresUserConfirmation: true,
      reasonCodes: [
        normalized.length < 7
          ? "WEIGHT_TREND_NEEDS_7_VALID_OBSERVATIONS"
          : "WEIGHT_TREND_NEEDS_14_DAY_SPAN",
      ],
      versions: {
        weightTrendVersion: WEIGHT_TREND_VERSION,
      },
    };
  }

  const weeklyPercent =
    (fit.slopeKgPerDay * 7 / fit.averageWeightKg) * 100;

  let proposedAdjustmentKcal: -100 | 0 | 100 = 0;
  if (weeklyPercent < goalBand.min) {
    proposedAdjustmentKcal = 100;
  } else if (weeklyPercent > goalBand.max) {
    proposedAdjustmentKcal = -100;
  }

  const proposedTargetKcal = Math.max(
    1000,
    currentTarget + proposedAdjustmentKcal,
  );

  return {
    status: "READY",
    eligible: true,
    observationCount: normalized.length,
    spanDays: fit.spanDays,
    slopeKgPerDay: fit.slopeKgPerDay,
    observedWeeklyChangePercent:
      Math.round(weeklyPercent * 100) / 100,
    goalBand,
    proposedAdjustmentKcal,
    proposedTargetKcal,
    requiresUserConfirmation: true,
    reasonCodes:
      proposedAdjustmentKcal === 0
        ? ["WEIGHT_TREND_INSIDE_GOAL_BAND"]
        : ["WEIGHT_TREND_BOUNDED_ADJUSTMENT_PROPOSED"],
    versions: {
      weightTrendVersion: WEIGHT_TREND_VERSION,
    },
  };
}
