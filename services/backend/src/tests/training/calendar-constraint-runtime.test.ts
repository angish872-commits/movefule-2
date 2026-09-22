import assert from "node:assert/strict";
import test from "node:test";
import type { AppwriteTablesClient, ListRowsRequest, ListRowsResult, OwnerScopedRepository, RepositoryRow, ServerOwnedRepository } from "../../foundation/repository.ts";
import type { FoundationTableId } from "../../foundation/permissions.ts";
import type { ProfileResult } from "../../foundation/profile.ts";
import { AppwriteExerciseCatalogStore } from "../../training/catalog-store.ts";
import { TrainingGenerationCoordinator, TrainingGenerationError, type TrainingCalendarConstraint } from "../../training/generation-coordinator.ts";
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

function fixture() {
  const tables = new MemoryTables();
  for (const id of ["squat-a", "push-a", "pull-a", "core-a", "hinge-a"]) tables.rows.set(`exercise_catalog:${id}`, catalogRow(id));
  const owner = new MemoryOwner();
  const server = new MemoryServer();
  const planStore = new AppwriteTrainingPlanStore(owner, tables);
  const runtime = new TrainingRuntimeInputBuilder({
    profileFor: async () => profileResult,
    setupFor: async () => setup,
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

type SessionView = {
  semanticSessionId: string;
  localDate: string;
  expectedDurationMinutes: number;
  exercises: readonly Record<string, unknown>[];
};

function firstSession(plan: { sessions: readonly unknown[] }): SessionView {
  const raw = plan.sessions[0];
  assert.ok(raw && typeof raw === "object" && !Array.isArray(raw));
  const session = raw as Record<string, unknown>;
  assert.equal(typeof session.semanticSessionId, "string");
  assert.equal(typeof session.localDate, "string");
  assert.equal(typeof session.expectedDurationMinutes, "number");
  assert.ok(Array.isArray(session.exercises));
  return {
    semanticSessionId: session.semanticSessionId as string,
    localDate: session.localDate as string,
    expectedDurationMinutes: session.expectedDurationMinutes as number,
    exercises: session.exercises as readonly Record<string, unknown>[],
  };
}

async function baseline() {
  const state = fixture();
  const generated = await state.coordinator.generate("u1", { idempotencyKey: "baseline", expectedPlanRevision: 0 });
  assert.equal(generated.status, "READY");
  if (generated.status !== "READY") throw new Error("baseline_training_not_ready");
  return { ...state, generated, session: firstSession(generated.plan) };
}

function immutableRevisionCount(tables: MemoryTables): number {
  return [...tables.rows.keys()].filter((key) => key.startsWith("workout_plan_revision:")).length;
}

test("Calendar exact-duration constraint is validated before immutable persistence", async () => {
  const { coordinator, session, tables } = await baseline();
  const result = await coordinator.generate("u1", {
    idempotencyKey: "calendar-exact",
    expectedPlanRevision: 1,
    calendarConstraint: { localDate: session.localDate, semanticSessionId: session.semanticSessionId, availableMinutes: session.expectedDurationMinutes },
  });
  assert.equal(result.status, "READY");
  if (result.status !== "READY") return;
  assert.equal(firstSession(result.plan).expectedDurationMinutes, session.expectedDurationMinutes);
  assert.equal(immutableRevisionCount(tables), 2);
});

test("Calendar shorter-duration constraint deterministically regenerates within the allowed window", async () => {
  const { coordinator, session } = await baseline();
  const availableMinutes = 20;
  const result = await coordinator.generate("u1", {
    idempotencyKey: "calendar-shorter",
    expectedPlanRevision: 1,
    calendarConstraint: { localDate: session.localDate, semanticSessionId: session.semanticSessionId, availableMinutes },
  });
  assert.equal(result.status, "READY");
  if (result.status !== "READY") return;
  const adapted = firstSession(result.plan);
  assert.equal(adapted.semanticSessionId, session.semanticSessionId);
  assert.equal(adapted.localDate, session.localDate);
  assert.ok(adapted.expectedDurationMinutes <= availableMinutes);
});

test("Calendar duration below 10 minutes fails closed before generation mutation", async () => {
  const { coordinator, session, tables } = await baseline();
  const before = immutableRevisionCount(tables);
  await assert.rejects(
    coordinator.generate("u1", {
      idempotencyKey: "calendar-too-short",
      expectedPlanRevision: 1,
      calendarConstraint: { localDate: session.localDate, semanticSessionId: session.semanticSessionId, availableMinutes: 9 },
    }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "invalid_training_generation",
  );
  assert.equal(immutableRevisionCount(tables), before);
});

test("Calendar duration above allowed maximum is rejected", async () => {
  const { coordinator, session, tables } = await baseline();
  const before = immutableRevisionCount(tables);
  await assert.rejects(
    coordinator.generate("u1", {
      idempotencyKey: "calendar-too-long",
      expectedPlanRevision: 1,
      calendarConstraint: { localDate: session.localDate, semanticSessionId: session.semanticSessionId, availableMinutes: 241 },
    }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "invalid_training_generation",
  );
  assert.equal(immutableRevisionCount(tables), before);
});

test("Calendar adaptation rejects a date outside canonical Training availability", async () => {
  const { coordinator, session, tables } = await baseline();
  const before = immutableRevisionCount(tables);
  await assert.rejects(
    coordinator.generate("u1", {
      idempotencyKey: "calendar-unknown-date",
      expectedPlanRevision: 1,
      calendarConstraint: { localDate: "2099-01-01", semanticSessionId: session.semanticSessionId, availableMinutes: 20 },
    }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "invalid_training_generation",
  );
  assert.equal(immutableRevisionCount(tables), before);
});

test("Calendar adaptation requires a semantic Training session", async () => {
  const { coordinator, session, tables } = await baseline();
  const before = immutableRevisionCount(tables);
  await assert.rejects(
    coordinator.generate("u1", {
      idempotencyKey: "calendar-no-session",
      expectedPlanRevision: 1,
      calendarConstraint: { localDate: session.localDate, semanticSessionId: "", availableMinutes: 20 },
    }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "invalid_training_generation",
  );
  assert.equal(immutableRevisionCount(tables), before);
});

test("Calendar constraint participates in idempotency: same key + same constraint replays", async () => {
  const { coordinator, session, tables } = await baseline();
  const command = {
    idempotencyKey: "calendar-replay",
    expectedPlanRevision: 1,
    calendarConstraint: { localDate: session.localDate, semanticSessionId: session.semanticSessionId, availableMinutes: 20 },
  };
  const first = await coordinator.generate("u1", command);
  const afterFirst = immutableRevisionCount(tables);
  const replay = await coordinator.generate("u1", command);
  assert.equal(first.status, "READY");
  assert.equal(replay.status, "READY");
  if (replay.status === "READY") assert.equal(replay.persistenceOutcome, "RECOVERED");
  assert.equal(immutableRevisionCount(tables), afterFirst);
});

test("Calendar constraint participates in idempotency: same key + different constraint conflicts", async () => {
  const { coordinator, session, tables } = await baseline();
  await coordinator.generate("u1", {
    idempotencyKey: "calendar-conflict",
    expectedPlanRevision: 1,
    calendarConstraint: { localDate: session.localDate, semanticSessionId: session.semanticSessionId, availableMinutes: 20 },
  });
  const before = immutableRevisionCount(tables);
  await assert.rejects(
    coordinator.generate("u1", {
      idempotencyKey: "calendar-conflict",
      expectedPlanRevision: 1,
      calendarConstraint: { localDate: session.localDate, semanticSessionId: session.semanticSessionId, availableMinutes: 21 },
    }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "idempotency_key_reused",
  );
  assert.equal(immutableRevisionCount(tables), before);
});

test("Calendar cannot directly prescribe exercises, sets, reps, or progression through its constraint", async () => {
  const clean = await baseline();
  const dirty = await baseline();
  const allowed: TrainingCalendarConstraint = {
    localDate: clean.session.localDate,
    semanticSessionId: clean.session.semanticSessionId,
    availableMinutes: 20,
  };
  const malicious = {
    localDate: dirty.session.localDate,
    semanticSessionId: dirty.session.semanticSessionId,
    availableMinutes: 20,
    exercises: ["calendar-chosen-exercise"],
    sets: 99,
    reps: 999,
    progression: "FORCE_PROGRESS",
  } as TrainingCalendarConstraint;
  const cleanResult = await clean.coordinator.generate("u1", { idempotencyKey: "clean-adapt", expectedPlanRevision: 1, calendarConstraint: allowed });
  const dirtyResult = await dirty.coordinator.generate("u1", { idempotencyKey: "dirty-adapt", expectedPlanRevision: 1, calendarConstraint: malicious });
  assert.equal(cleanResult.status, "READY");
  assert.equal(dirtyResult.status, "READY");
  if (cleanResult.status !== "READY" || dirtyResult.status !== "READY") return;
  const cleanSession = firstSession(cleanResult.plan);
  const dirtySession = firstSession(dirtyResult.plan);
  assert.deepEqual(dirtySession.exercises, cleanSession.exercises);
  assert.deepEqual(dirtyResult.plan.progressionVersion, cleanResult.plan.progressionVersion);
  assert.equal(JSON.stringify(dirtyResult.plan).includes("calendar-chosen-exercise"), false);
  assert.equal(JSON.stringify(dirtyResult.plan).includes("FORCE_PROGRESS"), false);
});

test("failed semantic-session constraint cannot create an immutable plan revision", async () => {
  const { coordinator, session, tables } = await baseline();
  const before = immutableRevisionCount(tables);
  await assert.rejects(
    coordinator.generate("u1", {
      idempotencyKey: "calendar-missing-semantic",
      expectedPlanRevision: 1,
      calendarConstraint: { localDate: session.localDate, semanticSessionId: "training-session-does-not-exist", availableMinutes: 20 },
    }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "training_generation_recovery_failed",
  );
  assert.equal(immutableRevisionCount(tables), before, "pre-persistence Calendar validation must prevent immutable publication");
});