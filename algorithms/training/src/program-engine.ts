import type { NormalizedTrainingProfile, ProgramState, TrainingSessionPurpose } from "./contracts.ts";

export type ProgressionStrategy = "FOUNDATION_SKILL" | "BOUNDED_REPS" | "BOUNDED_REPS_LOAD" | "BOUNDED_TIME" | "RETURN_CONSERVATIVE";

export type WeeklyTrainingIntent = {
  phase: ProgramState["phase"];
  frequency: number;
  sessionPurposes: readonly TrainingSessionPurpose[];
  progressionStrategy: ProgressionStrategy;
  reasonCodes: readonly string[];
};

const PURPOSES: Readonly<Record<NonNullable<NormalizedTrainingProfile["goal"]>, readonly TrainingSessionPurpose[]>> = {
  GENERAL_FITNESS: ["FULL_BODY", "FULL_BODY", "CONDITIONING"],
  STRENGTH: ["FULL_BODY", "UPPER", "LOWER"],
  MUSCLE: ["UPPER", "LOWER", "UPPER", "LOWER"],
  ENDURANCE: ["CONDITIONING", "FULL_BODY", "CONDITIONING"],
  RETURN_TO_TRAINING: ["RETURN", "RETURN"],
  YOUTH_FOUNDATION: ["FOUNDATION", "FOUNDATION", "FOUNDATION"],
};

function strategy(profile: NormalizedTrainingProfile): ProgressionStrategy {
  if (profile.policyBand === "YOUTH" || profile.goal === "YOUTH_FOUNDATION") return "FOUNDATION_SKILL";
  if (profile.goal === "RETURN_TO_TRAINING") return "RETURN_CONSERVATIVE";
  if (profile.goal === "ENDURANCE") return "BOUNDED_TIME";
  if (profile.goal === "STRENGTH" || profile.goal === "MUSCLE") return "BOUNDED_REPS_LOAD";
  return "BOUNDED_REPS";
}

export function buildWeeklyTrainingIntent(profile: NormalizedTrainingProfile, state: ProgramState): WeeklyTrainingIntent {
  if (!profile.goal) throw new Error("Training goal is required before program intent can be built.");
  const basePurposes = PURPOSES[profile.goal];
  const availableDays = Object.values(profile.availabilityMinutesByDay).filter((minutes) => minutes > 0).length;
  let cap = basePurposes.length;
  if (profile.experience === "BEGINNER") cap = Math.min(cap, 4);
  if (profile.policyBand === "YOUTH") cap = Math.min(cap, 4);
  if (profile.policyBand === "OLDER_ADULT") cap = Math.min(cap, 4);
  if (state.recentMissedSessions >= 2) cap = Math.max(1, cap - 1);
  const frequency = Math.max(0, Math.min(cap, availableDays));
  const sessionPurposes = Array.from({ length: frequency }, (_, index) => basePurposes[index % basePurposes.length]!);
  const reasonCodes = [
    `GOAL_${profile.goal}`,
    `PHASE_${state.phase}`,
    ...(frequency < basePurposes.length ? ["FREQUENCY_BOUNDED_BY_AVAILABILITY_OR_HISTORY"] : []),
  ];
  return { phase: state.phase, frequency, sessionPurposes, progressionStrategy: strategy(profile), reasonCodes };
}
