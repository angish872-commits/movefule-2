import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestUrl = new URL("../../../../../research/nutrition-research/database/algorithm-runtime-wave.v1.json", import.meta.url);

test("algorithm runtime wave is additive, typed, default-deny, and not deployed", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8")) as any;
  assert.equal(manifest.schemaVersion, 18);
  assert.equal(manifest.resourcePolicy.defaultDeny, true);
  assert.equal(manifest.resourcePolicy.applyAllowed, false);
  assert.deepEqual(manifest.resources.map((resource: any) => resource.id).sort(), [
    "algorithm_acceptance_run", "physical_measurement_trace", "vision_model_revision",
  ].sort());
  for (const resource of manifest.resources) {
    assert.equal(resource.rowSecurity, true);
    assert.deepEqual(resource.permissions, []);
    assert.ok(resource.typedColumns.length > 0);
  }
  const serialized = JSON.stringify(manifest).toLowerCase();
  assert.equal(serialized.includes("api_key"), false);
});
