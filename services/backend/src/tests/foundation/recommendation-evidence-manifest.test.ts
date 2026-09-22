import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

test("recommendation evidence is a server-only typed child boundary", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/recommendation-evidence-wave.v1.json", import.meta.url), "utf8")) as Manifest & {
    resourcePolicy: { serverOnlyTables: string[] };
  };
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest.resourcePolicy.serverOnlyTables, ["recommendation_evidence"]);
  assert.equal(manifest.resources[0]?.ownerField, null);
  assert.ok(manifest.resources[0]?.rowSecurity);
  assert.deepEqual(manifest.resources[0]?.permissions, []);
  const report = buildDryRunReport(manifest, snapshot);
  assert.equal(report.operations[0]?.action, "verify_existing");
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});
