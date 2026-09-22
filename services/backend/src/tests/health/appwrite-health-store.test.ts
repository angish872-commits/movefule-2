import assert from "node:assert/strict";
import test from "node:test";
import type { OwnerScopedRepository, RepositoryListOptions, RepositoryRow } from "../../foundation/repository.ts";
import { AppwriteHealthProjectionStore } from "../../health/health-store.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

class FakeOwnerRepository implements OwnerScopedRepository {
  private readonly rows = new Map<string, AnyRow>();
  async listOwned<T extends Record<string, unknown>>(tableId: any, userId: string, options: RepositoryListOptions = {}) {
    let rows = [...this.rows.entries()].filter(([key, value]) => key.startsWith(`${String(tableId)}:`) && value.userId === userId).map(([, value]) => value) as RepositoryRow<T>[];
    for (const query of options.queries ?? []) rows = rows.filter((value) => value[query.field] === query.value);
    return { rows, total: rows.length };
  }
  async getOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string) {
    const value = this.rows.get(`${String(tableId)}:${rowId}`);
    return value?.userId === userId ? value as RepositoryRow<T> : null;
  }
  async createOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: T) {
    const value = { ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.rows.set(`${String(tableId)}:${rowId}`, value as AnyRow);
    return value;
  }
  async updateOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: Partial<T>) {
    const key = `${String(tableId)}:${rowId}`;
    const prior = this.rows.get(key);
    if (!prior || prior.userId !== userId) throw new Error("missing_owner");
    const value = { ...prior, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.rows.set(key, value as AnyRow);
    return value;
  }
  async deleteOwned(tableId: any, userId: string, rowId: string) {
    const key = `${String(tableId)}:${rowId}`;
    const prior = this.rows.get(key);
    if (!prior || prior.userId !== userId) throw new Error("missing_owner");
    this.rows.delete(key);
  }
}

const input = {
  connectionId: "health-a",
  platform: "android_health_connect" as const,
  sourceName: "Health Connect",
  permissionState: "GRANTED" as const,
  dataType: "steps",
  samples: [{
    localDate: "2026-08-03",
    value: 1234,
    unit: "count",
    measuredStart: "2026-08-03T00:00:00.000Z",
    measuredEnd: "2026-08-03T23:59:59.000Z",
  }],
  cursorToken: "opaque-cursor",
};

test("Appwrite health adapter persists typed owner rows and rehydrates without raw samples", async () => {
  const repository = new FakeOwnerRepository();
  const store = new AppwriteHealthProjectionStore(repository, { now: () => 1_754_000_000_000 });
  const first = await store.import("user-a", input);
  assert.equal(first.imported, 1);
  assert.equal(first.cursorStored, true);
  assert.equal((await repository.listOwned("health_connection", "user-a")).total, 1);
  assert.equal((await repository.listOwned("health_import_cursor", "user-a")).total, 1);
  assert.equal((await repository.listOwned("health_sample_summary", "user-a")).total, 1);
  const summaries = await store.listSummaries("user-a", "2026-08-03", "steps");
  assert.equal(summaries.length, 1);
  assert.equal((await store.listConnections("user-b")).length, 0);
  const duplicate = await store.import("user-a", input);
  assert.equal(duplicate.imported, 0);
  assert.equal(duplicate.duplicates, 1);
});
