import assert from "node:assert/strict";
import test from "node:test";
import { AppwriteMealImageStore } from "../../meal/appwrite-image-store.ts";

test("Appwrite meal image store keeps server key in transport and applies owner permissions", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    requests.push({ url, init });
    if (init?.method === "POST") {
      assert.equal((init.headers as Record<string, string>)["X-Appwrite-Key"], "server-secret");
      const form = init.body as FormData;
      assert.ok(form instanceof FormData);
      const permissions = form.getAll("permissions[]").map(String);
      assert.deepEqual(permissions, [
        'read("user:user-1")',
        'update("user:user-1")',
        'delete("user:user-1")',
      ]);
      return new Response(JSON.stringify({ $id: "file-1" }), { status: 201, headers: { "content-type": "application/json" } });
    }
    if (url.endsWith("/view")) {
      const headers = init?.headers as Record<string, string>;
      if (headers?.["X-Appwrite-JWT"]) {
        assert.equal(headers["X-Appwrite-JWT"], "owner-jwt");
        assert.equal(headers["X-Appwrite-Key"], undefined);
      } else {
        assert.equal(headers?.["X-Appwrite-Key"], "server-secret");
      }
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } });
    }
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    return new Response(null, { status: 500 });
  };

  const store = new AppwriteMealImageStore({
    endpoint: "https://appwrite.example/v1",
    projectId: "movefuel",
    apiKey: "server-secret",
    bucketId: "meal-history-private",
    fetcher,
  });

  const saved = await store.save("user-1", "draft-1", "image/jpeg", Buffer.from([1, 2, 3]));
  assert.equal(saved.objectId, "appwrite-meal-image:meal-history-private:file-1");
  assert.equal(saved.sizeBytes, 3);
  const read = await store.read(saved.objectId);
  assert.deepEqual([...read.bytes], [1, 2, 3]);
  const ownerRead = await store.readForUser("user-1", "owner-jwt", saved.objectId);
  assert.deepEqual([...ownerRead.bytes], [1, 2, 3]);
  await store.delete(saved.objectId);
  assert.equal(requests.length, 4);
  assert.ok(requests.every((request) => !request.url.includes("server-secret")));
});

test("Appwrite meal image store records temporary owner-scoped media metadata with bounded expiry", async () => {
  const seen: string[] = [];
  const fetcher = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    seen.push(`${init?.method}:${url}`);
    if (url.includes("/storage/") && init?.method === "POST") {
      return new Response(JSON.stringify({ $id: "file-ledger" }), { status: 201, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/tables/meal_media/rows") && init?.method === "POST") {
      const payload = JSON.parse(String(init.body));
      assert.equal(payload.data.userId, "user-ledger");
      assert.equal(payload.data.objectId, "file-ledger");
      assert.equal(payload.data.bucketId, "meal-private");
      assert.equal(payload.data.state, "temporary");
      assert.equal(payload.data.deletedAt, null);
      assert.deepEqual(payload.permissions, [
        'read("user:user-ledger")',
        'write("user:user-ledger")',
        'update("user:user-ledger")',
        'delete("user:user-ledger")',
      ]);
      assert.match(payload.data.checksum, /^[a-f0-9]{64}$/);
      const createdAt = Date.parse(payload.data.createdAt);
      const deleteAfter = Date.parse(payload.data.deleteAfter);
      assert.ok(Number.isFinite(createdAt));
      assert.equal(deleteAfter - createdAt, 24 * 60 * 60 * 1_000);
      return new Response(JSON.stringify({ $id: payload.rowId }), { status: 201, headers: { "content-type": "application/json" } });
    }
    return new Response(null, { status: 500 });
  };
  const store = new AppwriteMealImageStore({
    endpoint: "https://appwrite.example/v1", projectId: "movefuel", apiKey: "server-secret",
    bucketId: "meal-private", databaseId: "movefuel_mvp", fetcher,
  });
  const result = await store.save("user-ledger", "draft-ledger", "image/jpeg", Buffer.from([5, 6, 7]));
  assert.equal(result.objectId, "appwrite-meal-image:meal-private:file-ledger");
  assert.equal(seen.filter((entry) => entry.startsWith("POST:")).length, 2);
});
