import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

test("full specification manifest preserves all 77 tables but blocks unreviewed deployment", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/full-spec-manifest.v1.json", import.meta.url), "utf8")) as Manifest & {
    status: string;
  };
  assert.equal(manifest.status, "preflight_only_logical_catalog");
  assert.equal(manifest.resources.length, 77);
  assert.equal(new Set(manifest.resources.map((resource) => resource.id)).size, 77);
  const report = buildDryRunReport(manifest, { resources: [] });
  assert.equal(report.operations.length, 77);
  assert.equal(report.reviewRequired, true);
  assert.equal(report.applyAllowed, false);
  assert.deepEqual(report.destructiveOperations, []);
  assert.ok(report.operations.every((operation) => operation.action === "inspect_and_stop_for_review"));
});
