import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

test("notification, sync, and exercise wave separates owner data from server-only delivery/catalog data", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/notification-sync-exercise-wave.v1.json", import.meta.url), "utf8")) as Manifest & {
    resourcePolicy: { serverOnlyTables: string[] };
  };
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8"));

  assert.deepEqual(manifest.resources.map((resource) => resource.id), [
    "sync_cursor",
    "notification",
    "notification_delivery",
    "exercise_catalog",
    "exercise_muscle_map",
  ]);
  assert.deepEqual(manifest.resourcePolicy.serverOnlyTables, ["notification_delivery", "exercise_catalog", "exercise_muscle_map"]);
  assert.equal(manifest.resources.filter((resource) => resource.ownerField === "userId").length, 2);
  assert.ok(manifest.resources.every((resource) => resource.rowSecurity === true));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.permissions) && resource.permissions.length === 0));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.typedColumns)));
  const report = buildDryRunReport(manifest, snapshot);
  assert.ok(report.operations.every((operation) => operation.action === "verify_existing"));
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});
