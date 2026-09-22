import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

test("workout plan/session wave keeps owner fields explicit and blocks the ambiguous revision table", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/workout-plan-session-wave.v1.json", import.meta.url), "utf8")) as Manifest & {
    resourcePolicy: { serverOnlyTables: string[] };
  };
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8"));

  assert.deepEqual(manifest.resources.map((resource) => resource.id), [
    "workout_plan",
    "workout_plan_revision",
    "workout_plan_step",
    "workout_session",
    "workout_event",
    "workout_summary",
  ]);
  assert.deepEqual(manifest.resourcePolicy.serverOnlyTables, ["workout_plan_revision", "workout_plan_step"]);
  assert.ok(manifest.resources.every((resource) => resource.rowSecurity === true));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.permissions) && resource.permissions.length === 0));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.typedColumns)));
  const report = buildDryRunReport(manifest, snapshot);
  assert.ok(report.operations.every((operation) => operation.action === "verify_existing"));
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});
