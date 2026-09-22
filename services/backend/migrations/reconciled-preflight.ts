import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ColumnDefinition = { key: string; [key: string]: unknown };
type IndexDefinition = { key: string; [key: string]: unknown };
type Resource = {
  kind: "table";
  id: string;
  name: string;
  columns: string[];
  indexes: string[];
  rowSecurity: boolean;
  ownerField: string | null;
  typedColumns?: ColumnDefinition[];
  indexDefinitions?: IndexDefinition[];
  [key: string]: unknown;
};

export const LEDGER_AUTHORITY = "schema_migrations" as const;

const APPROVED_CANONICAL_ONLY_IDS = new Set<string>(["calendar_entry", "calendar_revision", "daily_summary", "serving_prior_observation"]);

export type CanonicalLogicalAudit = {
  logicalIds: string[];
  canonicalIds: string[];
  liveIds: string[];
  canonicalOnlyIds: string[];
  approvedCanonicalOnlyIds: string[];
  unexpectedCanonicalIds: string[];
  unexpectedLiveIds: string[];
  missingLogicalFromCanonicalIds: string[];
  missingLogicalIds: string[];
  ledgerAuthority: {
    id: typeof LEDGER_AUTHORITY;
    presentInCanonical: boolean;
    presentInLive: boolean;
    conflictingLogicalIds: string[];
  };
};

export type ReconciledManifest = {
  migrationId: "movefuel_reconciled_typed_catalog_v1";
  schemaVersion: 1;
  mode: "verify_existing_and_create_missing_only";
  source: string[];
  logicalIds: string[];
  heldSourceDefinitions: string[];
  database: { id: "movefuel_mvp"; name: "MoveFuel MVP" };
  resources: Resource[];
};

export type PreflightReport = {
  dryRun: true;
  contactsAppwrite: false;
  migrationId: ReconciledManifest["migrationId"];
  database: ReconciledManifest["database"];
  manifestTableCount: number;
  typedResourceCount: number;
  logicalCoreResourceCount: number;
  liveTableCount: number;
  liveColumnCount: number;
  liveIndexCount: number;
  canonicalLogicalAudit: CanonicalLogicalAudit;
  missingResources: string[];
  missingColumns: Record<string, string[]>;
  missingIndexes: Record<string, string[]>;
  heldSourceDefinitions: string[];
  migrationLedger: {
    present: boolean;
    rowCount: number;
    columns: string[];
    indexes: string[];
    shapeVerified: boolean;
    semanticCheck: "verified" | "unavailable_sanitized_snapshot" | "invalid";
    semanticErrors: string[];
  };
  destructiveOperations: [];
  reviewRequired: boolean;
  applyAllowed: false;
  note: string;
};

const here = dirname(fileURLToPath(import.meta.url));

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

function resourceFor(raw: Resource): Resource {
  const typed = Array.isArray(raw.typedColumns) && Array.isArray(raw.indexDefinitions);
  const columns = [...new Set([
    ...(raw.columns ?? []),
    ...(raw.typedColumns ?? []).map((column) => column.key),
  ])];
  const indexes = [...new Set([
    ...(raw.indexes ?? []),
    ...(raw.indexDefinitions ?? []).map((index) => index.key),
  ])];
  return {
    ...raw,
    columns,
    indexes,
    ...(typed ? { requiresReview: false, status: "typed_verified" } : { status: "logical_core_contract" }),
  };
}

function mergeDefinitions<T extends { key: string }>(left: readonly T[] = [], right: readonly T[] = []): T[] {
  const merged = new Map(left.map((definition) => [definition.key, definition]));
  for (const definition of right) merged.set(definition.key, definition);
  return [...merged.values()];
}

function mergeResource(previous: Resource | undefined, next: Resource): Resource {
  if (!previous) return next;
  const typedColumns = mergeDefinitions(previous.typedColumns, next.typedColumns);
  const indexDefinitions = mergeDefinitions(previous.indexDefinitions, next.indexDefinitions);
  const columns = [...new Set([
    ...previous.columns,
    ...next.columns,
    ...typedColumns.map((column) => column.key),
  ])];
  const indexes = [...new Set([
    ...previous.indexes,
    ...next.indexes,
    ...indexDefinitions.map((index) => index.key),
  ])];
  const typed = typedColumns.length > 0 && indexDefinitions.length > 0;
  return {
    ...previous,
    ...next,
    columns,
    indexes,
    ...(typedColumns.length > 0 ? { typedColumns } : {}),
    ...(indexDefinitions.length > 0 ? { indexDefinitions } : {}),
    ...(typed ? { requiresReview: false, status: "typed_verified" } : { status: "logical_core_contract" }),
  };
}

function difference(left: readonly string[], right: ReadonlySet<string>): string[] {
  return [...new Set(left)].filter((id) => !right.has(id)).sort();
}

function buildCanonicalLogicalAudit(
  logicalIds: readonly string[],
  canonicalIds: readonly string[],
  liveIds: readonly string[],
): CanonicalLogicalAudit {
  const logical = new Set(logicalIds);
  const canonical = new Set(canonicalIds);
  const live = new Set(liveIds);
  const canonicalOnlyIds = difference(canonicalIds, logical);
  const approvedCanonicalOnlyIds = canonicalOnlyIds.filter((id) => APPROVED_CANONICAL_ONLY_IDS.has(id));
  return {
    logicalIds: [...new Set(logicalIds)].sort(),
    canonicalIds: [...new Set(canonicalIds)].sort(),
    liveIds: [...new Set(liveIds)].sort(),
    canonicalOnlyIds,
    approvedCanonicalOnlyIds,
    unexpectedCanonicalIds: canonicalOnlyIds.filter((id) => !APPROVED_CANONICAL_ONLY_IDS.has(id)),
    unexpectedLiveIds: difference(liveIds, canonical),
    missingLogicalFromCanonicalIds: difference(logicalIds, canonical),
    missingLogicalIds: difference(logicalIds, live),
    ledgerAuthority: {
      id: LEDGER_AUTHORITY,
      presentInCanonical: canonical.has(LEDGER_AUTHORITY),
      presentInLive: live.has(LEDGER_AUTHORITY),
      conflictingLogicalIds: [...new Set(logicalIds)].filter((id) => id === "schema_migration").sort(),
    },
  };
}

export async function buildReconciledManifest(): Promise<ReconciledManifest> {
  const files = (await readdir(here))
    .filter((file) => file === "manifest.v1.json" || /-wave\.v1\.json$/.test(file))
    .sort((left, right) => {
      const priority = (file: string): number =>
        file === "manifest.v1.json" ? 0 : file === "contracts-data-foundation-wave.v1.json" ? 2 : 1;
      return priority(left) - priority(right) || left.localeCompare(right);
    });
  const resources = new Map<string, Resource>();
  for (const file of files) {
    const manifest = await readJson<{ resources: Resource[] }>(resolve(here, file));
    for (const raw of manifest.resources) {
      const next = resourceFor(raw);
      const previous = resources.get(next.id);
      resources.set(next.id, mergeResource(previous, next));
    }
  }
  const fullSpec = await readJson<{ resources: Resource[] }>(resolve(here, "full-spec-manifest.v1.json"));
  const canonicalIds = new Set(resources.keys());
  const heldSourceDefinitions = fullSpec.resources
    .map((resource) => resource.id)
    .filter((id) => !canonicalIds.has(id));
  return {
    migrationId: "movefuel_reconciled_typed_catalog_v1",
    schemaVersion: 1,
    mode: "verify_existing_and_create_missing_only",
    source: files.map((file) => resolve(here, file)),
    logicalIds: fullSpec.resources.map((resource) => resource.id),
    heldSourceDefinitions,
    database: { id: "movefuel_mvp", name: "MoveFuel MVP" },
    resources: [...resources.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function buildPreflightReport(manifest: ReconciledManifest, actual: { resources?: Resource[] } = {}): PreflightReport {
  const live = new Map((actual.resources ?? []).map((resource) => [resource.id, resource]));
  const canonicalLogicalAudit = buildCanonicalLogicalAudit(
    manifest.logicalIds,
    manifest.resources.map((resource) => resource.id),
    [...live.keys()],
  );
  const missingResources: string[] = [];
  const missingColumns: Record<string, string[]> = {};
  const missingIndexes: Record<string, string[]> = {};
  let liveColumnCount = 0;
  let liveIndexCount = 0;
  for (const resource of actual.resources ?? []) {
    liveColumnCount += resource.columns?.length ?? 0;
    liveIndexCount += resource.indexes?.length ?? 0;
  }
  for (const resource of manifest.resources) {
    const current = live.get(resource.id);
    if (!current) {
      missingResources.push(resource.id);
      continue;
    }
    const currentColumns = new Set(current.columns ?? []);
    const currentIndexes = new Set(current.indexes ?? []);
    const columns = resource.columns.filter((column) => !currentColumns.has(column));
    const indexes = resource.indexes.filter((index) => !currentIndexes.has(index));
    if (columns.length > 0) missingColumns[resource.id] = columns;
    if (indexes.length > 0) missingIndexes[resource.id] = indexes;
  }
  const ledger = live.get(LEDGER_AUTHORITY);
  const expectedLedgerColumns = ["migrationId", "schemaVersion", "checksum", "state", "resourceSummaryJson", "createdAt", "updatedAt"];
  const expectedLedgerIndexes = ["migrationId_schemaVersion_unique"];
  const shapeVerified = Boolean(ledger &&
    expectedLedgerColumns.every((column) => ledger.columns?.includes(column)) &&
    expectedLedgerIndexes.every((index) => ledger.indexes?.includes(index)) &&
    ledger.rowSecurity === true);
  const ledgerRowIds = Array.isArray((ledger as Record<string, unknown> | undefined)?.rowIds)
    ? ((ledger as Record<string, unknown>).rowIds as unknown[]).filter((value): value is string => typeof value === "string")
    : [];
  const rowCount = Number((ledger as Record<string, unknown> | undefined)?.rowCount ?? 0);
  const semanticErrors = ledgerRowIds.length === 0 && rowCount > 0
    ? ["Sanitized snapshot omits migration row identifiers and checksums."]
    : ledgerRowIds.length > 0 && new Set(ledgerRowIds).size !== ledgerRowIds.length
      ? ["Migration row identifiers are not unique."]
      : ledgerRowIds.length > 0 && ledgerRowIds.length !== rowCount
        ? ["Migration row identifier count does not match rowCount."]
        : [];
  const semanticCheck: PreflightReport["migrationLedger"]["semanticCheck"] = !ledger
    ? "invalid"
    : semanticErrors.length > 0 && ledgerRowIds.length > 0
      ? "invalid"
      : semanticErrors.length > 0
        ? "unavailable_sanitized_snapshot"
        : "verified";
  return {
    dryRun: true,
    contactsAppwrite: false,
    migrationId: manifest.migrationId,
    database: manifest.database,
    manifestTableCount: manifest.resources.length,
    typedResourceCount: manifest.resources.filter((resource) => resource.status === "typed_verified").length,
    logicalCoreResourceCount: manifest.resources.filter((resource) => resource.status === "logical_core_contract").length,
    liveTableCount: live.size,
    liveColumnCount,
    liveIndexCount,
    canonicalLogicalAudit,
    missingResources,
    missingColumns,
    missingIndexes,
    heldSourceDefinitions: manifest.heldSourceDefinitions,
    migrationLedger: {
      present: Boolean(ledger),
      rowCount,
      columns: ledger?.columns ?? [],
      indexes: ledger?.indexes ?? [],
      shapeVerified,
      semanticCheck,
      semanticErrors,
    },
    destructiveOperations: [],
    reviewRequired: manifest.heldSourceDefinitions.length > 0 || missingResources.length > 0 ||
      Object.keys(missingColumns).length > 0 || Object.keys(missingIndexes).length > 0 || !shapeVerified ||
      canonicalLogicalAudit.unexpectedCanonicalIds.length > 0 || canonicalLogicalAudit.unexpectedLiveIds.length > 0 ||
      canonicalLogicalAudit.missingLogicalIds.length > 0 || !canonicalLogicalAudit.ledgerAuthority.presentInCanonical ||
      !canonicalLogicalAudit.ledgerAuthority.presentInLive || semanticCheck !== "verified",
    applyAllowed: false,
    note: "Sanitized preflight only. No Appwrite resource, column, index, row, permission, or ledger record is created or changed.",
  };
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  const manifest = await buildReconciledManifest();
  const snapshotPath = resolve(process.cwd(), process.argv[2] ?? "migrations/appwrite-snapshot-20260802.json");
  const snapshot = await readJson<{ resources?: Resource[] }>(snapshotPath);
  const report = buildPreflightReport(manifest, snapshot);
  const outputPath = process.argv[3] ? resolve(process.cwd(), process.argv[3]) : undefined;
  if (outputPath) await writeFile(outputPath, `${JSON.stringify({ manifest, report }, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}
