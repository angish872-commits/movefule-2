import assert from "node:assert/strict";
import test from "node:test";
import { packagedFallbackActions } from "../../nutrition/packaged/fallback.ts";

test("packaged failures expose review actions without fabricated nutrition", () => {
  assert.deepEqual(packagedFallbackActions("NOT_FOUND"), ["TRUSTED_SEARCH", "MANUAL_ENTRY"]);
  assert.equal(packagedFallbackActions("PROVIDER_UNAVAILABLE")[0], "RETRY_PROVIDER");
  assert.equal(packagedFallbackActions("PROVIDER_RATE_LIMITED")[0], "RETRY_PROVIDER");
  assert.equal(packagedFallbackActions("PROVIDER_TIMEOUT")[0], "RETRY_PROVIDER");
});
