import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDryRunReport, type Manifest } from "../../../migrations/dry-run.ts";

const manifestPath = new URL("../../../migrations/manifest.v1.json", import.meta.url);

test("core manifest contains the approved auth and vertical-slice tables", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const tableIds = manifest.resources.map((resource) => resource.id);
  assert.deepEqual(tableIds, [
    "user_profile",
    "user_identity",
    "user_session_metadata",
    "onboarding_progress",
    "consent_record",
    "user_preference",
    "privacy_preference",
    "user_goal",
    "target_revision",
    "device_session",
    "audit_event",
    "idempotency_key",
    "device",
    "meal_draft",
    "meal_draft_revision",
    "meal_analysis_request",
    "meal",
    "meal_revision",
    "meal_item",
    "daily_summary",
    "sync_operation",
    "watch_delivery",
    "watch_receipt",
    "schema_migrations",
  ]);
  assert.equal(new Set(tableIds).size, tableIds.length);
  assert.ok(manifest.resources.every((resource) => resource.permissions === "default_deny_owner_scoped" || resource.permissions === "default_deny_server_only"));
});

test("sanitized existing snapshot stays report-only and stops on the empty migration ledger", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const report = buildDryRunReport(manifest, {
    database: { id: "movefuel_mvp", name: "MoveFuel MVP" },
    resources: [{ kind: "table", id: "schema_migrations", columns: [], indexes: [] }],
  });
  const ledger = report.operations.find((operation) => operation.id === "schema_migrations");
  assert.equal(ledger?.action, "inspect_and_stop_for_review");
  assert.equal(report.reviewRequired, true);
  assert.equal(report.applyAllowed, false);
  assert.deepEqual(report.destructiveOperations, []);
  assert.equal(report.contactsAppwrite, false);
});

test("bootstrapped migration ledger is verified and the dry run is idempotent", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const report = buildDryRunReport(manifest, {
    database: { id: "movefuel_mvp", name: "MoveFuel MVP" },
    resources: [{
      kind: "table",
      id: "schema_migrations",
      columns: ["migrationId", "schemaVersion", "checksum", "state", "resourceSummaryJson", "createdAt", "updatedAt"],
      indexes: ["migrationId_schemaVersion_unique"],
    }],
  });
  const ledger = report.operations.find((operation) => operation.id === "schema_migrations");
  assert.equal(ledger?.action, "verify_existing");
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});

test("saved meal wave is typed, owner-scoped, and idempotent against the deployed snapshot", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../migrations/saved-meal-wave.v1.json", import.meta.url), "utf8")) as Manifest & {
    resourcePolicy: { applyAllowed: boolean };
  };
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8"));
  assert.equal(manifest.schemaVersion, 5);
  assert.equal(manifest.resources.length, 2);
  assert.ok(manifest.resources.every((resource) => resource.ownerField === "userId"));
  assert.ok(manifest.resources.every((resource) => resource.permissions.length === 0));
  assert.ok(manifest.resources.every((resource) => Array.isArray(resource.typedColumns)));
  const report = buildDryRunReport(manifest, snapshot);
  assert.ok(report.operations.every((operation) => operation.action === "verify_existing"));
  assert.equal(report.reviewRequired, false);
  assert.equal(report.applyAllowed, true);
  assert.deepEqual(report.destructiveOperations, []);
});
