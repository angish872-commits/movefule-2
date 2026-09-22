import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import test from "node:test";

import { AppwriteCalendarStore } from "../../calendar/appwrite-calendar-store.ts";
import { CalendarService } from "../../calendar/calendar-service.ts";
import type { SyncEnvelope } from "../../calendar/types.ts";
import { sha256 } from "../../domain/sync-store.ts";
import { requireSession } from "../../http/requestSupport.ts";
import { ContractError } from "../../shared/contracts.ts";
import { AppwriteWorkoutStore } from "../../sync/appwrite-workout-store.ts";
import {
  bindAuthenticatedSyncSession,
  CanonicalSyncSecurityGate,
} from "../../sync/canonical-reconciliation.ts";
import { CanonicalWorkoutReconciler } from "../../sync/canonical-workout-reconciler.ts";
import {
  appwriteSessionBindingHash,
  PHONE_SYNC_SESSION_PREFIX,
  phoneSyncSessionLocator,
  PhoneSyncSessionService,
} from "../../sync/phone-sync-session.ts";
import {
  MemoryOwnerRepository,
  MemoryServerRepository,
} from "../helpers/memoryRepositories.ts";

const USER_A = "user-a";
const USER_B = "user-b";
const PHONE_A = "phone-a";
const PHONE_B = "phone-b";
const WATCH_A = "watch-a";
const SESSION_A = "appwrite-session-a";
const SESSION_B = "appwrite-session-b";
const NOW = new Date("2026-08-30T12:00:00.000Z");
const fixedNow = () => new Date(NOW);
const fixedMillis = () => NOW.getTime();

function seedDevice(
  repository: MemoryOwnerRepository,
  userId: string,
  deviceId: string,
  deviceClass: "phone" | "watch",
  overrides: Record<string, unknown> = {},
): void {
  repository.seed("device", deviceId, {
    userId,
    deviceId,
    platform: deviceClass === "phone" ? "android" : "wear_os",
    deviceClass,
    appVersion: "1.0.0",
    ...overrides,
  });
}

function metadataRowId(userId: string, sessionId: string, deviceId: string): string {
  return `test-meta-${sha256({ userId, sessionId, deviceId }).slice(0, 24)}`;
}

function seedMetadata(
  repository: MemoryOwnerRepository,
  userId: string,
  sessionId: string,
  deviceId: string,
  overrides: Record<string, unknown> = {},
): { rowId: string; sessionHash: string } {
  const sessionHash = appwriteSessionBindingHash(sessionId);
  const rowId = metadataRowId(userId, sessionId, deviceId);
  repository.seed("user_session_metadata", rowId, {
    sessionMetaId: rowId,
    userId,
    appwriteSessionIdHash: sessionHash,
    deviceId,
    platform: "android",
    appVersion: "1.0.0",
    createdAt: "2026-08-30T11:00:00.000Z",
    lastSeenAt: "2026-08-30T11:30:00.000Z",
    ...overrides,
  });
  return { rowId, sessionHash };
}

function seedPairedSession(
  repository: MemoryOwnerRepository,
  deviceSessionId: string,
  overrides: Record<string, unknown> = {},
): void {
  repository.seed("device_session", deviceSessionId, {
    deviceSessionId,
    userId: USER_A,
    phoneDeviceId: PHONE_A,
    watchDeviceId: WATCH_A,
    state: "ACTIVE",
    issuedAt: "2026-08-30T11:00:00.000Z",
    expiresAt: "2026-08-31T11:00:00.000Z",
    ...overrides,
  });
}

function envelope(
  payload: unknown,
  overrides: Partial<SyncEnvelope<unknown>> = {},
): SyncEnvelope<unknown> {
  return {
    schemaVersion: 1,
    operationId: "op-1",
    idempotencyKey: "key-1",
    payloadHash: sha256(payload),
    deviceId: PHONE_A,
    deviceSessionId: "device-session-placeholder",
    sourcePlatform: "ANDROID",
    entityType: "calendar",
    entityId: "primary",
    operation: "SET_UNAVAILABLE",
    expectedEntityRevision: 0,
    clientSequence: null,
    occurredAtUtc: "2026-08-30T11:59:00.000Z",
    occurredLocalDate: "2026-08-30",
    timezone: "Asia/Kathmandu",
    payload,
    ...overrides,
  };
}

function boundPhoneEnvelope(
  locator: string,
  authenticatedSessionId: string,
  payload: unknown,
  overrides: Partial<SyncEnvelope<unknown>> = {},
): SyncEnvelope<unknown> {
  const value = envelope(payload, {
    deviceId: PHONE_A,
    deviceSessionId: locator,
    ...overrides,
  });
  bindAuthenticatedSyncSession(value, authenticatedSessionId);
  return value;
}

async function expectAuthorityRevoked(action: () => Promise<unknown>): Promise<void> {
  await assert.rejects(
    action,
    (error: unknown) => error instanceof ContractError && error.code === "AUTHORITY_REVOKED",
  );
}

function validPhoneFixture(): {
  owner: MemoryOwnerRepository;
  locator: string;
  metadataRowId: string;
} {
  const owner = new MemoryOwnerRepository();
  seedDevice(owner, USER_A, PHONE_A, "phone");
  const metadata = seedMetadata(owner, USER_A, SESSION_A, PHONE_A);
  return {
    owner,
    locator: phoneSyncSessionLocator(USER_A, PHONE_A, metadata.sessionHash),
    metadataRowId: metadata.rowId,
  };
}

function unavailablePayload(entryId = "unavailable-1") {
  return {
    entryId,
    unavailable: true,
    startAt: "2026-08-31T04:15:00.000Z",
    endAt: "2026-08-31T05:15:00.000Z",
    timezone: "Asia/Kathmandu",
    reasonCode: "USER_UNAVAILABLE",
  };
}

function calendarFixture() {
  const { owner, locator } = validPhoneFixture();
  const server = new MemoryServerRepository();
  const store = new AppwriteCalendarStore(server, { now: fixedNow, nowMillis: fixedMillis });
  const service = new CalendarService(store, owner, server, { now: fixedNow });
  return { owner, server, store, service, locator };
}

test("[PHONE 01/22] authenticated registered Phone acquires opaque Phone-only sync session", async () => {
  const owner = new MemoryOwnerRepository();
  seedDevice(owner, USER_A, PHONE_A, "phone");
  const metadata = seedMetadata(owner, USER_A, SESSION_A, PHONE_A);
  const session = await new PhoneSyncSessionService(owner, fixedNow).acquire(USER_A, SESSION_A, PHONE_A);

  assert.equal(session.mode, "PHONE_ONLY");
  assert.equal(session.deviceId, PHONE_A);
  assert.ok(session.deviceSessionId.startsWith(PHONE_SYNC_SESSION_PREFIX));
  assert.equal(session.deviceSessionId, phoneSyncSessionLocator(USER_A, PHONE_A, metadata.sessionHash));
  const serialized = JSON.stringify(session);
  assert.equal(serialized.includes(SESSION_A), false, "raw Appwrite session id must never be returned");
  assert.equal(serialized.includes(metadata.sessionHash), false, "raw Appwrite session hash must never be returned");
});

test("[PHONE 02/22] unauthenticated caller is rejected before Phone-session acquisition", async () => {
  const request = { headers: {} } as IncomingMessage;
  await assert.rejects(
    requireSession(request, { resolve: async () => null }),
    (error: unknown) => error instanceof ContractError && error.code === "unauthenticated",
  );
});

test("[PHONE 03/22] Phone owned by another authenticated owner is rejected", async () => {
  const owner = new MemoryOwnerRepository();
  seedDevice(owner, USER_B, PHONE_A, "phone");
  await expectAuthorityRevoked(() =>
    new PhoneSyncSessionService(owner, fixedNow).acquire(USER_A, SESSION_A, PHONE_A));
});

test("[PHONE 04/22] foreign Phone remains outside the authenticated owner's acquisition scope", async () => {
  const owner = new MemoryOwnerRepository();
  seedDevice(owner, USER_A, PHONE_A, "phone");
  seedDevice(owner, USER_B, PHONE_B, "phone");
  await expectAuthorityRevoked(() =>
    new PhoneSyncSessionService(owner, fixedNow).acquire(USER_A, SESSION_A, PHONE_B));
});

test("[PHONE 05/22] unknown device is rejected", async () => {
  const owner = new MemoryOwnerRepository();
  await expectAuthorityRevoked(() =>
    new PhoneSyncSessionService(owner, fixedNow).acquire(USER_A, SESSION_A, "missing-phone"));
});

test("[PHONE 06/22] Watch cannot acquire a Phone-only sync session", async () => {
  const owner = new MemoryOwnerRepository();
  seedDevice(owner, USER_A, WATCH_A, "watch");
  await expectAuthorityRevoked(() =>
    new PhoneSyncSessionService(owner, fixedNow).acquire(USER_A, SESSION_A, WATCH_A));
});

test("[PHONE 07/22] revoked Phone cannot acquire a Phone-only sync session", async () => {
  const owner = new MemoryOwnerRepository();
  seedDevice(owner, USER_A, PHONE_A, "phone", { revokedAt: "2026-08-30T11:45:00.000Z" });
  await expectAuthorityRevoked(() =>
    new PhoneSyncSessionService(owner, fixedNow).acquire(USER_A, SESSION_A, PHONE_A));
});

test("[PHONE 08/22] revoked authenticated session metadata is rejected", async () => {
  const owner = new MemoryOwnerRepository();
  seedDevice(owner, USER_A, PHONE_A, "phone");
  seedMetadata(owner, USER_A, SESSION_A, PHONE_A, { revokedAt: "2026-08-30T11:45:00.000Z" });
  await expectAuthorityRevoked(() =>
    new PhoneSyncSessionService(owner, fixedNow).acquire(USER_A, SESSION_A, PHONE_A));
});

test("[PHONE 09/22] wrong Appwrite session binding cannot use an existing opaque Phone locator", async () => {
  const { owner, locator } = validPhoneFixture();
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = unavailablePayload();
  const value = boundPhoneEnvelope(locator, SESSION_B, payload);
  await expectAuthorityRevoked(() => gate.assertAuthorized(USER_A, value));
});

test("[PHONE 10/22] owner mismatch cannot authenticate another owner's Phone locator", async () => {
  const { owner, locator } = validPhoneFixture();
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = unavailablePayload();
  const value = boundPhoneEnvelope(locator, SESSION_A, payload);
  await expectAuthorityRevoked(() => gate.assertAuthorized(USER_B, value));
});

test("[PHONE 11/22] device mismatch is rejected even for the same authenticated owner and session", async () => {
  const { owner, locator } = validPhoneFixture();
  seedDevice(owner, USER_A, PHONE_B, "phone");
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = unavailablePayload();
  const value = boundPhoneEnvelope(locator, SESSION_A, payload, { deviceId: PHONE_B });
  await expectAuthorityRevoked(() => gate.assertAuthorized(USER_A, value));
});

test("[PHONE 12/22] valid Phone-only session is accepted by the canonical Sync security gate", async () => {
  const { owner, locator } = validPhoneFixture();
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = unavailablePayload();
  const value = boundPhoneEnvelope(locator, SESSION_A, payload);
  await gate.assertAuthorized(USER_A, value);

  const unbound = envelope(payload, { deviceId: PHONE_A, deviceSessionId: locator });
  await expectAuthorityRevoked(() => gate.assertAuthorized(USER_A, unbound));
});

test("[PHONE 13/22] Watch cannot use a Phone-only sync-session locator", async () => {
  const { owner, locator } = validPhoneFixture();
  seedDevice(owner, USER_A, WATCH_A, "watch");
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = unavailablePayload();
  const value = boundPhoneEnvelope(locator, SESSION_A, payload, {
    deviceId: WATCH_A,
    sourcePlatform: "WEAR_OS",
  });
  await expectAuthorityRevoked(() => gate.assertAuthorized(USER_A, value));
});

test("[PHONE 14/22] a second Phone cannot use another Phone's opaque session locator", async () => {
  const { owner, locator } = validPhoneFixture();
  seedDevice(owner, USER_A, PHONE_B, "phone");
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = unavailablePayload();
  const value = boundPhoneEnvelope(locator, SESSION_A, payload, { deviceId: PHONE_B });
  await expectAuthorityRevoked(() => gate.assertAuthorized(USER_A, value));
});

test("[PHONE 15/22] revoked Phone-only session metadata invalidates an already issued locator", async () => {
  const { owner, locator, metadataRowId: rowId } = validPhoneFixture();
  await owner.updateOwned("user_session_metadata", USER_A, rowId, {
    revokedAt: "2026-08-30T11:50:00.000Z",
  });
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = unavailablePayload();
  const value = boundPhoneEnvelope(locator, SESSION_A, payload);
  await expectAuthorityRevoked(() => gate.assertAuthorized(USER_A, value));
});

test("[PHONE 16/22] valid existing paired Phone-Watch session still authorizes the Phone", async () => {
  const owner = new MemoryOwnerRepository();
  seedDevice(owner, USER_A, PHONE_A, "phone");
  seedDevice(owner, USER_A, WATCH_A, "watch");
  seedPairedSession(owner, "paired-session-a");
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = unavailablePayload();
  const value = envelope(payload, {
    deviceId: PHONE_A,
    deviceSessionId: "paired-session-a",
  });
  await gate.assertAuthorized(USER_A, value);
});

test("[PHONE 17/22] valid existing paired session still authorizes Watch reconciliation", async () => {
  const owner = new MemoryOwnerRepository();
  seedDevice(owner, USER_A, PHONE_A, "phone");
  seedDevice(owner, USER_A, WATCH_A, "watch");
  seedPairedSession(owner, "paired-session-a");
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = { event: "watch-reconcile" };
  const value = envelope(payload, {
    deviceId: WATCH_A,
    deviceSessionId: "paired-session-a",
    sourcePlatform: "WEAR_OS",
    entityType: "workout_session",
    entityId: "watch-session-1",
    operation: "WORKOUT_EVENT",
  });
  await gate.assertAuthorized(USER_A, value);
});

test("[PHONE 18/22] revoked paired credential never falls through to Phone-only validation", async () => {
  const { owner, locator } = validPhoneFixture();
  seedDevice(owner, USER_A, WATCH_A, "watch");
  seedPairedSession(owner, locator, { revokedAt: "2026-08-30T11:30:00.000Z" });
  const gate = new CanonicalSyncSecurityGate(owner, fixedMillis);
  const payload = unavailablePayload();
  const value = boundPhoneEnvelope(locator, SESSION_A, payload);
  await expectAuthorityRevoked(() => gate.assertAuthorized(USER_A, value));
});

test("[PHONE 19/22] duplicate Phone replay remains idempotent through canonical reconciliation", async () => {
  const { service, locator } = calendarFixture();
  const payload = unavailablePayload("unavailable-replay");
  const value = boundPhoneEnvelope(locator, SESSION_A, payload, {
    operationId: "calendar-replay-op",
    idempotencyKey: "calendar-replay-key",
    payloadHash: sha256(payload),
  });

  const first = await service.reconcile(USER_A, value);
  const second = await service.reconcile(USER_A, value);
  assert.equal(first.outcome, "ACCEPTED");
  assert.equal(second.outcome, "DUPLICATE");
  assert.equal(second.canonicalRevision, first.canonicalRevision);
});

test("[PHONE 20/22] stale Calendar revision behavior is preserved for Phone-only reconciliation", async () => {
  const { service, locator } = calendarFixture();
  const firstPayload = unavailablePayload("unavailable-first");
  const first = boundPhoneEnvelope(locator, SESSION_A, firstPayload, {
    operationId: "calendar-first-op",
    idempotencyKey: "calendar-first-key",
    payloadHash: sha256(firstPayload),
  });
  assert.equal((await service.reconcile(USER_A, first)).outcome, "ACCEPTED");

  const stalePayload = unavailablePayload("unavailable-stale");
  const stale = boundPhoneEnvelope(locator, SESSION_A, stalePayload, {
    operationId: "calendar-stale-op",
    idempotencyKey: "calendar-stale-key",
    payloadHash: sha256(stalePayload),
    expectedEntityRevision: 0,
  });
  const receipt = await service.reconcile(USER_A, stale);
  assert.equal(receipt.outcome, "STALE_REVISION");
  assert.equal(receipt.canonicalRevision, 1);
});

test("[PHONE 21/22] Phone-only Calendar reconciliation uses the canonical Calendar gate and store", async () => {
  const { service, store, locator } = calendarFixture();
  const payload = unavailablePayload("unavailable-phone-only");
  const value = boundPhoneEnvelope(locator, SESSION_A, payload, {
    operationId: "calendar-phone-only-op",
    idempotencyKey: "calendar-phone-only-key",
    payloadHash: sha256(payload),
  });

  const receipt = await service.reconcile(USER_A, value);
  assert.equal(receipt.outcome, "ACCEPTED");
  assert.equal(receipt.canonicalRevision, 1);
  const current = await store.readCurrent(USER_A);
  assert.equal(current.entries[0]?.entryId, "unavailable-phone-only");
});

test("[PHONE 22/22] Phone-only canonical workout reconciliation uses the existing workout reconciler", async () => {
  const { owner, locator } = validPhoneFixture();
  const server = new MemoryServerRepository();
  const workoutStore = new AppwriteWorkoutStore(owner, {
    now: fixedMillis,
    idGenerator: () => "generated-workout-session",
  });
  const reconciler = new CanonicalWorkoutReconciler(
    workoutStore,
    owner,
    server,
    undefined,
    fixedNow,
  );
  const payload = {
    idempotencyKey: "workout-phone-only-key",
    authorityDeviceId: PHONE_A,
    workoutType: "STRENGTH",
  };
  const value = boundPhoneEnvelope(locator, SESSION_A, payload, {
    operationId: "workout-phone-only-op",
    idempotencyKey: "workout-phone-only-key",
    payloadHash: sha256(payload),
    entityType: "workout_session",
    entityId: "workout-session-phone-only",
    operation: "WORKOUT_START",
    expectedEntityRevision: 0,
  });

  const receipt = await reconciler.reconcile(USER_A, value);
  assert.equal(receipt.outcome, "ACCEPTED");
  assert.equal(receipt.canonicalRevision, 1);
  assert.ok(await owner.getOwned("workout_session", USER_A, "workout-session-phone-only"));
  assert.equal(
    [...server.rows.keys()].filter((key) => key.startsWith("workout_session_revision:")).length,
    1,
  );
});
