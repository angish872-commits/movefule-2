import type { TrainingHistorySession } from "../../../../algorithms/training/src/contracts.ts";
import type { OwnerScopedRepository } from "../foundation/repository.ts";

export interface CanonicalTrainingHistorySource {
  loadCanonicalHistory(userId: string): Promise<readonly TrainingHistorySession[]>;
}

type WorkoutSessionRow = {
  sessionId: string;
  userId: string;
  planRevisionId?: string;
  state: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  currentRevision: number;
};

type WorkoutEventRow = {
  sessionId: string;
  userId: string;
  eventType: string;
  eventSequence: number;
  payloadJson: string;
};

type WorkoutSummaryRow = {
  sessionId: string;
  userId: string;
  durationSeconds: number;
  revision: number;
};

type PersistedEventPayload = {
  exerciseEvent?: {
    eventType?: string;
    exerciseId?: string;
  };
};

const localDate = (row: WorkoutSessionRow): string => {
  const source = row.endedAt ?? row.startedAt ?? row.createdAt;
  const parsed = Date.parse(source);
  if (!Number.isFinite(parsed)) throw new Error("canonical_workout_timestamp_invalid");
  return new Date(parsed).toISOString().slice(0, 10);
};

const eventPayload = (row: WorkoutEventRow): PersistedEventPayload | null => {
  try {
    const parsed = JSON.parse(row.payloadJson) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as PersistedEventPayload : null;
  } catch {
    return null;
  }
};

/**
 * Training progression history is reconstructed only from server-canonical workout
 * session/event/summary rows. Pending Phone outboxes, unresolved Watch state,
 * rejected sync operations, stale envelopes and duplicate receipts are therefore
 * not eligible inputs to the Training Engine.
 */
export class AppwriteCanonicalTrainingHistoryStore implements CanonicalTrainingHistorySource {
  private readonly repository: OwnerScopedRepository;

  constructor(repository: OwnerScopedRepository) {
    this.repository = repository;
  }

  async loadCanonicalHistory(userId: string): Promise<readonly TrainingHistorySession[]> {
    const sessions = await this.repository.listOwned<WorkoutSessionRow>("workout_session", userId, { limit: 200 });
    const terminal = sessions.rows
      .filter((row) => row.state === "COMPLETED" || row.state === "FAILED")
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));

    return Promise.all(terminal.map(async (session): Promise<TrainingHistorySession> => {
      const events = await this.repository.listOwned<WorkoutEventRow>("workout_event", userId, {
        queries: [{ field: "sessionId", operator: "equal", value: session.sessionId }],
        limit: 500,
      });
      const acceptedSets = events.rows
        .map(eventPayload)
        .map((payload) => payload?.exerciseEvent)
        .filter((event): event is NonNullable<PersistedEventPayload["exerciseEvent"]> => event?.eventType === "SET_COMPLETED");
      const exerciseIds = [...new Set(acceptedSets.map((event) => event.exerciseId).filter((value): value is string => Boolean(value)))];
      const summary = await this.repository.getOwned<WorkoutSummaryRow>("workout_summary", userId, `workout-summary-${session.sessionId}`);
      const summaryMatchesCanonicalRevision = summary?.revision === session.currentRevision;

      return {
        sessionId: session.sessionId,
        localDate: localDate(session),
        status: session.state === "COMPLETED" ? "COMPLETED" : "FAILED",
        ...(session.planRevisionId ? { planRevisionId: session.planRevisionId } : {}),
        ...(summary && summaryMatchesCanonicalRevision ? { durationMinutes: Math.max(0, Math.round(summary.durationSeconds / 60)) } : {}),
        ...(exerciseIds.length > 0 ? { exerciseIds } : {}),
        ...(acceptedSets.length > 0 ? { totalSets: acceptedSets.length } : {}),
      };
    }));
  }
}
