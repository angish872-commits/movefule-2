import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

test("workout session revision fix wave is typed, server-only, and review-gated until live preflight", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/workout-session-revision-fix-wave.v1.json", import.meta.url), "utf8")) as Manifest & {
    resourcePolicy: { defaultDeny: boolean; applyAllowed: boolean; serverOnlyTables: string[] };
    resources: Array<any>;
  };

  assert.equal(manifest.resourcePolicy.defaultDeny, true);
  assert.equal(manifest.resourcePolicy.applyAllowed, false);
  assert.deepEqual(manifest.resourcePolicy.serverOnlyTables, ["workout_session_revision"]);
  assert.equal(manifest.resources.length, 1);

  const resource = manifest.resources[0];
  assert.equal(resource.id, "workout_session_revision");
  assert.equal(resource.ownerField, null);
  assert.equal(resource.requiresReview, true);
  assert.ok(Array.isArray(resource.typedColumns) && resource.typedColumns.length > 0);
  assert.deepEqual(resource.indexDefinitions.map((index: any) => index.key), [
    "workout_session_revision_unique",
    "workout_session_operation_unique",
    "workout_session_idempotency_unique",
    "workout_session_acceptedAt",
  ]);
  assert.equal(JSON.stringify(resource.indexDefinitions).includes("userId"), false);
  for (const key of ["baseRevision", "sourceDeviceId", "sourceOperationId", "payloadHash", "reasonCodesJson", "schemaVersion", "acceptedAt"]) {
    assert.ok(resource.typedColumns.some((column: any) => column.key === key));
  }

  const report = buildDryRunReport(manifest, { resources: [] });
  assert.equal(report.reviewRequired, true);
  assert.equal(report.applyAllowed, false);
  assert.equal(report.operations[0]?.action, "inspect_and_stop_for_review");
  assert.deepEqual(report.destructiveOperations, []);
});
