import assert from "node:assert/strict";
import test from "node:test";
import {
  AppwriteSessionProvider,
  LocalTestSessionProvider,
  SessionResolutionError,
} from "../../foundation/session.ts";

test("Appwrite session provider delegates bearer validation without exposing the token", async () => {
  let receivedToken = "";
  const provider = new AppwriteSessionProvider({
    async getCurrentUser(accessToken) {
      receivedToken = accessToken;
      return { userId: "user-a", sessionId: "session-a" };
    },
  });

  assert.deepEqual(await provider.resolve({ authorization: "Bearer opaque-session-token" }), {
    userId: "user-a",
    sessionId: "session-a",
    provider: "appwrite",
  });
  assert.equal(receivedToken, "opaque-session-token");
  assert.equal(await provider.resolve({}), null);
});

test("invalid Appwrite session responses become safe session errors", async () => {
  const provider = new AppwriteSessionProvider({
    async getCurrentUser() {
      throw new Error("upstream detail must not cross the boundary");
    },
  });
  await assert.rejects(
    provider.resolve({ authorization: "Bearer invalid" }),
    (error: unknown) => error instanceof SessionResolutionError && error.code === "invalid_session" &&
      error.message === "The Appwrite session could not be validated.",
  );
});

test("local session provider is explicit and test-only", async () => {
  const provider = new LocalTestSessionProvider();
  assert.deepEqual(await provider.resolve({ authorization: "Bearer local-user:user-a" }), {
    userId: "user-a",
    sessionId: "local-session:user-a",
    provider: "local-test",
  });
  assert.equal(await provider.resolve({ authorization: "Bearer user-a" }), null);
});
