import type {
  ExerciseCatalog,
  InternalSessionRequirement,
  NormalizedTrainingProfile,
  ReadinessResult,
  TrainingSessionPlan,
} from "./contracts.ts";
import { evaluateExerciseEligibility } from "./policy.ts";

export type SessionValidationResult = { valid: boolean; issueCodes: readonly string[] };

export function validateSession(
  session: TrainingSessionPlan,
  requirement: InternalSessionRequirement,
  profile: NormalizedTrainingProfile,
  readiness: ReadinessResult,
  catalog: ExerciseCatalog,
): SessionValidationResult {
  const issues: string[] = [];
  if (session.exercises.length > requirement.maxExercises) issues.push("TOO_MANY_EXERCISES");
  if (session.expectedDurationMinutes > requirement.canonical.durationMinutes) issues.push("TIME_ENVELOPE_EXCEEDED");
  const ids = session.exercises.map((exercise) => exercise.exerciseId);
  if (new Set(ids).size !== ids.length) issues.push("DUPLICATE_EXERCISE");
  for (const movement of requirement.requiredMovements) {
    if (!session.exercises.some((exercise) => exercise.movementPattern === movement)) issues.push(`REQUIRED_MOVEMENT_MISSING:${movement}`);
  }
  const byId = new Map(catalog.exercises.map((exercise) => [exercise.exerciseId, exercise] as const));
  for (const prescription of session.exercises) {
    const exercise = byId.get(prescription.exerciseId);
    if (!exercise) { issues.push(`EXERCISE_NOT_IN_CATALOG:${prescription.exerciseId}`); continue; }
    const eligibility = evaluateExerciseEligibility(exercise, profile, requirement, readiness);
    if (!eligibility.allowed) issues.push(...eligibility.reasonCodes.map((reason) => `INELIGIBLE:${prescription.exerciseId}:${reason}`));
    if (prescription.sets < 1 || prescription.sets > (profile.policyBand === "YOUTH" ? 3 : 4)) issues.push(`SET_BOUND_VIOLATION:${prescription.exerciseId}`);
    for (const substituteId of prescription.substitutionExerciseIds) {
      const substitute = byId.get(substituteId);
      if (!substitute) { issues.push(`SUBSTITUTE_NOT_IN_CATALOG:${substituteId}`); continue; }
      if (substitute.substitutionGroup !== exercise.substitutionGroup) issues.push(`SUBSTITUTION_GROUP_MISMATCH:${substituteId}`);
      if (!evaluateExerciseEligibility(substitute, profile, requirement, readiness).allowed) issues.push(`INELIGIBLE_SUBSTITUTE:${substituteId}`);
    }
  }
  return { valid: issues.length === 0, issueCodes: [...new Set(issues)].sort() };
}
