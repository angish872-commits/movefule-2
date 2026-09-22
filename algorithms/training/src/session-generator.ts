import type {
  ExerciseDefinition,
  ExercisePrescription,
  ExerciseScore,
  InternalSessionRequirement,
  NormalizedTrainingProfile,
  TrainingSessionPlan,
} from "./contracts.ts";

function setsFor(requirement: InternalSessionRequirement, profile: NormalizedTrainingProfile): number {
  const base = profile.policyBand === "YOUTH" || requirement.purpose === "FOUNDATION" || requirement.purpose === "RETURN" ? 2 : 3;
  return Math.max(1, Math.min(profile.policyBand === "YOUTH" ? 3 : 4, Math.round(base * requirement.volumeMultiplier)));
}

function prescription(exercise: ExerciseDefinition, requirement: InternalSessionRequirement, profile: NormalizedTrainingProfile, eligible: readonly ExerciseDefinition[]): ExercisePrescription {
  const cardio = exercise.movementPattern === "CARDIO";
  const youth = profile.policyBand === "YOUTH" || requirement.purpose === "FOUNDATION";
  const repRange = cardio ? null : profile.goal === "STRENGTH" && !youth ? { min: 5, max: 8 } : { min: 8, max: 12 };
  const durationSeconds = cardio ? Math.max(300, Math.min(1200, requirement.canonical.durationMinutes * 30)) : null;
  const restSeconds = cardio ? 60 : profile.goal === "STRENGTH" && !youth ? 120 : 75;
  const substitutions = eligible
    .filter((candidate) => candidate.exerciseId !== exercise.exerciseId && candidate.substitutionGroup === exercise.substitutionGroup)
    .map((candidate) => candidate.exerciseId)
    .sort();
  return {
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.canonicalName,
    movementPattern: exercise.movementPattern,
    sets: setsFor(requirement, profile),
    repRange,
    durationSeconds,
    restSeconds,
    substitutionExerciseIds: substitutions,
    progressionContext: exercise.progressionCompatibility,
    reasonCodes: ["ELIGIBLE_EXERCISE", `PURPOSE_${requirement.purpose}`],
  };
}

function estimateMinutes(exercises: readonly ExercisePrescription[]): number {
  const seconds = exercises.reduce((sum, exercise) => {
    if (exercise.durationSeconds !== null) return sum + exercise.durationSeconds + exercise.restSeconds;
    return sum + exercise.sets * (45 + exercise.restSeconds);
  }, 300);
  return Math.max(1, Math.ceil(seconds / 60));
}

export function generateSession(
  requirement: InternalSessionRequirement,
  scores: readonly ExerciseScore[],
  profile: NormalizedTrainingProfile,
): TrainingSessionPlan | null {
  const selected: ExerciseDefinition[] = [];
  const eligible = scores.map((entry) => entry.exercise);
  for (const movement of requirement.requiredMovements) {
    const candidate = scores.find((entry) => entry.exercise.movementPattern === movement && !selected.some((value) => value.exerciseId === entry.exercise.exerciseId));
    if (!candidate) return null;
    selected.push(candidate.exercise);
  }
  for (const entry of scores) {
    if (selected.length >= requirement.maxExercises) break;
    if (selected.some((value) => value.exerciseId === entry.exercise.exerciseId)) continue;
    if (!requirement.optionalMovements.includes(entry.exercise.movementPattern)) continue;
    selected.push(entry.exercise);
  }

  let prescriptions = selected.map((exercise) => prescription(exercise, requirement, profile, eligible));
  while (prescriptions.length > requirement.requiredMovements.length && estimateMinutes(prescriptions) > requirement.canonical.durationMinutes) prescriptions = prescriptions.slice(0, -1);
  while (estimateMinutes(prescriptions) > requirement.canonical.durationMinutes && prescriptions.some((exercise) => exercise.sets > 1)) {
    for (let index = prescriptions.length - 1; index >= 0 && estimateMinutes(prescriptions) > requirement.canonical.durationMinutes; index -= 1) {
      const current = prescriptions[index]!;
      if (current.sets <= 1) continue;
      prescriptions[index] = { ...current, sets: current.sets - 1, reasonCodes: [...current.reasonCodes, "TIME_ENVELOPE_REDUCED_SET"] };
    }
  }
  const expectedDurationMinutes = estimateMinutes(prescriptions);
  if (expectedDurationMinutes > requirement.canonical.durationMinutes) return null;
  return {
    semanticSessionId: requirement.canonical.semanticSessionId,
    localDate: requirement.localDate,
    purpose: requirement.purpose,
    expectedDurationMinutes,
    exercises: prescriptions,
    reasonCodes: ["DETERMINISTIC_SESSION_GENERATED", ...requirement.canonical.reasonCodes],
  };
}
