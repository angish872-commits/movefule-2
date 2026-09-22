import assert from "node:assert/strict";
import test from "node:test";
import type { RepositoryListOptions, RepositoryRow, ServerOwnedRepository } from "../../foundation/repository.ts";
import { AppwriteDeviceCommandStore } from "../../device/appwrite-device-commands.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;
class FakeServerRepository implements ServerOwnedRepository {
  private readonly rows = new Map<string, AnyRow>();
  async listForUser<T extends Record<string, unknown>>(tableId: any, userId: string, options: RepositoryListOptions = {}) { let rows = [...this.rows.entries()].filter(([key, value]) => key.startsWith(`${String(tableId)}:`) && value.userId === userId).map(([, value]) => value) as RepositoryRow<T>[]; for (const query of options.queries ?? []) rows = rows.filter((value) => value[query.field] === query.value); return { rows, total: rows.length }; }
  async getForUser<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string) { const value = this.rows.get(`${String(tableId)}:${rowId}`); return value?.userId === userId ? value as RepositoryRow<T> : null; }
  async createForUser<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: T) { const value = { ...data, userId, $id: rowId } as RepositoryRow<T>; this.rows.set(`${String(tableId)}:${rowId}`, value as AnyRow); return value; }
  async updateForUser<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: Partial<T>) { const key = `${String(tableId)}:${rowId}`; const prior = this.rows.get(key); if (!prior || prior.userId !== userId) throw new Error("missing_owner"); const value = { ...prior, ...data, userId, $id: rowId } as RepositoryRow<T>; this.rows.set(key, value as AnyRow); return value; }}

test("Appwrite device command adapter persists only trusted owner commands", async () => {
  const repository = new FakeServerRepository();
  const trust = { isTrustedWatch: async (userId: string, watchDeviceId: string) => userId === "user-a" && watchDeviceId === "watch-a" };
  const store = new AppwriteDeviceCommandStore(repository, trust, () => 1_754_000_000_000);
  const first = await store.enqueue("user-a", { idempotencyKey: "command-1", targetDeviceId: "watch-a", commandType: "RECONCILE", objectId: "summary-1", objectRevision: 1 });
  assert.equal(first.created, true);
  assert.equal((await store.enqueue("user-a", { idempotencyKey: "command-1", targetDeviceId: "watch-a", commandType: "RECONCILE", objectId: "summary-1", objectRevision: 1 })).created, false);
  assert.equal((await store.acknowledge("user-a", first.command.commandId, "ACKNOWLEDGED")).state, "ACKNOWLEDGED");
  assert.equal((await store.list("user-b")).length, 0);
});
