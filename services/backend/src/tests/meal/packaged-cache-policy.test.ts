import assert from "node:assert/strict";
import test from "node:test";
import { packagedCacheTtlSeconds } from "../../nutrition/packaged/cachePolicy.ts";

test("provider outage is never cached as nutrition truth", () => {
  assert.equal(packagedCacheTtlSeconds("UNAVAILABLE"), 0);
  assert.ok(packagedCacheTtlSeconds("FOUND") > packagedCacheTtlSeconds("NOT_FOUND"));
});
