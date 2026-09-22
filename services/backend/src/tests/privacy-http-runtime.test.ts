import assert from "node:assert/strict";
import test from "node:test";
import { createMoveFuelServer } from "../http/local-server.ts";

const authFor = (userId: string) => ({ Authorization: `Bearer local-user:${userId}`, "content-type": "application/json" });

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

async function readPrivacy(baseUrl: string, userId: string) {
  const response = await fetch(`${baseUrl}/v1/privacy`, { headers: authFor(userId) });
  return { status: response.status, body: await response.json() as any };
}

async function savePrivacy(baseUrl: string, userId: string, body: unknown) {
  const response = await fetch(`${baseUrl}/v1/privacy`, {
    method: "PUT",
    headers: authFor(userId),
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as any };
}

const preference = (overrides: Record<string, unknown> = {}) => ({
  retainMealImages: false,
  imageRetentionDays: null,
  analyticsAllowed: false,
  modelImprovementAllowed: false,
  ...overrides,
});

test("/v1/privacy requires authentication", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/privacy`);
    assert.equal(response.status, 401);
  });
});

test("/v1/privacy defaults fail closed for a new owner", async () => {
  await withServer(async (baseUrl) => {
    const result = await readPrivacy(baseUrl, "privacy-default");
    assert.equal(result.status, 200);
    assert.equal(result.body.data.userId, "privacy-default");
    assert.equal(result.body.data.retainMealImages, false);
    assert.equal(result.body.data.imageRetentionDays, null);
    assert.equal(result.body.data.analyticsAllowed, false);
    assert.equal(result.body.data.modelImprovementAllowed, false);
    assert.equal(result.body.data.revision, 0);
  });
});

test("/v1/privacy is owner-scoped", async () => {
  await withServer(async (baseUrl) => {
    const saved = await savePrivacy(baseUrl, "privacy-owner-a", preference({
      retainMealImages: true,
      imageRetentionDays: 30,
      analyticsAllowed: true,
    }));
    assert.equal(saved.status, 200);
    assert.equal(saved.body.data.revision, 1);

    const other = await readPrivacy(baseUrl, "privacy-owner-b");
    assert.equal(other.status, 200);
    assert.equal(other.body.data.userId, "privacy-owner-b");
    assert.equal(other.body.data.retainMealImages, false);
    assert.equal(other.body.data.analyticsAllowed, false);
    assert.equal(other.body.data.revision, 0);
  });
});

test("/v1/privacy saves valid bounded retention and increments revision", async () => {
  await withServer(async (baseUrl) => {
    const first = await savePrivacy(baseUrl, "privacy-revision", preference({ retainMealImages: true, imageRetentionDays: 7 }));
    assert.equal(first.status, 200);
    assert.equal(first.body.data.revision, 1);
    assert.equal(first.body.data.imageRetentionDays, 7);

    const second = await savePrivacy(baseUrl, "privacy-revision", preference({ retainMealImages: true, imageRetentionDays: 14 }));
    assert.equal(second.status, 200);
    assert.equal(second.body.data.revision, 2);
    assert.equal(second.body.data.imageRetentionDays, 14);
  });
});

test("/v1/privacy rejects invalid retention", async () => {
  await withServer(async (baseUrl) => {
    for (const body of [
      preference({ retainMealImages: true, imageRetentionDays: 0 }),
      preference({ retainMealImages: true, imageRetentionDays: 3651 }),
      preference({ retainMealImages: false, imageRetentionDays: 10 }),
    ]) {
      const result = await savePrivacy(baseUrl, "privacy-invalid", body);
      assert.equal(result.status, 400);
      assert.equal(result.body.error.code, "invalid_privacy_preference");
    }
    assert.equal((await readPrivacy(baseUrl, "privacy-invalid")).body.data.revision, 0);
  });
});

test("analytics consent is independent from model-improvement consent", async () => {
  await withServer(async (baseUrl) => {
    const result = await savePrivacy(baseUrl, "privacy-analytics", preference({ analyticsAllowed: true, modelImprovementAllowed: false }));
    assert.equal(result.status, 200);
    assert.equal(result.body.data.analyticsAllowed, true);
    assert.equal(result.body.data.modelImprovementAllowed, false);
  });
});

test("model-improvement consent is independent from analytics consent", async () => {
  await withServer(async (baseUrl) => {
    const result = await savePrivacy(baseUrl, "privacy-model", preference({
      retainMealImages: true,
      imageRetentionDays: 30,
      analyticsAllowed: false,
      modelImprovementAllowed: true,
    }));
    assert.equal(result.status, 200);
    assert.equal(result.body.data.analyticsAllowed, false);
    assert.equal(result.body.data.modelImprovementAllowed, true);
  });
});

test("privacy media purge route is authenticated and owner-scoped", async () => {
  await withServer(async (baseUrl) => {
    const unauthenticated = await fetch(`${baseUrl}/v1/privacy/media/purge`, { method: "POST" });
    assert.equal(unauthenticated.status, 401);
    const authenticated = await fetch(`${baseUrl}/v1/privacy/media/purge`, {
      method: "POST",
      headers: authFor("privacy-purge-owner"),
    });
    assert.equal(authenticated.status, 200);
    const body = await authenticated.json() as any;
    assert.deepEqual(body.data, { scanned: 0, deleted: 0, alreadyDeleted: 0, scheduledRetry: 0 });
  });
});
