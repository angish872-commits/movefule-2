import type {
  ExperienceBand,
  JsonValue,
  NormalizedTrainingProfile,
  PolicyBand,
  TrainingGoal,
  TrainingProfile,
} from "./contracts.ts";

export type ProfileNormalizationResult = {
  normalized: NormalizedTrainingProfile;
  missingFields: readonly string[];
  reasonCodes: readonly string[];
};

const GOAL_ALIASES: Readonly<Record<string, TrainingGoal>> = {
  GENERAL_FITNESS: "GENERAL_FITNESS",
  FITNESS: "GENERAL_FITNESS",
  STRENGTH: "STRENGTH",
  MUSCLE: "MUSCLE",
  MUSCLE_DEVELOPMENT: "MUSCLE",
  HYPERTROPHY: "MUSCLE",
  ENDURANCE: "ENDURANCE",
  CONDITIONING: "ENDURANCE",
  RETURN_TO_TRAINING: "RETURN_TO_TRAINING",
  RETURN: "RETURN_TO_TRAINING",
  YOUTH_FOUNDATION: "YOUTH_FOUNDATION",
};

function code(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function codes(values: readonly string[]): readonly string[] {
  return [...new Set(values.map(code).filter(Boolean))].sort();
}

function experience(value: string): ExperienceBand {
  const normalized = code(value);
  return normalized === "BEGINNER" || normalized === "INTERMEDIATE" || normalized === "ADVANCED"
    ? normalized
    : "UNKNOWN";
}

function goal(values: readonly string[]): TrainingGoal | null {
  for (const value of values) {
    const mapped = GOAL_ALIASES[code(value)];
    if (mapped) return mapped;
  }
  return null;
}

function availability(value: JsonValue): Readonly<Record<string, number>> {
  if (value === null || Array.isArray(value) || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [rawDay, rawMinutes] of Object.entries(value)) {
    if (typeof rawMinutes !== "number" || !Number.isFinite(rawMinutes)) continue;
    const day = code(rawDay);
    if (!day) continue;
    out[day] = Math.max(0, Math.min(240, Math.trunc(rawMinutes)));
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function blockedExerciseIds(profile: TrainingProfile): ReadonlySet<string> {
  const result = new Set<string>();
  for (const raw of [...profile.preferenceCodes, ...profile.limitationCodes]) {
    const trimmed = raw.trim();
    const upper = trimmed.toUpperCase();
    if (!upper.startsWith("BLOCK_EXERCISE:")) continue;
    const id = trimmed.slice(trimmed.indexOf(":") + 1).trim();
    if (id) result.add(id);
  }
  return result;
}

function fieldUnknown(profile: TrainingProfile, field: string): boolean {
  const wanted = code(field);
  return profile.unknownFields.some((value) => code(value) === wanted);
}

export function normalizeTrainingProfile(profile: TrainingProfile, policyBand: PolicyBand): ProfileNormalizationResult {
  const normalizedGoal = goal(profile.goalCodes);
  const normalizedExperience = experience(profile.experienceBand);
  const equipment = new Set(codes(profile.equipmentCodes).filter((value) => !["NONE", "NO_EQUIPMENT", "BODY_ONLY"].includes(value)));
  const environments = new Set(codes(profile.environmentCodes));
  const normalizedAvailability = availability(profile.availabilityMinutesByDay);
  const preferences = new Set(codes(profile.preferenceCodes));
  const limitations = new Set(codes(profile.limitationCodes));
  const missingFields: string[] = [];
  const reasonCodes: string[] = [];

  if (fieldUnknown(profile, "goalCodes") || normalizedGoal === null) missingFields.push("goalCodes");
  if (fieldUnknown(profile, "experienceBand") || normalizedExperience === "UNKNOWN") missingFields.push("experienceBand");
  if (fieldUnknown(profile, "environmentCodes") || environments.size === 0) missingFields.push("environmentCodes");
  if (fieldUnknown(profile, "availabilityMinutesByDay") || Object.keys(normalizedAvailability).length === 0) missingFields.push("availabilityMinutesByDay");
  if (fieldUnknown(profile, "equipmentCodes")) missingFields.push("equipmentCodes");
  if (policyBand === "UNKNOWN") missingFields.push("policyBand");

  if (profile.goalCodes.length > 0 && normalizedGoal === null) reasonCodes.push("UNSUPPORTED_GOAL_CODE");
  if (profile.experienceBand.trim() && normalizedExperience === "UNKNOWN") reasonCodes.push("UNSUPPORTED_EXPERIENCE_BAND");
  if (missingFields.length > 0) reasonCodes.push("PROFILE_INFORMATION_INCOMPLETE");

  return {
    normalized: {
      canonical: profile,
      goal: normalizedGoal,
      experience: normalizedExperience,
      equipmentCodes: equipment,
      environmentCodes: environments,
      availabilityMinutesByDay: normalizedAvailability,
      preferenceCodes: preferences,
      limitationCodes: limitations,
      blockedExerciseIds: blockedExerciseIds(profile),
      policyBand,
    },
    missingFields: [...new Set(missingFields)].sort(),
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}
