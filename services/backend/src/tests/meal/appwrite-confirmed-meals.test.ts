import assert from "node:assert/strict";
import test from "node:test";
import type { ConfirmedMeal } from "../../meal/contracts.ts";
import type { OwnerScopedRepository, RepositoryListOptions, RepositoryRow, ServerOwnedRepository } from "../../foundation/repository.ts";
import { AppwriteConfirmedMealStore } from "../../meal/confirmed-meals.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

class FakeOwnerRepository implements OwnerScopedRepository, ServerOwnedRepository {
  private readonly rows = new Map<string, AnyRow>();
  async listOwned<T extends Record<string, unknown>>(tableId: any, userId: string, options: RepositoryListOptions = {}) { let rows = [...this.rows.entries()].filter(([key,row]) => key.startsWith(`${String(tableId)}:`) && row.userId === userId).map(([,row]) => row) as RepositoryRow<T>[]; for (const query of options.queries ?? []) rows = rows.filter((row) => row[query.field] === query.value); return { rows, total: rows.length }; }
  async getOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string) { const row = this.rows.get(`${String(tableId)}:${rowId}`); return row?.userId === userId ? row as RepositoryRow<T> : null; }
  async createOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: T) { const row = { ...data, userId, $id: rowId } as RepositoryRow<T>; this.rows.set(`${String(tableId)}:${rowId}`, row as AnyRow); return row; }
  async updateOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: Partial<T>) { const key = `${String(tableId)}:${rowId}`; const current = this.rows.get(key); if (!current || current.userId !== userId) throw new Error("missing_owner"); const row = { ...current, ...data, userId, $id: rowId } as RepositoryRow<T>; this.rows.set(key,row as AnyRow); return row; }
  async deleteOwned(tableId: any, userId: string, rowId: string) { const key = `${String(tableId)}:${rowId}`; const current = this.rows.get(key); if (!current || current.userId !== userId) throw new Error("missing_owner"); this.rows.delete(key); }
  listForUser<T extends Record<string, unknown>>(tableId:any,userId:string,options:RepositoryListOptions={}) { return this.listOwned<T>(tableId,userId,options); }
  getForUser<T extends Record<string, unknown>>(tableId:any,userId:string,rowId:string) { return this.getOwned<T>(tableId,userId,rowId); }
  createForUser<T extends Record<string, unknown>>(tableId:any,userId:string,rowId:string,data:T) { return this.createOwned<T>(tableId,userId,rowId,data); }
  updateForUser<T extends Record<string, unknown>>(tableId:any,userId:string,rowId:string,data:Partial<T>) { return this.updateOwned<T>(tableId,userId,rowId,data); }
}

function meal(userId = "user-a"): ConfirmedMeal { return { mealId:"meal-1", userId, localDate:"2026-08-02", mealType:"lunch", status:"CONFIRMED", currentRevision:1, sourceDraftId:"draft-1", items:[{itemId:"item-1",displayName:"Rice bowl",portionGrams:250,energyKcal:400,proteinGrams:12,carbGrams:70,fatGrams:8,fiberGrams:4,confidence:"medium",energyRangeKcal:{min:360,max:440}}], totals:{energyKcal:400,proteinGrams:12,carbGrams:70,fatGrams:8,fiberGrams:4}, confirmedAtEpochMillis:1_700_000_000_000, createdAtEpochMillis:1_700_000_000_000, updatedAtEpochMillis:1_700_000_000_000 }; }

test("Appwrite confirmed meal adapter persists normalized child rows and rehydrates revisions", async () => { const repository = new FakeOwnerRepository(); const store = new AppwriteConfirmedMealStore(repository, repository, { now: () => 1_700_000_000_000 }); await store.persist("user-a", meal()); await store.persist("user-a", meal()); const listed = await store.list("user-a", "2026-08-02"); assert.equal(listed.length,1); assert.equal(listed[0]?.items[0]?.displayName,"Rice bowl"); assert.equal((await store.get("user-a","meal-1"))?.totals.energyKcal,400); assert.equal((await store.list("user-b")).length,0); assert.equal(await store.get("user-b","meal-1"),null); });

test("stale persisted confirmation cannot resurrect a newer deleted tombstone", async () => {
  const repository = new FakeOwnerRepository();
  const store = new AppwriteConfirmedMealStore(repository, repository, { now: () => 1_700_000_010_000 });
  const revision1 = meal();
  await store.persist("user-a", revision1);
  const tombstone: ConfirmedMeal = { ...revision1, status: "DELETED", currentRevision: 2, updatedAtEpochMillis: 1_700_000_010_000, deletedAtEpochMillis: 1_700_000_010_000 };
  await store.persist("user-a", tombstone);
  await store.persist("user-a", revision1);
  const current = await store.get("user-a", revision1.mealId);
  assert.equal(current?.status, "DELETED");
  assert.equal(current?.currentRevision, 2);
  assert.equal((await store.list("user-a", revision1.localDate)).length, 0);
});
