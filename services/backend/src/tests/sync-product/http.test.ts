import assert from "node:assert/strict";
import test from "node:test";
import { createSyncProductServer } from "../../http/sync-routes.ts";
import { sha256 } from "../../domain/sync-store.ts";
import { SyncProductAdapter } from "../../sync/adapter.ts";

const summary = (revision: number) => ({
  schemaVersion: 1 as const,
  source: "MOVEFUEL" as const,
  summaryId: "summary-http-1",
  revision,
  updatedAtEpochMillis: 1_700_000_000_000 + revision,
  energyKcal: 500,
  energyGoalKcal: 2_000,
  proteinGrams: 30,
  proteinGoalGrams: 120,
  movementMinutes: 12,
  movementGoalMinutes: 30,
  workoutState: "IDLE" as const,
});

const operation = (revision: number) => ({
  operationId: `http-op-${revision}`,
  entityType: "daily_summary" as const,
  entityId: "summary-http-1",
  entityRevision: revision,
  operationType: "append_revision" as const,
  idempotencyKey: `http-op-${revision}`,
  payload: summary(revision),
  payloadHash: sha256(summary(revision)),
});

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createSyncProductServer({ environment: "local", adapter: new SyncProductAdapter() });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP address.");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function jsonRequest(baseUrl: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (!headers.has("authorization")) headers.set("authorization", "Bearer local-user:user-http");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  return { status: response.status, body: await response.json() as Record<string, any> };
}

test("standalone sync routes expose envelopes, auth, cursor pull, watch receipt, and workout lifecycle", async () => {
  await withServer(async (baseUrl) => {
    const unauthorized = await jsonRequest(baseUrl, "/v1/sync/pull", {
      method: "POST",
      headers: { authorization: "" },
      body: JSON.stringify({ schemaVersion: 1, deviceId: "phone-a" }),
    });
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.body.error.code, "unauthenticated");
    assert.equal(typeof unauthorized.body.correlationId, "string");

    const pushed = await jsonRequest(baseUrl, "/v1/sync/push", {
      method: "POST",
      body: JSON.stringify({ schemaVersion: 1, deviceId: "phone-a", operations: [operation(1)] }),
    });
    assert.equal(pushed.status, 200);
    assert.equal(pushed.body.data.results[0].status, "accepted");
    assert.equal(pushed.body.error, null);

    const pulled = await jsonRequest(baseUrl, "/v1/sync/pull", {
      method: "POST",
      body: JSON.stringify({ schemaVersion: 1, deviceId: "phone-a" }),
    });
    assert.equal(pulled.status, 200);
    assert.equal(pulled.body.data.summaries[0].summary.revision, 1);
    assert.equal(pulled.body.data.cursor, 1);

    const created = await jsonRequest(baseUrl, "/v1/watch/deliveries", {
      method: "POST",
      body: JSON.stringify({ summary: summary(1), phoneDeviceId: "phone-a", watchDeviceId: "watch-a" }),
    });
    assert.equal(created.status, 201);
    const deliveryId = created.body.data.delivery.deliveryId;

    const sent = await jsonRequest(baseUrl, `/v1/watch/deliveries/${deliveryId}/attempt`, {
      method: "POST",
      body: JSON.stringify({ attemptedAtEpochMillis: 1_700_000_000_010 }),
    });
    assert.equal(sent.body.data.state, "SENT");

    const receipt = await jsonRequest(baseUrl, "/v1/watch/receipts", {
      method: "POST",
      body: JSON.stringify({
        deliveryId,
        summaryId: "summary-http-1",
        revision: 1,
        watchDeviceId: "watch-a",
        result: "PERSISTED",
        receivedAtEpochMillis: 1_700_000_000_011,
      }),
    });
    assert.equal(receipt.status, 200);
    assert.equal(receipt.body.data.outcome, "ACCEPTED");

    const started = await jsonRequest(baseUrl, "/v1/workouts/start", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "http-workout-start",
        authorityDeviceId: "phone-a",
        workoutType: "walk",
        occurredAtEpochMillis: 1_000,
      }),
    });
    assert.equal(started.status, 201);
    const sessionId = started.body.data.session.sessionId;

    const active = await jsonRequest(baseUrl, `/v1/workouts/${sessionId}/transition`, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "http-workout-active",
        authorityDeviceId: "phone-a",
        action: "start",
        expectedRevision: 1,
        occurredAtEpochMillis: 1_100,
      }),
    });
    assert.equal(active.body.data.session.state, "ACTIVE");

    const ending = await jsonRequest(baseUrl, `/v1/workouts/${sessionId}/transition`, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "http-workout-end",
        authorityDeviceId: "phone-a",
        action: "end",
        expectedRevision: 2,
        occurredAtEpochMillis: 2_100,
      }),
    });
    assert.equal(ending.body.data.session.state, "ENDING");

    const completed = await jsonRequest(baseUrl, `/v1/workouts/${sessionId}/complete`, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "http-workout-complete",
        authorityDeviceId: "phone-a",
        expectedRevision: 3,
        occurredAtEpochMillis: 2_200,
      }),
    });
    assert.equal(completed.status, 200);
    assert.equal(completed.body.data.session.state, "COMPLETED");


    const listed = await jsonRequest(baseUrl, "/v1/workouts?state=COMPLETED&limit=20", { method: "GET" });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data.sessions.length, 1);
    assert.equal(listed.body.data.sessions[0].sessionId, sessionId);
    assert.equal(listed.body.data.sessions[0].state, "COMPLETED");
  });
});

test("route errors are structured and invalid cursors do not mutate sync state", async () => {
  await withServer(async (baseUrl) => {
    const invalid = await jsonRequest(baseUrl, "/v1/sync/pull", {
      method: "POST",
      body: JSON.stringify({ schemaVersion: 1, deviceId: "phone-a", cursor: -1 }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.data, null);
    assert.equal(invalid.body.error.code, "invalid_cursor");
    assert.equal(invalid.body.error.retryable, false);
  });
});

