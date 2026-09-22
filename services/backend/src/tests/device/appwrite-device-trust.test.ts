import assert from "node:assert/strict";
import test from "node:test";
import type { OwnerScopedRepository, RepositoryListOptions, RepositoryRow } from "../../foundation/repository.ts";
import { AppwriteDeviceTrustStore } from "../../device/appwrite-device-trust.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;
class FakeOwnerRepository implements OwnerScopedRepository {
  private readonly rows = new Map<string, AnyRow>();
  async listOwned<T extends Record<string, unknown>>(tableId: any, userId: string, options: RepositoryListOptions = {}) {
    let rows = [...this.rows.entries()].filter(([key, value]) => key.startsWith(`${String(tableId)}:`) && value.userId === userId).map(([, value]) => value) as RepositoryRow<T>[];
    for (const query of options.queries ?? []) rows = rows.filter((value) => value[query.field] === query.value);
    return { rows, total: rows.length };
  }
  async getOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string) { const value = this.rows.get(`${String(tableId)}:${rowId}`); return value?.userId === userId ? value as RepositoryRow<T> : null; }
  async createOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: T) { const value = { ...data, userId, $id: rowId } as RepositoryRow<T>; this.rows.set(`${String(tableId)}:${rowId}`, value as AnyRow); return value; }
  async updateOwned<T extends Record<string, unknown>>(tableId: any, userId: string, rowId: string, data: Partial<T>) { const key = `${String(tableId)}:${rowId}`; const prior = this.rows.get(key); if (!prior || prior.userId !== userId) throw new Error("missing_owner"); const value = { ...prior, ...data, userId, $id: rowId } as RepositoryRow<T>; this.rows.set(key, value as AnyRow); return value; }
  async deleteOwned(tableId: any, userId: string, rowId: string) { const key = `${String(tableId)}:${rowId}`; this.rows.delete(key); }
  seed<T extends Record<string, unknown>>(tableId: string, rowId: string, data: T): void { this.rows.set(`${tableId}:${rowId}`, { ...data, $id: rowId } as AnyRow); }
}

test("Appwrite device trust adapter persists owner-scoped device_session rows", async () => {
  const store = new AppwriteDeviceTrustStore(new FakeOwnerRepository(), { now: () => 1_754_000_000_000 });
  const first = await store.trust("user-a", { phoneDeviceId: "phone-a", watchDeviceId: "watch-a", idempotencyKey: "trust-1" });
  assert.equal(first.created, true);
  assert.equal((await store.trust("user-a", { phoneDeviceId: "phone-a", watchDeviceId: "watch-a", idempotencyKey: "trust-2" })).created, false);
  assert.equal(await store.isTrustedPair("user-a", "phone-a", "watch-a"), true);
  assert.equal((await store.list("user-b")).length, 0);
  assert.equal((await store.revoke("user-a", first.session.deviceSessionId)).state, "REVOKED");
  assert.equal(await store.isTrustedPair("user-a", "phone-a", "watch-a"), false);
});

test("Appwrite device trust adapter rejects expired rows and creates a replacement", async () => {
  const now = 1_754_000_000_000;
  const repository = new FakeOwnerRepository();
  repository.seed("device_session", "expired-session", {
    deviceSessionId: "expired-session",
    userId: "user-a",
    phoneDeviceId: "phone-a",
    watchDeviceId: "watch-a",
    state: "ACTIVE",
    issuedAt: new Date(now - 10_000).toISOString(),
    expiresAt: new Date(now - 1).toISOString(),
  });
  const store = new AppwriteDeviceTrustStore(repository, { now: () => now });
  assert.equal(await store.isTrustedPair("user-a", "phone-a", "watch-a"), false);
  const replacement = await store.trust("user-a", { phoneDeviceId: "phone-a", watchDeviceId: "watch-a", idempotencyKey: "replacement-1" });
  assert.equal(replacement.created, true);
  assert.notEqual(replacement.session.deviceSessionId, "expired-session");
});
