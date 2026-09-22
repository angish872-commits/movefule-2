import assert from "node:assert/strict";
import test from "node:test";

import { AppwriteCalendarStore } from "../../calendar/appwrite-calendar-store.ts";
import { CalendarService } from "../../calendar/calendar-service.ts";
import type { CalendarEntryDraft, SyncEnvelope } from "../../calendar/types.ts";
import { sha256 } from "../../domain/sync-store.ts";
import type {
  FoundationTableId,
  ListRowsResult,
  OwnerScopedRepository,
  RepositoryListOptions,
  RepositoryRow,
  ServerOwnedRepository,
} from "../../foundation/index.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

class MemoryRepository implements OwnerScopedRepository, ServerOwnedRepository {
  readonly tables = new Map<FoundationTableId, Map<string, AnyRow>>();

  private table(tableId: FoundationTableId): Map<string, AnyRow> {
    let table = this.tables.get(tableId);
    if (!table) {
      table = new Map();
      this.tables.set(tableId, table);
    }
    return table;
  }

  private list<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options: RepositoryListOptions = {}): ListRowsResult<T> {
    const rows = [...this.table(tableId).values()]
      .filter((row) => row.userId === userId)
      .filter((row) => (options.queries ?? []).every((query) => query.operator !== "equal" || row[query.field] === query.value))
      .slice(0, options.limit ?? 100) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  private get<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string): RepositoryRow<T> | null {
    const row = this.table(tableId).get(rowId);
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  private create<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T): RepositoryRow<T> {
    const table = this.table(tableId);
    if (table.has(rowId)) throw new Error("duplicate_row");
    const row = { ...data, userId, $id: rowId } as RepositoryRow<T>;
    table.set(rowId, row as AnyRow);
    return row;
  }

  private update<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>): RepositoryRow<T> {
    const current = this.get<T>(tableId, userId, rowId);
    if (!current) throw new Error("missing_row");
    const row = { ...current, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.table(tableId).set(rowId, row as AnyRow);
    return row;
  }

  async listOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options?: RepositoryListOptions) { return this.list<T>(tableId, userId, options); }
  async getOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string) { return this.get<T>(tableId, userId, rowId); }
  async createOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T) { return this.create(tableId, userId, rowId, data); }
  async updateOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>) { return this.update(tableId, userId, rowId, data); }
  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string) { if (this.get(tableId, userId, rowId)) this.table(tableId).delete(rowId); }
  async listForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options?: RepositoryListOptions) { return this.list<T>(tableId, userId, options); }
  async getForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string) { return this.get<T>(tableId, userId, rowId); }
  async createForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T) { return this.create(tableId, userId, rowId, data); }
  async updateForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>) { return this.update(tableId, userId, rowId, data); }
}

const now = () => new Date("2026-09-01T10:00:00.000Z");

function entry(overrides: Partial<CalendarEntryDraft> = {}): CalendarEntryDraft {
  return {
    entryId: "missed-workout",
    semanticObjectType: "WORKOUT",
    semanticObjectId: "session-a",
    startAt: "2026-09-01T07:00:00.000Z",
    endAt: "2026-09-01T08:00:00.000Z",
    timezone: "UTC",
    localDate: "2026-09-01",
    status: "MISSED",
    locked: false,
    reasonCodes: ["MISSED_WORKOUT"],
    ...overrides,
  };
}

function syncEnvelope(
  operationId: string,
  operation: string,
  expectedRevision: number,
  payload: Record<string, unknown>,
): SyncEnvelope<unknown> {
  return {
    schemaVersion: 1,
    operationId,
    idempotencyKey: operationId,
    payloadHash: sha256(payload),
    deviceId: "phone-a",
    deviceSessionId: "device-session-a",
    sourcePlatform: "ANDROID",
    entityType: "calendar",
    entityId: "primary",
    operation,
    expectedEntityRevision: expectedRevision,
    clientSequence: null,
    occurredAtUtc: now().toISOString(),
    occurredLocalDate: "2026-09-01",
    timezone: "UTC",
    payload,
  };
}

async function setup(sourceState: "ACTIVE" | "COMPLETED" = "ACTIVE") {
  const repository = new MemoryRepository();
  await repository.createOwned("device", "user-a", "phone-a", {
    deviceId: "phone-a", userId: "user-a", platform: "ANDROID", deviceClass: "PHONE", appVersion: "1",
  });
  await repository.createOwned("device_session", "user-a", "device-session-a", {
    deviceSessionId: "device-session-a", userId: "user-a", phoneDeviceId: "phone-a", watchDeviceId: "watch-a",
    state: "ACTIVE", issuedAt: now().toISOString(),
  });
  await repository.createOwned("workout_session", "user-a", "session-a", {
    sessionId: "session-a", userId: "user-a", state: sourceState, currentRevision: 3,
    authorityDeviceId: "phone-a", workoutType: "canonical-plan", createdAt: "2026-09-01T06:30:00.000Z",
  });

  const store = new AppwriteCalendarStore(repository, { now, nowMillis: () => now().getTime() });
  const seedPayload = { action: "seed-calendar" };
  const seed = await store.publish("user-a", {
    envelope: syncEnvelope("seed-calendar", "MOVE_CALENDAR_ENTRY", 0, seedPayload),
    expectedCalendarRevision: 0,
    entries: [
      entry(),
      entry({
        entryId: "locked-busy",
        semanticObjectType: "UNAVAILABLE",
        semanticObjectId: "locked-busy",
        startAt: "2026-09-01T12:00:00.000Z",
        endAt: "2026-09-01T13:00:00.000Z",
        status: "LOCKED",
        locked: true,
        reasonCodes: ["USER_UNAVAILABLE"],
      }),
      entry({
        entryId: "normal-busy",
        semanticObjectType: "OTHER",
        semanticObjectId: "normal-busy",
        startAt: "2026-09-01T15:00:00.000Z",
        endAt: "2026-09-01T16:00:00.000Z",
        status: "SCHEDULED",
        locked: false,
        reasonCodes: ["OTHER_COMMITMENT"],
      }),
    ],
    reasonCodes: ["SEED"],
  });
  assert.equal(seed.outcome, "ACCEPTED");
  return {
    repository,
    store,
    service: new CalendarService(store, repository, repository, { now }),
  };
}

function reschedulePayload(startAt: string, endAt: string) {
  return {
    entryId: "missed-workout",
    resolution: "RESCHEDULE",
    reasonCode: "USER_RESCHEDULED_MISSED",
    newStartAt: startAt,
    newEndAt: endAt,
    timezone: "UTC",
  };
}

test("missed workout cannot be rescheduled across a locked Calendar entry", async () => {
  const { service, store } = await setup();
  const payload = reschedulePayload("2026-09-01T12:30:00.000Z", "2026-09-01T13:30:00.000Z");
  const receipt = await service.reconcile("user-a", syncEnvelope("missed-overlap-locked", "RESOLVE_MISSED_PLACEMENT", 1, payload));
  assert.equal(receipt.outcome, "CONCURRENT_EDIT");
  assert.equal(receipt.errorCode, "LOCKED_ENTRY_OVERLAP");
  assert.equal((await store.readCurrent("user-a")).revision?.revision, 1);
});

test("missed workout cannot be rescheduled across another active Calendar entry", async () => {
  const { service, store } = await setup();
  const payload = reschedulePayload("2026-09-01T15:30:00.000Z", "2026-09-01T16:30:00.000Z");
  const receipt = await service.reconcile("user-a", syncEnvelope("missed-overlap-normal", "RESOLVE_MISSED_PLACEMENT", 1, payload));
  assert.equal(receipt.outcome, "CONCURRENT_EDIT");
  assert.equal(receipt.errorCode, "CALENDAR_OVERLAP");
  assert.equal((await store.readCurrent("user-a")).revision?.revision, 1);
});

test("missed workout reschedule fails closed if its canonical workout dependency is already terminal", async () => {
  const { service, store } = await setup("COMPLETED");
  const payload = reschedulePayload("2026-09-01T18:00:00.000Z", "2026-09-01T19:00:00.000Z");
  const receipt = await service.reconcile("user-a", syncEnvelope("missed-source-terminal", "RESOLVE_MISSED_PLACEMENT", 1, payload));
  assert.equal(receipt.outcome, "DEPENDENCY_CHANGED");
  assert.equal(receipt.errorCode, "SOURCE_WORKOUT_CHANGED");
  assert.equal((await store.readCurrent("user-a")).revision?.revision, 1);
});

test("valid missed workout reschedule remains allowed and recomputes local date from timezone", async () => {
  const { service, store } = await setup();
  const payload = {
    ...reschedulePayload("2026-09-01T18:30:00.000Z", "2026-09-01T19:15:00.000Z"),
    timezone: "Asia/Kathmandu",
  };
  const receipt = await service.reconcile("user-a", syncEnvelope("missed-valid-reschedule", "RESOLVE_MISSED_PLACEMENT", 1, payload));
  assert.equal(receipt.outcome, "ACCEPTED");
  assert.equal(receipt.canonicalRevision, 2);
  const current = await store.readCurrent("user-a");
  const moved = current.entries.find((candidate) => candidate.entryId === "missed-workout");
  assert.equal(moved?.timezone, "Asia/Kathmandu");
  assert.equal(moved?.localDate, "2026-09-02");
  assert.equal(moved?.status, "SCHEDULED");
});

test("explicit Training placement derives end time from the canonical session and rejects a different local date", async () => {
  const { repository, store } = await setup();
  const service = new CalendarService(store, repository, repository, {
    now,
    canonicalTrainingSession: async ({ userId, semanticSessionId }) =>
      userId === "user-a" && semanticSessionId === "training-session-a"
        ? { planId: "plan-a", planRevision: 4, localDate: "2026-09-01", expectedDurationMinutes: 45 }
        : null,
  });
  const payload = {
    semanticSessionId: "training-session-a",
    startAt: "2026-09-01T18:00:00.000Z",
    timezone: "UTC",
    reasonCode: "USER_CHOSE_TIME",
  };
  const accepted = await service.reconcile("user-a", syncEnvelope("place-training", "PLACE_TRAINING_SESSION", 1, payload));
  assert.equal(accepted.outcome, "ACCEPTED");
  const placed = (await store.readCurrent("user-a")).entries.find((entry) => entry.semanticObjectId === "training-session-a");
  assert.equal(placed?.startAt, "2026-09-01T18:00:00.000Z");
  assert.equal(placed?.endAt, "2026-09-01T18:45:00.000Z");

  const wrongDuration = {
    schemaVersion: 1,
    entryId: placed!.entryId,
    expectedCalendarRevision: 2,
    newStartAt: "2026-09-01T19:00:00.000Z",
    newEndAt: "2026-09-01T19:30:00.000Z",
    timezone: "UTC",
    reasonCode: "USER_RESCHEDULED",
    idempotencyKey: "move-training-wrong-duration",
  };
  const durationRejected = await service.reconcile("user-a", syncEnvelope("move-training-wrong-duration", "MOVE_CALENDAR_ENTRY", 2, wrongDuration));
  assert.equal(durationRejected.outcome, "DEPENDENCY_CHANGED");
  assert.equal(durationRejected.errorCode, "CANONICAL_TRAINING_DURATION_MISMATCH");

  const wrongDatePayload = { ...payload, startAt: "2026-09-02T18:00:00.000Z" };
  const rejected = await service.reconcile("user-a", syncEnvelope("place-training-wrong-date", "PLACE_TRAINING_SESSION", 2, wrongDatePayload));
  assert.equal(rejected.outcome, "DEPENDENCY_CHANGED");
  assert.equal(rejected.errorCode, "TRAINING_LOCAL_DATE_MISMATCH");
});
