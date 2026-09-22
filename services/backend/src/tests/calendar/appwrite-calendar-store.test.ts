import assert from "node:assert/strict";
import test from "node:test";
import { AppwriteCalendarStore } from "../../calendar/appwrite-calendar-store.ts";
import type { CalendarEntryDraft, CalendarPublicationRequest, SyncEnvelope } from "../../calendar/types.ts";
import { sha256 } from "../../domain/sync-store.ts";
import type {
  FoundationTableId,
  ListRowsResult,
  RepositoryListOptions,
  RepositoryRow,
  ServerOwnedRepository,
} from "../../foundation/index.ts";
import { ContractError } from "../../shared/contracts.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

class MemoryServerRepository implements ServerOwnedRepository {
  readonly tables = new Map<FoundationTableId, Map<string, AnyRow>>();
  failNextRevisionCreate = false;

  private table(tableId: FoundationTableId): Map<string, AnyRow> {
    let table = this.tables.get(tableId);
    if (!table) {
      table = new Map();
      this.tables.set(tableId, table);
    }
    return table;
  }

  async listForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    options: RepositoryListOptions = {},
  ): Promise<ListRowsResult<T>> {
    const rows = [...this.table(tableId).values()]
      .filter((row) => row.userId === userId)
      .filter((row) => (options.queries ?? []).every((query) => query.operator !== "equal" || row[query.field] === query.value))
      .slice(0, options.limit ?? 100) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string): Promise<RepositoryRow<T> | null> {
    const row = this.table(tableId).get(rowId);
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  async createForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T): Promise<RepositoryRow<T>> {
    if (tableId === "calendar_revision" && this.failNextRevisionCreate) {
      this.failNextRevisionCreate = false;
      throw new Error("injected_publication_failure");
    }
    const table = this.table(tableId);
    if (table.has(rowId)) throw new Error("duplicate_row");
    const row = { ...data, userId, $id: rowId } as RepositoryRow<T>;
    table.set(rowId, row as AnyRow);
    return row;
  }

  async updateForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const existing = await this.getForUser<T>(tableId, userId, rowId);
    if (!existing) throw new Error("missing_row");
    const row = { ...existing, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.table(tableId).set(rowId, row as AnyRow);
    return row;
  }
}

const fixedNow = () => new Date("2026-08-29T14:00:00.000Z");
const fixedMillis = () => fixedNow().getTime();

const workoutDraft = (overrides: Partial<CalendarEntryDraft> = {}): CalendarEntryDraft => ({
  entryId: "workout-slot-1",
  semanticObjectType: "WORKOUT",
  semanticObjectId: "workout-session-1",
  startAt: "2026-08-30T12:15:00.000Z",
  endAt: "2026-08-30T13:15:00.000Z",
  timezone: "Asia/Kathmandu",
  localDate: "2026-08-30",
  status: "SCHEDULED",
  locked: false,
  reasonCodes: ["INITIAL_PLACEMENT"],
  ...overrides,
});

function envelope(payload: unknown = { action: "publish" }, overrides: Partial<SyncEnvelope<unknown>> = {}): SyncEnvelope<unknown> {
  return {
    schemaVersion: 1,
    operationId: "calendar-op-1",
    idempotencyKey: "calendar-key-1",
    payloadHash: sha256(payload),
    deviceId: "phone-a",
    deviceSessionId: "device-session-a",
    sourcePlatform: "ANDROID",
    entityType: "calendar",
    entityId: "primary",
    operation: "MOVE_CALENDAR_ENTRY",
    expectedEntityRevision: 0,
    clientSequence: null,
    occurredAtUtc: "2026-08-29T13:59:00.000Z",
    occurredLocalDate: "2026-08-29",
    timezone: "Asia/Kathmandu",
    payload,
    ...overrides,
  };
}

function publication(overrides: Partial<CalendarPublicationRequest> = {}): CalendarPublicationRequest {
  const syncEnvelope = overrides.envelope ?? envelope();
  return {
    envelope: syncEnvelope,
    expectedCalendarRevision: syncEnvelope.expectedEntityRevision ?? 0,
    entries: [workoutDraft()],
    reasonCodes: ["USER_MOVE"],
    ...overrides,
  };
}

test("publishes immutable Calendar revision and duplicate replay returns canonical result", async () => {
  const repository = new MemoryServerRepository();
  const store = new AppwriteCalendarStore(repository, { now: fixedNow, nowMillis: fixedMillis });
  const request = publication();

  const accepted = await store.publish("user-a", request);
  assert.equal(accepted.outcome, "ACCEPTED");
  assert.equal(accepted.canonicalRevision, 1);
  assert.equal(accepted.retryClass, "COMPLETE");
  assert.ok(accepted.canonicalCursor?.startsWith("c1."));

  const duplicate = await store.publish("user-a", request);
  assert.equal(duplicate.outcome, "DUPLICATE");
  assert.equal(duplicate.canonicalRevision, 1);
  assert.equal(duplicate.canonicalCursor, accepted.canonicalCursor);

  const current = await store.readCurrent("user-a");
  assert.equal(current.revision?.revision, 1);
  assert.equal(current.entries[0]?.entryId, "workout-slot-1");
  assert.equal(repository.tables.get("calendar_revision")?.size, 1);
  assert.equal(repository.tables.get("calendar_entry")?.size, 1);
});

test("stale Calendar publication never last-write-wins canonical placement", async () => {
  const repository = new MemoryServerRepository();
  const store = new AppwriteCalendarStore(repository, { now: fixedNow, nowMillis: fixedMillis });
  await store.publish("user-a", publication());
  const payload = { action: "stale" };
  const staleEnvelope = envelope(payload, {
    operationId: "calendar-op-stale",
    idempotencyKey: "calendar-key-stale",
    payloadHash: sha256(payload),
    expectedEntityRevision: 0,
  });
  const stale = await store.publish("user-a", publication({
    envelope: staleEnvelope,
    expectedCalendarRevision: 0,
    entries: [workoutDraft({ startAt: "2026-08-30T13:15:00.000Z", endAt: "2026-08-30T14:15:00.000Z" })],
  }));
  assert.equal(stale.outcome, "STALE_REVISION");
  assert.equal(stale.retryClass, "REQUIRES_REFRESH");
  assert.equal(stale.canonicalRevision, 1);
  assert.equal((await store.readCurrent("user-a")).entries[0]?.startAt, "2026-08-30T12:15:00.000Z");
});

test("old revision remains readable after next immutable publication", async () => {
  const repository = new MemoryServerRepository();
  const store = new AppwriteCalendarStore(repository, { now: fixedNow, nowMillis: fixedMillis });
  await store.publish("user-a", publication());
  const payload = { action: "revision-2" };
  const secondEnvelope = envelope(payload, {
    operationId: "calendar-op-2",
    idempotencyKey: "calendar-key-2",
    payloadHash: sha256(payload),
    expectedEntityRevision: 1,
  });
  const second = await store.publish("user-a", publication({
    envelope: secondEnvelope,
    expectedCalendarRevision: 1,
    entries: [workoutDraft({ startAt: "2026-08-30T13:15:00.000Z", endAt: "2026-08-30T14:15:00.000Z" })],
  }));
  assert.equal(second.outcome, "ACCEPTED");
  assert.equal(second.canonicalRevision, 2);
  const first = await store.readRevision("user-a", 1);
  const latest = await store.readCurrent("user-a");
  assert.equal(first?.entries[0]?.startAt, "2026-08-30T12:15:00.000Z");
  assert.equal(latest.entries[0]?.startAt, "2026-08-30T13:15:00.000Z");
});

test("prepared future entries are invisible if publication marker creation fails", async () => {
  const repository = new MemoryServerRepository();
  repository.failNextRevisionCreate = true;
  const store = new AppwriteCalendarStore(repository, { now: fixedNow, nowMillis: fixedMillis });
  const result = await store.publish("user-a", publication());

  assert.equal(result.outcome, "CONCURRENT_EDIT");
  assert.equal(repository.tables.get("calendar_entry")?.size, 1, "entry preparation happened");
  assert.equal(repository.tables.get("calendar_revision")?.size ?? 0, 0, "publication marker is absent");
  assert.deepEqual(await store.readCurrent("user-a"), { revision: null, entries: [] });
});

test("orphan entry rows never become reader-visible without a Calendar revision", async () => {
  const repository = new MemoryServerRepository();
  await repository.createForUser("calendar_entry", "user-a", "orphan", {
    entryRowId: "orphan",
    schemaVersion: 1,
    entryId: "orphan",
    calendarRevisionId: "missing-revision",
    calendarRevision: 77,
    semanticObjectType: "WORKOUT",
    semanticObjectId: "workout-x",
    startAt: "2026-08-30T12:15:00.000Z",
    endAt: "2026-08-30T13:15:00.000Z",
    timezone: "Asia/Kathmandu",
    localDate: "2026-08-30",
    status: "SCHEDULED",
    locked: false,
    reasonCodesJson: "[]",
  });
  const store = new AppwriteCalendarStore(repository, { now: fixedNow, nowMillis: fixedMillis });
  assert.deepEqual(await store.readCurrent("user-a"), { revision: null, entries: [] });
});

test("Calendar history is isolated by authenticated owner", async () => {
  const repository = new MemoryServerRepository();
  const store = new AppwriteCalendarStore(repository, { now: fixedNow, nowMillis: fixedMillis });
  await store.publish("user-a", publication());
  assert.deepEqual(await store.readCurrent("user-b"), { revision: null, entries: [] });
});

test("rejects timezone/local-date mismatch rather than inventing local date", async () => {
  const repository = new MemoryServerRepository();
  const store = new AppwriteCalendarStore(repository, { now: fixedNow, nowMillis: fixedMillis });
  await assert.rejects(
    store.publish("user-a", publication({ entries: [workoutDraft({ localDate: "2026-08-31" })] })),
    (error: unknown) => error instanceof ContractError && error.code === "invalid_calendar_local_date",
  );
  await assert.rejects(
    store.publish("user-a", publication({ entries: [workoutDraft({ timezone: "UTC+05:45" })] })),
    (error: unknown) => error instanceof ContractError && error.code === "invalid_calendar_timezone",
  );
});

test("same idempotency key with different canonical request is rejected", async () => {
  const repository = new MemoryServerRepository();
  const store = new AppwriteCalendarStore(repository, { now: fixedNow, nowMillis: fixedMillis });
  await store.publish("user-a", publication());
  const changedPayload = { action: "different" };
  const reusedEnvelope = envelope(changedPayload, {
    operationId: "calendar-op-other",
    idempotencyKey: "calendar-key-1",
    payloadHash: sha256(changedPayload),
    expectedEntityRevision: 1,
  });
  const result = await store.publish("user-a", publication({ envelope: reusedEnvelope, expectedCalendarRevision: 1 }));
  assert.equal(result.outcome, "REJECTED");
  assert.equal(result.errorCode, "IDEMPOTENCY_KEY_REUSED");
  assert.equal((await store.readCurrent("user-a")).revision?.revision, 1);
});
