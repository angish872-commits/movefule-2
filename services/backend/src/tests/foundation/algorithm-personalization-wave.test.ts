import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";
import { permissionFor } from "../../foundation/permissions.ts";


test("serving prior observations are one additive server-only algorithm table", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/algorithm-personalization-wave.v1.json", import.meta.url), "utf8")) as Manifest & {
    resourcePolicy: { serverOnlyTables: string[] };
  };
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest.resources.map((resource) => resource.id), ["serving_prior_observation"]);
  assert.deepEqual(manifest.resourcePolicy.serverOnlyTables, ["serving_prior_observation"]);
  assert.equal(permissionFor("serving_prior_observation").ownerField, null);
  assert.deepEqual(permissionFor("serving_prior_observation").grants.server, ["read", "create"]);
  const report = buildDryRunReport(manifest, snapshot);
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});
