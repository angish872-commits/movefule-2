import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport } from "../../../migrations/dry-run.ts";

test("billing schema wave is typed, additive, default-deny, and excludes unsafe conflicts", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/billing-schema-wave.v1.json", import.meta.url), "utf8")) as any;
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8")) as any;
  const report = buildDryRunReport(manifest, snapshot);
  assert.deepEqual(manifest.resources.map((resource: any) => resource.id), ["usage_ledger", "subscription", "entitlement", "purchase_event", "webhook_event"]);
  assert.equal(manifest.resourcePolicy.defaultDeny, true);
  assert.equal(report.applyAllowed, true);
  assert.equal(report.reviewRequired, false);
  assert.deepEqual(report.operations.map((operation) => operation.action), ["verify_existing", "verify_existing", "verify_existing", "verify_existing", "verify_existing"]);
  assert.equal(manifest.resources.some((resource: any) => resource.id === "schema_migration"), false);
  assert.equal(manifest.resources.some((resource: any) => resource.id === "workout_session_revision"), false);
  assert.deepEqual(report.destructiveOperations, []);
});
