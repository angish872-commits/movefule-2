import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createMoveFuelServer } from "../http/local-server.ts";
import { AppwriteSessionProvider } from "../foundation/session.ts";

const auth = { Authorization: "Bearer local-user:integration-user", "x-device-id": "phone-integration" };

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = createMoveFuelServer({ environment: "local" });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a port.");
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function call(baseUrl: string, path: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...auth, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() as any };
}

async function put(baseUrl: string, path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PUT",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as any };
}

async function saveConfirmedTargets(baseUrl: string) {
  const saved = await put(baseUrl, "/v1/profile", {
    displayName: "Integration User",
    dateOfBirth: "1995-01-01",
    countryRegion: "NP",
    metricUnits: true,
    height: "170",
    weight: "70",
    goal: "Maintain weight",
    activityLevel: "Moderate",
    trainingFrequency: "4 days",
    sexForEnergyEstimation: "Male",
    calorieTarget: "2300",
    proteinTarget: "130",
    dietaryPreferences: "",
    cameraConsent: true,
    healthConsent: true,
    watchConnection: "Galaxy Watch",
    notificationsEnabled: true,
    analyticsAllowed: false,
    completed: true,
  });
  assert.equal(saved.status, 200);
}

test("authenticated onboarding consent choices are versioned, user-scoped, and retry-safe", async () => {
  await withServer(async (baseUrl) => {
    const choices = {
      consents: [
        { consentType: "camera", documentVersion: "onboarding-v1", choice: "GRANTED", sourcePlatform: "android-phone" },
        { consentType: "health", documentVersion: "onboarding-v1", choice: "DENIED", sourcePlatform: "android-phone" },
        { consentType: "analytics", documentVersion: "onboarding-v1", choice: "DENIED", sourcePlatform: "android-phone" },
      ],
    };
    const first = await put(baseUrl, "/v1/consents", choices);
    assert.equal(first.status, 200);
    assert.equal(first.body.data.source, "local_fixture");
    assert.equal(first.body.data.consents.length, 3);
    assert.equal(first.body.data.consents[0].userId, "integration-user");

    const retry = await put(baseUrl, "/v1/consents", choices);
    assert.equal(retry.status, 200);
    assert.deepEqual(
      retry.body.data.consents.map((record: Record<string, unknown>) => record.consentId),
      first.body.data.consents.map((record: Record<string, unknown>) => record.consentId),
    );

    const invalid = await put(baseUrl, "/v1/consents", {
      consents: [{ consentType: "camera", documentVersion: "onboarding-v1", choice: "MAYBE", sourcePlatform: "android-phone" }],
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "invalid_consent_choice");
  });
});

test("authenticated profile writes persist onboarding state behind the owner boundary", async () => {
  await withServer(async (baseUrl) => {
    const saved = await put(baseUrl, "/v1/profile", {
      displayName: "Integration User",
      dateOfBirth: "2008-01-01",
      countryRegion: "NP",
      metricUnits: true,
      height: "170",
      weight: "60",
      goal: "General wellness",
      activityLevel: "Moderate",
      trainingFrequency: "3-4 days",
      sexForEnergyEstimation: "Prefer not to say",
      calorieTarget: "2200",
      proteinTarget: "120",
      dietaryPreferences: "Vegetarian",
      cameraConsent: true,
      healthConsent: false,
      watchConnection: "Phone only",
      notificationsEnabled: true,
      analyticsAllowed: false,
      completed: true,
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.data.source, "local_fixture");
    assert.equal(saved.body.data.profile.displayName, "Integration User");
    assert.equal(saved.body.data.onboarding.currentStep, 18);

    const read = await call(baseUrl, "/v1/profile");
    assert.equal(read.status, 200);
    assert.equal(read.body.data.profile.userId, "integration-user");

    const other = await fetch(`${baseUrl}/v1/profile`, { headers: { Authorization: "Bearer local-user:other-user" } });
    assert.equal(other.status, 404);
    assert.equal((await other.json() as any).error.code, "profile_not_found");
  });
});

test("account export and deletion routes require authentication and explicit confirmation", async () => {
  await withServer(async (baseUrl) => {
    const exported = await call(baseUrl, "/v1/account/export");
    assert.equal(exported.status, 200);
    assert.equal(exported.body.data.source, "local_fixture");
    assert.deepEqual(exported.body.data.tables, {});

    const rejected = await call(baseUrl, "/v1/account/delete", { confirm: false });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.body.error.code, "delete_confirmation_required");

    const deleted = await call(baseUrl, "/v1/account/delete", { confirm: true });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.data.source, "local_fixture");
    assert.equal(deleted.body.data.deletedRows, 0);

    const unauthenticated = await fetch(`${baseUrl}/v1/account/export`);
    assert.equal(unauthenticated.status, 401);
  });
});

test("entitlements expose an explicit mock mode and supported demo state", async () => {
  await withServer(async (baseUrl) => {
    const result = await call(baseUrl, "/v1/entitlements");
    assert.equal(result.status, 200);
    assert.equal(result.body.data.userId, "integration-user");
    assert.equal(result.body.data.provider, "mock");
    assert.equal(result.body.data.mode, "demo");
    assert.equal(result.body.data.state, "FREE");
    assert.equal(result.body.data.premium, false);
  });
});

test("main server exposes an authenticated health projection without storing provider samples", async () => {
  await withServer(async (baseUrl) => {
    const imported = await call(baseUrl, "/v1/health/import", {
      connectionId: "health-connect-integration",
      platform: "android_health_connect",
      sourceName: "Health Connect",
      permissionState: "GRANTED",
      dataType: "steps",
      samples: [{
        localDate: "2026-08-03",
        value: 5000,
        unit: "count",
        measuredStart: "2026-08-03T00:00:00.000Z",
        measuredEnd: "2026-08-03T23:59:59.000Z",
      }],
      cursorToken: "opaque-provider-cursor",
    });
    assert.equal(imported.status, 200);
    assert.equal(imported.body.data.imported, 1);
    assert.equal(imported.body.data.cursorStored, true);
    assert.equal("samples" in imported.body.data, false);

    const connections = await call(baseUrl, "/v1/health/connections");
    assert.equal(connections.status, 200);
    assert.equal(connections.body.data.connections.length, 1);

    const otherUser = await fetch(`${baseUrl}/v1/health/connections`, { headers: { Authorization: "Bearer local-user:other-user" } });
    assert.equal(otherUser.status, 200);
    assert.equal((await otherUser.json() as any).data.connections.length, 0);
    const gap = await call(baseUrl, "/v1/health/gaps?localDate=2026-08-03&dataType=steps&expectedStart=2026-08-03T00:00:00.000Z&expectedEnd=2026-08-03T23:59:59.000Z");
    assert.equal(gap.status, 200);
    assert.equal(gap.body.data.assessment.status, "COVERED");
  });
});

test("main server requires an active phone-watch trust session for watch delivery", async () => {
  await withServer(async (baseUrl) => {
    const denied = await call(baseUrl, "/v1/watch/deliveries", {
      summary: { schemaVersion: 1, source: "MOVEFUEL", summaryId: "trust-summary", revision: 1, updatedAtEpochMillis: 1_754_000_000_001, energyKcal: 100, energyGoalKcal: 2_000, proteinGrams: 10, proteinGoalGrams: 120, movementMinutes: 1, movementGoalMinutes: 30, workoutState: "IDLE" },
      phoneDeviceId: "phone-integration",
      watchDeviceId: "watch-integration",
    });
    assert.equal(denied.status, 400);
    assert.equal(denied.body.error.code, "device_not_trusted");

    const trusted = await call(baseUrl, "/v1/devices/trust", {
      phoneDeviceId: "phone-integration",
      watchDeviceId: "watch-integration",
      idempotencyKey: "trust-integration-1",
    });
    assert.equal(trusted.status, 201);
    const allowed = await call(baseUrl, "/v1/watch/deliveries", {
      summary: { schemaVersion: 1, source: "MOVEFUEL", summaryId: "trust-summary", revision: 1, updatedAtEpochMillis: 1_754_000_000_001, energyKcal: 100, energyGoalKcal: 2_000, proteinGrams: 10, proteinGoalGrams: 120, movementMinutes: 1, movementGoalMinutes: 30, workoutState: "IDLE" },
      phoneDeviceId: "phone-integration",
      watchDeviceId: "watch-integration",
    });
    assert.equal(allowed.status, 201);
  });
});

test("main server queues a trusted watch reconciliation command and acknowledges it", async () => {
  await withServer(async (baseUrl) => {
    const trusted = await call(baseUrl, "/v1/devices/trust", { phoneDeviceId: "phone-integration", watchDeviceId: "watch-command", idempotencyKey: "trust-command-1" });
    assert.equal(trusted.status, 201);
    const queued = await call(baseUrl, "/v1/devices/commands", { idempotencyKey: "command-1", targetDeviceId: "watch-command", commandType: "RECONCILE", objectId: "summary-1", objectRevision: 2 });
    assert.equal(queued.status, 201);
    const commandId = queued.body.data.command.commandId;
    const acknowledged = await call(baseUrl, `/v1/devices/commands/${commandId}/ack`, { result: "ACKNOWLEDGED" });
    assert.equal(acknowledged.status, 200);
    assert.equal(acknowledged.body.data.command.state, "ACKNOWLEDGED");
  });
});

test("main server composes camera meal review confirmation and summary sync", async () => {
  await withServer(async (baseUrl) => {
    await saveConfirmedTargets(baseUrl);
    const draftResponse = await call(baseUrl, "/v1/meals/drafts", {
      localDate: "2026-08-01",
      mealType: "lunch",
      sourceType: "sample",
      note: "fixture:chicken-curry-rice",
    });
    assert.equal(draftResponse.status, 201);
    const draft = draftResponse.body.data.draft;

    const analysisResponse = await call(baseUrl, "/v1/meals/analysis", {
      draftId: draft.draftId,
      idempotencyKey: "integration-analysis-1",
    });
    assert.equal(analysisResponse.status, 200);
    const analysis = analysisResponse.body.data.analysisRequest;
    assert.equal(analysis.state, "COMPLETED");

    const correctedItems = analysis.result.items.map((item: Record<string, unknown>, index: number) =>
      index === 0 ? { ...item, energyKcal: Number(item.energyKcal) + 25 } : item);
    const revisionResponse = await call(baseUrl, `/v1/meals/drafts/${draft.draftId}/revisions`, {
      expectedRevision: 1,
      items: correctedItems,
    });
    assert.equal(revisionResponse.status, 200);
    assert.equal(revisionResponse.body.data.draft.activeRevision, 2);

    const confirmResponse = await call(baseUrl, "/v1/meals/confirm", {
      draftId: draft.draftId,
      idempotencyKey: "integration-confirm-1",
      confirmed: true,
      expectedRevision: 2,
      items: correctedItems,
    });
    assert.equal(confirmResponse.status, 201);
    assert.equal(confirmResponse.body.data.meal.status, "CONFIRMED");
    assert.equal(confirmResponse.body.data.totals.confirmedMealCount, 1);

    const duplicate = await call(baseUrl, "/v1/meals/confirm", {
      draftId: draft.draftId,
      idempotencyKey: "integration-confirm-1",
      confirmed: true,
      expectedRevision: 2,
      items: correctedItems,
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data.status, "DUPLICATE");

    const pull = await call(baseUrl, "/v1/sync/pull", {
      schemaVersion: 1,
      deviceId: "phone-integration",
      cursor: 0,
    });
    assert.equal(pull.status, 200);
    assert.equal(pull.body.data.summaries.length, 1);
    assert.equal(pull.body.data.summaries[0].summary.energyKcal, confirmResponse.body.data.totals.energyKcal);
  });
});

test("nutrition report is authenticated, confirmed-only, and date bounded", async () => {
  await withServer(async (baseUrl) => {
    const draftResponse = await call(baseUrl, "/v1/meals/drafts", {
      localDate: "2026-08-03",
      mealType: "lunch",
      sourceType: "sample",
      note: "fixture:chicken-curry-rice",
    });
    const draft = draftResponse.body.data.draft;
    const analysisResponse = await call(baseUrl, "/v1/meals/analysis", {
      draftId: draft.draftId,
      idempotencyKey: "report-analysis-1",
    });
    const items = analysisResponse.body.data.analysisRequest.result.items;
    const confirmed = await call(baseUrl, "/v1/meals/confirm", {
      draftId: draft.draftId,
      idempotencyKey: "report-confirm-1",
      confirmed: true,
      expectedRevision: 1,
      items,
    });
    assert.equal(confirmed.status, 201);

    const report = await call(baseUrl, "/v1/reports/nutrition?from=2026-08-01&to=2026-08-03");
    assert.equal(report.status, 200);
    assert.equal(report.body.data.report.source, "confirmed_meals");
    assert.equal(report.body.data.report.freshness, "confirmed_only");
    assert.equal(report.body.data.report.days.length, 3);
    assert.equal(report.body.data.report.days[2].confirmedMealCount, 1);

    const tooLarge = await call(baseUrl, "/v1/reports/nutrition?from=2025-01-01&to=2026-01-02");
    assert.equal(tooLarge.status, 400);
    assert.equal(tooLarge.body.error.code, "report_range_too_large");
  });
});

test("meal correction and deletion publish revisioned daily summaries", async () => {
  await withServer(async (baseUrl) => {
    await saveConfirmedTargets(baseUrl);
    const draftResponse = await call(baseUrl, "/v1/meals/drafts", {
      localDate: "2026-08-03",
      mealType: "dinner",
      sourceType: "sample",
      note: "fixture:chicken-curry-rice",
    });
    const draft = draftResponse.body.data.draft;
    const analysisResponse = await call(baseUrl, "/v1/meals/analysis", {
      draftId: draft.draftId,
      idempotencyKey: "mutation-analysis-1",
    });
    const items = analysisResponse.body.data.analysisRequest.result.items;
    const confirmed = await call(baseUrl, "/v1/meals/confirm", {
      draftId: draft.draftId,
      idempotencyKey: "mutation-confirm-1",
      confirmed: true,
      expectedRevision: 1,
      items,
    });
    const mealId = confirmed.body.data.meal.mealId;
    const correctedItems = items.map((item: Record<string, unknown>) => ({ ...item, energyKcal: 100 }));
    const correctedResponse = await fetch(`${baseUrl}/v1/meals/${mealId}`, {
      method: "PATCH",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "mutation-patch-1", expectedRevision: 1, items: correctedItems }),
    });
    const corrected = await correctedResponse.json() as any;
    assert.equal(correctedResponse.status, 200);
    assert.equal(corrected.data.meal.currentRevision, 2);

    const afterCorrection = await call(baseUrl, "/v1/sync/pull", {
      schemaVersion: 1,
      deviceId: "phone-integration",
      cursor: 0,
    });
    assert.equal(afterCorrection.body.data.summaries.at(-1).summary.revision, 2);
    assert.equal(afterCorrection.body.data.summaries.at(-1).summary.energyKcal, 100 * correctedItems.length);

    const deletedResponse = await fetch(`${baseUrl}/v1/meals/${mealId}`, {
      method: "DELETE",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "mutation-delete-1", expectedRevision: 2 }),
    });
    const deleted = await deletedResponse.json() as any;
    assert.equal(deletedResponse.status, 200);
    assert.equal(deleted.data.meal.status, "DELETED");

    const afterDelete = await call(baseUrl, "/v1/sync/pull", {
      schemaVersion: 1,
      deviceId: "phone-integration",
      cursor: 0,
    });
    assert.equal(afterDelete.body.data.summaries.at(-1).summary.revision, 3);
    assert.equal(afterDelete.body.data.summaries.at(-1).summary.energyKcal, 0);
  });
});

test("main server supports manual meal review before confirmation", async () => {
  await withServer(async (baseUrl) => {
    const draftResponse = await call(baseUrl, "/v1/meals/drafts", {
      localDate: "2026-08-02",
      mealType: "dinner",
      sourceType: "sample",
      note: "fixture:chicken-curry-rice",
    });
    assert.equal(draftResponse.status, 201);
    const draft = draftResponse.body.data.draft;

    const analysisResponse = await call(baseUrl, "/v1/meals/analysis", {
      draftId: draft.draftId,
      idempotencyKey: "manual-analysis-1",
    });
    assert.equal(analysisResponse.status, 200);
    const reviewedItems = analysisResponse.body.data.analysisRequest.result.items.map((item: Record<string, unknown>) => ({
      ...item,
      displayName: "Reviewed manual dinner",
      energyKcal: 500,
      proteinGrams: 20,
    }));

    const confirmed = await call(baseUrl, "/v1/meals/confirm", {
      draftId: draft.draftId,
      idempotencyKey: "manual-confirm-1",
      confirmed: true,
      expectedRevision: 1,
      items: reviewedItems,
    });
    assert.equal(confirmed.status, 201);
    assert.equal(confirmed.body.data.meal.items[0].displayName, "Reviewed manual dinner");
    assert.equal(confirmed.body.data.totals.energyKcal, 500 * reviewedItems.length);
  });
});

test("main server composes revisioned workout lifecycle and isolates users", async () => {
  await withServer(async (baseUrl) => {
    const started = await call(baseUrl, "/v1/workouts/start", {
      idempotencyKey: "integration-workout-start",
      authorityDeviceId: "phone-integration",
      workoutType: "walk",
      occurredAtEpochMillis: 1_000,
    });
    assert.equal(started.status, 201);
    const sessionId = started.body.data.session.sessionId;

    const active = await call(baseUrl, `/v1/workouts/${sessionId}/transition`, {
      idempotencyKey: "integration-workout-active",
      authorityDeviceId: "phone-integration",
      action: "start",
      expectedRevision: 1,
      occurredAtEpochMillis: 1_100,
    });
    assert.equal(active.status, 200);
    assert.equal(active.body.data.session.state, "ACTIVE");

    const ending = await call(baseUrl, `/v1/workouts/${sessionId}/transition`, {
      idempotencyKey: "integration-workout-ending",
      authorityDeviceId: "phone-integration",
      action: "end",
      expectedRevision: 2,
      occurredAtEpochMillis: 2_000,
    });
    assert.equal(ending.status, 200);
    assert.equal(ending.body.data.session.state, "ENDING");

    const complete = await call(baseUrl, `/v1/workouts/${sessionId}/complete`, {
      idempotencyKey: "integration-workout-complete",
      authorityDeviceId: "phone-integration",
      expectedRevision: 3,
      occurredAtEpochMillis: 2_100,
      summary: { distanceMeters: 250 },
    });
    assert.equal(complete.status, 200);
    assert.equal(complete.body.data.session.state, "COMPLETED");

    const otherUser = await fetch(`${baseUrl}/v1/workouts/${sessionId}/complete`, {
      method: "POST",
      headers: { ...auth, Authorization: "Bearer local-user:other-user", "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: "other-complete",
        authorityDeviceId: "phone-integration",
        expectedRevision: 4,
      }),
    });
    assert.equal(otherUser.status, 404);
  });
});

test("main server composes watch delivery, attempt, and receipt acknowledgement", async () => {
  await withServer(async (baseUrl) => {
    const trusted = await call(baseUrl, "/v1/devices/trust", {
      phoneDeviceId: "phone-integration",
      watchDeviceId: "watch-integration",
      idempotencyKey: "watch-trust-legacy-flow",
    });
    assert.equal(trusted.status, 201);
    const summary = {
      schemaVersion: 1,
      source: "MOVEFUEL",
      summaryId: "integration-watch-summary",
      revision: 1,
      updatedAtEpochMillis: 1_700_000_000_000,
      energyKcal: 620,
      energyGoalKcal: 2_000,
      proteinGrams: 34,
      proteinGoalGrams: 140,
      movementMinutes: 0,
      movementGoalMinutes: 30,
      workoutState: "IDLE",
    };
    const created = await call(baseUrl, "/v1/watch/deliveries", {
      summary,
      phoneDeviceId: "phone-integration",
      watchDeviceId: "watch-integration",
    });
    assert.equal(created.status, 201);
    const deliveryId = created.body.data.delivery.deliveryId;

    const attempt = await call(baseUrl, `/v1/watch/deliveries/${deliveryId}/attempt`, {
      attemptedAtEpochMillis: 1_700_000_000_001,
    });
    assert.equal(attempt.status, 200);
    assert.equal(attempt.body.data.state, "SENT");

    const receipt = await call(baseUrl, "/v1/watch/receipts", {
      deliveryId,
      summaryId: summary.summaryId,
      revision: summary.revision,
      watchDeviceId: "watch-integration",
      result: "PERSISTED",
      receivedAtEpochMillis: 1_700_000_000_002,
    });
    assert.equal(receipt.status, 200);
    assert.equal(receipt.body.data.outcome, "ACCEPTED");

    const duplicate = await call(baseUrl, "/v1/watch/receipts", {
      deliveryId,
      summaryId: summary.summaryId,
      revision: summary.revision,
      watchDeviceId: "watch-integration",
      result: "PERSISTED",
      receivedAtEpochMillis: 1_700_000_000_002,
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data.outcome, "DUPLICATE");
  });
});

test("production server accepts only the injected Appwrite session boundary", async () => {
  const server = createMoveFuelServer({
    environment: "production",
    appwriteEndpoint: "https://appwrite.example/v1",
    appwriteProjectId: "project-test",
    appwriteServerApiKey: "server-only-test-key",
    mealMediaBucketId: "meal_media",
    sessionProvider: new AppwriteSessionProvider({
      async getCurrentUser(accessToken) {
        assert.equal(accessToken, "opaque-appwrite-session");
        return { userId: "appwrite-user", sessionId: "appwrite-session" };
      },
    }),
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a port.");
  try {
    const accepted = await fetch(`http://127.0.0.1:${address.port}/v1/config`, {
      headers: { Authorization: "Bearer opaque-appwrite-session" },
    });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json() as any).data.features.appwriteRuntime, true);

    const rejected = await fetch(`http://127.0.0.1:${address.port}/v1/config`, {
      headers: { Authorization: "Bearer local-user:appwrite-user" },
    });
    assert.equal(rejected.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("production requests fail closed when a session principal lacks Appwrite persistence credentials", async () => {
  const server = createMoveFuelServer({
    environment: "production",
    appwriteEndpoint: "https://appwrite.example/v1",
    appwriteProjectId: "project-test",
    appwriteServerApiKey: "server-only-test-key",
    mealMediaBucketId: "meal_media",
    sessionProvider: {
      async resolve() {
        return { userId: "unsafe-user", sessionId: "unsafe-session", provider: "appwrite" as const };
      },
    },
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a port.");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/v1/config`, {
      headers: { Authorization: "Bearer opaque-but-not-forwarded" },
    });
    assert.equal(response.status, 400);
    const body = await response.json() as any;
    assert.equal(body.error.code, "production_session_incomplete");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("production server refuses to start with local persistence fallbacks", () => {
  assert.throws(
    () => createMoveFuelServer({ environment: "production" }),
    /production_appwrite_persistence_config_incomplete/,
  );
});

test("production Appwrite sessions auto-wire the TablesDB bootstrap boundary", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const tablesFetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    const path = new URL(String(input)).pathname;
    if (path === "/account") {
      return new Response(JSON.stringify({ $id: "appwrite-user" }), { status: 200 });
    }
    if (init?.method === "GET" && (path.endsWith("/rows/appwrite-user") || path.endsWith("/rows/phone-authenticated"))) {
      return new Response(JSON.stringify({ code: "row_not_found" }), { status: 404 });
    }
    return new Response(JSON.stringify({ $id: "row", userId: "appwrite-user" }), { status: 201 });
  }) as (input: string, init?: RequestInit) => Promise<Response>;
  const server = createMoveFuelServer({
    environment: "production",
    appwriteEndpoint: "https://appwrite.example/v1",
    appwriteProjectId: "project-test",
    appwriteServerApiKey: "server-only-test-key",
    mealMediaBucketId: "meal_media",
    appwriteTablesFetcher: tablesFetcher,
    sessionProvider: new AppwriteSessionProvider({
      async getCurrentUser(accessToken) {
        assert.equal(accessToken, "opaque-appwrite-session");
        return { userId: "appwrite-user", sessionId: "appwrite-session" };
      },
    }),
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a port.");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/v1/bootstrap`, {
      headers: { Authorization: "Bearer opaque-appwrite-session", "x-device-id": "phone-authenticated" },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as any).data.persistence, "appwrite");
    const tablesRequest = requests.find((request) => request.url.includes("/tablesdb/movefuel_mvp/tables/"));
    assert.equal((tablesRequest?.init?.headers as Record<string, string>)?.["X-Appwrite-JWT"], "opaque-appwrite-session");
    assert.equal("X-Appwrite-Key" in ((tablesRequest?.init?.headers ?? {}) as Record<string, string>), false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("production Appwrite sync survives recreation and direct workout mutation is isolated", async () => {
  const rows = new Map<string, Record<string, any>>();
  const tablesFetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const match = url.pathname.match(/^\/v1\/tablesdb\/[^/]+\/tables\/([^/]+)\/rows(?:\/([^/]+))?$/);
    if (!match) return new Response(JSON.stringify({ error: "unsupported_path" }), { status: 400 });
    const tableId = decodeURIComponent(match[1]);
    const rowId = match[2] ? decodeURIComponent(match[2]) : undefined;
    const key = (id: string) => `${tableId}:${id}`;
    if (init?.method === "GET" && rowId) {
      const row = rows.get(key(rowId));
      return row
        ? new Response(JSON.stringify(row), { status: 200 })
        : new Response(JSON.stringify({ code: "row_not_found" }), { status: 404 });
    }
    if (init?.method === "GET") {
      let values = [...rows.values()].filter((row) => row.$tableId === tableId);
      for (const query of url.searchParams.getAll("queries[]")) {
        const matchQuery = query.match(/^equal\("([^"]+)",\["([^"]*)"\]\)$/);
        if (matchQuery) values = values.filter((row) => String(row[matchQuery[1]]) === matchQuery[2]);
      }
      return new Response(JSON.stringify({ total: values.length, rows: values }), { status: 200 });
    }
    const body = init?.body ? JSON.parse(String(init.body)) as { rowId?: string; data?: Record<string, any> } : {};
    if (init?.method === "POST") {
      const id = body.rowId ?? "missing-row-id";
      const row = { ...(body.data ?? {}), $id: id, $tableId: tableId };
      rows.set(key(id), row);
      return new Response(JSON.stringify(row), { status: 201 });
    }
    if (init?.method === "PATCH" && rowId) {
      const current = rows.get(key(rowId)) ?? { $id: rowId, $tableId: tableId };
      const row = { ...current, ...(body.data ?? {}) };
      rows.set(key(rowId), row);
      return new Response(JSON.stringify(row), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 204 });
  }) as (input: string, init?: RequestInit) => Promise<Response>;

  const provider = new AppwriteSessionProvider({
    async getCurrentUser(accessToken) {
      assert.equal(accessToken, "opaque-appwrite-session");
      return { userId: "appwrite-user", sessionId: "appwrite-session" };
    },
  });
  const summary = {
    schemaVersion: 1,
    source: "MOVEFUEL",
    summaryId: "persistent-summary",
    revision: 1,
    updatedAtEpochMillis: 1_700_000_000_001,
    energyKcal: 500,
    energyGoalKcal: 2_000,
    proteinGrams: 30,
    proteinGoalGrams: 120,
    movementMinutes: 12,
    movementGoalMinutes: 30,
    workoutState: "IDLE",
  } as const;
  const operation = {
    operationId: "persistent-operation",
    entityType: "daily_summary",
    entityId: summary.summaryId,
    entityRevision: summary.revision,
    operationType: "create",
    idempotencyKey: "persistent-operation-key",
    payload: summary,
    payloadHash: createHash("sha256").update(JSON.stringify(summary)).digest("hex"),
  };

  const createServer = () => createMoveFuelServer({
    environment: "production",
    appwriteEndpoint: "https://appwrite.example/v1",
    appwriteProjectId: "project-test",
    appwriteServerApiKey: "server-only-test-key",
    mealMediaBucketId: "meal_media",
    appwriteTablesFetcher: tablesFetcher,
    sessionProvider: provider,
  });
  const callAppwrite = async (baseUrl: string, path: string, body: unknown) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: "Bearer opaque-appwrite-session", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as any };
  };
  const serve = async (server: ReturnType<typeof createServer>, run: (baseUrl: string) => Promise<void>) => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server address missing");
    try {
      await run(`http://127.0.0.1:${address.port}`);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };

  await serve(createServer(), async (baseUrl) => {
    const pushed = await callAppwrite(baseUrl, "/v1/sync/push", { schemaVersion: 1, deviceId: "phone-a", operations: [operation] });
    assert.equal(pushed.status, 200, JSON.stringify(pushed.body));
    assert.equal(pushed.body.data.results[0].status, "accepted");
  });
  await serve(createServer(), async (baseUrl) => {
    const duplicate = await callAppwrite(baseUrl, "/v1/sync/push", { schemaVersion: 1, deviceId: "phone-a", operations: [operation] });
    assert.equal(duplicate.body.data.results[0].status, "duplicate");
    const pulled = await callAppwrite(baseUrl, "/v1/sync/pull", { schemaVersion: 1, deviceId: "phone-a", cursor: 0 });
    assert.equal(pulled.body.data.summaries[0].summary.summaryId, "persistent-summary");
    const blocked = await callAppwrite(baseUrl, "/v1/workouts/start", {
      idempotencyKey: "legacy-workout-start",
      authorityDeviceId: "phone-a",
      workoutType: "walk",
      occurredAtEpochMillis: 1_000,
    });
    assert.equal(blocked.status, 400);
    assert.equal(blocked.body.error.code, "canonical_reconciliation_required");
  });
});

test("report narrative endpoint preserves deterministic score and works without Gemini key", async () => {
  await withServer(async (baseUrl) => {
    const response = await call(baseUrl, "/v1/reports/narrative", {
      reportType: "weekly",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-07",
      score: 82,
      scoreLabel: "Strong consistency",
      confidence: "High",
      observedDays: 7,
      totalDays: 7,
      confirmedMeals: 18,
      completedWorkouts: 4,
      workoutMinutes: 155,
      averageRecordedCalories: 2200,
      averageRecordedProteinGrams: 132,
      averageRecordedCarbohydrateGrams: 230,
      averageRecordedFatGrams: 68,
      averageRecordedFiberGrams: 27,
      strongestSignal: "Training consistency is the strongest recorded signal (100/100).",
      nextAction: "Use the Fuel screen to close the recorded protein gap on the days you track.",
      evidenceNote: "Missing meals/days are not treated as zero intake.",
      components: [
        { key: "logging", label: "Tracking coverage", score: 100, evidence: "7 of 7 days contain a confirmed meal." },
        { key: "protein", label: "Recorded protein progress", score: 75, evidence: "Compared with the reviewed protein target." },
        { key: "training", label: "Training consistency", score: 100, evidence: "4 completed sessions." },
      ],
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.narrative.source, "deterministic");
    assert.match(response.body.data.narrative.summary, /82\/100/);
  });
});

test("calendar projection preserves missing evidence as absent instead of zero", async () => {
  await withServer(async (baseUrl) => {
    await saveConfirmedTargets(baseUrl);
    const meal = await call(baseUrl, "/v1/meals/drafts", { localDate: "2026-08-07", mealType: "breakfast", sourceType: "sample", note: "fixture:chicken-curry-rice" });
    assert.equal(meal.status, 201);
    const draftId = meal.body.data.draft.draftId;
    const analyzed = await call(baseUrl, "/v1/meals/analysis", { draftId, idempotencyKey: "calendar-analysis-1" });
    assert.equal(analyzed.status, 200);
    const reviewedItems = analyzed.body.data.analysisRequest.result.items.map((item: Record<string, unknown>) => ({
      ...item,
      displayName: "Calendar meal",
      energyKcal: 300,
      proteinGrams: 25,
      carbGrams: 30,
      fatGrams: 8,
      fiberGrams: 3,
    }));
    const confirmed = await call(baseUrl, "/v1/meals/confirm", {
      draftId,
      idempotencyKey: "calendar-confirm-1",
      confirmed: true,
      expectedRevision: 1,
      localDate: "2026-08-07",
      items: reviewedItems,
    });
    assert.equal(confirmed.status, 201);

    const calendar = await call(baseUrl, "/v1/calendar?from=2026-08-07&to=2026-08-08");
    assert.equal(calendar.status, 200);
    assert.equal(calendar.body.data.days.length, 2);
    assert.equal(calendar.body.data.days[0].mealCount, 1);
    assert.equal(calendar.body.data.days[0].energyKcal, 600);
    assert.equal(calendar.body.data.days[1].mealCount, 0);
    assert.equal("energyKcal" in calendar.body.data.days[1], false);
    assert.equal(calendar.body.data.days[1].evidence.mealsObserved, false);
  });
});

test("canonical account export accepts POST and billing verification fails closed until production verifier exists", async () => {
  await withServer(async (baseUrl) => {
    const exportResponse = await fetch(`${baseUrl}/v1/account/export`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(exportResponse.status, 200);

    const billing = await call(baseUrl, "/v1/billing/google/verify", { purchaseToken: "not-a-real-token" });
    assert.equal(billing.status, 503);
    assert.equal(billing.body.error.code, "billing_not_configured");
  });
});

test("target commit requires explicit confirmation and creates a new target revision", async () => {
  await withServer(async (baseUrl) => {
    await saveConfirmedTargets(baseUrl);
    const rejected = await call(baseUrl, "/v1/targets/commit", { energyKcal: 2450, proteinG: 145, userConfirmed: false });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.body.error.code, "target_confirmation_required");

    const committed = await call(baseUrl, "/v1/targets/commit", { energyKcal: 2450, proteinG: 145, userConfirmed: true });
    assert.equal(committed.status, 200);
    assert.equal(committed.body.data.target.energyKcal, 2450);
    assert.equal(committed.body.data.target.proteinG, 145);
    assert.ok(committed.body.data.target.revision >= 2);
  });
});
