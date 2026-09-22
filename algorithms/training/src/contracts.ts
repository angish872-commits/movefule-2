import type {
  JsonValue,
  SessionRequirement as CanonicalSessionRequirement,
  TrainingPlanEnvelope as CanonicalTrainingPlanEnvelope,
  TrainingProfile as CanonicalTrainingProfile,
  ValidityWindow,
} from "../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

export type TrainingProfile = CanonicalTrainingProfile;
export type SessionRequirement = CanonicalSessionRequirement;
export type TrainingPlanEnvelope = CanonicalTrainingPlanEnvelope;
export type { JsonValue, ValidityWindow };

export const TRAINING_SCHEMA_VERSION = 1 as const;
export const TRAINING_POLICY_VERSION = "training-policy-p0-v1";
export const PROGRAM_ALGORITHM_VERSION = "training-program-p0-v1";
export const EXERCISE_SCORING_VERSION = "exercise-scoring-p0-v1";
export const PROGRESSION_VERSION = "training-progression-p0-v1";
export const TRAINING_ALGORITHM_BUNDLE_VERSION = "training-engine-5-p0-v1";

export type TrainingGoal =
  | "GENERAL_FITNESS"
  | "STRENGTH"
  | "MUSCLE"
  | "ENDURANCE"
  | "RETURN_TO_TRAINING"
  | "YOUTH_FOUNDATION";

export type ExperienceBand = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "UNKNOWN";
export type PolicyBand = "YOUTH" | "ADULT" | "OLDER_ADULT" | "UNKNOWN";
export type MovementPattern = "SQUAT" | "HINGE" | "PUSH" | "PULL" | "LUNGE" | "CARRY" | "CORE" | "CARDIO";
export type ExerciseSkill = "FOUNDATION" | "INTERMEDIATE" | "ADVANCED";
export type ProgressionCompatibility = "REPS" | "LOAD" | "TIME" | "RANGE";

export type ExerciseSource = {
  provider: string;
  recordId: string;
  sourceVersion: string;
  license: string;
  licenseReference: string;
};

export type ExerciseDefinition = {
  exerciseId: string;
  canonicalName: string;
  aliases: readonly string[];
  movementPattern: MovementPattern;
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
  equipmentCodes: readonly string[];
  environmentCodes: readonly string[];
  minimumExperience: Exclude<ExperienceBand, "UNKNOWN">;
  skill: ExerciseSkill;
  progressionCompatibility: readonly ProgressionCompatibility[];
  substitutionGroup: string;
  contraindicationCodes: readonly string[];
  fatigueCost: number;
  source: ExerciseSource;
};

export type ExerciseCatalog = {
  catalogVersion: string;
  exercises: readonly ExerciseDefinition[];
};

export type NormalizedTrainingProfile = {
  canonical: TrainingProfile;
  goal: TrainingGoal | null;
  experience: ExperienceBand;
  equipmentCodes: ReadonlySet<string>;
  environmentCodes: ReadonlySet<string>;
  availabilityMinutesByDay: Readonly<Record<string, number>>;
  preferenceCodes: ReadonlySet<string>;
  limitationCodes: ReadonlySet<string>;
  blockedExerciseIds: ReadonlySet<string>;
  policyBand: PolicyBand;
};

export type ReadinessInput = {
  sleepQuality?: number | null;
  energy?: number | null;
  motivation?: number | null;
  soreness?: number | null;
  painFlag?: boolean;
  illnessFlag?: boolean;
};

export type ReadinessStatus = "FULL" | "REDUCED" | "RECOVERY" | "STOP";

export type ReadinessResult = {
  score: number | null;
  status: ReadinessStatus;
  volumeMultiplier: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasonCodes: readonly string[];
};

export type TrainingHistorySession = {
  sessionId: string;
  localDate: string;
  status: "COMPLETED" | "MISSED" | "DISCARDED" | "FAILED";
  planRevisionId?: string | null;
  durationMinutes?: number | null;
  exerciseIds?: readonly string[];
  totalSets?: number | null;
};

export type ProgramState = {
  phase: "FOUNDATION" | "BUILD" | "RETURN";
  weekIndex: number;
  completedSessions: number;
  missedSessions: number;
  recentCompletedSessions: number;
  recentMissedSessions: number;
  recentSets: number;
  consistency: number | null;
  movementExposure: Readonly<Record<MovementPattern, number>>;
  priorPlanRevisionIds: readonly string[];
  priorSessionIds: readonly string[];
  historySnapshotHash: string;
  reasonCodes: readonly string[];
};

export type CalendarAvailability = {
  localDate: string;
  weekday: string;
  availableMinutes: number;
  locked?: boolean;
};

export type TrainingSessionPurpose = "FULL_BODY" | "UPPER" | "LOWER" | "CONDITIONING" | "RETURN" | "FOUNDATION";

export type InternalSessionRequirement = {
  canonical: SessionRequirement;
  localDate: string;
  purpose: TrainingSessionPurpose;
  requiredMovements: readonly MovementPattern[];
  optionalMovements: readonly MovementPattern[];
  maxExercises: number;
  volumeMultiplier: number;
};

export type ExerciseScore = {
  exercise: ExerciseDefinition;
  score: number;
  reasonCodes: readonly string[];
};

export type ExercisePrescription = {
  exerciseId: string;
  exerciseName: string;
  movementPattern: MovementPattern;
  sets: number;
  repRange: { min: number; max: number } | null;
  durationSeconds: number | null;
  restSeconds: number;
  substitutionExerciseIds: readonly string[];
  progressionContext: readonly ProgressionCompatibility[];
  reasonCodes: readonly string[];
};

export type TrainingSessionPlan = {
  semanticSessionId: string;
  localDate: string;
  purpose: TrainingSessionPurpose;
  expectedDurationMinutes: number;
  exercises: readonly ExercisePrescription[];
  reasonCodes: readonly string[];
};

export type TrainingActionCandidate = {
  candidateId: string;
  userId: string;
  type: "TRAINING_SESSION" | "TRAINING_RECOVERY" | "TRAINING_SETUP";
  score: number;
  sourcePlanId: string | null;
  sourcePlanRevision: number | null;
  semanticSessionId: string | null;
  reasonCodes: readonly string[];
  validFrom: string;
  expiresAt: string;
};

export type GenerateTrainingPlanInput = {
  profile: TrainingProfile;
  policyBand: PolicyBand;
  readiness: ReadinessInput;
  history: readonly TrainingHistorySession[];
  availability: readonly CalendarAvailability[];
  catalog: ExerciseCatalog;
  generatedAt: string;
  planRevision: number;
  validityHours?: number;
  seed?: string | null;
};

export type GenerateTrainingPlanResult =
  | { status: "READY"; plan: TrainingPlanEnvelope; programState: ProgramState; requirements: readonly InternalSessionRequirement[]; actionCandidates: readonly TrainingActionCandidate[]; limitations: readonly string[] }
  | { status: "BLOCKED"; reasonCodes: readonly string[]; missingFields: readonly string[]; programState: ProgramState | null };

export type ProgressionDecision = "MAINTAIN" | "PROGRESS" | "REPEAT" | "BOUNDED_REDUCE" | "MODIFY" | "SUBSTITUTE";

export type ProgressionInput = {
  prior: ExercisePrescription;
  completedSets: number;
  prescribedSets: number;
  targetRepsMet?: boolean | null;
  effortRpe?: number | null;
  painOrSafetyConcern?: boolean;
  missedSession?: boolean;
  policyBand: PolicyBand;
};

export type ProgressionResult = {
  decision: ProgressionDecision;
  reasonCodes: readonly string[];
};

export type MissedWorkoutDecision = {
  action: "RESCHEDULE_IF_AVAILABLE" | "CONTINUE_PROGRAM" | "SHORTEN_NEXT_IF_NEEDED";
  reasonCodes: readonly string[];
};
