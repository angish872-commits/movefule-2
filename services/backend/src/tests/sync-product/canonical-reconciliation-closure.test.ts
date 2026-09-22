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
import type { ConfirmedMeal } from "../../meal/contracts.ts";
import { AppwriteConfirmedMealStore } from "../../meal/confirmed-meals.ts";
import { AppwriteWorkoutStore } from "../../sync/appwrite-workout-store.ts";
import { CanonicalMealReconciler } from "../../sync/canonical-meal-reconciler.ts";
import { CanonicalWorkoutReconciler } from "../../sync/canonical-workout-reconciler.ts";
import { ContractError } from "../../shared/contracts.ts";
import type { SyncEnvelope } from "../../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

class MemoryCanonicalRepository implements OwnerScopedRepository, ServerOwnedRepository {
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
    let rows = [...this.table(tableId).values()]
      .filter((row) => row.userId === userId)
      .filter((row) => (options.queries ?? []).every((query) => {
        const value = row[query.field];
        return query.operator !== "equal" || value === query.value;
      }))
      .slice(0, options.limit ?? 100) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  private get<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
  ): RepositoryRow<T> | null {
    const row = this.table(tableId).get(rowId);
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  private create<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: T,
  ): RepositoryRow<T> {
    const table = this.table(tableId);
    if (table.has(rowId)) throw new Error("duplicate_row");
    const row = { ...data, userId, $id: rowId } as RepositoryRow<T>;
    table.set(rowId, row as AnyRow);
    return row;
  }

  private update<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: Partial<T>,
  ): RepositoryRow<T> {
    const current = this.get<T>(tableId, userId, rowId);
    if (!current) throw new Error("missing_row");
    const row = { ...current, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.table(tableId).set(rowId, row as AnyRow);
    return row;
  }

  async listOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options?: RepositoryListOptions) {
    return this.list<T>(tableId, userId, options);
  }
  async getOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string) {
    return this.get<T>(tableId, userId, rowId);
  }
  async createOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T) {
    return this.create(tableId, userId, rowId, data);
  }
  async updateOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>) {
    return this.update(tableId, userId, rowId, data);
  }
  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string) {
    if (!this.get(tableId, userId, rowId)) throw new Error("missing_row");
    this.table(tableId).delete(rowId);
  }
  async listForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options?: RepositoryListOptions) {
    return this.list<T>(tableId, userId, options);
  }
  async getForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string) {
    return this.get<T>(tableId, userId, rowId);
  }
  async createForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T) {
    return this.create(tableId, userId, rowId, data);
  }
  async updateForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>) {
    return this.update(tableId, userId, rowId, data);
  }
}

const now = () => new Date("2026-08-29T16:00:00.000Z");

async function authorizedRepository(): Promise<MemoryCanonicalRepository> {
  const repository = new MemoryCanonicalRepository();
  await repository.createOwned("device", "user-a", "phone-a", {
    deviceId: "phone-a", userId: "user-a", platform: "ANDROID", deviceClass: "PHONE", appVersion: "1",
  });
  await repository.createOwned("device_session", "user-a", "device-session-a", {
    deviceSessionId: "device-session-a", userId: "user-a", phoneDeviceId: "phone-a",
    watchDeviceId: "watch-a", state: "ACTIVE", issuedAt: now().toISOString(),
  });
  return repository;
}

function syncEnvelope(
  operationId: string,
  operation: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
  expectedEntityRevision: number | null,
  clientSequence: number | null,
): SyncEnvelope<unknown> {
  return {
    schemaVersion: 1,
    operationId,
    idempotencyKey: operationId,
    payloadHash: sha256(payload),
    deviceId: "phone-a",
    deviceSessionId: "device-session-a",
    sourcePlatform: "WEAR_OS",
    entityType,
    entityId,
    operation,
    expectedEntityRevision,
    clientSequence,
    occurredAtUtc: "2026-08-29T15:59:00.000Z",
    occurredLocalDate: "2026-08-29",
    timezone: "UTC",
    payload,
  };
}

async function activeWorkout() {
  const repository = await authorizedRepository();
  const reconciler = new CanonicalWorkoutReconciler(
    new AppwriteWorkoutStore(repository, { now: () => now().getTime(), idGenerator: () => "unexpected-id" }),
    repository,
    repository,
    undefined,
    now,
  );
  const payload = {
    idempotencyKey: "workout-start",
    authorityDeviceId: "phone-a",
    workoutType: "watch-plan",
  };
  const start = syncEnvelope("workout-start", "WORKOUT_START", "workout_session", "session-a", payload, 0, 1);
  const accepted = await reconciler.reconcile("user-a", start);
  assert.equal(accepted.outcome, "ACCEPTED");
  assert.equal(accepted.canonicalRevision, 1);
  return { repository, reconciler };
}

test("duplicate workout event replays the persisted server receipt after a lost response", async () => {
  const { repository, reconciler } = await activeWorkout();
  const payload = {
    sessionId: "session-a", idempotencyKey: "set-1", authorityDeviceId: "phone-a",
    expectedRevision: 1, eventType: "SET_COMPLETED", exerciseId: "squat", exerciseName: "Squat", setIndex: 1,
  };
  const envelope = syncEnvelope("set-1", "WORKOUT_EVENT", "workout_session", "session-a", payload, 1, 2);
  const first = await reconciler.reconcile("user-a", envelope);
  const replay = await new CanonicalWorkoutReconciler(
    new AppwriteWorkoutStore(repository, { now: () => now().getTime() }),
    repository, repository, undefined, now,
  ).reconcile("user-a", envelope);
  assert.equal(first.outcome, "ACCEPTED");
  assert.equal(replay.outcome, "DUPLICATE");
  assert.equal(replay.canonicalRevision, first.canonicalRevision);
  assert.equal(repository.tables.get("sync_operation")?.size, 2, "start plus one event journal row");
  assert.equal(repository.tables.get("workout_session_revision")?.size, 2);
});

test("stale workout revision and invalid event order have canonical retry classes", async () => {
  const { reconciler } = await activeWorkout();
  const stalePayload = {
    sessionId: "session-a", idempotencyKey: "stale-set", authorityDeviceId: "phone-a",
    expectedRevision: 0, eventType: "SET_COMPLETED", exerciseId: "squat", exerciseName: "Squat", setIndex: 1,
  };
  const stale = await reconciler.reconcile("user-a",
    syncEnvelope("stale-set", "WORKOUT_EVENT", "workout_session", "session-a", stalePayload, 0, 2));
  assert.equal(stale.outcome, "STALE_REVISION");
  assert.equal(stale.retryClass, "REQUIRES_REFRESH");

  const orderPayload = { ...stalePayload, idempotencyKey: "out-of-order", expectedRevision: 1 };
  const invalid = await reconciler.reconcile("user-a",
    syncEnvelope("out-of-order", "WORKOUT_EVENT", "workout_session", "session-a", orderPayload, 1, 9));
  assert.equal(invalid.outcome, "INVALID_EVENT_ORDER");
  assert.equal(invalid.retryClass, "RETRYABLE");
});

test("revoked device and cross-user mutation fail before canonical mutation", async () => {
  const { repository, reconciler } = await activeWorkout();
  const payload = {
    sessionId: "session-a", idempotencyKey: "cross-user", authorityDeviceId: "phone-a",
    expectedRevision: 1, eventType: "SET_COMPLETED", exerciseId: "squat", exerciseName: "Squat", setIndex: 1,
  };
  await assert.rejects(
    reconciler.reconcile("user-b", syncEnvelope("cross-user", "WORKOUT_EVENT", "workout_session", "session-a", payload, 1, 2)),
    (error: unknown) => error instanceof ContractError && error.code === "AUTHORITY_REVOKED",
  );
  await repository.updateOwned("device", "user-a", "phone-a", { revokedAt: now().toISOString() });
  await assert.rejects(
    reconciler.reconcile("user-a", syncEnvelope("revoked", "WORKOUT_EVENT", "workout_session", "session-a",
      { ...payload, idempotencyKey: "revoked" }, 1, 2)),
    (error: unknown) => error instanceof ContractError && error.code === "AUTHORITY_REVOKED",
  );
  assert.equal((await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a"))?.currentRevision, 1);
});

function meal(): ConfirmedMeal {
  return {
    mealId: "meal-a", userId: "user-a", localDate: "2026-08-29", mealType: "lunch",
    status: "CONFIRMED", currentRevision: 1, sourceDraftId: "draft-a",
    items: [{ itemId: "item-a", displayName: "Meal", portionGrams: 100, energyKcal: 200,
      proteinGrams: 10, carbGrams: 20, fatGrams: 5, fiberGrams: 3, confidence: "medium",
      energyRangeKcal: { min: 180, max: 220 } }],
    totals: { energyKcal: 200, proteinGrams: 10, carbGrams: 20, fatGrams: 5, fiberGrams: 3 },
    confirmedAtEpochMillis: now().getTime(), createdAtEpochMillis: now().getTime(), updatedAtEpochMillis: now().getTime(),
  };
}

test("stale meal correction is rejected and a deleted meal cannot be resurrected", async () => {
  const repository = await authorizedRepository();
  const store = new AppwriteConfirmedMealStore(repository, repository, { now: () => now().getTime() });
  await store.persist("user-a", meal());
  const reconciler = new CanonicalMealReconciler(store, repository, repository, undefined, now);

  const stalePayload = { mealId: "meal-a", idempotencyKey: "stale-correction", expectedRevision: 0, items: meal().items };
  const stale = await reconciler.reconcile("user-a",
    syncEnvelope("stale-correction", "MEAL_CORRECT", "meal", "meal-a", stalePayload, 0, null));
  assert.equal(stale.outcome, "STALE_REVISION");

  const deletePayload = { mealId: "meal-a", idempotencyKey: "delete-meal", expectedRevision: 1, reasonCode: "USER_DELETE" };
  const deleted = await reconciler.reconcile("user-a",
    syncEnvelope("delete-meal", "MEAL_DELETE", "meal", "meal-a", deletePayload, 1, null));
  assert.equal(deleted.outcome, "ACCEPTED");
  assert.equal(deleted.canonicalRevision, 2);

  const replayPayload = { idempotencyKey: "resurrect-attempt" };
  const resurrect = await reconciler.reconcile("user-a",
    syncEnvelope("resurrect-attempt", "MEAL_CONFIRM_REPLAY", "meal", "meal-a", replayPayload, 2, null));
  assert.equal(resurrect.outcome, "DEPENDENCY_CHANGED");
  assert.equal(resurrect.errorCode, "MEAL_TOMBSTONED");
  assert.equal((await store.get("user-a", "meal-a"))?.status, "DELETED");
});

test("duplicate meal mutation replays without another revision", async () => {
  const repository = await authorizedRepository();
  const store = new AppwriteConfirmedMealStore(repository, repository, { now: () => now().getTime() });
  await store.persist("user-a", meal());
  const reconciler = new CanonicalMealReconciler(store, repository, repository, undefined, now);
  const payload = { mealId: "meal-a", idempotencyKey: "delete-meal", expectedRevision: 1 };
  const envelope = syncEnvelope("delete-meal", "MEAL_DELETE", "meal", "meal-a", payload, 1, null);
  const first = await reconciler.reconcile("user-a", envelope);
  const duplicate = await reconciler.reconcile("user-a", envelope);
  assert.equal(first.outcome, "ACCEPTED");
  assert.equal(duplicate.outcome, "DUPLICATE");
  assert.equal(duplicate.canonicalRevision, 2);
  assert.equal(repository.tables.get("meal_revision")?.size, 2);
});
