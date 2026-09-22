import assert from "node:assert/strict";
import test from "node:test";
import { AppwriteTablesHttpClient, AppwriteTablesRequestError } from "../../foundation/appwrite-tables-client.ts";
import { AppwriteServerTablesHttpClient } from "../../foundation/appwrite-server-tables-client.ts";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("Appwrite TablesDB adapter uses the authenticated session boundary", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const client = new AppwriteTablesHttpClient({
    endpoint: "https://fra.cloud.appwrite.io/v1/",
    projectId: "project-test",
    sessionToken: () => "session-token",
    fetcher: async (url, init) => {
      requests.push({ url, init });
      return response({ rows: [{ $id: "row-a", userId: "user-a" }], total: 1 });
    },
  });

  const result = await client.listRows({
    databaseId: "movefuel_mvp",
    tableId: "user_profile",
    queries: [{ field: "userId", operator: "equal", value: "user-a" }],
    limit: 10,
  });
  assert.equal(result.total, 1);
  assert.equal(result.rows[0]?.userId, "user-a");
  assert.match(requests[0]!.url, /\/v1\/tablesdb\/movefuel_mvp\/tables\/user_profile\/rows/);
  assert.doesNotMatch(requests[0]!.url, /\/databases\//);
  const query = new URL(requests[0]!.url).searchParams.get("queries[]");
  assert.deepEqual(JSON.parse(query ?? "{}"), { method: "equal", attribute: "userId", values: ["user-a"] });
  assert.equal((requests[0]!.init?.headers as Record<string, string>)["X-Appwrite-Project"], "project-test");
  assert.equal((requests[0]!.init?.headers as Record<string, string>)["X-Appwrite-JWT"], "session-token");
  assert.equal("X-Appwrite-Key" in (requests[0]!.init?.headers as Record<string, string>), false);
});

test("server TablesDB adapter uses the current TablesDB route and keeps its API key server-side", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const client = new AppwriteServerTablesHttpClient({
    endpoint: "https://fra.cloud.appwrite.io/v1",
    projectId: "project-test",
    apiKey: "server-only-key",
    fetcher: async (url, init) => {
      requests.push({ url, init });
      return response({ rows: [], total: 0 });
    },
  });
  await client.listRows({ databaseId: "movefuel_mvp", tableId: "schema_migrations", queries: [] });
  assert.match(requests[0]!.url, /\/v1\/tablesdb\/movefuel_mvp\/tables\/schema_migrations\/rows$/);
  assert.doesNotMatch(requests[0]!.url, /\/databases\//);
  assert.equal((requests[0]!.init?.headers as Record<string, string>)["X-Appwrite-Key"], "server-only-key");
  assert.equal("X-Appwrite-JWT" in (requests[0]!.init?.headers as Record<string, string>), false);
});

test("Appwrite TablesDB adapter keeps missing sessions fail-closed", async () => {
  let called = false;
  const client = new AppwriteTablesHttpClient({
    endpoint: "https://fra.cloud.appwrite.io/v1",
    projectId: "project-test",
    sessionToken: () => undefined,
    fetcher: async () => {
      called = true;
      return response({});
    },
  });
  await assert.rejects(
    client.getRow("movefuel_mvp", "user_profile", "row-a"),
    (error: unknown) => error instanceof AppwriteTablesRequestError && error.status === 401,
  );
  assert.equal(called, false);
});

test("Appwrite TablesDB adapter maps missing rows to null without exposing response details", async () => {
  const client = new AppwriteTablesHttpClient({
    endpoint: "https://fra.cloud.appwrite.io/v1",
    projectId: "project-test",
    sessionToken: () => "session-token",
    fetcher: async () => response({ secret: "must-not-cross-boundary" }, 404),
  });
  assert.equal(await client.getRow("movefuel_mvp", "user_profile", "missing"), null);
});
