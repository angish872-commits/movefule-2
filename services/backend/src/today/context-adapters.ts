import type { JsonValue } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { WorkoutSession } from "../sync/types.ts";
import type { TodayCandidateInput } from "./contracts.ts";

function sessionTime(session: WorkoutSession): number {
  return session.startedAtEpochMillis ?? session.createdAtEpochMillis;
}

function activeSession(sessions: readonly WorkoutSession[]): WorkoutSession | null {
  const active = sessions
    .filter((session) => session.state === "ACTIVE" || session.state === "PAUSED")
    .sort((left, right) => {
      if (left.state !== right.state) return left.state === "ACTIVE" ? -1 : 1;
      if (left.currentRevision !== right.currentRevision) return right.currentRevision - left.currentRevision;
      return sessionTime(right) - sessionTime(left) || left.sessionId.localeCompare(right.sessionId);
    });
  return active[0] ?? null;
}

/**
 * Converts an already-canonical workout execution state into a Today continuity
 * action. This adapter never reads or changes the Training prescription.
 */
export function activeWorkoutContinuity(
  userId: string,
  sessions: readonly WorkoutSession[],
  now: string,
): { readonly input: TodayCandidateInput; readonly projection: JsonValue } | null {
  const session = activeSession(sessions);
  if (!session) return null;
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("today_active_workout_invalid_now");
  const validFromMs = Math.min(sessionTime(session), nowMs);
  const expiresAt = new Date(nowMs + 30 * 60_000).toISOString();
  const input: TodayCandidateInput = Object.freeze({
    candidate: Object.freeze({
      schemaVersion: 1,
      candidateId: `today-active-workout:${session.sessionId}:${session.currentRevision}`,
      semanticActionKey: `training:active-workout:${session.sessionId}`,
      userId,
      domain: "TRAINING",
      type: "CONTINUE_ACTIVE_WORKOUT",
      blockingState: "INTERRUPTIVE",
      reasonCodes: Object.freeze(["ACTIVE_WORKOUT_CONTINUITY", `WORKOUT_STATE_${session.state}`]),
      sourceObjectId: session.sessionId,
      sourceRevision: String(session.currentRevision),
      validFrom: new Date(validFromMs).toISOString(),
      expiresAt,
      requiresNetwork: false,
      deepLink: Object.freeze({ destination: "training/session", sessionId: session.sessionId }),
    }),
    domainValidity: "VALID",
    dependencyState: "SATISFIED",
    freshness: "FRESH",
    continuity: "ACTIVE_WORKOUT",
  });
  const projection: JsonValue = Object.freeze({
    sessionId: session.sessionId,
    state: session.state,
    revision: session.currentRevision,
    elapsedSeconds: session.elapsedSeconds,
    workoutType: session.workoutType,
  });
  return Object.freeze({ input, projection });
}
