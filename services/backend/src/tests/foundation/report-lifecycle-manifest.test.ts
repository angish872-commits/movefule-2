import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

test("report and lifecycle wave separates owner records from server-only workers and evidence", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/report-lifecycle-wave.v1.json", import.meta.url), "utf8")) as Manifest & {
    resourcePolicy: { serverOnlyTables: string[] };
  };
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8"));

  assert.deepEqual(manifest.resourcePolicy.serverOnlyTables, ["deletion_job", "feature_flag", "data_retention_job", "report_section", "report_evidence"]);
  assert.equal(manifest.resources.filter((resource) => resource.ownerField === "userId").length, 7);
  assert.equal(manifest.resources.filter((resource) => resource.ownerField === null).length, 5);
  assert.ok(manifest.resources.every((resource) => resource.rowSecurity === true));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.permissions) && resource.permissions.length === 0));
  assert.ok(manifest.resources.flatMap((resource) => resource.indexDefinitions ?? []).every((index) => index.key.length <= 36));
  const report = buildDryRunReport(manifest, snapshot);
  assert.ok(report.operations.every((operation) => operation.action === "verify_existing"));
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});
