import assert from "node:assert/strict";
import test from "node:test";
import { sha256, SyncStore } from "../domain/sync-store.ts";

const summary = (revision: number) => ({
  schemaVersion: 1 as const,
  source: "MOVEFUEL" as const,
  summaryId: "summary-1",
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

const operation = (revision: number, key = `op-${revision}`) => ({
  payload: summary(revision),
  operationId: key,
  entityType: "daily_summary" as const,
  entityId: "summary-1",
  entityRevision: revision,
  operationType: revision === 0 ? "create" as const : "append_revision" as const,
  idempotencyKey: key,
  payloadHash: sha256(summary(revision)),
});

test("accepts a newer summary and exposes it through pull", () => {
  const store = new SyncStore();
  const pushed = store.push("user-a", "device-a", [operation(1)]);
  assert.equal(pushed.results[0]?.status, "accepted");
  assert.equal(pushed.results[0]?.receipt?.outcome, "ACCEPTED");

  const pulled = store.pull("user-a", "device-a");
  assert.equal(pulled.summaries.length, 1);
  assert.equal(pulled.summaries[0]?.summary.revision, 1);
  assert.equal(pulled.cursor, 1);
});

test("duplicate and older revisions never replace last known good data", () => {
  const store = new SyncStore();
  store.push("user-a", "device-a", [operation(2)]);
  const duplicate = store.push("user-a", "device-a", [operation(2, "op-duplicate")]);
  const older = store.push("user-a", "device-a", [operation(1)]);

  assert.equal(duplicate.results[0]?.status, "duplicate");
  assert.equal(older.results[0]?.status, "older");
  assert.equal(store.pull("user-a", "device-a").summaries[0]?.summary.revision, 2);
});

test("reusing an idempotency key with a different request is rejected", () => {
  const store = new SyncStore();
  store.push("user-a", "device-a", [operation(1, "same-key")]);
  const changed = { ...operation(2, "same-key"), entityId: "different-summary" };
  const result = store.push("user-a", "device-a", [changed]);
  assert.equal(result.results[0]?.status, "rejected");
  assert.equal(result.results[0]?.errorCode, "idempotency_key_reused");
});

test("rejects invalid source and preserves the accepted summary", () => {
  const store = new SyncStore();
  store.push("user-a", "device-a", [operation(1)]);
  const invalid = { ...operation(2), payload: { ...summary(2), source: "REAL_HEALTH" } };
  const result = store.push("user-a", "device-a", [invalid]);
  assert.equal(result.results[0]?.status, "rejected");
  assert.equal(store.pull("user-a", "device-a").summaries[0]?.summary.revision, 1);
});

test("rejects a payload whose integrity hash does not match", () => {
  const store = new SyncStore();
  const invalid = { ...operation(1), payloadHash: "not-the-payload-hash" };
  const result = store.push("user-a", "device-a", [invalid]);
  assert.equal(result.results[0]?.status, "rejected");
  assert.equal(result.results[0]?.errorCode, "payload_hash_mismatch");
});
