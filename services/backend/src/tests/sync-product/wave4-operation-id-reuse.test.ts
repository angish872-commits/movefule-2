import assert from "node:assert/strict";
import test from "node:test";

import { sha256 } from "../../domain/sync-store.ts";
import type {
  FoundationTableId,
  ListRowsResult,
  OwnerScopedRepository,
  RepositoryListOptions,
  RepositoryRow,
  ServerOwnedRepository,
} from "../../foundation/index.ts";
import { AppwriteWorkoutStore } from "../../sync/appwrite-workout-store.ts";
import { CanonicalWorkoutReconciler } from "../../sync/canonical-workout-reconciler.ts";
import type { SyncEnvelope } from "../../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

class MemoryRepository implements OwnerScopedRepository, ServerOwnedRepository {
  readonly tables = new Map<FoundationTableId, Map<string, AnyRow>>();

  private table(tableId: FoundationTableId): Map<string, AnyRow> {
    let table = this.tables.get(tableId);
    if (!table) {
      table = new Map();
      this.tables.set(tableId, table);
    }
    return table;
  }

  private list<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    options: RepositoryListOptions = {},
  ): ListRowsResult<T> {
    const rows = [...this.table(tableId).values()]
      .filter((row) => row.userId === userId)
      .filter((row) => (options.queries ?? []).every((query) => query.operator !== "equal" || row[query.field] === query.value))
      .slice(0, options.limit ?? 100) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  private get<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string): RepositoryRow<T> | null {
    const row = this.table(tableId).get(rowId);
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  private create<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T): RepositoryRow<T> {
    const table = this.table(tableId);
    if (table.has(rowId)) throw new Error("duplicate_row");
    const row = { ...data, userId, $id: rowId } as RepositoryRow<T>;
    table.set(rowId, row as AnyRow);
    return row;
  }

  private update<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>): RepositoryRow<T> {
    const current = this.get<T>(tableId, userId, rowId);
    if (!current) throw new Error("missing_row");
    const row = { ...current, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.table(tableId).set(rowId, row as AnyRow);
    return row;
  }

  async listOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options?: RepositoryListOptions) { return this.list<T>(tableId, userId, options); }
  async getOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string) { return this.get<T>(tableId, userId, rowId); }
  async createOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T) { return this.create(tableId, userId, rowId, data); }
  async updateOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>) { return this.update(tableId, userId, rowId, data); }
  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string) { if (this.get(tableId, userId, rowId)) this.table(tableId).delete(rowId); }
  async listForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options?: RepositoryListOptions) { return this.list<T>(tableId, userId, options); }
  async getForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string) { return this.get<T>(tableId, userId, rowId); }
  async createForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T) { return this.create(tableId, userId, rowId, data); }
  async updateForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>) { return this.update(tableId, userId, rowId, data); }
}

const now = () => new Date("2026-09-01T09:30:00.000Z");

function envelope(input: {
  operationId: string;
  idempotencyKey: string;
  expectedRevision: number;
  sequence: number;
  setIndex: number;
}): SyncEnvelope<unknown> {
  const payload = {
    sessionId: "session-a",
    idempotencyKey: input.idempotencyKey,
    authorityDeviceId: "phone-a",
    expectedRevision: input.expectedRevision,
    eventType: "SET_COMPLETED",
    exerciseId: "squat-a",
    exerciseName: "Squat",
    setIndex: input.setIndex,
    reps: 8,
  };
  return {
    schemaVersion: 1,
    operationId: input.operationId,
    idempotencyKey: input.idempotencyKey,
    payloadHash: sha256(payload),
    deviceId: "phone-a",
    deviceSessionId: "device-session-a",
    sourcePlatform: "ANDROID",
    entityType: "workout_session",
    entityId: "session-a",
    operation: "WORKOUT_EVENT",
    expectedEntityRevision: input.expectedRevision,
    clientSequence: input.sequence,
    occurredAtUtc: now().toISOString(),
    occurredLocalDate: "2026-09-01",
    timezone: "UTC",
    payload,
  };
}

async function setup() {
  const repository = new MemoryRepository();
  await repository.createOwned("device", "user-a", "phone-a", {
    deviceId: "phone-a", userId: "user-a", platform: "ANDROID", deviceClass: "PHONE", appVersion: "1",
  });
  await repository.createOwned("device_session", "user-a", "device-session-a", {
    deviceSessionId: "device-session-a", userId: "user-a", phoneDeviceId: "phone-a", watchDeviceId: "watch-a",
    state: "ACTIVE", issuedAt: now().toISOString(),
  });
  const reconciler = new CanonicalWorkoutReconciler(
    new AppwriteWorkoutStore(repository, { now: () => now().getTime(), idGenerator: () => `event-${repository.tables.get("workout_event")?.size ?? 0}` }),
    repository,
    repository,
    undefined,
    now,
  );
  const startPayload = { idempotencyKey: "start-key", authorityDeviceId: "phone-a", workoutType: "canonical-plan" };
  const start: SyncEnvelope<unknown> = {
    schemaVersion: 1,
    operationId: "start-op",
    idempotencyKey: "start-key",
    payloadHash: sha256(startPayload),
    deviceId: "phone-a",
    deviceSessionId: "device-session-a",
    sourcePlatform: "ANDROID",
    entityType: "workout_session",
    entityId: "session-a",
    operation: "WORKOUT_START",
    expectedEntityRevision: 0,
    clientSequence: 1,
    occurredAtUtc: now().toISOString(),
    occurredLocalDate: "2026-09-01",
    timezone: "UTC",
    payload: startPayload,
  };
  const started = await reconciler.reconcile("user-a", start);
  assert.equal(started.outcome, "ACCEPTED");
  return { repository, reconciler };
}

test("reused canonical operationId with a new idempotency key is rejected before workout mutation", async () => {
  const { repository, reconciler } = await setup();
  const first = await reconciler.reconcile("user-a", envelope({
    operationId: "shared-operation",
    idempotencyKey: "set-key-a",
    expectedRevision: 1,
    sequence: 2,
    setIndex: 1,
  }));
  assert.equal(first.outcome, "ACCEPTED");
  assert.equal(first.canonicalRevision, 2);

  const beforeSession = await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a");
  const beforeEventCount = repository.tables.get("workout_event")?.size ?? 0;
  const beforeRevisionRows = repository.tables.get("workout_session_revision")?.size ?? 0;

  const reused = await reconciler.reconcile("user-a", envelope({
    operationId: "shared-operation",
    idempotencyKey: "set-key-b",
    expectedRevision: 2,
    sequence: 3,
    setIndex: 2,
  }));

  assert.equal(reused.outcome, "REJECTED");
  assert.equal(reused.errorCode, "OPERATION_ID_REUSED");
  assert.equal(reused.retryClass, "FAILED_FINAL");

  const afterSession = await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a");
  assert.equal(afterSession?.currentRevision, beforeSession?.currentRevision, "operation-id collision must not advance canonical revision");
  assert.equal(repository.tables.get("workout_event")?.size ?? 0, beforeEventCount, "operation-id collision must not persist a workout event");
  assert.equal(repository.tables.get("workout_session_revision")?.size ?? 0, beforeRevisionRows, "operation-id collision must not persist a session revision");
});

test("same canonical operation and idempotency still replays the persisted receipt", async () => {
  const { reconciler } = await setup();
  const original = envelope({ operationId: "stable-operation", idempotencyKey: "stable-key", expectedRevision: 1, sequence: 2, setIndex: 1 });
  const first = await reconciler.reconcile("user-a", original);
  const duplicate = await reconciler.reconcile("user-a", structuredClone(original));
  assert.equal(first.outcome, "ACCEPTED");
  assert.equal(duplicate.outcome, "DUPLICATE");
  assert.equal(duplicate.canonicalRevision, first.canonicalRevision);
});
