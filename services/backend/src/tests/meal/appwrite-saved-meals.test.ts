import assert from "node:assert/strict";
import test from "node:test";
import type {
  OwnerScopedRepository,
  RepositoryListOptions,
  RepositoryRow,
} from "../../foundation/repository.ts";
import { MealContractError } from "../../meal/contracts.ts";
import { AppwriteSavedMealStore } from "../../meal/saved-meals.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

class FakeOwnerRepository implements OwnerScopedRepository {
  private readonly rows = new Map<string, AnyRow>();

  async listOwned<T extends Record<string, unknown>>(tableId: any, userId: string, options: RepositoryListOptions = {}) {
    let rows = [...this.rows.entries()]
      .filter(([key, row]) => key.startsWith(`${String(tableId)}:`) && row.userId === userId)
      .map(([, row]) => row) as RepositoryRow<T>[];
    for (const query of options.queries ?? []) {
      rows = rows.filter((row) => row[query.field] === query.value);
    }
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

  async deleteOwned(tableId: any, userId: string, rowId: string) {
    const key = `${String(tableId)}:${rowId}`;
    const current = this.rows.get(key);
    if (!current || current.userId !== userId) throw new Error("missing_owner");
    this.rows.delete(key);
  }
}

const items = [{
  displayName: "Rice bowl",
  portionGrams: 250,
  energyKcal: 400,
  proteinGrams: 12,
  carbGrams: 70,
  fatGrams: 8,
  fiberGrams: 4,
}];

test("Appwrite saved-meal adapter persists owner rows and replays deterministic retries", async () => {
  const store = new AppwriteSavedMealStore(new FakeOwnerRepository(), { now: () => 1_700_000_000_000 });
  const first = await store.create("user-a", { idempotencyKey: "remote-1", name: "Remote bowl", items });
  const duplicate = await store.create("user-a", { idempotencyKey: "remote-1", name: "Remote bowl", items });

  assert.equal(first.status, "CREATED");
  assert.equal(duplicate.status, "DUPLICATE");
  assert.equal((await store.list("user-a"))[0]?.items[0]?.displayName, "Rice bowl");
  assert.equal((await store.list("user-b")).length, 0);
  await assert.rejects(() => store.create("user-a", {
    idempotencyKey: "remote-1",
    name: "Changed bowl",
    items,
  }), (error: unknown) => error instanceof MealContractError && error.code === "idempotency_key_reused");
});
