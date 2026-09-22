import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestUrl = new URL("../../../../../research/nutrition-research/database/algorithm-calibration-wave.v1.json", import.meta.url);

test("algorithm calibration wave is additive, typed, default-deny, and intentionally not live-deploying", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8")) as any;
  assert.equal(manifest.schemaVersion, 17);
  assert.equal(manifest.resourcePolicy.defaultDeny, true);
  assert.equal(manifest.resourcePolicy.applyAllowed, false);
  assert.deepEqual(manifest.resources.map((resource: any) => resource.id).sort(), [
    "food_density_revision", "physical_scale_calibration", "portion_calibration_profile", "user_food_portion_stat", "vision_benchmark_result", "weighed_portion_benchmark",
  ].sort());
  for (const resource of manifest.resources) {
    assert.equal(resource.rowSecurity, true);
    assert.deepEqual(resource.permissions, []);
    assert.ok(Array.isArray(resource.typedColumns) && resource.typedColumns.length > 0);
  }
  const serialized = JSON.stringify(manifest).toLowerCase();
  assert.equal(serialized.includes("gemini_api_key"), false);
  assert.equal(serialized.includes("appwrite_api_key"), false);
});
