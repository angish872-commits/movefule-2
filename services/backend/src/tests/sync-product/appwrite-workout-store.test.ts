import assert from "node:assert/strict";
import test from "node:test";
import type { OwnerScopedRepository, RepositoryListOptions, RepositoryRow, ServerOwnedRepository } from "../../foundation/repository.ts";
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

test("Appwrite workout adapter rehydrates lifecycle state from session and event rows", async () => {
  const repository = new FakeOwnerRepository();
  const first = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  const started = await first.startWorkout("user-a", {
    idempotencyKey: "workout-start",
    authorityDeviceId: "phone-a",
    workoutType: "walk",
    occurredAtEpochMillis: 1_000,
  });
  assert.equal(started.session.state, "PREPARING");
  const sessionId = started.session.sessionId;

  const recreated = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  const active = await recreated.transitionWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-active",
    authorityDeviceId: "phone-a",
    action: "start",
    expectedRevision: 1,
    occurredAtEpochMillis: 1_100,
  });
  assert.equal(active.session.state, "ACTIVE");

  const restarted = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  const ending = await restarted.transitionWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-ending",
    authorityDeviceId: "phone-a",
    action: "end",
    expectedRevision: 2,
    occurredAtEpochMillis: 2_100,
  });
  assert.equal(ending.session.state, "ENDING");
  assert.equal(ending.session.elapsedSeconds, 1);

  const completed = await new AppwriteSyncProductAdapter(repository, { serverRepository: repository }).completeWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-complete",
    authorityDeviceId: "phone-a",
    expectedRevision: 3,
    occurredAtEpochMillis: 2_200,
    summary: { distanceMeters: 900, sourcePlatform: "demo" },
  });
  assert.equal(completed.session.state, "COMPLETED");
  assert.equal(completed.session.elapsedSeconds, 1);
  assert.equal((await new AppwriteSyncProductAdapter(repository, { serverRepository: repository }).completeWorkout("user-a", {
    sessionId,
    idempotencyKey: "workout-complete",
    authorityDeviceId: "phone-a",
    expectedRevision: 3,
    occurredAtEpochMillis: 2_200,
    summary: { distanceMeters: 900, sourcePlatform: "demo" },
  })).outcome, "DUPLICATE");
  await assert.rejects(
    new AppwriteSyncProductAdapter(repository, { serverRepository: repository }).transitionWorkout("user-b", {
      sessionId,
      idempotencyKey: "cross-user",
      authorityDeviceId: "phone-a",
      action: "start",
      expectedRevision: 1,
      occurredAtEpochMillis: 3_000,
    }),
    /Workout session was not found/,
  );
});
