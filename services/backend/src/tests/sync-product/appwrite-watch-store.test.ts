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
    const key = `${String(tableId)}:${rowId}`;
    if (this.rows.has(key)) throw new Error("duplicate_row");
    const row = { ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.rows.set(key, row as AnyRow);
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

const summary = (revision = 4) => ({
  schemaVersion: 1 as const,
  source: "MOVEFUEL" as const,
  summaryId: "summary-watch-durable",
  revision,
  updatedAtEpochMillis: 1_700_000_000_004,
  energyKcal: 720,
  energyGoalKcal: 2_000,
  proteinGrams: 48,
  proteinGoalGrams: 130,
  movementMinutes: 22,
  movementGoalMinutes: 30,
  workoutState: "IDLE" as const,
});

test("Appwrite watch delivery and receipt survive adapter recreation", async () => {
  const repository = new FakeOwnerRepository();
  const first = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  const created = await first.createWatchDelivery("user-a", {
    phoneDeviceId: "phone-a",
    watchDeviceId: "watch-a",
    summary: summary(),
  });
  assert.equal(created.created, true);
  assert.equal(created.delivery.state, "PENDING");

  const recreated = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  const replay = await recreated.createWatchDelivery("user-a", {
    phoneDeviceId: "phone-a",
    watchDeviceId: "watch-a",
    summary: summary(),
  });
  assert.equal(replay.created, false);
  assert.equal(replay.delivery.deliveryId, created.delivery.deliveryId);

  const attempt = await recreated.markWatchAttempt("user-a", created.delivery.deliveryId, 1_700_000_000_100);
  assert.equal(attempt.attemptCount, 1);
  assert.equal(attempt.state, "SENT");

  const afterRestart = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  assert.equal((await afterRestart.listWatchDeliveries("user-a", "watch-a"))[0]?.attemptCount, 1);
  const receipt = await afterRestart.recordWatchReceipt("user-a", {
    deliveryId: created.delivery.deliveryId,
    summaryId: summary().summaryId,
    revision: summary().revision,
    watchDeviceId: "watch-a",
    result: "PERSISTED",
    receivedAtEpochMillis: 1_700_000_000_200,
  });
  assert.equal(receipt.outcome, "ACCEPTED");

  const finalRestart = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  const duplicate = await finalRestart.recordWatchReceipt("user-a", {
    deliveryId: created.delivery.deliveryId,
    summaryId: summary().summaryId,
    revision: summary().revision,
    watchDeviceId: "watch-a",
    result: "PERSISTED",
    receivedAtEpochMillis: 1_700_000_000_200,
  });
  assert.equal(duplicate.outcome, "DUPLICATE");
  assert.equal((await finalRestart.listWatchDeliveries("user-a", "watch-a"))[0]?.state, "ACKNOWLEDGED");
  await assert.rejects(
    finalRestart.markWatchAttempt("user-a", created.delivery.deliveryId, 1_700_000_000_300),
    /terminal watch delivery/i,
  );
});

test("Appwrite watch persistence is owner-scoped and stale receipts are replay-safe", async () => {
  const repository = new FakeOwnerRepository();
  const adapter = new AppwriteSyncProductAdapter(repository, { serverRepository: repository });
  const created = await adapter.createWatchDelivery("user-a", {
    phoneDeviceId: "phone-a",
    watchDeviceId: "watch-a",
    summary: summary(7),
  });
  assert.equal((await new AppwriteSyncProductAdapter(repository, { serverRepository: repository }).listWatchDeliveries("user-b", "watch-a")).length, 0);
  await assert.rejects(
    new AppwriteSyncProductAdapter(repository, { serverRepository: repository }).recordWatchReceipt("user-b", {
      deliveryId: created.delivery.deliveryId,
      summaryId: summary(7).summaryId,
      revision: 7,
      watchDeviceId: "watch-a",
      result: "PERSISTED",
      receivedAtEpochMillis: 1_700_000_000_300,
    }),
    /Watch delivery was not found/,
  );

  const stale = await new AppwriteSyncProductAdapter(repository, { serverRepository: repository }).recordWatchReceipt("user-a", {
    deliveryId: created.delivery.deliveryId,
    summaryId: summary(7).summaryId,
    revision: 6,
    watchDeviceId: "watch-a",
    result: "PERSISTED",
    receivedAtEpochMillis: 1_700_000_000_400,
  });
  assert.equal(stale.outcome, "STALE");
  assert.equal((await new AppwriteSyncProductAdapter(repository, { serverRepository: repository }).listWatchDeliveries("user-a", "watch-a"))[0]?.state, "PENDING");
  const duplicateStale = await new AppwriteSyncProductAdapter(repository, { serverRepository: repository }).recordWatchReceipt("user-a", {
    deliveryId: created.delivery.deliveryId,
    summaryId: summary(7).summaryId,
    revision: 6,
    watchDeviceId: "watch-a",
    result: "PERSISTED",
    receivedAtEpochMillis: 1_700_000_000_400,
  });
  assert.equal(duplicateStale.outcome, "DUPLICATE");
});
