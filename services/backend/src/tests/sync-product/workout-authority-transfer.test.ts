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
import { ContractError } from "../../shared/contracts.ts";
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
  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string) { if (!this.get(tableId, userId, rowId)) throw new Error("missing_row"); this.table(tableId).delete(rowId); }
  async listForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options?: RepositoryListOptions) { return this.list<T>(tableId, userId, options); }
  async getForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string) { return this.get<T>(tableId, userId, rowId); }
  async createForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T) { return this.create(tableId, userId, rowId, data); }
  async updateForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>) { return this.update(tableId, userId, rowId, data); }
}

const now = () => new Date("2026-08-30T04:00:00.000Z");

async function seededRepository(): Promise<MemoryRepository> {
  const repository = new MemoryRepository();
  await repository.createOwned("device", "user-a", "phone-a", {
    deviceId: "phone-a", userId: "user-a", platform: "ANDROID", deviceClass: "PHONE", appVersion: "1",
  });
  await repository.createOwned("device", "user-a", "watch-a", {
    deviceId: "watch-a", userId: "user-a", platform: "WEAR_OS", deviceClass: "WATCH", appVersion: "1",
  });
  await repository.createOwned("device_session", "user-a", "device-session-a", {
    deviceSessionId: "device-session-a", userId: "user-a", phoneDeviceId: "phone-a", watchDeviceId: "watch-a",
    state: "ACTIVE", issuedAt: now().toISOString(),
  });
  return repository;
}

function envelope(
  operationId: string,
  deviceId: "phone-a" | "watch-a",
  operation: string,
  payload: Record<string, unknown>,
  expectedRevision: number | null,
  clientSequence: number | null,
): SyncEnvelope<unknown> {
  return {
    schemaVersion: 1,
    operationId,
    idempotencyKey: operationId,
    payloadHash: sha256(payload),
    deviceId,
    deviceSessionId: "device-session-a",
    sourcePlatform: deviceId === "watch-a" ? "WEAR_OS" : "ANDROID",
    entityType: "workout_session",
    entityId: "session-a",
    operation,
    expectedEntityRevision: expectedRevision,
    clientSequence,
    occurredAtUtc: "2026-08-30T03:59:00.000Z",
    occurredLocalDate: "2026-08-30",
    timezone: "UTC",
    payload,
  };
}

function reconciler(repository: MemoryRepository): CanonicalWorkoutReconciler {
  return new CanonicalWorkoutReconciler(
    new AppwriteWorkoutStore(repository, { now: () => now().getTime(), idGenerator: () => `id-${repository.tables.get("workout_event")?.size ?? 0}` }),
    repository,
    repository,
    undefined,
    now,
  );
}

async function startOnPhone(repository: MemoryRepository, sync = reconciler(repository)): Promise<CanonicalWorkoutReconciler> {
  const payload = {
    idempotencyKey: "start-a",
    authorityDeviceId: "phone-a",
    workoutType: "canonical-plan",
    planRevisionId: "plan-revision-a",
  };
  const receipt = await sync.reconcile("user-a", envelope("start-a", "phone-a", "WORKOUT_START", payload, 0, 1));
  assert.equal(receipt.outcome, "ACCEPTED");
  assert.equal(receipt.canonicalRevision, 1);
  const session = await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a");
  assert.equal(session?.authorityDeviceId, "phone-a");
  assert.equal(session?.planRevisionId, "plan-revision-a", "Watch never creates or replaces canonical plan identity");
  return sync;
}

function setPayload(idempotencyKey: string, authorityDeviceId: string, expectedRevision: number, setIndex: number) {
  return {
    sessionId: "session-a",
    idempotencyKey,
    authorityDeviceId,
    expectedRevision,
    eventType: "SET_COMPLETED",
    exerciseId: "squat-a",
    exerciseName: "Squat",
    setIndex,
    reps: 8,
  };
}

test("Phone to Watch authority is explicit, offline replay is idempotent, stale sources cannot overwrite, and completion is canonical once", async () => {
  const repository = await seededRepository();
  const sync = await startOnPhone(repository);

  const unauthorizedPayload = setPayload("watch-before-authority", "watch-a", 1, 1);
  const unauthorized = await sync.reconcile("user-a", envelope("watch-before-authority", "watch-a", "WORKOUT_EVENT", unauthorizedPayload, 1, 2));
  assert.equal(unauthorized.outcome, "REJECTED");
  assert.equal(unauthorized.errorCode, "AUTHORITY_DEVICE_MISMATCH");
  assert.equal((await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a"))?.currentRevision, 1);

  const transferPayload = {
    sessionId: "session-a",
    idempotencyKey: "transfer-to-watch",
    authorityDeviceId: "phone-a",
    targetAuthorityDeviceId: "watch-a",
    expectedRevision: 1,
    reason: "USER_STARTED_WATCH_EXECUTION",
  };
  const transfer = await sync.reconcile("user-a", envelope("transfer-to-watch", "phone-a", "WORKOUT_AUTHORITY_TRANSFER", transferPayload, 1, null));
  assert.equal(transfer.outcome, "ACCEPTED");
  assert.equal(transfer.canonicalRevision, 2);
  const transferred = await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a");
  assert.equal(transferred?.authorityDeviceId, "watch-a");
  assert.equal(transferred?.planRevisionId, "plan-revision-a");

  const transferRevision = [...(repository.tables.get("workout_session_revision")?.values() ?? [])]
    .find((row) => row.revision === 2);
  assert.equal(transferRevision?.sourceDeviceId, "phone-a", "authority-transfer provenance is the actual authorizing Phone");
  assert.equal(transferRevision?.authorityDeviceId, "watch-a", "canonical revision records the newly approved authority");

  // The Watch creates this operation while offline. Nothing canonical changes until reconnect/reconciliation.
  const offlinePayload = setPayload("offline-watch-set", "watch-a", 2, 1);
  const offlineEnvelope = envelope("offline-watch-set", "watch-a", "WORKOUT_EVENT", offlinePayload, 2, 3);
  assert.equal((await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a"))?.currentRevision, 2);

  const replayedAfterReconnect = await sync.reconcile("user-a", offlineEnvelope);
  assert.equal(replayedAfterReconnect.outcome, "ACCEPTED");
  assert.equal(replayedAfterReconnect.canonicalRevision, 3);
  const duplicateReplay = await reconciler(repository).reconcile("user-a", offlineEnvelope);
  assert.equal(duplicateReplay.outcome, "DUPLICATE");
  assert.equal(duplicateReplay.canonicalRevision, 3);

  const exerciseRowsAfterReplay = [...(repository.tables.get("workout_event")?.values() ?? [])]
    .filter((row) => String(row.eventType).includes("SET_COMPLETED"));
  assert.equal(exerciseRowsAfterReplay.length, 1, "offline retry cannot duplicate an accepted set");
  assert.equal(exerciseRowsAfterReplay[0]?.sourceDevice, "watch-a", "durable event preserves actual Watch provenance");

  const oldPhonePayload = setPayload("old-phone-after-transfer", "phone-a", 3, 2);
  const oldPhone = await sync.reconcile("user-a", envelope("old-phone-after-transfer", "phone-a", "WORKOUT_EVENT", oldPhonePayload, 3, 4));
  assert.equal(oldPhone.outcome, "REJECTED");
  assert.equal(oldPhone.errorCode, "AUTHORITY_DEVICE_MISMATCH");
  assert.equal((await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a"))?.currentRevision, 3);

  const nextPayload = setPayload("watch-set-2", "watch-a", 3, 2);
  const next = await sync.reconcile("user-a", envelope("watch-set-2", "watch-a", "WORKOUT_EVENT", nextPayload, 3, 4));
  assert.equal(next.outcome, "ACCEPTED");
  assert.equal(next.canonicalRevision, 4);

  const stalePayload = setPayload("stale-watch-set", "watch-a", 3, 3);
  const stale = await sync.reconcile("user-a", envelope("stale-watch-set", "watch-a", "WORKOUT_EVENT", stalePayload, 3, 5));
  assert.equal(stale.outcome, "STALE_REVISION");
  assert.equal(stale.retryClass, "REQUIRES_REFRESH");
  assert.equal((await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a"))?.currentRevision, 4);

  const completePayload = {
    sessionId: "session-a",
    idempotencyKey: "watch-complete",
    authorityDeviceId: "watch-a",
    expectedRevision: 4,
    summary: { sourcePlatform: "wear_os" },
  };
  const completeEnvelope = envelope("watch-complete", "watch-a", "WORKOUT_COMPLETE", completePayload, 4, null);
  const completed = await sync.reconcile("user-a", completeEnvelope);
  assert.equal(completed.outcome, "ACCEPTED");
  assert.equal(completed.canonicalRevision, 5);
  const completionReplay = await reconciler(repository).reconcile("user-a", completeEnvelope);
  assert.equal(completionReplay.outcome, "DUPLICATE");
  assert.equal(completionReplay.canonicalRevision, 5);
  assert.equal(repository.tables.get("workout_summary")?.size, 1, "canonical completion is persisted exactly once");

  const watchRevision = [...(repository.tables.get("workout_session_revision")?.values() ?? [])]
    .find((row) => row.revision === 3);
  assert.equal(watchRevision?.sourceDeviceId, "watch-a", "canonical reconciliation preserves Watch source provenance");
});

test("revoked Watch cannot receive or exercise canonical authority", async () => {
  const repository = await seededRepository();
  const sync = await startOnPhone(repository);
  await repository.updateOwned("device", "user-a", "watch-a", { revokedAt: now().toISOString() });

  const transferPayload = {
    sessionId: "session-a",
    idempotencyKey: "transfer-revoked-watch",
    authorityDeviceId: "phone-a",
    targetAuthorityDeviceId: "watch-a",
    expectedRevision: 1,
  };
  const rejectedTransfer = await sync.reconcile("user-a", envelope("transfer-revoked-watch", "phone-a", "WORKOUT_AUTHORITY_TRANSFER", transferPayload, 1, null));
  assert.equal(rejectedTransfer.outcome, "AUTHORITY_REVOKED");
  assert.equal((await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a"))?.authorityDeviceId, "phone-a");

  // Simulate a previously authorized Watch being revoked after transfer; the source security gate fails before mutation.
  await repository.updateOwned("device", "user-a", "watch-a", { revokedAt: undefined });
  const transferPayload2 = { ...transferPayload, idempotencyKey: "transfer-valid-watch" };
  const transfer = await sync.reconcile("user-a", envelope("transfer-valid-watch", "phone-a", "WORKOUT_AUTHORITY_TRANSFER", transferPayload2, 1, null));
  assert.equal(transfer.outcome, "ACCEPTED");
  await repository.updateOwned("device", "user-a", "watch-a", { revokedAt: now().toISOString() });

  const eventPayload = setPayload("revoked-watch-set", "watch-a", 2, 1);
  await assert.rejects(
    sync.reconcile("user-a", envelope("revoked-watch-set", "watch-a", "WORKOUT_EVENT", eventPayload, 2, 3)),
    (error: unknown) => error instanceof ContractError && error.code === "AUTHORITY_REVOKED",
  );
  assert.equal((await repository.getOwned<Record<string, unknown>>("workout_session", "user-a", "session-a"))?.currentRevision, 2);
});
