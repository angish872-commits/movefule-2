import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBarcode, packagedFoodCandidateFromLookup } from "../../nutrition/packaged/index.ts";

test("packaged food public boundary exports deterministic helpers", () => {
  assert.equal(normalizeBarcode("3017624010701"), "3017624010701");
  assert.equal(packagedFoodCandidateFromLookup({ status: "NOT_FOUND", barcode: "3017624010701" }).status, "MANUAL_FALLBACK");
});
