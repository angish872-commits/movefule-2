import assert from "node:assert/strict";
import test from "node:test";

import type { AppwriteTablesClient, ListRowsRequest, ListRowsResult, OwnerScopedRepository, RepositoryRow } from "../../foundation/repository.ts";
import type { FoundationTableId } from "../../foundation/permissions.ts";
import { AppwriteExerciseCatalogStore } from "../../training/catalog-store.ts";
import { AppwriteTrainingPlanStore } from "../../training/plan-store.ts";
import { TrainingBackendService } from "../../training/training-service.ts";

class MemoryTables implements AppwriteTablesClient {
  readonly rows = new Map<string, RepositoryRow>();
  private key(tableId: FoundationTableId, rowId: string) { return `${tableId}:${rowId}`; }
  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const rows = [...this.rows.entries()].filter(([key]) => key.startsWith(`${request.tableId}:`)).map(([, row]) => row as RepositoryRow<T>);
    return { rows: rows.filter((row) => request.queries.every((query) => row[query.field] === query.value)), total: rows.length };
  }
  async getRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    return (this.rows.get(this.key(tableId, rowId)) as RepositoryRow<T> | undefined) ?? null;
  }
  async createRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: T): Promise<RepositoryRow<T>> {
    const key = this.key(tableId, rowId); if (this.rows.has(key)) throw new Error("duplicate");
    const row = { $id: rowId, ...data } as RepositoryRow<T>; this.rows.set(key, row); return row;
  }
  async updateRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const key = this.key(tableId, rowId); const prior = this.rows.get(key); if (!prior) throw new Error("missing");
    const row = { ...prior, ...data } as RepositoryRow<T>; this.rows.set(key, row); return row;
  }
  async deleteRow(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<void> { this.rows.delete(this.key(tableId, rowId)); }
}

class MemoryOwner implements OwnerScopedRepository {
  readonly rows = new Map<string, RepositoryRow>();
  private key(tableId: FoundationTableId, rowId: string) { return `${tableId}:${rowId}`; }
  async listOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string): Promise<ListRowsResult<T>> {
    const rows = [...this.rows.entries()].filter(([key, row]) => key.startsWith(`${tableId}:`) && row.userId === userId).map(([, row]) => row as RepositoryRow<T>); return { rows, total: rows.length };
  }
  async getOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string): Promise<RepositoryRow<T> | null> { const row = this.rows.get(this.key(tableId, rowId)); return row?.userId === userId ? row as RepositoryRow<T> : null; }
  async createOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T): Promise<RepositoryRow<T>> { const row = { $id: rowId, ...data, userId } as RepositoryRow<T>; this.rows.set(this.key(tableId, rowId), row); return row; }
  async updateOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> { const prior = await this.getOwned<T>(tableId, userId, rowId); if (!prior) throw new Error("missing"); const row = { ...prior, ...data, userId } as RepositoryRow<T>; this.rows.set(this.key(tableId, rowId), row); return row; }
  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string): Promise<void> { const prior = await this.getOwned(tableId, userId, rowId); if (prior) this.rows.delete(this.key(tableId, rowId)); }
}

function catalogRow(id: string, verified = true): RepositoryRow {
  return {
    $id: id, exerciseId: id, sourceRecordId: id, name: id, status: "ACTIVE", revision: 1, updatedAt: "2026-08-30T00:00:00.000Z",
    aliasesJson: "[]", movementPattern: id.includes("squat") ? "SQUAT" : id.includes("push") ? "PUSH" : id.includes("pull") ? "PULL" : id.includes("cardio") ? "CARDIO" : id.includes("hinge") ? "HINGE" : "CORE",
    primaryMusclesJson: "[]", secondaryMusclesJson: "[]", equipmentJson: "[]", environmentJson: JSON.stringify(["HOME"]), minimumExperience: "BEGINNER", skillLevel: "FOUNDATION",
    progressionJson: JSON.stringify(id.includes("cardio") ? ["TIME"] : ["REPS"]), substitutionGroup: id, contraindicationJson: "[]", fatigueCost: 0.4,
    sourceProvider: "reviewed-test", sourceVersion: "1", sourceLicense: "CC0-1.0", sourceLicenseReference: "https://example.test/license", sourceLicenseVerified: verified,
  };
}

function seedCatalog(tables: MemoryTables) {
  for (const id of ["squat-a", "push-a", "pull-a", "core-a", "hinge-a", "cardio-a"]) tables.rows.set(`exercise_catalog:${id}`, catalogRow(id));
  tables.rows.set("exercise_catalog:unverified", catalogRow("unverified", false));
}

test("Appwrite catalog adapter admits only provenance-complete verified ACTIVE exercises", async () => {
  const tables = new MemoryTables(); seedCatalog(tables);
  const catalog = await new AppwriteExerciseCatalogStore(tables).loadTrusted();
  assert.equal(catalog.exercises.length, 6);
  assert.equal(catalog.exercises.some((exercise) => exercise.source.recordId === "unverified"), false);
});

test("backend Training adapter persists immutable plan revision and steps idempotently", async () => {
  const tables = new MemoryTables(); seedCatalog(tables);
  const owner = new MemoryOwner();
  const service = new TrainingBackendService(new AppwriteExerciseCatalogStore(tables), new AppwriteTrainingPlanStore(owner, tables));
  const request = {
    userId: "u1",
    profile: { schemaVersion: 1, userId: "u1", goalCodes: ["GENERAL_FITNESS"], experienceBand: "BEGINNER", equipmentCodes: [], environmentCodes: ["HOME"], availabilityMinutesByDay: { MONDAY: 30 }, preferenceCodes: [], limitationCodes: [], unknownFields: [], revision: 1, updatedAt: "2026-08-30T00:00:00.000Z" },
    policyBand: "ADULT" as const,
    readiness: { energy: 8, sleepQuality: 8, motivation: 8, soreness: 2 }, history: [],
    availability: [{ localDate: "2026-08-31", weekday: "MONDAY", availableMinutes: 30 }], generatedAt: "2026-08-30T00:00:00.000Z", planRevision: 1,
  };
  const first = await service.generateAndPersist(request);
  assert.equal(first.result.status, "READY");
  assert.equal(first.persistence?.outcome, "CREATED");
  const second = await service.generateAndPersist(request);
  assert.equal(second.persistence?.outcome, "DUPLICATE");
  assert.equal([...tables.rows.keys()].some((key) => key.startsWith("workout_plan_revision:")), true);
  assert.equal([...tables.rows.keys()].filter((key) => key.startsWith("workout_plan_step:")).length >= 3, true);
  assert.equal([...owner.rows.keys()].filter((key) => key.startsWith("workout_plan:")).length, 1);
});

test("backend Training adapter rejects cross-user profile authority", async () => {
  const tables = new MemoryTables(); seedCatalog(tables);
  const service = new TrainingBackendService(new AppwriteExerciseCatalogStore(tables), new AppwriteTrainingPlanStore(new MemoryOwner(), tables));
  await assert.rejects(() => service.generateAndPersist({
    userId: "u1",
    profile: { schemaVersion: 1, userId: "u2", goalCodes: ["GENERAL_FITNESS"], experienceBand: "BEGINNER", equipmentCodes: [], environmentCodes: ["HOME"], availabilityMinutesByDay: { MONDAY: 30 }, preferenceCodes: [], limitationCodes: [], unknownFields: [], revision: 1, updatedAt: "2026-08-30T00:00:00.000Z" },
    policyBand: "ADULT", readiness: {}, history: [], availability: [], generatedAt: "2026-08-30T00:00:00.000Z", planRevision: 1,
  }), /training_profile_owner_mismatch/);
});
