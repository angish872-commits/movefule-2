import assert from "node:assert/strict";
import test from "node:test";
import type { AppwriteTablesClient, ListRowsRequest, ListRowsResult, OwnerScopedRepository, RepositoryRow, ServerOwnedRepository } from "../../foundation/repository.ts";
import type { FoundationTableId } from "../../foundation/permissions.ts";
import type { ProfileResult } from "../../foundation/profile.ts";
import { AppwriteExerciseCatalogStore } from "../../training/catalog-store.ts";
import { TrainingGenerationCoordinator, TrainingGenerationError } from "../../training/generation-coordinator.ts";
import { AppwriteTrainingPlanStore } from "../../training/plan-store.ts";
import { TrainingRuntimeInputBuilder } from "../../training/runtime-input.ts";
import { TrainingBackendService } from "../../training/training-service.ts";
import type { StoredTrainingSetup } from "../../training/setup-service.ts";

class MemoryTables implements AppwriteTablesClient {
  readonly rows = new Map<string, RepositoryRow>();
  private key(tableId: FoundationTableId, rowId: string) { return `${tableId}:${rowId}`; }
  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const rows = [...this.rows.entries()].filter(([key]) => key.startsWith(`${request.tableId}:`)).map(([, row]) => row as RepositoryRow<T>);
    const filtered = rows.filter((row) => request.queries.every((query) => {
      const value = row[query.field];
      if (query.operator === "equal") return value === query.value;
      if (query.operator === "lessThan") return typeof value === "number" && value < query.value;
      if (query.operator === "lessThanEqual") return typeof value === "number" && value <= query.value;
      if (query.operator === "greaterThan") return typeof value === "number" && value > query.value;
      return typeof value === "number" && value >= query.value;
    }));
    return { rows: filtered, total: filtered.length };
  }
  async getRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    return (this.rows.get(this.key(tableId, rowId)) as RepositoryRow<T> | undefined) ?? null;
  }
  async createRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: T): Promise<RepositoryRow<T>> {
    const key = this.key(tableId, rowId);
    if (this.rows.has(key)) throw new Error("duplicate");
    const row = { $id: rowId, ...data } as RepositoryRow<T>;
    this.rows.set(key, row);
    return row;
  }
  async updateRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const key = this.key(tableId, rowId);
    const prior = this.rows.get(key);
    if (!prior) throw new Error("missing");
    const row = { ...prior, ...data } as RepositoryRow<T>;
    this.rows.set(key, row);
    return row;
  }
  async deleteRow(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<void> { this.rows.delete(this.key(tableId, rowId)); }
}

class MemoryOwner implements OwnerScopedRepository {
  readonly rows = new Map<string, RepositoryRow>();
  private key(tableId: FoundationTableId, rowId: string) { return `${tableId}:${rowId}`; }
  async listOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string): Promise<ListRowsResult<T>> {
    const rows = [...this.rows.entries()].filter(([key, row]) => key.startsWith(`${tableId}:`) && row.userId === userId).map(([, row]) => row as RepositoryRow<T>);
    return { rows, total: rows.length };
  }
  async getOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string): Promise<RepositoryRow<T> | null> {
    const row = this.rows.get(this.key(tableId, rowId)); return row?.userId === userId ? row as RepositoryRow<T> : null;
  }
  async createOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T): Promise<RepositoryRow<T>> {
    const key = this.key(tableId, rowId); if (this.rows.has(key)) throw new Error("duplicate");
    const row = { $id: rowId, ...data, userId } as RepositoryRow<T>; this.rows.set(key, row); return row;
  }
  async updateOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const prior = await this.getOwned<T>(tableId, userId, rowId); if (!prior) throw new Error("missing");
    const row = { ...prior, ...data, userId } as RepositoryRow<T>; this.rows.set(this.key(tableId, rowId), row); return row;
  }
  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string): Promise<void> {
    const prior = await this.getOwned(tableId, userId, rowId); if (prior) this.rows.delete(this.key(tableId, rowId));
  }
}

class MemoryServer implements ServerOwnedRepository {
  readonly rows = new Map<string, RepositoryRow>();
  private key(tableId: FoundationTableId, rowId: string) { return `${tableId}:${rowId}`; }
  async listForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string): Promise<ListRowsResult<T>> {
    const rows = [...this.rows.entries()].filter(([key, row]) => key.startsWith(`${tableId}:`) && row.userId === userId).map(([, row]) => row as RepositoryRow<T>);
    return { rows, total: rows.length };
  }
  async getForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string): Promise<RepositoryRow<T> | null> {
    const row = this.rows.get(this.key(tableId, rowId)); return row?.userId === userId ? row as RepositoryRow<T> : null;
  }
  async createForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T): Promise<RepositoryRow<T>> {
    const key = this.key(tableId, rowId); if (this.rows.has(key)) throw new Error("duplicate");
    const row = { $id: rowId, ...data, userId } as RepositoryRow<T>; this.rows.set(key, row); return row;
  }
  async updateForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const prior = await this.getForUser<T>(tableId, userId, rowId); if (!prior) throw new Error("missing");
    const row = { ...prior, ...data, userId } as RepositoryRow<T>; this.rows.set(this.key(tableId, rowId), row); return row;
  }
}

function catalogRow(id: string): RepositoryRow {
  return {
    $id: id, exerciseId: id, sourceRecordId: id, name: id, status: "ACTIVE", revision: 1, updatedAt: "2026-08-30T00:00:00.000Z",
    aliasesJson: "[]", movementPattern: id.includes("squat") ? "SQUAT" : id.includes("push") ? "PUSH" : id.includes("pull") ? "PULL" : id.includes("hinge") ? "HINGE" : "CORE",
    primaryMusclesJson: "[]", secondaryMusclesJson: "[]", equipmentJson: "[]", environmentJson: "[\"HOME\"]", minimumExperience: "BEGINNER", skillLevel: "FOUNDATION",
    progressionJson: "[\"REPS\"]", substitutionGroup: id, contraindicationJson: "[]", fatigueCost: 0.4,
    sourceProvider: "reviewed-test", sourceVersion: "1", sourceLicense: "CC0-1.0", sourceLicenseReference: "https://example.test/license", sourceLicenseVerified: true,
  };
}

const profileResult: ProfileResult = {
  userId: "u1", source: "appwrite",
  profile: { $id: "u1", userId: "u1", dateOfBirth: "2000-01-01", timeZone: "UTC", revision: 1, updatedAt: "2026-08-30T00:00:00.000Z" },
  onboarding: {}, preferences: {}, goal: { goalType: "GENERAL_FITNESS" }, target: null,
};
const setup: StoredTrainingSetup = {
  experienceBand: "BEGINNER", equipmentCodes: [], environmentCodes: ["HOME"], availabilityMinutesByDay: { MONDAY: 30 }, preferenceCodes: [], limitationCodes: [], revision: 1, updatedAt: "2026-08-30T00:00:00.000Z",
};

function fixture(withSetup = true) {
  const tables = new MemoryTables();
  for (const id of ["squat-a", "push-a", "pull-a", "core-a", "hinge-a"]) tables.rows.set(`exercise_catalog:${id}`, catalogRow(id));
  const owner = new MemoryOwner();
  const server = new MemoryServer();
  const planStore = new AppwriteTrainingPlanStore(owner, tables);
  const runtime = new TrainingRuntimeInputBuilder({
    profileFor: async () => profileResult,
    setupFor: async () => withSetup ? setup : null,
    canonicalHistoryFor: async () => [],
    workoutSessionsFor: async () => [],
    workoutSummariesFor: async () => [],
    planStepsForRevision: async () => [],
    calendarFor: async () => ({ revision: null, entries: [] }),
    wellnessFor: async () => [],
  });
  const training = new TrainingBackendService(new AppwriteExerciseCatalogStore(tables), planStore);
  const coordinator = new TrainingGenerationCoordinator({ runtimeInputs: runtime, training, plans: planStore, idempotency: server, now: () => new Date("2026-08-30T03:00:00.000Z") });
  return { tables, owner, server, planStore, coordinator };
}

test("same canonical generation operation replays one stable plan revision", async () => {
  const { coordinator, owner } = fixture();
  const command = { idempotencyKey: "generate-1", expectedPlanRevision: 0 };
  const first = await coordinator.generate("u1", command);
  const second = await coordinator.generate("u1", command);
  assert.equal(first.status, "READY");
  assert.equal(second.status, "READY");
  if (first.status !== "READY" || second.status !== "READY") return;
  assert.equal(first.plan.planId, second.plan.planId);
  assert.equal(first.plan.planRevision, 1);
  assert.deepEqual(second.plan, first.plan);
  assert.equal(second.persistenceOutcome, "RECOVERED");
  assert.equal([...owner.rows.keys()].filter((key) => key.startsWith("workout_plan:")).length, 1);
});

test("stale expected revision is rejected before another plan is created", async () => {
  const { coordinator } = fixture();
  await coordinator.generate("u1", { idempotencyKey: "generate-1", expectedPlanRevision: 0 });
  await assert.rejects(
    coordinator.generate("u1", { idempotencyKey: "generate-2", expectedPlanRevision: 0 }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "stale_plan_revision",
  );
});

test("same idempotency key with different payload is rejected", async () => {
  const { coordinator } = fixture();
  await coordinator.generate("u1", { idempotencyKey: "generate-1", expectedPlanRevision: 0 });
  await assert.rejects(
    coordinator.generate("u1", { idempotencyKey: "generate-1", expectedPlanRevision: 1 }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "idempotency_key_reused",
  );
});

test("response-loss recovery uses immutable revision provenance even when journal row is missing", async () => {
  const { coordinator, server, tables } = fixture();
  const command = { idempotencyKey: "generate-loss", expectedPlanRevision: 0 };
  const first = await coordinator.generate("u1", command);
  assert.equal(first.status, "READY");
  for (const key of [...server.rows.keys()]) if (key.startsWith("idempotency_key:")) server.rows.delete(key);
  const before = [...tables.rows.keys()].filter((key) => key.startsWith("workout_plan_revision:")).length;
  const replay = await coordinator.generate("u1", command);
  const after = [...tables.rows.keys()].filter((key) => key.startsWith("workout_plan_revision:")).length;
  assert.equal(replay.status, "READY");
  assert.equal(before, after);
  if (replay.status === "READY") assert.equal(replay.persistenceOutcome, "RECOVERED");
});

test("missing setup produces blocking setup action without canonical plan mutation", async () => {
  const { coordinator, owner, server } = fixture(false);
  const result = await coordinator.generate("u1", { idempotencyKey: "missing-setup", expectedPlanRevision: 0 });
  assert.equal(result.status, "MISSING_INFORMATION");
  if (result.status !== "MISSING_INFORMATION") return;
  assert.equal(result.setupAction.domain, "TRAINING");
  assert.equal(result.setupAction.type, "TRAINING_SETUP");
  assert.equal(result.setupAction.blockingState, "BLOCKING");
  assert.equal([...owner.rows.keys()].some((key) => key.startsWith("workout_plan:")), false);
  assert.equal([...server.rows.keys()].some((key) => key.startsWith("idempotency_key:")), false);
});