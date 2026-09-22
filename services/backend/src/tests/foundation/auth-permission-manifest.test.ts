import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

test("auth permission wave verifies typed owner and server-only boundaries", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/auth-permission-wave.v1.json", import.meta.url), "utf8")) as Manifest & {
    resourcePolicy: { applyAllowed: boolean; serverOnlyTables: string[] };
  };
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8"));

  assert.equal(manifest.schemaVersion, 6);
  assert.equal(manifest.resources.length, 13);
  assert.equal(manifest.resourcePolicy.applyAllowed, true);
  assert.deepEqual(manifest.resourcePolicy.serverOnlyTables, ["audit_event", "idempotency_key"]);
  assert.ok(manifest.resources.every((resource) => resource.rowSecurity === true));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.typedColumns)));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.permissions) && resource.permissions.length === 0));
  assert.ok(manifest.resources.filter((resource) => resource.ownerField === "userId").length === 11);
  assert.ok(manifest.resources.filter((resource) => resource.ownerField === null).length === 2);

  const report = buildDryRunReport(manifest, snapshot);
  assert.ok(report.operations.every((operation) => operation.action === "verify_existing"));
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});
