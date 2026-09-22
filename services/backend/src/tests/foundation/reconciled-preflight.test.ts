import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildPreflightReport, buildReconciledManifest } from "../../../migrations/reconciled-preflight.ts";

test("reconciled migration pool exposes current additive resources without logical naming conflicts", async () => {
  const manifest = await buildReconciledManifest();
  assert.equal(manifest.resources.length, 81);
  assert.equal(manifest.resources.filter((resource) => resource.status === "typed_verified").length, 74);
  assert.equal(manifest.resources.filter((resource) => resource.status === "logical_core_contract").length, 7);
  assert.deepEqual(manifest.heldSourceDefinitions, []);

  const actual = {
    resources: manifest.resources.map((resource) => ({
      id: resource.id,
      columns: resource.columns,
      indexes: resource.indexes,
      rowSecurity: true,
      ...(resource.id === "schema_migrations"
        ? { rowCount: 16 }
        : {}),
    })),
  };
  const report = buildPreflightReport(manifest, actual);
  assert.equal(report.missingResources.length, 0);
  assert.deepEqual(report.missingColumns, {});
  assert.deepEqual(report.missingIndexes, {});
  assert.equal(report.migrationLedger.shapeVerified, true);
  assert.equal(report.migrationLedger.semanticCheck, "unavailable_sanitized_snapshot");
  assert.equal(report.applyAllowed, false);
});

test("current manifests and sanitized snapshot report the four pending additive resources", async () => {
  const manifest = await buildReconciledManifest();
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8")) as Parameters<typeof buildPreflightReport>[1];
  const report = buildPreflightReport(manifest, snapshot);

  assert.deepEqual(report.canonicalLogicalAudit.unexpectedLiveIds, []);
  assert.deepEqual(report.canonicalLogicalAudit.canonicalOnlyIds, ["calendar_entry", "calendar_revision", "daily_summary", "serving_prior_observation"]);
  assert.deepEqual(report.canonicalLogicalAudit.approvedCanonicalOnlyIds, ["calendar_entry", "calendar_revision", "daily_summary", "serving_prior_observation"]);
  assert.deepEqual(report.canonicalLogicalAudit.unexpectedCanonicalIds, []);
  assert.deepEqual(report.canonicalLogicalAudit.missingLogicalFromCanonicalIds, []);
  assert.deepEqual(report.canonicalLogicalAudit.missingLogicalIds, ["workout_session_revision"]);
  assert.deepEqual(report.canonicalLogicalAudit.ledgerAuthority, {
    id: "schema_migrations",
    presentInCanonical: true,
    presentInLive: true,
    conflictingLogicalIds: [],
  });
  assert.deepEqual(report.missingResources, ["calendar_entry", "calendar_revision", "serving_prior_observation", "workout_session_revision"]);
  assert.equal(report.migrationLedger.shapeVerified, true);
  assert.equal(report.migrationLedger.semanticCheck, "unavailable_sanitized_snapshot");
  assert.equal(report.applyAllowed, false);
});

test("preflight verifies migration row identity when a non-sanitized ledger inspection is supplied", async () => {
  const manifest = await buildReconciledManifest();
  const report = buildPreflightReport(manifest, {
    resources: manifest.resources.map((resource) => ({
      ...resource,
      rowSecurity: true,
      ...(resource.id === "schema_migrations"
        ? { rowCount: 2, rowIds: ["bootstrap_20260802", "core_v2_20260802"] }
        : {}),
    })),
  });

  assert.equal(report.migrationLedger.semanticCheck, "verified");
  assert.deepEqual(report.migrationLedger.semanticErrors, []);
});

test("preflight reports an unexpected live ID and keeps schema_migrations as the only ledger authority", async () => {
  const manifest = await buildReconciledManifest();
  const report = buildPreflightReport(manifest, {
    resources: [
      ...manifest.resources.map((resource) => ({
        ...resource,
        rowSecurity: true,
      })),
      {
        kind: "table",
        id: "untracked_live_table",
        name: "Untracked live table",
        columns: [],
        indexes: [],
        rowSecurity: true,
        ownerField: null,
      },
    ],
  });

  assert.deepEqual(report.canonicalLogicalAudit.unexpectedLiveIds, ["untracked_live_table"]);
  assert.equal(report.canonicalLogicalAudit.ledgerAuthority.id, "schema_migrations");
  assert.deepEqual(report.canonicalLogicalAudit.ledgerAuthority.conflictingLogicalIds, []);
  assert.equal(report.applyAllowed, false);
  assert.equal(report.reviewRequired, true);
});
