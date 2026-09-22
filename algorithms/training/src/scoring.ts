import type {
  ExerciseDefinition,
  ExerciseScore,
  InternalSessionRequirement,
  NormalizedTrainingProfile,
  ProgramState,
  TrainingHistorySession,
} from "./contracts.ts";

function recentExerciseIds(history: readonly TrainingHistorySession[]): ReadonlySet<string> {
  return new Set([...history].sort((a, b) => b.localDate.localeCompare(a.localDate)).slice(0, 6).flatMap((session) => session.exerciseIds ?? []));
}

function preference(profile: NormalizedTrainingProfile, exercise: ExerciseDefinition): boolean {
  return profile.preferenceCodes.has(`PREFER_EXERCISE:${exercise.exerciseId}`) || profile.preferenceCodes.has(`PREFER_MOVEMENT:${exercise.movementPattern}`);
}

export function scoreEligibleExercises(
  exercises: readonly ExerciseDefinition[],
  requirement: InternalSessionRequirement,
  profile: NormalizedTrainingProfile,
  state: ProgramState,
  history: readonly TrainingHistorySession[],
): readonly ExerciseScore[] {
  const recent = recentExerciseIds(history);
  return exercises.map((exercise) => {
    let score = 0;
    const reasons: string[] = [];
    if (requirement.requiredMovements.includes(exercise.movementPattern)) { score += 100; reasons.push("REQUIRED_MOVEMENT_FIT"); }
    else if (requirement.optionalMovements.includes(exercise.movementPattern)) { score += 50; reasons.push("OPTIONAL_MOVEMENT_FIT"); }
    const exposure = state.movementExposure[exercise.movementPattern];
    score += Math.max(0, 20 - Math.min(20, exposure * 3));
    reasons.push("MOVEMENT_BALANCE");
    if (recent.has(exercise.exerciseId)) { score += 8; reasons.push("CONTINUITY"); }
    else { score += 4; reasons.push("CONTROLLED_VARIATION"); }
    if (preference(profile, exercise)) { score += 8; reasons.push("USER_PREFERENCE"); }
    if (exercise.equipmentCodes.length === 0) { score += 3; reasons.push("LOW_SETUP_COST"); }
    score += Math.round((1 - exercise.fatigueCost) * 10);
    reasons.push("BOUNDED_FATIGUE_COST");
    if (profile.goal === "STRENGTH" && exercise.progressionCompatibility.includes("LOAD")) { score += 8; reasons.push("STRENGTH_PROGRESS_COMPATIBLE"); }
    if (profile.goal === "MUSCLE" && exercise.progressionCompatibility.includes("REPS")) { score += 8; reasons.push("REPETITION_PROGRESS_COMPATIBLE"); }
    if (profile.goal === "ENDURANCE" && exercise.progressionCompatibility.includes("TIME")) { score += 8; reasons.push("TIME_PROGRESS_COMPATIBLE"); }
    return { exercise, score, reasonCodes: reasons };
  }).sort((a, b) => b.score - a.score || a.exercise.exerciseId.localeCompare(b.exercise.exerciseId));
}
