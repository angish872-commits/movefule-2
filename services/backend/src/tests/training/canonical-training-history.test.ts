import assert from "node:assert/strict";
import test from "node:test";

import type {
  FoundationTableId,
  ListRowsResult,
  OwnerScopedRepository,
  RepositoryListOptions,
  RepositoryRow,
} from "../../foundation/index.ts";
import { AppwriteCanonicalTrainingHistoryStore } from "../../training/canonical-history-store.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

class MemoryOwner implements OwnerScopedRepository {
  readonly tables = new Map<FoundationTableId, Map<string, AnyRow>>();

  private table(tableId: FoundationTableId) {
    let table = this.tables.get(tableId);
    if (!table) { table = new Map<string, AnyRow>(); this.tables.set(tableId, table); }
    return table;
  }

  async listOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    options: RepositoryListOptions = {},
  ): Promise<ListRowsResult<T>> {
    const rows = [...this.table(tableId).values()]
      .filter((row) => row.userId === userId)
      .filter((row) => (options.queries ?? []).every((query) => query.operator !== "equal" || row[query.field] === query.value))
      .slice(0, options.limit ?? 100) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string): Promise<RepositoryRow<T> | null> {
    const row = this.table(tableId).get(rowId);
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  async createOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T): Promise<RepositoryRow<T>> {
    const row = { ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.table(tableId).set(rowId, row as AnyRow);
    return row;
  }

  async updateOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const prior = await this.getOwned<T>(tableId, userId, rowId);
    if (!prior) throw new Error("missing");
    const row = { ...prior, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.table(tableId).set(rowId, row as AnyRow);
    return row;
  }

  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string): Promise<void> {
    this.table(tableId).delete(rowId);
  }
}

function workoutEventPayload(exerciseId: string) {
  return JSON.stringify({
    requestHash: "accepted-canonical-event",
    session: {},
    exerciseEvent: { eventType: "SET_COMPLETED", exerciseId },
  });
}

test("canonical Training history excludes unresolved local state, rejected/stale operations and duplicates", async () => {
  const repository = new MemoryOwner();

  await repository.createOwned("workout_session", "u1", "completed-a", {
    sessionId: "completed-a", userId: "u1", planRevisionId: "plan-r1", state: "COMPLETED", currentRevision: 4,
    authorityDeviceId: "watch-a", workoutType: "strength", createdAt: "2026-08-28T08:00:00.000Z", startedAt: "2026-08-28T08:01:00.000Z", endedAt: "2026-08-28T08:31:00.000Z",
  });
  await repository.createOwned("workout_event", "u1", "event-set-1", {
    eventId: "event-set-1", sessionId: "completed-a", userId: "u1", eventType: "EXERCISE_SET_COMPLETED", eventSequence: 2,
    payloadJson: workoutEventPayload("squat-a"), sourceDevice: "watch-a", occurredAt: "2026-08-28T08:10:00.000Z", idempotencyKey: "set-1",
  });
  await repository.createOwned("workout_event", "u1", "event-set-2", {
    eventId: "event-set-2", sessionId: "completed-a", userId: "u1", eventType: "EXERCISE_SET_COMPLETED", eventSequence: 3,
    payloadJson: workoutEventPayload("squat-a"), sourceDevice: "watch-a", occurredAt: "2026-08-28T08:15:00.000Z", idempotencyKey: "set-2",
  });
  await repository.createOwned("workout_summary", "u1", "workout-summary-completed-a", {
    summaryId: "workout-summary-completed-a", sessionId: "completed-a", userId: "u1", durationSeconds: 1800,
    sourcePlatform: "wear_os", healthWriteState: "NOT_REQUESTED", revision: 4, createdAt: "2026-08-28T08:31:00.000Z",
  });

  // Canonical but non-terminal execution is intentionally invisible to progression until reconciliation completes it.
  await repository.createOwned("workout_session", "u1", "active-local-a", {
    sessionId: "active-local-a", userId: "u1", state: "ACTIVE", currentRevision: 2, authorityDeviceId: "watch-a",
    workoutType: "strength", createdAt: "2026-08-29T08:00:00.000Z", startedAt: "2026-08-29T08:01:00.000Z",
  });
  await repository.createOwned("workout_event", "u1", "active-set", {
    eventId: "active-set", sessionId: "active-local-a", userId: "u1", eventType: "EXERCISE_SET_COMPLETED", eventSequence: 2,
    payloadJson: workoutEventPayload("push-a"), sourceDevice: "watch-a", occurredAt: "2026-08-29T08:10:00.000Z", idempotencyKey: "pending-replay",
  });

  // Rejected, stale and duplicate transport operations are audit records, never Training history authorities.
  for (const [id, outcome] of [["rejected-op", "REJECTED"], ["stale-op", "STALE_REVISION"], ["duplicate-op", "DUPLICATE"]] as const) {
    await repository.createOwned("sync_operation", "u1", id, {
      operationId: id, userId: "u1", deviceId: "watch-a", deviceSessionId: "ds-a", schemaVersion: 1,
      entityType: "workout_session", entityId: "active-local-a", operation: "WORKOUT_EVENT", idempotencyKey: id,
      requestHash: id, payloadHash: id, outcome, receivedAt: "2026-08-29T08:20:00.000Z",
    });
  }

  const history = await new AppwriteCanonicalTrainingHistoryStore(repository).loadCanonicalHistory("u1");
  assert.deepEqual(history, [{
    sessionId: "completed-a",
    localDate: "2026-08-28",
    status: "COMPLETED",
    planRevisionId: "plan-r1",
    durationMinutes: 30,
    exerciseIds: ["squat-a"],
    totalSets: 2,
  }]);
});

test("canonical history exposes a completed session only after canonical terminal reconciliation", async () => {
  const repository = new MemoryOwner();
  await repository.createOwned("workout_session", "u1", "session-a", {
    sessionId: "session-a", userId: "u1", state: "ACTIVE", currentRevision: 2, authorityDeviceId: "watch-a",
    workoutType: "strength", createdAt: "2026-08-30T08:00:00.000Z", startedAt: "2026-08-30T08:01:00.000Z",
  });
  const store = new AppwriteCanonicalTrainingHistoryStore(repository);
  assert.deepEqual(await store.loadCanonicalHistory("u1"), []);

  await repository.updateOwned("workout_session", "u1", "session-a", {
    state: "COMPLETED", currentRevision: 3, endedAt: "2026-08-30T08:30:00.000Z",
  });
  const history = await store.loadCanonicalHistory("u1");
  assert.equal(history.length, 1);
  assert.equal(history[0]?.status, "COMPLETED");
  assert.equal(history[0]?.sessionId, "session-a");
});
