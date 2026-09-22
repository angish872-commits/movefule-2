import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Resource = {
  id: string;
  columns?: string[];
  indexes?: string[];
};

type Snapshot = { resources?: Resource[] };

export const WATCH_CONTRACTS = [
  {
    id: "watch_delivery",
    requiredColumns: [
      "deliveryId",
      "userId",
      "summaryId",
      "revision",
      "phoneDeviceId",
      "watchDeviceId",
      "state",
      "attemptCount",
      "lastAttemptAt",
      "payloadJson",
      "createdAt",
      "updatedAt",
    ],
    requiredIndexes: ["userId_summaryId_revision_watchDeviceId_unique", "userId_state"],
  },
  {
    id: "watch_receipt",
    requiredColumns: [
      "receiptId",
      "userId",
      "deliveryId",
      "summaryId",
      "revision",
      "result",
      "outcome",
      "persistedAt",
      "watchDeviceId",
      "receivedAt",
      "createdAt",
    ],
    requiredIndexes: ["watchDeviceId_summaryId_revision_result_unique", "deliveryId", "userId_receivedAt"],
  },
] as const;

export type WatchCompatibilityTable = {
  id: string;
  liveColumns: string[];
  liveIndexes: string[];
  missingColumns: string[];
  missingIndexes: string[];
  compatible: boolean;
};

export type WatchCompatibilityReport = {
  dryRun: true;
  contactsAppwrite: false;
  database: { id: "movefuel_mvp"; name: "MoveFuel MVP" };
  tables: WatchCompatibilityTable[];
  readyForFullLogicalPersistence: boolean;
  destructiveOperations: [];
  applyAllowed: false;
  note: string;
};

export function buildWatchCompatibilityReport(snapshot: Snapshot): WatchCompatibilityReport {
  const live = new Map((snapshot.resources ?? []).map((resource) => [resource.id, resource]));
  const tables = WATCH_CONTRACTS.map((contract) => {
    const resource = live.get(contract.id);
    const liveColumns = resource?.columns ?? [];
    const liveIndexes = resource?.indexes ?? [];
    const missingColumns = contract.requiredColumns.filter((column) => !liveColumns.includes(column));
    const missingIndexes = contract.requiredIndexes.filter((index) => !liveIndexes.includes(index));
    return {
      id: contract.id,
      liveColumns,
      liveIndexes,
      missingColumns,
      missingIndexes,
      compatible: Boolean(resource) && missingColumns.length === 0 && missingIndexes.length === 0,
    };
  });
  return {
    dryRun: true,
    contactsAppwrite: false,
    database: { id: "movefuel_mvp", name: "MoveFuel MVP" },
    tables,
    readyForFullLogicalPersistence: tables.every((table) => table.compatible),
    destructiveOperations: [],
    applyAllowed: false,
    note: "Read-only compatibility evidence. No table, column, index, row, permission, or migration-ledger value is created or changed.",
  };
}

if (process.argv[1]?.endsWith("watch-compatibility-preflight.ts")) {
  const snapshotPath = resolve(process.cwd(), process.argv[2] ?? "migrations/appwrite-snapshot-20260802.json");
  const outputPath = process.argv[3] ? resolve(process.cwd(), process.argv[3]) : undefined;
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as Snapshot;
  const report = buildWatchCompatibilityReport(snapshot);
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}
