import assert from "node:assert/strict";
import test from "node:test";
import { DeviceTrustStore } from "../../device/device-trust.ts";

test("device trust registration is owner-scoped, idempotent, and revocable", () => {
  let nextId = 0;
  const store = new DeviceTrustStore({ now: () => 1_754_000_000_000, idFactory: () => `session-${++nextId}` });
  const first = store.trust("user-a", { phoneDeviceId: "phone-a", watchDeviceId: "watch-a", idempotencyKey: "trust-1" });
  assert.equal(first.created, true);
  const duplicate = store.trust("user-a", { phoneDeviceId: "phone-a", watchDeviceId: "watch-a", idempotencyKey: "trust-1" });
  assert.equal(duplicate.created, false);
  assert.equal(store.isTrustedPair("user-a", "phone-a", "watch-a"), true);
  assert.equal(store.isTrustedWatch("user-b", "watch-a"), false);
  const revoked = store.revoke("user-a", first.session.deviceSessionId);
  assert.equal(revoked.state, "REVOKED");
  assert.equal(store.isTrustedPair("user-a", "phone-a", "watch-a"), false);
  assert.equal(store.revoke("user-a", first.session.deviceSessionId).state, "REVOKED");
});

test("expired trust sessions fail closed and can be replaced", () => {
  let now = 1_754_000_000_000;
  let nextId = 0;
  const store = new DeviceTrustStore({ now: () => now, idFactory: () => `session-${++nextId}` });
  const expiresAt = new Date(now + 1_000).toISOString();
  const first = store.trust("user-a", {
    phoneDeviceId: "phone-a",
    watchDeviceId: "watch-a",
    idempotencyKey: "trust-expiring-1",
    expiresAt,
  });
  assert.equal(store.isTrustedWatch("user-a", "watch-a"), true);
  now += 1_001;
  assert.equal(store.isTrustedWatch("user-a", "watch-a"), false);
  const replacement = store.trust("user-a", {
    phoneDeviceId: "phone-a",
    watchDeviceId: "watch-a",
    idempotencyKey: "trust-expiring-2",
  });
  assert.equal(replacement.created, true);
  assert.notEqual(replacement.session.deviceSessionId, first.session.deviceSessionId);
});
