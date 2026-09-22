import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

test("personal/dashboard wave keeps private owner fields and safe index aliases explicit", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/personal-dashboard-wave.v1.json", import.meta.url), "utf8")) as Manifest;
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8"));

  assert.deepEqual(manifest.resources.map((resource) => resource.id), [
    "personal_food",
    "day_summary",
    "daily_recommendation",
    "action_completion",
    "wellness_checkin",
    "progress_insight",
  ]);
  assert.ok(manifest.resources.every((resource) => resource.ownerField === "userId"));
  assert.ok(manifest.resources.every((resource) => resource.rowSecurity === true));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.permissions) && resource.permissions.length === 0));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.typedColumns)));
  const report = buildDryRunReport(manifest, snapshot);
  assert.ok(report.operations.every((operation) => operation.action === "verify_existing"));
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});
