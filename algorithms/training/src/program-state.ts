import type { ExerciseCatalog, MovementPattern, ProgramState, TrainingGoal, TrainingHistorySession } from "./contracts.ts";
import { stableHash, uniqueSorted } from "./util.ts";

const MOVEMENTS: readonly MovementPattern[] = ["SQUAT", "HINGE", "PUSH", "PULL", "LUNGE", "CARRY", "CORE", "CARDIO"];

function dayMillis(localDate: string): number | null {
  const parsed = Date.parse(`${localDate}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalHistory(history: readonly TrainingHistorySession[]): readonly TrainingHistorySession[] {
  return [...history]
    .map((session) => ({ ...session, exerciseIds: session.exerciseIds ? [...session.exerciseIds].sort() : undefined }))
    .sort((a, b) => a.localDate.localeCompare(b.localDate) || a.sessionId.localeCompare(b.sessionId));
}

export function reconstructProgramState(
  history: readonly TrainingHistorySession[],
  catalog: ExerciseCatalog,
  goal: TrainingGoal,
  generatedAt: string,
): ProgramState {
  const ordered = canonicalHistory(history);
  const now = Date.parse(generatedAt);
  const cutoff = Number.isFinite(now) ? now - 7 * 86_400_000 : Number.NEGATIVE_INFINITY;
  const recent = ordered.filter((session) => {
    const date = dayMillis(session.localDate);
    return date !== null && date >= cutoff && date <= now;
  });
  const completedSessions = ordered.filter((session) => session.status === "COMPLETED").length;
  const missedSessions = ordered.filter((session) => session.status === "MISSED").length;
  const recentCompletedSessions = recent.filter((session) => session.status === "COMPLETED").length;
  const recentMissedSessions = recent.filter((session) => session.status === "MISSED").length;
  const recentSets = recent.filter((session) => session.status === "COMPLETED").reduce((sum, session) => sum + Math.max(0, session.totalSets ?? 0), 0);
  const considered = completedSessions + missedSessions;
  const consistency = considered === 0 ? null : Math.round((completedSessions / considered) * 1000) / 1000;
  const exerciseMovement = new Map(catalog.exercises.map((exercise) => [exercise.exerciseId, exercise.movementPattern] as const));
  const exposure = Object.fromEntries(MOVEMENTS.map((movement) => [movement, 0])) as Record<MovementPattern, number>;
  for (const session of ordered) {
    if (session.status !== "COMPLETED") continue;
    for (const exerciseId of session.exerciseIds ?? []) {
      const movement = exerciseMovement.get(exerciseId);
      if (movement) exposure[movement] += 1;
    }
  }
  const dated = ordered.map((session) => dayMillis(session.localDate)).filter((value): value is number => value !== null);
  const first = dated.length > 0 ? Math.min(...dated) : now;
  const weekIndex = Number.isFinite(now) && Number.isFinite(first) ? Math.max(1, Math.floor(Math.max(0, now - first) / (7 * 86_400_000)) + 1) : 1;
  const phase = goal === "RETURN_TO_TRAINING" ? "RETURN" : completedSessions < 6 ? "FOUNDATION" : "BUILD";
  const reasonCodes = [phase === "RETURN" ? "RETURN_PHASE" : phase === "FOUNDATION" ? "FOUNDATION_PHASE" : "BUILD_PHASE"];

  return {
    phase,
    weekIndex,
    completedSessions,
    missedSessions,
    recentCompletedSessions,
    recentMissedSessions,
    recentSets,
    consistency,
    movementExposure: exposure,
    priorPlanRevisionIds: uniqueSorted(ordered.map((session) => session.planRevisionId ?? "").filter(Boolean)),
    priorSessionIds: ordered.map((session) => session.sessionId),
    historySnapshotHash: stableHash(ordered),
    reasonCodes,
  };
}
