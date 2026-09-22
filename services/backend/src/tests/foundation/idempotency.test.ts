import assert from "node:assert/strict";
import test from "node:test";
import {
  IdempotencyError,
  InMemoryIdempotencyStore,
  hashRequest,
  validateIdempotencyKey,
} from "../../foundation/idempotency.ts";

test("request hashing is stable across object key order", () => {
  assert.equal(hashRequest({ b: 2, a: 1 }), hashRequest({ a: 1, b: 2 }));
  assert.notEqual(hashRequest({ a: 1 }), hashRequest({ a: 2 }));
});

test("idempotency claim replays matching work and conflicts on changed work", async () => {
  const store = new InMemoryIdempotencyStore();
  const hash = hashRequest({ operation: "create", value: 1 });
  assert.equal((await store.claim("user-a", "request-1", hash)).outcome, "claimed");
  await store.complete("user-a", "request-1", { accepted: true });
  assert.equal((await store.claim("user-a", "request-1", hash)).outcome, "replay");
  assert.equal((await store.claim("user-a", "request-1", hashRequest({ operation: "create", value: 2 }))).outcome, "conflict");
  assert.equal((await store.claim("user-b", "request-1", hash)).outcome, "claimed");
});

test("invalid keys and completion without a claim are rejected", async () => {
  assert.throws(() => validateIdempotencyKey("   "), (error: unknown) => error instanceof IdempotencyError && error.code === "invalid_key");
  const store = new InMemoryIdempotencyStore();
  await assert.rejects(
    store.complete("user-a", "missing", { ok: false }),
    (error: unknown) => error instanceof IdempotencyError && error.code === "claim_missing",
  );
});
