import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildWatchCompatibilityReport } from "../../../migrations/watch-compatibility-preflight.ts";

test("watch compatibility preflight blocks full logical persistence on the current live table shape", async () => {
  const snapshot = JSON.parse(await readFile(new URL("../../../migrations/appwrite-snapshot-20260802.json", import.meta.url), "utf8")) as {
    resources: Array<{ id: string; columns: string[]; indexes: string[] }>;
  };
  const report = buildWatchCompatibilityReport(snapshot);
  assert.equal(report.applyAllowed, false);
  assert.equal(report.readyForFullLogicalPersistence, false);
  assert.equal(report.destructiveOperations.length, 0);

  const delivery = report.tables.find((table) => table.id === "watch_delivery");
  assert.deepEqual(delivery?.missingColumns, ["phoneDeviceId", "watchDeviceId", "attemptCount", "lastAttemptAt", "payloadJson", "updatedAt"]);
  assert.deepEqual(delivery?.missingIndexes, ["userId_summaryId_revision_watchDeviceId_unique"]);

  const receipt = report.tables.find((table) => table.id === "watch_receipt");
  assert.deepEqual(receipt?.missingColumns, ["deliveryId", "result", "persistedAt", "watchDeviceId", "receivedAt"]);
  assert.deepEqual(receipt?.missingIndexes, ["watchDeviceId_summaryId_revision_result_unique", "deliveryId", "userId_receivedAt"]);
});
