import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

test("health-device wave is typed, owner-scoped, and uses Appwrite-safe index aliases", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/health-device-wave.v1.json", import.meta.url), "utf8")) as Manifest;
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8"));

  assert.equal(manifest.schemaVersion, 7);
  assert.deepEqual(manifest.resources.map((resource) => resource.id), [
    "health_connection",
    "health_import_cursor",
    "health_sample_summary",
    "device_command",
  ]);
  assert.ok(manifest.resources.every((resource) => resource.ownerField === "userId"));
  assert.ok(manifest.resources.every((resource) => resource.rowSecurity === true));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.permissions) && resource.permissions.length === 0));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.typedColumns)));
  const physicalKeys = manifest.resources.flatMap((resource) => (resource.indexDefinitions as Array<{ key: string }>).map((index) => index.key));
  assert.ok(physicalKeys.every((key) => key.length <= 36));

  const report = buildDryRunReport(manifest, snapshot);
  assert.ok(report.operations.every((operation) => operation.action === "verify_existing"));
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});
