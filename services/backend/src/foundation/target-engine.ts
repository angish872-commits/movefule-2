export type EnergySex = "male" | "female" | "unspecified";
export type ActivityCategory = "inactive" | "low_active" | "active" | "very_active";
export type GoalCategory = "lose" | "maintain" | "gain" | "performance" | "general";

export type PersonalTargetInput = {
  dateOfBirth?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  sexForEnergyEstimate?: string;
  activityLevel?: string;
  trainingFrequency?: string;
  goal?: string;
  dietaryPreferences?: string;
  now?: Date;
};

export type PersonalTargetPreview = {
  supported: boolean;
  requiresUserConfirmation: true;
  ageYears: number | null;
  maintenanceEnergyKcal: number | null;
  suggestedEnergyKcal: number | null;
  energyRangeKcal: { minimum: number; maximum: number } | null;
  proteinG: number | null;
  proteinRangeG: { minimum: number; maximum: number } | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
  movementMinutes: number;
  activityCategory: ActivityCategory;
  goalCategory: GoalCategory;
  formulaVersion: string;
  evidenceIds: string[];
  notes: string[];
};

export type WeightObservation = {
  localDate: string;
  weightKg: number;
};

export type TargetTrendCalibrationInput = {
  goal?: string;
  currentEnergyTargetKcal: number;
  observations: WeightObservation[];
};

export type TargetTrendCalibration = {
  eligible: boolean;
  requiresUserConfirmation: true;
  observedWeeklyWeightChangePercent: number | null;
  targetWeeklyWeightChangePercent: { minimum: number; maximum: number };
  recommendedEnergyAdjustmentKcal: number;
  proposedEnergyTargetKcal: number;
  observationCount: number;
  spanDays: number;
  evidenceIds: string[];
  notes: string[];
};

export const TARGET_FORMULA_VERSION = "movefuel-targets-2026-08-v2-science-calibrated";
export const ENERGY_EVIDENCE_ID = "NASEM_DRI_ENERGY_2023_EER";
export const PROTEIN_GENERAL_EVIDENCE_ID = "US_DGA_2025_2030_PROTEIN_1_2_TO_1_6_G_PER_KG";
export const PROTEIN_MUSCLE_EVIDENCE_ID = "MORTON_2018_RET_PROTEIN_BREAKPOINT_1_62_G_PER_KG";
export const FIBER_EVIDENCE_ID = "DRI_FIBER_14_G_PER_1000_KCAL";
export const MACRO_EVIDENCE_ID = "DRI_ADULT_AMDR_CARB_45_65_FAT_20_35";
export const WEIGHT_TREND_EVIDENCE_ID = "NASEM_2023_MONITOR_WEIGHT_AND_ADJUST";
export const NIDDK_WEIGHT_DYNAMICS_EVIDENCE_ID = "NIDDK_BODY_WEIGHT_PLANNER_DYNAMIC_MODEL";

function normalized(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

export function ageInYears(dateOfBirth?: string, now = new Date()): number | null {
  if (!dateOfBirth) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dob.getTime()) || dob.getUTCFullYear() !== year || dob.getUTCMonth() !== month - 1 || dob.getUTCDate() !== day) return null;
  let age = now.getUTCFullYear() - year;
  const beforeBirthday = now.getUTCMonth() < month - 1 || (now.getUTCMonth() === month - 1 && now.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

export function parseEnergySex(value?: string): EnergySex {
  const v = normalized(value);
  if (v === "male" || v === "m") return "male";
  if (v === "female" || v === "f") return "female";
  return "unspecified";
}

function parsedTrainingDays(value?: string): { minimum: number; maximum: number } | null {
  const training = normalized(value);
  let match = /^(\d+)\s*(?:days?)?$/.exec(training);
  if (match) {
    const days = Number(match[1]);
    return Number.isInteger(days) && days >= 0 && days <= 7 ? { minimum: days, maximum: days } : null;
  }
  match = /^(\d+)\s*[-–]\s*(\d+)\s*days?$/.exec(training);
  if (match) {
    const minimum = Number(match[1]);
    const maximum = Number(match[2]);
    return minimum >= 0 && maximum >= minimum && maximum <= 7 ? { minimum, maximum } : null;
  }
  match = /^(\d+)\+\s*days?$/.exec(training);
  if (match) {
    const minimum = Number(match[1]);
    return minimum >= 0 && minimum <= 7 ? { minimum, maximum: 7 } : null;
  }
  return null;
}

/**
 * PAL category is the authoritative activity input for the 2023 NASEM EER
 * equations. Training frequency is used only as a strict fallback when the
 * user has not provided a recognized activity category. Malformed free text
 * must never silently elevate the energy equation.
 */
export function parseActivityCategory(activityLevel?: string, trainingFrequency?: string): ActivityCategory {
  const activity = normalized(activityLevel).replaceAll("-", "_").replaceAll(" ", "_");
  if (["very_active", "high"].includes(activity)) return "very_active";
  if (["active", "moderate", "moderately_active"].includes(activity)) return "active";
  if (["low_active", "light", "lightly_active"].includes(activity)) return "low_active";
  if (["inactive", "sedentary"].includes(activity)) return "inactive";

  const days = parsedTrainingDays(trainingFrequency);
  if (!days) return "inactive";
  if (days.minimum >= 6) return "very_active";
  if (days.maximum >= 3) return "active";
  if (days.maximum >= 1) return "low_active";
  return "inactive";
}

export function parseGoalCategory(goal?: string): GoalCategory {
  const v = normalized(goal);
  if (v.includes("lose") || v.includes("loss") || v.includes("deficit")) return "lose";
  if (v.includes("gain") || v.includes("strength") || v.includes("muscle")) return "gain";
  if (v.includes("perform") || v.includes("endurance")) return "performance";
  if (v.includes("maintain") || v.includes("steady")) return "maintain";
  return "general";
}

type EnergyEquation = readonly [number, number, number, number];

/** 2023 National Academies EER/TEE equations for adults age 19+. */
export function adultMaintenanceEnergyKcal(
  sex: Exclude<EnergySex, "unspecified">,
  activity: ActivityCategory,
  ageYears: number,
  heightCm: number,
  weightKg: number,
): number {
  const equations: Record<ActivityCategory, EnergyEquation> = sex === "male"
    ? {
      inactive: [753.07, -10.83, 6.50, 14.10],
      low_active: [581.47, -10.83, 8.30, 14.94],
      active: [1004.82, -10.83, 6.52, 15.91],
      very_active: [-517.88, -10.83, 15.61, 19.11],
    }
    : {
      inactive: [584.90, -7.01, 5.72, 11.71],
      low_active: [575.77, -7.01, 6.60, 12.14],
      active: [710.25, -7.01, 6.54, 12.34],
      very_active: [511.83, -7.01, 9.07, 12.56],
    };
  const [intercept, ageCoefficient, heightCoefficient, weightCoefficient] = equations[activity];
  return Math.round(intercept + ageCoefficient * ageYears + heightCoefficient * heightCm + weightCoefficient * weightKg);
}

/**
 * 2023 National Academies adolescent equations for age 14-18.99 years. The
 * published EER includes a +20 kcal/day growth allowance in this age band.
 * MoveFuel is 18+, so this path is intentionally used only for age 18.
 */
export function adolescentMaintenanceEnergyKcal(
  sex: Exclude<EnergySex, "unspecified">,
  activity: ActivityCategory,
  ageYears: number,
  heightCm: number,
  weightKg: number,
): number {
  const equations: Record<ActivityCategory, EnergyEquation> = sex === "male"
    ? {
      inactive: [-447.51, 3.68, 13.01, 13.15],
      low_active: [19.12, 3.68, 8.62, 20.28],
      active: [-388.19, 3.68, 12.66, 20.46],
      very_active: [-671.75, 3.68, 15.38, 23.25],
    }
    : {
      inactive: [55.59, -22.25, 8.43, 17.07],
      low_active: [-297.54, -22.25, 12.77, 14.73],
      active: [-189.55, -22.25, 11.74, 18.34],
      very_active: [-709.59, -22.25, 18.22, 14.25],
    };
  const [intercept, ageCoefficient, heightCoefficient, weightCoefficient] = equations[activity];
  return Math.round(intercept + ageCoefficient * ageYears + heightCoefficient * heightCm + weightCoefficient * weightKg + 20);
}

function maintenanceRmseKcal(sex: Exclude<EnergySex, "unspecified">, ageYears: number): number {
  if (ageYears === 18) return sex === "male" ? 259 : 237;
  return sex === "male" ? 339 : 246;
}

function goalAdjustedEnergy(maintenance: number, goal: GoalCategory): number {
  // This is deliberately only an initial MoveFuel product rule. NASEM says
  // individual planning should start with EER and then be corrected from
  // observed weight trend; NIDDK likewise uses dynamic weight-change models.
  const delta = goal === "lose" ? -250 : goal === "gain" ? 200 : 0;
  return Math.max(1_000, Math.round((maintenance + delta) / 10) * 10);
}

function proteinMultiplier(goal: GoalCategory): { central: number; minimum: number; maximum: number } {
  // Current U.S. Dietary Guidelines target 1.2-1.6 g/kg/day. For muscle gain,
  // performance and weight loss, MoveFuel starts at the upper end; a large
  // resistance-training meta-analysis found no additional FFM gain above
  // ~1.62 g/kg/day on average. Specialized athlete plans remain outside this
  // general-wellness automatic target.
  if (goal === "gain" || goal === "performance" || goal === "lose") {
    return { central: 1.6, minimum: 1.2, maximum: 1.6 };
  }
  return { central: 1.4, minimum: 1.2, maximum: 1.6 };
}

function round5(value: number): number {
  return Math.max(0, Math.round(value / 5) * 5);
}

function planningEnergyRange(
  suggestedEnergyKcal: number,
  sex: Exclude<EnergySex, "unspecified">,
  ageYears: number,
): { minimum: number; maximum: number } {
  // ±15% is retained as a *validation/planning* band requested by the product,
  // not as a universal scientific confidence interval. Never make it narrower
  // than the published NASEM equation RMSE for the relevant sex/life stage.
  const halfWidth = Math.max(suggestedEnergyKcal * 0.15, maintenanceRmseKcal(sex, ageYears));
  return {
    minimum: Math.max(1_000, Math.round((suggestedEnergyKcal - halfWidth) / 10) * 10),
    maximum: Math.round((suggestedEnergyKcal + halfWidth) / 10) * 10,
  };
}

export function previewPersonalTargets(input: PersonalTargetInput): PersonalTargetPreview {
  const now = input.now ?? new Date();
  const ageYears = ageInYears(input.dateOfBirth, now);
  const sex = parseEnergySex(input.sexForEnergyEstimate);
  const activityCategory = parseActivityCategory(input.activityLevel, input.trainingFrequency);
  const goalCategory = parseGoalCategory(input.goal);
  const heightCm = input.heightCm ?? null;
  const weightKg = input.weightKg ?? null;
  const notes: string[] = [];
  const evidenceIds = [
    ENERGY_EVIDENCE_ID,
    PROTEIN_GENERAL_EVIDENCE_ID,
    PROTEIN_MUSCLE_EVIDENCE_ID,
    FIBER_EVIDENCE_ID,
    MACRO_EVIDENCE_ID,
    WEIGHT_TREND_EVIDENCE_ID,
    NIDDK_WEIGHT_DYNAMICS_EVIDENCE_ID,
  ];

  let maintenanceEnergyKcal: number | null = null;
  let suggestedEnergyKcal: number | null = null;
  let energyRangeKcal: PersonalTargetPreview["energyRangeKcal"] = null;

  if (ageYears === null) notes.push("Add a valid date of birth to calculate an energy target.");
  else if (ageYears < 18) notes.push("Automatic calorie targets are limited to users age 18+.");
  if (sex === "unspecified") notes.push("Choose Male or Female only for the energy-estimation equation, or enter a calorie target manually.");
  if (!heightCm || heightCm <= 0) notes.push("Add height to calculate an energy target.");
  if (!weightKg || weightKg <= 0) notes.push("Add weight to calculate personal targets.");

  if (ageYears !== null && ageYears >= 18 && sex !== "unspecified" && heightCm && heightCm > 0 && weightKg && weightKg > 0) {
    maintenanceEnergyKcal = ageYears === 18
      ? adolescentMaintenanceEnergyKcal(sex, activityCategory, ageYears, heightCm, weightKg)
      : adultMaintenanceEnergyKcal(sex, activityCategory, ageYears, heightCm, weightKg);
    suggestedEnergyKcal = goalAdjustedEnergy(maintenanceEnergyKcal, goalCategory);
    energyRangeKcal = planningEnergyRange(suggestedEnergyKcal, sex, ageYears);
  }

  let proteinG: number | null = null;
  let proteinRangeG: PersonalTargetPreview["proteinRangeG"] = null;
  if (weightKg && weightKg > 0) {
    const multiplier = proteinMultiplier(goalCategory);
    proteinG = round5(weightKg * multiplier.central);
    proteinRangeG = {
      minimum: round5(weightKg * multiplier.minimum),
      maximum: round5(weightKg * multiplier.maximum),
    };
  }

  const energyForMacros = suggestedEnergyKcal ?? maintenanceEnergyKcal;
  let fatG: number | null = null;
  let carbohydrateG: number | null = null;
  let fiberG: number | null = null;
  if (energyForMacros && energyForMacros > 0) {
    // 30% fat is a neutral starting allocation inside the adult 20-35% AMDR.
    // Protein is fixed first; carbohydrate gets the remaining energy.
    fatG = Math.max(0, Math.round((energyForMacros * 0.30) / 9));
    const proteinCalories = (proteinG ?? 0) * 4;
    carbohydrateG = Math.max(0, Math.round((energyForMacros - proteinCalories - fatG * 9) / 4));
    fiberG = Math.max(0, Math.round((energyForMacros / 1_000) * 14));

    // The absolute protein target is chosen first because it is weight-based.
    // Check the resulting energy shares against the adult AMDR rather than
    // pretending that every profile can simultaneously hit a fixed 30% fat
    // split and all macronutrient reference ranges.
    const proteinPercent = proteinG === null ? null : (proteinG * 4 / energyForMacros) * 100;
    const fatPercent = (fatG * 9 / energyForMacros) * 100;
    const carbohydratePercent = (carbohydrateG * 4 / energyForMacros) * 100;
    if (proteinPercent !== null && (proteinPercent < 10 || proteinPercent > 35)) {
      notes.push(`Protein is ${Math.round(proteinPercent)}% of target energy, outside the adult 10-35% AMDR; keep this as a reviewable preview rather than silently forcing the other macros.`);
    }
    if (fatPercent < 20 || fatPercent > 35) {
      notes.push(`Fat is ${Math.round(fatPercent)}% of target energy, outside the adult 20-35% AMDR; review the macro split.`);
    }
    if (carbohydratePercent < 45 || carbohydratePercent > 65) {
      notes.push(`Carbohydrate is ${Math.round(carbohydratePercent)}% of target energy, outside the adult 45-65% AMDR; review the macro split instead of treating it as a prescription.`);
    }
  }

  const supported = suggestedEnergyKcal !== null && proteinG !== null;
  if (supported) {
    notes.push("Targets are starting estimates, not exact measurements. Confirm them before they become active.");
    notes.push("The calorie range is an engineering planning band: at least ±15% and never narrower than the published NASEM equation RMSE; it is not a formal 95% confidence interval.");
    notes.push("Use weight trend over multiple weeks to recalibrate energy instead of treating a single equation as permanent truth.");
    if (goalCategory === "lose" || goalCategory === "gain") {
      notes.push("The initial goal adjustment is conservative and provisional; MoveFuel should adapt it from confirmed weight trends.");
    }
  }

  return {
    supported,
    requiresUserConfirmation: true,
    ageYears,
    maintenanceEnergyKcal,
    suggestedEnergyKcal,
    energyRangeKcal,
    proteinG,
    proteinRangeG,
    carbohydrateG,
    fatG,
    fiberG,
    movementMinutes: 30,
    activityCategory,
    goalCategory,
    formulaVersion: TARGET_FORMULA_VERSION,
    evidenceIds,
    notes,
  };
}

function parseObservationDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getTime() / 86_400_000);
}

function weeklyTrendPercent(observations: WeightObservation[]): { percent: number; spanDays: number; count: number } | null {
  const valid = observations
    .map((o) => ({ day: parseObservationDate(o.localDate), weight: o.weightKg }))
    .filter((o): o is { day: number; weight: number } => o.day !== null && Number.isFinite(o.weight) && o.weight > 0)
    .sort((a, b) => a.day - b.day);
  if (valid.length < 7) return null;

  const latestDay = valid.at(-1)!.day;
  const recent = valid.filter((o) => o.day >= latestDay - 27);
  if (recent.length < 7) return null;
  const firstRecent = recent[0]!;
  const lastRecent = recent.at(-1)!;
  const spanDays = lastRecent.day - firstRecent.day;
  if (spanDays < 13) return null;

  const x0 = firstRecent.day;
  const xs = recent.map((o) => o.day - x0);
  const ys = recent.map((o) => o.weight);
  const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const numerator = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i]! - yMean), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  if (denominator <= 0 || yMean <= 0) return null;
  const kgPerDay = numerator / denominator;
  const percent = (kgPerDay * 7 / yMean) * 100;
  return { percent, spanDays, count: recent.length };
}

function targetTrendBand(goal: GoalCategory): { minimum: number; maximum: number } {
  // Versioned MoveFuel product bands. They are intentionally moderate; they
  // are not represented as a medical prescription or universal optimum.
  if (goal === "lose") return { minimum: -0.75, maximum: -0.25 };
  if (goal === "gain") return { minimum: 0.10, maximum: 0.40 };
  return { minimum: -0.20, maximum: 0.20 };
}

/**
 * Recalibrates the *starting* energy target from a multi-week measured weight
 * trend. It never silently changes the active target and intentionally uses
 * small 100-kcal steps to avoid reacting to day-to-day water-weight noise.
 */
export function recalibrateEnergyFromWeightTrend(input: TargetTrendCalibrationInput): TargetTrendCalibration {
  const goal = parseGoalCategory(input.goal);
  const band = targetTrendBand(goal);
  const trend = weeklyTrendPercent(input.observations);
  const currentTarget = Math.max(1_000, Math.round(input.currentEnergyTargetKcal));
  const notes: string[] = [];

  if (!trend) {
    notes.push("Need at least 7 valid weights spanning at least 14 days before trend-based calorie recalibration.");
    return {
      eligible: false,
      requiresUserConfirmation: true,
      observedWeeklyWeightChangePercent: null,
      targetWeeklyWeightChangePercent: band,
      recommendedEnergyAdjustmentKcal: 0,
      proposedEnergyTargetKcal: currentTarget,
      observationCount: input.observations.length,
      spanDays: 0,
      evidenceIds: [WEIGHT_TREND_EVIDENCE_ID, NIDDK_WEIGHT_DYNAMICS_EVIDENCE_ID],
      notes,
    };
  }

  let adjustment = 0;
  if (trend.percent < band.minimum) adjustment = 100;
  else if (trend.percent > band.maximum) adjustment = -100;
  const proposed = Math.max(1_000, currentTarget + adjustment);

  if (adjustment === 0) notes.push("Observed weight trend is inside the current goal band; keep the calorie target unchanged.");
  else notes.push("Proposed a small 100 kcal/day correction from the multi-week trend; user confirmation is required before applying it.");
  notes.push("Daily scale noise is not treated as calorie truth; recalibration uses a multi-week trend and should be repeated rather than making large one-time corrections.");

  return {
    eligible: true,
    requiresUserConfirmation: true,
    observedWeeklyWeightChangePercent: Math.round(trend.percent * 100) / 100,
    targetWeeklyWeightChangePercent: band,
    recommendedEnergyAdjustmentKcal: adjustment,
    proposedEnergyTargetKcal: proposed,
    observationCount: trend.count,
    spanDays: trend.spanDays,
    evidenceIds: [WEIGHT_TREND_EVIDENCE_ID, NIDDK_WEIGHT_DYNAMICS_EVIDENCE_ID],
    notes,
  };
}
