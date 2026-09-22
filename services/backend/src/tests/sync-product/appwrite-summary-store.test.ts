import assert from "node:assert/strict";
import test from "node:test";
import type { OwnerScopedRepository, RepositoryListOptions, RepositoryRow, ServerOwnedRepository } from "../../foundation/repository.ts";
import { sha256 } from "../../domain/sync-store.ts";
import { AppwriteSyncProductAdapter } from "../../sync/appwrite-adapter.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

class FakeOwnerRepository implements OwnerScopedRepository, ServerOwnedRepository {
  private readonly rows = new Map<string, AnyRow>();

  async listOwned<T extends Record<string, unknown>>(tableId: any, userId: string, options: RepositoryListOptions = {}) {
    let rows = [...this.rows.entries()]
      .filter(([key, row]) => key.startsWith(`${String(tableId)}:`) && row.userId === userId)
      .map(([, row]) => row) as RepositoryRow<T>[];
    for (const query of options.queries ?? []) rows = rows.filter((row) => row[query.field] === query.value);
    return { rows, total: rows.length };
  }

  async getOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string) {
    const row = this.rows.get(`${String(tableId)}:${rowId}`);
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  async createOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: T) {
    const row = { ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.rows.set(`${String(tableId)}:${rowId}`, row as AnyRow);
    return row;
  }

  async updateOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: Partial<T>) {
    const key = `${String(tableId)}:${rowId}`;
    const current = this.rows.get(key);
    if (!current || current.userId !== userId) throw new Error("missing_owner");
    const row = { ...current, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.rows.set(key, row as AnyRow);
    return row;
  }

  async listForUser<T extends Record<string, unknown>>(tableId: any, userId: string, options: RepositoryListOptions = {}) {
    return this.listOwned<T>(tableId, userId, options);
  }

  async getForUser<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string) {
    return this.getOwned<T>(tableId, userId, rowId);
  }

  async createForUser<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: T) {
    return this.createOwned<T>(tableId, userId, rowId, data);
  }

  async updateForUser<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: Partial<T>) {
    return this.updateOwned<T>(tableId, userId, rowId, data);
  }

  async deleteOwned(tableId: any, userId: string, rowId: string) {
    const key = `${String(tableId)}:${rowId}`;
    const current = this.rows.get(key);
    if (!current || current.userId !== userId) throw new Error("missing_owner");
    this.rows.delete(key);
  }
}

const summary = (revision: number) => ({
  schemaVersion: 1 as const,
  source: "MOVEFUEL" as const,
  summaryId: "summary-appwrite-1",
  revision,
  updatedAtEpochMillis: 1_700_000_000_000 + revision,
  energyKcal: 500,
  energyGoalKcal: 2_000,
  proteinGrams: 30,
  proteinGoalGrams: 120,
  movementMinutes: 12,
  movementGoalMinutes: 30,
  workoutState: "IDLE" as const,
});

const operation = (revision: number, idempotencyKey = `appwrite-op-${revision}`) => ({
  operationId: idempotencyKey,
  entityType: "daily_summary" as const,
  entityId: "summary-appwrite-1",
  entityRevision: revision,
  operationType: "append_revision" as const,
  idempotencyKey,
  payload: summary(revision),
  payloadHash: sha256(summary(revision)),
});

test("Appwrite summary adapter persists across adapter recreation and isolates owners", async () => {
  const repository = new FakeOwnerRepository();
  const first = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  const pushed = await first.push("user-a", { schemaVersion: 1, deviceId: "phone-a", operations: [operation(1)] });
  assert.equal(pushed.results[0]?.status, "accepted");

  const recreated = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  const duplicate = await recreated.push("user-a", {
    schemaVersion: 1,
    deviceId: "phone-a",
    operations: [operation(1)],
  });
  assert.equal(duplicate.results[0]?.status, "duplicate");
  const pulled = await recreated.pull("user-a", { schemaVersion: 1, deviceId: "phone-a", cursor: 0 });
  assert.equal(pulled.summaries[0]?.summary.revision, 1);
  assert.equal((await recreated.pull("user-b", { schemaVersion: 1, deviceId: "phone-a", cursor: 0 })).summaries.length, 0);
});
