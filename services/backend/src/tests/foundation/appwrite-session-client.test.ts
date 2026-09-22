import assert from "node:assert/strict";
import test from "node:test";
import { AppwriteSessionHttpClient } from "../../foundation/appwrite-session-client.ts";

test("Appwrite session HTTP client validates JWTs without exposing the token", async () => {
  const secretToken = "jwt-secret-that-must-not-cross-the-error-boundary";
  let capturedHeaders: HeadersInit | undefined;
  const client = new AppwriteSessionHttpClient({
    endpoint: "https://example.invalid/v1",
    projectId: "project-1",
    fetcher: async (_input, init) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ $id: "user-1", name: "MoveFuel User" }), { status: 200 });
    },
  });

  const principal = await client.getCurrentUser(secretToken);
  assert.equal(principal.userId, "user-1");
  assert.match(principal.sessionId, /^jwt:[a-f0-9]{32}$/);
  assert.deepEqual(capturedHeaders, {
    Accept: "application/json",
    "X-Appwrite-Project": "project-1",
    "X-Appwrite-JWT": secretToken,
  });
});

test("Appwrite session HTTP client fails safely on rejected JWTs", async () => {
  const client = new AppwriteSessionHttpClient({
    endpoint: "https://example.invalid/v1",
    projectId: "project-1",
    fetcher: async () => new Response("private provider details", { status: 401 }),
  });
  await assert.rejects(() => client.getCurrentUser("jwt-secret"), (error: Error) => {
    assert.equal(error.message, "appwrite_session_rejected");
    assert.equal(error.message.includes("private"), false);
    return true;
  });
});
