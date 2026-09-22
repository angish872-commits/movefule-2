import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("watch sync persistence migration is typed, additive, owner-scoped, and complete", async () => {
  const migration = JSON.parse(await readFile(new URL("../../../migrations/watch-sync-persistence-wave.v1.json", import.meta.url), "utf8")) as any;
  assert.equal(migration.schemaVersion, 18);
  assert.equal(migration.status, "typed_additive_wave");
  assert.equal(migration.resourcePolicy.applyAllowed, true);
  assert.equal(migration.resourcePolicy.ownerField, "userId");
  assert.deepEqual(migration.resources.map((resource: any) => resource.id).sort(), ["watch_delivery", "watch_receipt"]);

  const delivery = migration.resources.find((resource: any) => resource.id === "watch_delivery");
  assert.equal(delivery.ownerField, "userId");
  for (const key of ["phoneDeviceId", "watchDeviceId", "attemptCount", "lastAttemptAt", "payloadJson", "updatedAt"]) {
    assert.ok(delivery.typedColumns.some((column: any) => column.key === key), `missing watch_delivery.${key}`);
  }
  assert.ok(delivery.indexDefinitions.some((index: any) => index.key === "userId_summaryId_revision_watchDeviceId_unique"));

  const receipt = migration.resources.find((resource: any) => resource.id === "watch_receipt");
  assert.equal(receipt.ownerField, "userId");
  for (const key of ["userId", "deliveryId", "result", "outcome", "persistedAt", "watchDeviceId", "receivedAt", "createdAt"]) {
    assert.ok(receipt.typedColumns.some((column: any) => column.key === key), `missing watch_receipt.${key}`);
  }
  assert.ok(receipt.indexDefinitions.some((index: any) => index.key === "userId_receivedAt"));
  assert.equal(JSON.stringify(migration).includes("API_KEY"), false);
});
