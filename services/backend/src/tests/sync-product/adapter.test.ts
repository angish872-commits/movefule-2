import assert from "node:assert/strict";
import test from "node:test";
import { sha256 } from "../../domain/sync-store.ts";
import { SyncProductAdapter } from "../../sync/adapter.ts";
import { SyncProductStore } from "../../sync/product-store.ts";
import { OfflineRetryPolicy } from "../../sync/retry-policy.ts";

const summary = (revision: number) => ({
  schemaVersion: 1 as const,
  source: "MOVEFUEL" as const,
  summaryId: "summary-sync-1",
  revision,
  updatedAtEpochMillis: 1_700_000_000_000 + revision,
  energyKcal: 400 + revision,
  energyGoalKcal: 2_000,
  proteinGrams: 25 + revision,
  proteinGoalGrams: 120,
  movementMinutes: 10 + revision,
  movementGoalMinutes: 30,
  workoutState: "IDLE" as const,
});

const operation = (revision: number, idempotencyKey = `summary-op-${revision}`) => ({
  operationId: idempotencyKey,
  entityType: "daily_summary" as const,
  entityId: "summary-sync-1",
  entityRevision: revision,
  operationType: revision === 0 ? "create" as const : "append_revision" as const,
  idempotencyKey,
  payload: summary(revision),
  payloadHash: sha256(summary(revision)),
});

test("sync adapter isolates users and returns accepted, duplicate, and older outcomes", () => {
  const adapter = new SyncProductAdapter();
  const first = adapter.push("user-a", { schemaVersion: 1, deviceId: "phone-a", operations: [operation(1)] });
  assert.equal(first.results[0]?.status, "accepted");

  const duplicate = adapter.push("user-a", {
    schemaVersion: 1,
    deviceId: "phone-a",
    operations: [operation(1, "summary-op-duplicate")],
  });
  assert.equal(duplicate.results[0]?.status, "duplicate");

  const older = adapter.push("user-a", {
    schemaVersion: 1,
    deviceId: "phone-a",
    operations: [operation(0, "summary-op-old")],
  });
  assert.equal(older.results[0]?.status, "older");

  const userAPull = adapter.pull("user-a", { schemaVersion: 1, deviceId: "phone-a" });
  const userBPull = adapter.pull("user-b", { schemaVersion: 1, deviceId: "phone-a" });
  assert.equal(userAPull.summaries.length, 1);
  assert.equal(userAPull.summaries[0]?.summary.revision, 1);
  assert.equal(userBPull.summaries.length, 0);
});

test("sync adapter rejects malformed operations before they reach the store", () => {
  const adapter = new SyncProductAdapter();
  assert.throws(
    () => adapter.push("user-a", {
      schemaVersion: 1,
      deviceId: "phone-a",
      operations: [{ ...operation(1), operationType: "unsupported" } as never],
    }),
    (error: unknown) => error instanceof Error && error.message.includes("operationType is unsupported"),
  );
});

test("offline queue uses bounded exponential retry and completes terminal results", () => {
  const adapter = new SyncProductAdapter({
    retryPolicy: new OfflineRetryPolicy({ maxAttempts: 2, baseDelayMillis: 100, maxDelayMillis: 250 }),
  });
  const queued = adapter.enqueueOffline(operation(1), 1_000);
  assert.equal(queued.state, "PENDING");
  assert.equal(adapter.offlineQueue.due(1_000).length, 1);

  const retried = adapter.offlineQueue.applyResult("summary-op-1", {
    operationId: "summary-op-1",
    idempotencyKey: "summary-op-1",
    status: "rejected",
    errorCode: "network_error",
  }, 1_000);
  assert.equal(retried.state, "PENDING");
  assert.equal(retried.attemptCount, 1);
  assert.equal(retried.nextAttemptAtEpochMillis, 1_100);
  assert.equal(adapter.offlineQueue.due(1_099).length, 0);

  const completed = adapter.offlineQueue.applyResult("summary-op-1", {
    operationId: "summary-op-1",
    idempotencyKey: "summary-op-1",
    status: "accepted",
  }, 1_100);
  assert.equal(completed.state, "COMPLETED");
});

test("watch delivery is not acknowledged by transport send and receipts are idempotent", () => {
  const adapter = new SyncProductAdapter();
  const request = {
    summary: summary(2),
    phoneDeviceId: "phone-a",
    watchDeviceId: "watch-a",
  };
  const created = adapter.createWatchDelivery("user-a", request);
  const replayed = adapter.createWatchDelivery("user-a", request);
  assert.equal(created.created, true);
  assert.equal(replayed.created, false);
  assert.equal(replayed.delivery.deliveryId, created.delivery.deliveryId);

  const sent = adapter.markWatchAttempt("user-a", created.delivery.deliveryId, 1_700_000_000_001);
  assert.equal(sent.state, "SENT");
  assert.equal(adapter.listWatchDeliveries("user-a", "watch-a")[0]?.state, "SENT");

  const receiptRequest = {
    deliveryId: created.delivery.deliveryId,
    summaryId: "summary-sync-1",
    revision: 2,
    watchDeviceId: "watch-a",
    result: "PERSISTED" as const,
    receivedAtEpochMillis: 1_700_000_000_002,
  };
  const accepted = adapter.recordWatchReceipt("user-a", receiptRequest);
  const duplicate = adapter.recordWatchReceipt("user-a", receiptRequest);
  assert.equal(accepted.outcome, "ACCEPTED");
  assert.equal(duplicate.outcome, "DUPLICATE");
  assert.equal(adapter.listWatchDeliveries("user-a", "watch-a")[0]?.state, "ACKNOWLEDGED");

  const stale = adapter.recordWatchReceipt("user-a", { ...receiptRequest, revision: 1, receivedAtEpochMillis: 1_700_000_000_003 });
  assert.equal(stale.outcome, "STALE");
  const staleRetry = adapter.recordWatchReceipt("user-a", { ...receiptRequest, revision: 1, receivedAtEpochMillis: 1_700_000_000_004 });
  assert.equal(staleRetry.outcome, "DUPLICATE");
  assert.throws(() => adapter.recordWatchReceipt("user-b", receiptRequest), /Watch delivery was not found/);
});

test("workout lifecycle enforces authority, revisions, legal transitions, and elapsed active time", () => {
  let nextId = 0;
  const adapter = new SyncProductAdapter({
    productStore: new SyncProductStore({ idGenerator: () => `id-${++nextId}` }),
  });

  const started = adapter.startWorkout("user-a", {
    idempotencyKey: "workout-start-1",
    authorityDeviceId: "phone-a",
    workoutType: "walk",
    occurredAtEpochMillis: 1_000,
  });
  assert.equal(started.session.state, "PREPARING");
  assert.equal(started.session.currentRevision, 1);
  const duplicate = adapter.startWorkout("user-a", {
    idempotencyKey: "workout-start-1",
    authorityDeviceId: "phone-a",
    workoutType: "walk",
    occurredAtEpochMillis: 1_000,
  });
  assert.equal(duplicate.outcome, "DUPLICATE");

  const sessionId = started.session.sessionId;
  const active = adapter.transitionWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-active-1",
    authorityDeviceId: "phone-a",
    action: "start",
    expectedRevision: 1,
    occurredAtEpochMillis: 1_100,
  });
  assert.equal(active.session.state, "ACTIVE");
  assert.throws(() => adapter.transitionWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-wrong-device",
    authorityDeviceId: "watch-a",
    action: "pause",
    expectedRevision: 2,
    occurredAtEpochMillis: 2_000,
  }), /authority device/);

  const paused = adapter.transitionWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-pause-1",
    authorityDeviceId: "phone-a",
    action: "pause",
    expectedRevision: 2,
    occurredAtEpochMillis: 4_100,
  });
  assert.equal(paused.session.state, "PAUSED");
  assert.equal(paused.session.elapsedSeconds, 3);

  const resumed = adapter.transitionWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-resume-1",
    authorityDeviceId: "phone-a",
    action: "resume",
    expectedRevision: 3,
    occurredAtEpochMillis: 5_100,
  });
  assert.equal(resumed.session.state, "ACTIVE");

  const ending = adapter.transitionWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-end-1",
    authorityDeviceId: "phone-a",
    action: "end",
    expectedRevision: 4,
    occurredAtEpochMillis: 7_100,
  });
  assert.equal(ending.session.state, "ENDING");
  assert.equal(ending.session.elapsedSeconds, 5);

  const completed = adapter.completeWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-complete-1",
    authorityDeviceId: "phone-a",
    expectedRevision: 5,
    occurredAtEpochMillis: 8_100,
    summary: { distanceMeters: 900 },
  });
  assert.equal(completed.session.state, "COMPLETED");
  assert.equal(completed.session.elapsedSeconds, 5);
  assert.throws(() => adapter.completeWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-complete-stale",
    authorityDeviceId: "phone-a",
    expectedRevision: 5,
    occurredAtEpochMillis: 8_200,
  }), /stale/);
});
