import assert from "node:assert/strict";
import test from "node:test";
import { ENTITLEMENT_STATES, LocalDevelopmentEntitlementProvider } from "../../billing/entitlements.ts";

test("local development entitlement provider exposes every documented demo state without store data", () => {
  assert.deepEqual(ENTITLEMENT_STATES, ["FREE", "TRIAL", "PREMIUM_ACTIVE", "EXPIRED", "CANCELLED"]);
  for (const state of ENTITLEMENT_STATES) {
    const provider = new LocalDevelopmentEntitlementProvider(state);
    const snapshot = provider.get("user-a");
    assert.equal(snapshot.state, state);
    assert.equal(snapshot.provider, "mock");
    assert.equal(snapshot.mode, "demo");
    assert.equal(snapshot.premium, state === "TRIAL" || state === "PREMIUM_ACTIVE");
  }
});

test("local development entitlement overrides stay user-scoped", () => {
  const provider = new LocalDevelopmentEntitlementProvider("FREE");
  provider.setStateForTests("user-a", "PREMIUM_ACTIVE");
  assert.equal(provider.get("user-a").state, "PREMIUM_ACTIVE");
  assert.equal(provider.get("user-b").state, "FREE");
});
