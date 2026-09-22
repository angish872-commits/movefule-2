import type {
  GenerateTrainingPlanInput,
  GenerateTrainingPlanResult,
  JsonValue,
  TrainingActionCandidate,
  TrainingPlanEnvelope,
  TrainingSessionPlan,
} from "./contracts.ts";
import {
  EXERCISE_SCORING_VERSION,
  PROGRAM_ALGORITHM_VERSION,
  PROGRESSION_VERSION,
  TRAINING_ALGORITHM_BUNDLE_VERSION,
  TRAINING_POLICY_VERSION,
} from "./contracts.ts";
import { normalizeTrainingProfile } from "./profile.ts";
import { calculateReadiness } from "./readiness.ts";
import { reconstructProgramState } from "./program-state.ts";
import { buildWeeklyTrainingIntent } from "./program-engine.ts";
import { buildSessionRequirements } from "./session-requirement.ts";
import { eligibleExercises } from "./policy.ts";
import { scoreEligibleExercises } from "./scoring.ts";
import { generateSession } from "./session-generator.ts";
import { validateSession } from "./validator.ts";
import { stableHash } from "./util.ts";

function asJsonSession(session: TrainingSessionPlan): JsonValue {
  return {
    semanticSessionId: session.semanticSessionId,
    localDate: session.localDate,
    purpose: session.purpose,
    expectedDurationMinutes: session.expectedDurationMinutes,
    exercises: session.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      movementPattern: exercise.movementPattern,
      sets: exercise.sets,
      repRange: exercise.repRange,
      durationSeconds: exercise.durationSeconds,
      restSeconds: exercise.restSeconds,
      substitutionExerciseIds: exercise.substitutionExerciseIds,
      progressionContext: exercise.progressionContext,
      reasonCodes: exercise.reasonCodes,
    })),
    reasonCodes: session.reasonCodes,
  };
}

function actionCandidates(plan: TrainingPlanEnvelope, sessions: readonly TrainingSessionPlan[], expiresAt: string): readonly TrainingActionCandidate[] {
  return sessions.map((session, index) => ({
    candidateId: `training-candidate-${stableHash([plan.planId, session.semanticSessionId])}`,
    userId: plan.planId.split(":")[0] ?? "",
    type: "TRAINING_SESSION",
    score: Math.max(1, 100 - index * 5),
    sourcePlanId: plan.planId,
    sourcePlanRevision: plan.planRevision,
    semanticSessionId: session.semanticSessionId,
    reasonCodes: ["VALID_TRAINING_SESSION", `PURPOSE_${session.purpose}`],
    validFrom: plan.generatedAt,
    expiresAt,
  }));
}

export function generateTrainingPlan(input: GenerateTrainingPlanInput): GenerateTrainingPlanResult {
  const normalizedResult = normalizeTrainingProfile(input.profile, input.policyBand);
  const profile = normalizedResult.normalized;
  const goal = profile.goal;
  if (normalizedResult.missingFields.length > 0 || goal === null) {
    return { status: "BLOCKED", reasonCodes: normalizedResult.reasonCodes, missingFields: normalizedResult.missingFields, programState: null };
  }
  if (input.catalog.exercises.length === 0) return { status: "BLOCKED", reasonCodes: ["TRUSTED_EXERCISE_CATALOG_EMPTY"], missingFields: ["exerciseCatalog"], programState: null };
  const readiness = calculateReadiness(input.readiness);
  const state = reconstructProgramState(input.history, input.catalog, goal, input.generatedAt);
  if (readiness.status === "STOP") return { status: "BLOCKED", reasonCodes: readiness.reasonCodes, missingFields: [], programState: state };
  const intent = buildWeeklyTrainingIntent(profile, state);
  if (intent.frequency === 0) return { status: "BLOCKED", reasonCodes: ["NO_AVAILABLE_TRAINING_WINDOW"], missingFields: ["availability"], programState: state };
  const requirements = buildSessionRequirements(intent, profile, input.availability, readiness);
  if (requirements.length === 0) return { status: "BLOCKED", reasonCodes: ["NO_CALENDAR_WINDOW_FOR_REQUIREMENTS"], missingFields: ["availability"], programState: state };
  const sessions: TrainingSessionPlan[] = [];
  for (const requirement of requirements) {
    const eligible = eligibleExercises(input.catalog.exercises, profile, requirement, readiness);
    const scores = scoreEligibleExercises(eligible, requirement, profile, state, input.history);
    const session = generateSession(requirement, scores, profile);
    if (!session) return { status: "BLOCKED", reasonCodes: ["SESSION_REQUIREMENTS_UNSATISFIED"], missingFields: [], programState: state };
    const validation = validateSession(session, requirement, profile, readiness, input.catalog);
    if (!validation.valid) return { status: "BLOCKED", reasonCodes: ["SESSION_VALIDATION_FAILED", ...validation.issueCodes], missingFields: [], programState: state };
    sessions.push(session);
  }
  const validityHours = Math.max(1, Math.min(168, input.validityHours ?? 24));
  const generatedMillis = Date.parse(input.generatedAt);
  const expiresAt = new Date(generatedMillis + validityHours * 3_600_000).toISOString();
  const planId = `${input.profile.userId}:training-plan-${stableHash([input.profile.userId, input.planRevision, state.historySnapshotHash, input.catalog.catalogVersion, input.generatedAt, input.seed ?? null])}`;
  const plan: TrainingPlanEnvelope = {
    schemaVersion: 1,
    planId,
    planRevision: input.planRevision,
    programStateRef: `derived:${state.historySnapshotHash}`,
    profileRevision: input.profile.revision,
    sessions: sessions.map(asJsonSession),
    exerciseCatalogVersion: input.catalog.catalogVersion,
    trainingPolicyVersion: TRAINING_POLICY_VERSION,
    programAlgorithmVersion: PROGRAM_ALGORITHM_VERSION,
    exerciseScoringVersion: EXERCISE_SCORING_VERSION,
    progressionVersion: PROGRESSION_VERSION,
    algorithmBundleVersion: TRAINING_ALGORITHM_BUNDLE_VERSION,
    generatedAt: input.generatedAt,
    validity: { validFrom: input.generatedAt, expiresAt },
    reasonCodes: [...intent.reasonCodes, ...readiness.reasonCodes],
    limitations: readiness.confidence === "LOW" ? ["READINESS_DATA_LOW_CONFIDENCE"] : [],
    seed: input.seed ?? null,
  };
  return {
    status: "READY",
    plan,
    programState: state,
    requirements,
    actionCandidates: actionCandidates(plan, sessions, expiresAt).map((candidate) => ({ ...candidate, userId: input.profile.userId })),
    limitations: plan.limitations,
  };
}
