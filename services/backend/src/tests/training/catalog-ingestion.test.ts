import assert from "node:assert/strict";
import test from "node:test";
import type { FoundationTableId } from "../../foundation/permissions.ts";
import type { AppwriteTablesClient, ListRowsRequest, ListRowsResult, RepositoryRow } from "../../foundation/repository.ts";
import { ExerciseCatalogIngestionService, classifyExerciseSourceBatches, type ExerciseSourceBatch } from "../../training/catalog-ingestion.ts";

class MemoryTables implements AppwriteTablesClient {
  readonly rows = new Map<string, RepositoryRow>();
  readonly creates: string[] = [];
  readonly updates: string[] = [];
  private key(tableId: FoundationTableId, rowId: string) { return `${tableId}:${rowId}`; }
  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const rows = [...this.rows.entries()].filter(([key]) => key.startsWith(`${request.tableId}:`)).map(([, row]) => row as RepositoryRow<T>);
    return { rows, total: rows.length };
  }
  async getRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    return (this.rows.get(this.key(tableId, rowId)) as RepositoryRow<T> | undefined) ?? null;
  }
  async createRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: T): Promise<RepositoryRow<T>> {
    assert.equal(tableId, "exercise_catalog");
    const row = { $id: rowId, ...data } as RepositoryRow<T>;
    this.rows.set(this.key(tableId, rowId), row);
    this.creates.push(rowId);
    return row;
  }
  async updateRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    assert.equal(tableId, "exercise_catalog");
    const key = this.key(tableId, rowId);
    const prior = this.rows.get(key);
    if (!prior) throw new Error("missing");
    const row = { ...prior, ...data } as RepositoryRow<T>;
    this.rows.set(key, row);
    this.updates.push(rowId);
    return row;
  }
  async deleteRow(): Promise<void> { throw new Error("exercise_catalog_ingestion_never_deletes"); }
}

const validRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "push-up",
  name: "Push Up",
  movementPattern: "PUSH",
  environmentCodes: ["HOME"],
  level: "BEGINNER",
  fatigueCost: 0.35,
  progressionCompatibility: ["REPS"],
  substitutionGroup: "PUSH_BODYWEIGHT",
  primaryMuscles: ["CHEST"],
  ...overrides,
});

const trustedBatch = (overrides: Partial<ExerciseSourceBatch> = {}): ExerciseSourceBatch => ({
  provider: "reviewed-provider",
  sourceVersion: "2026-08-30",
  license: "CC-BY-4.0",
  licenseReference: "https://example.test/exercise-data-license",
  licenseVerified: true,
  records: [validRecord()],
  ...overrides,
});

test("trusted exercise import preserves provider, record id, version and exercise-data license provenance", async () => {
  const tables = new MemoryTables();
  const result = await new ExerciseCatalogIngestionService(tables).import([trustedBatch()], "2026-08-30T04:00:00.000Z");
  assert.equal(result.trusted, 1);
  assert.equal(result.unverified, 0);
  assert.equal(result.rejected, 0);
  assert.equal(result.created, 1);
  const row = [...tables.rows.values()][0]!;
  assert.equal(row.status, "ACTIVE");
  assert.equal(row.sourceProvider, "reviewed-provider");
  assert.equal(row.sourceRecordId, "push-up");
  assert.equal(row.sourceVersion, "2026-08-30");
  assert.equal(row.sourceLicense, "CC-BY-4.0");
  assert.equal(row.sourceLicenseReference, "https://example.test/exercise-data-license");
  assert.equal(row.sourceLicenseVerified, true);
  assert.equal(row.revision, 1);
});

test("unknown exercise-data license is UNVERIFIED and cannot enter the production trusted catalog", async () => {
  const tables = new MemoryTables();
  const result = await new ExerciseCatalogIngestionService(tables).import([trustedBatch({
    license: null,
    licenseReference: null,
    licenseVerified: false,
  })]);
  assert.equal(result.trusted, 0);
  assert.equal(result.unverified, 1);
  assert.equal(result.created, 0);
  assert.equal(tables.rows.size, 0);
});

test("unknown provider/version provenance is UNVERIFIED rather than silently trusted", () => {
  const result = classifyExerciseSourceBatches([trustedBatch({ provider: "", sourceVersion: "" })]);
  assert.equal(result.length, 1);
  assert.equal(result[0]!.status, "UNVERIFIED");
  assert.ok(result[0]!.reasonCodes.includes("SOURCE_PROVIDER_MISSING"));
  assert.ok(result[0]!.reasonCodes.includes("SOURCE_VERSION_MISSING"));
});

test("invalid exercise fields remain REJECTED even when provenance is also incomplete", () => {
  const result = classifyExerciseSourceBatches([trustedBatch({
    license: null,
    licenseReference: null,
    licenseVerified: false,
    records: [validRecord({ movementPattern: "UNKNOWN_MOVEMENT" })],
  })]);
  assert.equal(result[0]!.status, "REJECTED");
  assert.ok(result[0]!.reasonCodes.includes("MOVEMENT_PATTERN_MISSING_OR_UNSUPPORTED"));
});

test("image/media license fields never substitute for verified exercise-data licensing", () => {
  const result = classifyExerciseSourceBatches([trustedBatch({
    license: null,
    licenseReference: null,
    licenseVerified: false,
    records: [validRecord({
      license: "CC0-1.0",
      licenseReference: "https://example.test/image-license",
      imageLicense: "CC0-1.0",
      mediaLicense: "CC0-1.0",
    })],
  })]);
  assert.equal(result[0]!.status, "UNVERIFIED");
  assert.ok(result[0]!.reasonCodes.includes("SOURCE_LICENSE_MISSING"));
  assert.ok(result[0]!.reasonCodes.includes("SOURCE_LICENSE_NOT_VERIFIED"));
});

test("canonical deduplication is deterministic before production import", async () => {
  const tables = new MemoryTables();
  const result = await new ExerciseCatalogIngestionService(tables).import([
    trustedBatch({ provider: "z-provider", records: [validRecord({ id: "z-push" })] }),
    trustedBatch({ provider: "a-provider", records: [validRecord({ id: "a-push" })] }),
  ], "2026-08-30T04:00:00.000Z");
  assert.equal(result.trusted, 2);
  assert.equal(result.created, 1);
  const row = [...tables.rows.values()][0]!;
  assert.equal(row.sourceProvider, "a-provider");
  assert.equal(row.sourceRecordId, "a-push");
});

test("repeating the same trusted import is idempotent and does not increment revision", async () => {
  const tables = new MemoryTables();
  const service = new ExerciseCatalogIngestionService(tables);
  const first = await service.import([trustedBatch()], "2026-08-30T04:00:00.000Z");
  const second = await service.import([trustedBatch()], "2026-08-30T05:00:00.000Z");
  assert.equal(first.created, 1);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.unchanged, 1);
  assert.equal([...tables.rows.values()][0]!.revision, 1);
});

test("reviewed source metadata change increments catalog revision and preserves the reviewed provenance fields", async () => {
  const tables = new MemoryTables();
  const service = new ExerciseCatalogIngestionService(tables);
  await service.import([trustedBatch()], "2026-08-30T04:00:00.000Z");
  const changed = await service.import([trustedBatch({ sourceVersion: "2026-08-31" })], "2026-08-31T04:00:00.000Z");
  assert.equal(changed.created, 0);
  assert.equal(changed.updated, 1);
  const row = [...tables.rows.values()][0]!;
  assert.equal(row.sourceProvider, "reviewed-provider");
  assert.equal(row.sourceRecordId, "push-up");
  assert.equal(row.sourceVersion, "2026-08-31");
  assert.equal(row.sourceLicense, "CC-BY-4.0");
  assert.equal(row.sourceLicenseReference, "https://example.test/exercise-data-license");
  assert.equal(row.revision, 2);
});
