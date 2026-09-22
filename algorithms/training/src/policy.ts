import type {
  ExerciseDefinition,
  ExperienceBand,
  InternalSessionRequirement,
  NormalizedTrainingProfile,
  ReadinessResult,
} from "./contracts.ts";

export type ExerciseEligibility = {
  allowed: boolean;
  reasonCodes: readonly string[];
};

const EXPERIENCE_RANK: Readonly<Record<Exclude<ExperienceBand, "UNKNOWN">, number>> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
};

function blockedMovement(profile: NormalizedTrainingProfile, movement: string): boolean {
  return profile.limitationCodes.has(`BLOCK_MOVEMENT:${movement}`) || profile.preferenceCodes.has(`BLOCK_MOVEMENT:${movement}`);
}

export function evaluateExerciseEligibility(
  exercise: ExerciseDefinition,
  profile: NormalizedTrainingProfile,
  requirement: InternalSessionRequirement,
  readiness: ReadinessResult,
): ExerciseEligibility {
  const reasons: string[] = [];
  if (readiness.status === "STOP") reasons.push("READINESS_STOP");
  if (profile.experience === "UNKNOWN") reasons.push("EXPERIENCE_UNKNOWN");
  if (profile.blockedExerciseIds.has(exercise.exerciseId) || profile.blockedExerciseIds.has(exercise.source.recordId)) reasons.push("EXERCISE_BLOCKED_BY_USER");
  if (blockedMovement(profile, exercise.movementPattern)) reasons.push("MOVEMENT_BLOCKED_BY_USER");

  for (const equipment of exercise.equipmentCodes) {
    if (!profile.equipmentCodes.has(equipment)) reasons.push(`MISSING_EQUIPMENT:${equipment}`);
  }
  if (!exercise.environmentCodes.includes("ANY") && !exercise.environmentCodes.some((environment) => profile.environmentCodes.has(environment))) {
    reasons.push("ENVIRONMENT_INCOMPATIBLE");
  }
  if (profile.experience !== "UNKNOWN" && EXPERIENCE_RANK[exercise.minimumExperience] > EXPERIENCE_RANK[profile.experience]) {
    reasons.push("EXPERIENCE_TOO_LOW");
  }
  if (![...requirement.requiredMovements, ...requirement.optionalMovements].includes(exercise.movementPattern)) {
    reasons.push("SESSION_REQUIREMENT_MISMATCH");
  }
  if (exercise.contraindicationCodes.some((code) => profile.limitationCodes.has(code))) reasons.push("LIMITATION_POLICY_BLOCK");
  if (profile.policyBand === "YOUTH" && exercise.skill === "ADVANCED") reasons.push("YOUTH_ADVANCED_SKILL_BLOCK");
  if (profile.policyBand === "YOUTH" && exercise.fatigueCost > 0.7) reasons.push("YOUTH_HIGH_FATIGUE_BLOCK");
  if (requirement.purpose === "RETURN" && exercise.fatigueCost > 0.65) reasons.push("RETURN_HIGH_FATIGUE_BLOCK");

  return { allowed: reasons.length === 0, reasonCodes: [...new Set(reasons)].sort() };
}

export function eligibleExercises(
  exercises: readonly ExerciseDefinition[],
  profile: NormalizedTrainingProfile,
  requirement: InternalSessionRequirement,
  readiness: ReadinessResult,
): readonly ExerciseDefinition[] {
  return exercises.filter((exercise) => evaluateExerciseEligibility(exercise, profile, requirement, readiness).allowed);
}
