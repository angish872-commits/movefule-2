import {
  FIBER_POLICY_VERSION,
  MACRO_POLICY_VERSION,
  TARGET_ALGORITHM_VERSIONS,
  TARGET_EER_FORMULA_VERSION,
  TARGET_POLICY_VERSION,
  type TargetAlgorithmVersions,
} from "../core/versions";

export type EnergyEquationCategory = "MALE" | "FEMALE";
export type ActivityCategory =
  | "INACTIVE"
  | "LOW_ACTIVE"
  | "ACTIVE"
  | "VERY_ACTIVE";

export type TargetGoal =
  | "LOSE"
  | "MAINTAIN"
  | "GAIN"
  | "PERFORMANCE"
  | "GENERAL";

export type TargetEligibilityState = "READY" | "HOLD" | "UNSUPPORTED";

export interface TargetEngineInput {
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  /**
   * Energy-equation category only. This is not a general identity field.
   * Supported values resolve to MALE or FEMALE because the migrated NASEM
   * equations are parameterized that way.
   */
  energyCategory: string | null;
  /**
   * Explicit activity category wins when recognized. Otherwise the engine may
   * fall back to the bounded training-frequency parser.
   */
  activityCategory?: string | null;
  trainingFrequency?: string | null;
  goal: string | null;
}

export interface ActivityNormalizationResult {
  category: ActivityCategory;
  source: "EXPLICIT" | "TRAINING_FREQUENCY" | "SAFE_DEFAULT";
  reasonCodes: string[];
}

export interface MaintenanceEnergyOutput {
  maintenanceEnergyKcal: number;
  equationId: string;
  formulaVersion: typeof TARGET_EER_FORMULA_VERSION;
  inputEvidence: readonly string[];
}

export interface GoalPolicyOutput {
  maintenanceEnergyKcal: number;
  goal: TargetGoal;
  adjustmentKcal: number;
  suggestedEnergyKcal: number;
  policyVersion: typeof TARGET_POLICY_VERSION;
  requiresUserConfirmation: true;
}

export interface EnergyTargetRange {
  min: number;
  central: number;
  max: number;
  halfWidth: number;
  rmseKcal: number;
}

export interface ProteinTarget {
  min: number;
  central: number;
  max: number;
  multiplierUsed: number;
  minimumMultiplier: number;
  maximumMultiplier: number;
  policyVersion: typeof MACRO_POLICY_VERSION;
}

export interface MacroTargetOutput {
  carbohydrateG: number;
  fatG: number;
  fiberG: number;
  proteinEnergyPercent: number;
  fatEnergyPercent: number;
  carbohydrateEnergyPercent: number;
  reasonCodes: string[];
  macroPolicyVersion: typeof MACRO_POLICY_VERSION;
  fiberPolicyVersion: typeof FIBER_POLICY_VERSION;
}

export interface TargetEngineOutput {
  eligibility: TargetEligibilityState;
  activityCategory: ActivityCategory;
  activitySource: ActivityNormalizationResult["source"];
  goal: TargetGoal | null;
  maintenanceEnergy: MaintenanceEnergyOutput | null;
  energyTarget: EnergyTargetRange | null;
  protein: ProteinTarget | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
  requiresUserConfirmation: boolean;
  reasonCodes: string[];
  versions: TargetAlgorithmVersions;
}

export const ENERGY_EVIDENCE_ID = "NASEM_DRI_ENERGY_2023_EER";
export const PROTEIN_GENERAL_EVIDENCE_ID =
  "US_DGA_2025_2030_PROTEIN_1_2_TO_1_6_G_PER_KG";
export const PROTEIN_MUSCLE_EVIDENCE_ID =
  "MORTON_2018_RET_PROTEIN_BREAKPOINT_1_62_G_PER_KG";
export const FIBER_EVIDENCE_ID = "DRI_FIBER_14_G_PER_1000_KCAL";
export const MACRO_EVIDENCE_ID =
  "DRI_ADULT_AMDR_CARB_45_65_FAT_20_35";

export const DEFAULT_FAT_ENERGY_SHARE = 0.30;
export const PROTEIN_MIN_G_PER_KG = 1.2;
export const PROTEIN_MAX_G_PER_KG = 1.6;
export const PROTEIN_GENERAL_CENTRAL_G_PER_KG = 1.4;
export const PROTEIN_GOAL_CENTRAL_G_PER_KG = 1.6;
export const FIBER_G_PER_1000_KCAL = 14;

type EnergyEquation = readonly [
  intercept: number,
  ageCoefficient: number,
  heightCoefficient: number,
  weightCoefficient: number,
];

const ADULT_MALE_EQUATIONS: Record<ActivityCategory, EnergyEquation> = {
  INACTIVE: [753.07, -10.83, 6.50, 14.10],
  LOW_ACTIVE: [581.47, -10.83, 8.30, 14.94],
  ACTIVE: [1004.82, -10.83, 6.52, 15.91],
  VERY_ACTIVE: [-517.88, -10.83, 15.61, 19.11],
};

const ADULT_FEMALE_EQUATIONS: Record<ActivityCategory, EnergyEquation> = {
  INACTIVE: [584.90, -7.01, 5.72, 11.71],
  LOW_ACTIVE: [575.77, -7.01, 6.60, 12.14],
  ACTIVE: [710.25, -7.01, 6.54, 12.34],
  VERY_ACTIVE: [511.83, -7.01, 9.07, 12.56],
};

const AGE18_MALE_EQUATIONS: Record<ActivityCategory, EnergyEquation> = {
  INACTIVE: [-447.51, 3.68, 13.01, 13.15],
  LOW_ACTIVE: [19.12, 3.68, 8.62, 20.28],
  ACTIVE: [-388.19, 3.68, 12.66, 20.46],
  VERY_ACTIVE: [-671.75, 3.68, 15.38, 23.25],
};

const AGE18_FEMALE_EQUATIONS: Record<ActivityCategory, EnergyEquation> = {
  INACTIVE: [55.59, -22.25, 8.43, 17.07],
  LOW_ACTIVE: [-297.54, -22.25, 12.77, 14.73],
  ACTIVE: [-189.55, -22.25, 11.74, 18.34],
  VERY_ACTIVE: [-709.59, -22.25, 18.22, 14.25],
};

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function parseEnergyCategory(
  value: string | null | undefined,
): EnergyEquationCategory | null {
  const v = normalized(value);
  if (v === "male" || v === "m") return "MALE";
  if (v === "female" || v === "f") return "FEMALE";
  return null;
}

export function parseTargetGoal(
  value: string | null | undefined,
): TargetGoal | null {
  const v = normalized(value);
  if (!v) return null;
  if (v === "lose" || v.includes("lose") || v.includes("loss") || v.includes("deficit")) {
    return "LOSE";
  }
  if (v === "gain" || v.includes("gain") || v.includes("muscle") || v.includes("strength")) {
    return "GAIN";
  }
  if (v === "performance" || v.includes("perform") || v.includes("endurance")) {
    return "PERFORMANCE";
  }
  if (v === "maintain" || v.includes("maintain") || v.includes("steady")) {
    return "MAINTAIN";
  }
  if (v === "general" || v.includes("general") || v.includes("health")) {
    return "GENERAL";
  }
  return null;
}

function parseExplicitActivity(
  value: string | null | undefined,
): ActivityCategory | null {
  const v = normalized(value).replaceAll("-", "_").replaceAll(" ", "_");
  if (v === "very_active" || v === "high") return "VERY_ACTIVE";
  if (v === "active" || v === "moderate" || v === "moderately_active") {
    return "ACTIVE";
  }
  if (v === "low_active" || v === "light" || v === "lightly_active") {
    return "LOW_ACTIVE";
  }
  if (v === "inactive" || v === "sedentary") return "INACTIVE";
  return null;
}

function parseTrainingDays(
  value: string | null | undefined,
): { minimum: number; maximum: number } | null {
  const training = normalized(value);

  let match = /^(\d+)\s*(?:days?)?$/.exec(training);
  if (match) {
    const days = Number(match[1]);
    return Number.isInteger(days) && days >= 0 && days <= 7
      ? { minimum: days, maximum: days }
      : null;
  }

  match = /^(\d+)\s*[-–]\s*(\d+)\s*days?$/.exec(training);
  if (match) {
    const minimum = Number(match[1]);
    const maximum = Number(match[2]);
    return minimum >= 0 && maximum >= minimum && maximum <= 7
      ? { minimum, maximum }
      : null;
  }

  match = /^(\d+)\+\s*days?$/.exec(training);
  if (match) {
    const minimum = Number(match[1]);
    return minimum >= 0 && minimum <= 7
      ? { minimum, maximum: 7 }
      : null;
  }

  return null;
}

/**
 * Explicit activity is authoritative when valid. Training frequency is only a
 * bounded fallback. Malformed free text cannot elevate activity; it falls back
 * to INACTIVE with a reason code.
 */
export function normalizeActivityCategory(
  activityCategory?: string | null,
  trainingFrequency?: string | null,
): ActivityNormalizationResult {
  const explicit = parseExplicitActivity(activityCategory);
  if (explicit !== null) {
    return {
      category: explicit,
      source: "EXPLICIT",
      reasonCodes: [],
    };
  }

  const days = parseTrainingDays(trainingFrequency);
  if (days !== null) {
    const category: ActivityCategory =
      days.minimum >= 6
        ? "VERY_ACTIVE"
        : days.maximum >= 3
          ? "ACTIVE"
          : days.maximum >= 1
            ? "LOW_ACTIVE"
            : "INACTIVE";

    return {
      category,
      source: "TRAINING_FREQUENCY",
      reasonCodes: ["ACTIVITY_DERIVED_FROM_TRAINING_FREQUENCY"],
    };
  }

  return {
    category: "INACTIVE",
    source: "SAFE_DEFAULT",
    reasonCodes: ["ACTIVITY_INPUT_UNRECOGNIZED_DEFAULTED_INACTIVE"],
  };
}

function roundToNearest10(value: number): number {
  return Math.round(value / 10) * 10;
}

function roundToNearest5(value: number): number {
  return Math.max(0, Math.round(value / 5) * 5);
}

function maintenanceRmseKcal(
  energyCategory: EnergyEquationCategory,
  ageYears: number,
): number {
  if (ageYears === 18) {
    return energyCategory === "MALE" ? 259 : 237;
  }
  return energyCategory === "MALE" ? 339 : 246;
}

/**
 * Pure NASEM maintenance-energy layer. Goal/policy logic is intentionally
 * excluded.
 */
export function calculateMaintenanceEnergy(
  energyCategory: EnergyEquationCategory,
  activityCategory: ActivityCategory,
  ageYears: number,
  heightCm: number,
  weightKg: number,
): MaintenanceEnergyOutput {
  if (
    !Number.isFinite(ageYears) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    ageYears < 18 ||
    heightCm <= 0 ||
    weightKg <= 0
  ) {
    throw new Error("calculateMaintenanceEnergy requires valid adult inputs");
  }

  const age18 = ageYears === 18;
  const equations = age18
    ? energyCategory === "MALE"
      ? AGE18_MALE_EQUATIONS
      : AGE18_FEMALE_EQUATIONS
    : energyCategory === "MALE"
      ? ADULT_MALE_EQUATIONS
      : ADULT_FEMALE_EQUATIONS;

  const [intercept, ageCoefficient, heightCoefficient, weightCoefficient] =
    equations[activityCategory];

  const growthAllowance = age18 ? 20 : 0;
  const maintenanceEnergyKcal = Math.round(
    intercept +
      ageCoefficient * ageYears +
      heightCoefficient * heightCm +
      weightCoefficient * weightKg +
      growthAllowance,
  );

  return {
    maintenanceEnergyKcal,
    equationId: `NASEM_2023_EER_${age18 ? "AGE18" : "ADULT"}_${energyCategory}_${activityCategory}`,
    formulaVersion: TARGET_EER_FORMULA_VERSION,
    inputEvidence: [ENERGY_EVIDENCE_ID],
  };
}

/**
 * MoveFuel product policy layer. This is deliberately separate from EER.
 */
export function applyGoalPolicy(
  maintenanceEnergyKcal: number,
  goal: TargetGoal,
): GoalPolicyOutput {
  if (!Number.isFinite(maintenanceEnergyKcal) || maintenanceEnergyKcal <= 0) {
    throw new Error("maintenanceEnergyKcal must be a finite positive number");
  }

  const adjustmentKcal =
    goal === "LOSE" ? -250 : goal === "GAIN" ? 200 : 0;

  const suggestedEnergyKcal = Math.max(
    1000,
    roundToNearest10(maintenanceEnergyKcal + adjustmentKcal),
  );

  return {
    maintenanceEnergyKcal,
    goal,
    adjustmentKcal,
    suggestedEnergyKcal,
    policyVersion: TARGET_POLICY_VERSION,
    requiresUserConfirmation: true,
  };
}

export function calculateEnergyTargetRange(
  suggestedEnergyKcal: number,
  energyCategory: EnergyEquationCategory,
  ageYears: number,
): EnergyTargetRange {
  if (!Number.isFinite(suggestedEnergyKcal) || suggestedEnergyKcal <= 0) {
    throw new Error("suggestedEnergyKcal must be a finite positive number");
  }

  const rmseKcal = maintenanceRmseKcal(energyCategory, ageYears);
  const halfWidth = Math.max(suggestedEnergyKcal * 0.15, rmseKcal);

  return {
    min: Math.max(
      1000,
      roundToNearest10(suggestedEnergyKcal - halfWidth),
    ),
    central: suggestedEnergyKcal,
    max: roundToNearest10(suggestedEnergyKcal + halfWidth),
    halfWidth,
    rmseKcal,
  };
}

export function calculateProteinTarget(
  weightKg: number,
  goal: TargetGoal,
): ProteinTarget {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("weightKg must be a finite positive number");
  }

  const multiplierUsed =
    goal === "GAIN" || goal === "PERFORMANCE" || goal === "LOSE"
      ? PROTEIN_GOAL_CENTRAL_G_PER_KG
      : PROTEIN_GENERAL_CENTRAL_G_PER_KG;

  return {
    min: roundToNearest5(weightKg * PROTEIN_MIN_G_PER_KG),
    central: roundToNearest5(weightKg * multiplierUsed),
    max: roundToNearest5(weightKg * PROTEIN_MAX_G_PER_KG),
    multiplierUsed,
    minimumMultiplier: PROTEIN_MIN_G_PER_KG,
    maximumMultiplier: PROTEIN_MAX_G_PER_KG,
    policyVersion: MACRO_POLICY_VERSION,
  };
}

export function calculateMacroTargets(
  energyKcal: number,
  proteinG: number,
): MacroTargetOutput {
  if (!Number.isFinite(energyKcal) || energyKcal <= 0) {
    throw new Error("energyKcal must be a finite positive number");
  }
  if (!Number.isFinite(proteinG) || proteinG < 0) {
    throw new Error("proteinG must be a finite non-negative number");
  }

  const fatG = Math.max(
    0,
    Math.round((energyKcal * DEFAULT_FAT_ENERGY_SHARE) / 9),
  );
  const proteinCalories = proteinG * 4;
  const fatCalories = fatG * 9;
  const carbohydrateG = Math.max(
    0,
    Math.round((energyKcal - proteinCalories - fatCalories) / 4),
  );
  const fiberG = Math.max(
    0,
    Math.round((energyKcal / 1000) * FIBER_G_PER_1000_KCAL),
  );

  const proteinEnergyPercent = (proteinCalories / energyKcal) * 100;
  const fatEnergyPercent = (fatCalories / energyKcal) * 100;
  const carbohydrateEnergyPercent =
    ((carbohydrateG * 4) / energyKcal) * 100;

  const reasonCodes: string[] = [];
  if (proteinEnergyPercent < 10 || proteinEnergyPercent > 35) {
    reasonCodes.push("PROTEIN_OUTSIDE_ADULT_AMDR");
  }
  if (fatEnergyPercent < 20 || fatEnergyPercent > 35) {
    reasonCodes.push("FAT_OUTSIDE_ADULT_AMDR");
  }
  if (carbohydrateEnergyPercent < 45 || carbohydrateEnergyPercent > 65) {
    reasonCodes.push("CARBOHYDRATE_OUTSIDE_ADULT_AMDR");
  }

  return {
    carbohydrateG,
    fatG,
    fiberG,
    proteinEnergyPercent,
    fatEnergyPercent,
    carbohydrateEnergyPercent,
    reasonCodes,
    macroPolicyVersion: MACRO_POLICY_VERSION,
    fiberPolicyVersion: FIBER_POLICY_VERSION,
  };
}

function baseOutput(
  eligibility: TargetEligibilityState,
  activity: ActivityNormalizationResult,
  goal: TargetGoal | null,
  reasonCodes: string[],
): TargetEngineOutput {
  return {
    eligibility,
    activityCategory: activity.category,
    activitySource: activity.source,
    goal,
    maintenanceEnergy: null,
    energyTarget: null,
    protein: null,
    carbohydrateG: null,
    fatG: null,
    fiberG: null,
    requiresUserConfirmation: false,
    reasonCodes: [...activity.reasonCodes, ...reasonCodes],
    versions: TARGET_ALGORITHM_VERSIONS,
  };
}

/**
 * Canonical MoveFuel-2 target engine.
 *
 * The scientific maintenance equation, MoveFuel goal policy, macro policy and
 * fiber policy are versioned separately. Users under 18 do not receive
 * automatic calorie/macro targets from this adult-oriented engine.
 */
export function calculatePersonalTargets(
  input: TargetEngineInput,
): TargetEngineOutput {
  const activity = normalizeActivityCategory(
    input.activityCategory,
    input.trainingFrequency,
  );
  const goal = parseTargetGoal(input.goal);

  if (
    input.ageYears === null ||
    !Number.isFinite(input.ageYears) ||
    input.ageYears < 0 ||
    input.ageYears > 120
  ) {
    return baseOutput(
      "HOLD",
      activity,
      goal,
      ["TARGET_AGE_MISSING_OR_INVALID"],
    );
  }

  if (input.ageYears < 18) {
    return baseOutput(
      "UNSUPPORTED",
      activity,
      goal,
      ["YOUTH_AUTOMATIC_CALORIE_TARGETS_BLOCKED"],
    );
  }

  if (
    input.heightCm === null ||
    !Number.isFinite(input.heightCm) ||
    input.heightCm <= 0
  ) {
    return baseOutput(
      "HOLD",
      activity,
      goal,
      ["TARGET_HEIGHT_MISSING_OR_INVALID"],
    );
  }

  if (
    input.weightKg === null ||
    !Number.isFinite(input.weightKg) ||
    input.weightKg <= 0
  ) {
    return baseOutput(
      "HOLD",
      activity,
      goal,
      ["TARGET_WEIGHT_MISSING_OR_INVALID"],
    );
  }

  const energyCategory = parseEnergyCategory(input.energyCategory);
  if (energyCategory === null) {
    return baseOutput(
      "HOLD",
      activity,
      goal,
      ["TARGET_ENERGY_CATEGORY_UNSUPPORTED"],
    );
  }

  if (goal === null) {
    return baseOutput(
      "HOLD",
      activity,
      null,
      ["TARGET_GOAL_MISSING_OR_UNSUPPORTED"],
    );
  }

  const maintenanceEnergy = calculateMaintenanceEnergy(
    energyCategory,
    activity.category,
    input.ageYears,
    input.heightCm,
    input.weightKg,
  );

  const goalPolicy = applyGoalPolicy(
    maintenanceEnergy.maintenanceEnergyKcal,
    goal,
  );

  const energyTarget = calculateEnergyTargetRange(
    goalPolicy.suggestedEnergyKcal,
    energyCategory,
    input.ageYears,
  );

  const protein = calculateProteinTarget(input.weightKg, goal);
  const macros = calculateMacroTargets(
    goalPolicy.suggestedEnergyKcal,
    protein.central,
  );

  return {
    eligibility: "READY",
    activityCategory: activity.category,
    activitySource: activity.source,
    goal,
    maintenanceEnergy,
    energyTarget,
    protein,
    carbohydrateG: macros.carbohydrateG,
    fatG: macros.fatG,
    fiberG: macros.fiberG,
    requiresUserConfirmation: true,
    reasonCodes: [
      ...activity.reasonCodes,
      ...macros.reasonCodes,
      "TARGETS_REQUIRE_USER_CONFIRMATION",
    ],
    versions: TARGET_ALGORITHM_VERSIONS,
  };
}
