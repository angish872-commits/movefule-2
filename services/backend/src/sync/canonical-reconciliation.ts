import { Buffer } from "node:buffer";
import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository, RepositoryRow, ServerOwnedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import type {
  RetryClass,
  SyncEnvelope,
  SyncOutcome,
  SyncReceipt,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import {
  appwriteSessionBindingHash,
  PHONE_SYNC_SESSION_PREFIX,
  phoneSyncSessionLocator,
  type PhoneSessionMetadataRow,
} from "./phone-sync-session.ts";

export const CANONICAL_SYNC_SCHEMA_VERSION = 1 as const;

export type SyncOperationRow = {
  operationId: string;
  userId: string;
  deviceId: string;
  deviceSessionId: string;
  schemaVersion: number;
  entityType: string;
  entityId: string;
  operation: string;
  expectedEntityRevision?: number;
  idempotencyKey: string;
  requestHash: string;
  payloadHash: string;
  outcome: SyncOutcome;
  conflictCode?: string;
  errorCode?: string;
  canonicalRevision?: number;
  canonicalEventId?: string;
  cursorToken?: string;
  receivedAt: string;
};

type SyncCursorRow = {
  cursorId: string;
  userId: string;
  deviceId: string;
  deviceSessionId: string;
  stream: string;
  cursorToken: string;
  lastAckedOperationId?: string;
  schemaVersion: number;
  updatedAt: string;
};

type DeviceRow = {
  deviceId: string;
  userId: string;
  platform: string;
  deviceClass: string;
  revokedAt?: string;
};

type DeviceSessionRow = {
  deviceSessionId: string;
  userId: string;
  phoneDeviceId: string;
  watchDeviceId: string;
  state: string;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
};

const requireId = (value: unknown, code: string, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) {
    throw new ContractError(code, `${label} is required.`);
  }
  return value.trim();
};

const operationRowId = (userId: string, operationId: string): string =>
  `sync-operation-${sha256({ userId, operationId }).slice(0, 48)}`;

const cursorRowId = (userId: string, deviceId: string, deviceSessionId: string, stream: string): string =>
  `sync-cursor-${sha256({ userId, deviceId, deviceSessionId, stream }).slice(0, 48)}`;

const AUTHENTICATED_SYNC_SESSION_ID = Symbol("movefuel.authenticated-sync-session-id");

type ServerBoundSyncEnvelope = SyncEnvelope<unknown> & {
  [AUTHENTICATED_SYNC_SESSION_ID]?: string;
};

/** Attach request-authenticated session identity without serializing it into the canonical envelope or journal hash. */
export function bindAuthenticatedSyncSession<T>(envelope: SyncEnvelope<T>, authenticatedSessionId: string): void {
  const sessionId = requireId(authenticatedSessionId, "invalid_session", "authenticated session");
  Object.defineProperty(envelope, AUTHENTICATED_SYNC_SESSION_ID, {
    value: sessionId,
    enumerable: false,
    configurable: false,
    writable: false,
  });
}

const boundAuthenticatedSessionId = (envelope: SyncEnvelope<unknown>): string | null =>
  (envelope as ServerBoundSyncEnvelope)[AUTHENTICATED_SYNC_SESSION_ID] ?? null;

export function retryClassForSyncOutcome(outcome: SyncOutcome): RetryClass {
  switch (outcome) {
    case "ACCEPTED":
    case "DUPLICATE":
      return "COMPLETE";
    case "STALE_REVISION":
    case "DEPENDENCY_CHANGED":
    case "CANONICAL_RECORD_MISSING":
      return "REQUIRES_REFRESH";
    case "CONCURRENT_EDIT":
      return "REQUIRES_USER";
    case "INVALID_EVENT_ORDER":
      return "RETRYABLE";
    case "AUTHORITY_REVOKED":
    case "SCHEMA_MISMATCH":
    case "REJECTED":
      return "FAILED_FINAL";
  }
}

export function validateSyncEnvelope<T>(envelope: SyncEnvelope<T>): void {
  if (envelope.schemaVersion !== CANONICAL_SYNC_SCHEMA_VERSION) {
    throw new ContractError("SCHEMA_MISMATCH", "Unsupported sync schema version.");
  }
  requireId(envelope.operationId, "invalid_operation_id", "operationId");
  requireId(envelope.idempotencyKey, "invalid_idempotency_key", "idempotencyKey");
  requireId(envelope.payloadHash, "invalid_payload_hash", "payloadHash");
  requireId(envelope.deviceId, "invalid_device_id", "deviceId");
  requireId(envelope.deviceSessionId, "invalid_device_session", "deviceSessionId");
  requireId(envelope.entityType, "invalid_entity_type", "entityType");
  requireId(envelope.entityId, "invalid_entity_id", "entityId");
  requireId(envelope.operation, "invalid_operation", "operation");
  if (envelope.expectedEntityRevision !== null &&
      (!Number.isInteger(envelope.expectedEntityRevision) || envelope.expectedEntityRevision < 0)) {
    throw new ContractError("invalid_expected_revision", "expectedEntityRevision must be null or a non-negative integer.");
  }
  if (envelope.clientSequence !== null &&
      (!Number.isInteger(envelope.clientSequence) || envelope.clientSequence < 1)) {
    throw new ContractError("invalid_client_sequence", "clientSequence must be null or a positive integer.");
  }
  if (!Number.isFinite(Date.parse(envelope.occurredAtUtc))) {
    throw new ContractError("invalid_occurred_at", "occurredAtUtc must be a valid timestamp.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(envelope.occurredLocalDate)) {
    throw new ContractError("invalid_local_date", "occurredLocalDate must be YYYY-MM-DD.");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: envelope.timezone }).format(new Date(0));
  } catch {
    throw new ContractError("invalid_timezone", "timezone must be a valid IANA timezone.");
  }
  if (sha256(envelope.payload) !== envelope.payloadHash) {
    throw new ContractError("payload_hash_mismatch", "payloadHash does not match the canonical payload.");
  }
}

export function syncReceipt(
  envelope: SyncEnvelope<unknown>,
  outcome: SyncOutcome,
  receivedAtUtc: string,
  options: {
    canonicalRevision?: number | null;
    canonicalEventId?: string | null;
    canonicalCursor?: string | null;
    errorCode?: string | null;
  } = {},
): SyncReceipt {
  return {
    schemaVersion: CANONICAL_SYNC_SCHEMA_VERSION,
    operationId: envelope.operationId,
    idempotencyKey: envelope.idempotencyKey,
    payloadHash: envelope.payloadHash,
    outcome,
    entityType: envelope.entityType,
    entityId: envelope.entityId,
    canonicalRevision: options.canonicalRevision ?? null,
    canonicalEventId: options.canonicalEventId ?? null,
    canonicalCursor: options.canonicalCursor ?? null,
    receivedAtUtc,
    retryClass: retryClassForSyncOutcome(outcome),
    errorCode: options.errorCode ?? null,
  };
}

export class CanonicalSyncJournal {
  private readonly repository: ServerOwnedRepository;
  private readonly now: () => Date;

  constructor(
    repository: ServerOwnedRepository,
    now: () => Date = () => new Date(),
  ) {
    this.repository = repository;
    this.now = now;
  }

  requestHash(envelope: SyncEnvelope<unknown>): string {
    return sha256(envelope);
  }

  private collisionReceipt(
    envelope: SyncEnvelope<unknown>,
    prior: SyncOperationRow,
    errorCode: "IDEMPOTENCY_KEY_REUSED" | "OPERATION_ID_REUSED",
  ): SyncReceipt {
    return syncReceipt(envelope, "REJECTED", this.now().toISOString(), {
      canonicalRevision: prior.canonicalRevision ?? null,
      canonicalEventId: prior.canonicalEventId ?? null,
      canonicalCursor: prior.cursorToken ?? null,
      errorCode,
    });
  }

  async replay(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt | null> {
    validateSyncEnvelope(envelope);
    const owner = requireId(userId, "invalid_user_id", "userId");
    const [idempotencyRows, operationRows] = await Promise.all([
      this.repository.listForUser<SyncOperationRow>("sync_operation", owner, {
        queries: [
          { field: "deviceSessionId", operator: "equal", value: envelope.deviceSessionId },
          { field: "idempotencyKey", operator: "equal", value: envelope.idempotencyKey },
        ],
        limit: 2,
      }),
      this.repository.listForUser<SyncOperationRow>("sync_operation", owner, {
        queries: [{ field: "operationId", operator: "equal", value: envelope.operationId }],
        limit: 2,
      }),
    ]);
    const byIdempotency = idempotencyRows.rows[0];
    const byOperation = operationRows.rows[0];
    if (!byIdempotency && !byOperation) return null;

    if (byIdempotency && byIdempotency.operationId !== envelope.operationId) {
      return this.collisionReceipt(envelope, byIdempotency, "IDEMPOTENCY_KEY_REUSED");
    }
    if (byOperation && byOperation.idempotencyKey !== envelope.idempotencyKey) {
      return this.collisionReceipt(envelope, byOperation, "OPERATION_ID_REUSED");
    }

    const prior = byIdempotency ?? byOperation!;
    if (prior.requestHash !== this.requestHash(envelope)) {
      return this.collisionReceipt(envelope, prior, "IDEMPOTENCY_KEY_REUSED");
    }
    return syncReceipt(envelope, "DUPLICATE", prior.receivedAt, {
      canonicalRevision: prior.canonicalRevision ?? null,
      canonicalEventId: prior.canonicalEventId ?? null,
      canonicalCursor: prior.cursorToken ?? null,
      errorCode: prior.errorCode ?? prior.conflictCode ?? null,
    });
  }

  async record(
    userId: string,
    envelope: SyncEnvelope<unknown>,
    receipt: SyncReceipt,
    conflictCode?: string,
  ): Promise<void> {
    const owner = requireId(userId, "invalid_user_id", "userId");
    const row: SyncOperationRow = {
      operationId: envelope.operationId,
      userId: owner,
      deviceId: envelope.deviceId,
      deviceSessionId: envelope.deviceSessionId,
      schemaVersion: envelope.schemaVersion,
      entityType: envelope.entityType,
      entityId: envelope.entityId,
      operation: envelope.operation,
      ...(envelope.expectedEntityRevision === null ? {} : { expectedEntityRevision: envelope.expectedEntityRevision }),
      idempotencyKey: envelope.idempotencyKey,
      requestHash: this.requestHash(envelope),
      payloadHash: envelope.payloadHash,
      outcome: receipt.outcome,
      ...(conflictCode ? { conflictCode } : {}),
      ...(receipt.errorCode ? { errorCode: receipt.errorCode } : {}),
      ...(receipt.canonicalRevision === null ? {} : { canonicalRevision: receipt.canonicalRevision }),
      ...(receipt.canonicalEventId === null ? {} : { canonicalEventId: receipt.canonicalEventId }),
      ...(receipt.canonicalCursor === null ? {} : { cursorToken: receipt.canonicalCursor }),
      receivedAt: receipt.receivedAtUtc,
    };
    try {
      await this.repository.createForUser("sync_operation", owner, operationRowId(owner, envelope.operationId), row);
    } catch (error) {
      const replay = await this.replay(owner, envelope);
      if (!replay) throw error;
      if (replay.outcome === "REJECTED" &&
          (replay.errorCode === "IDEMPOTENCY_KEY_REUSED" || replay.errorCode === "OPERATION_ID_REUSED")) throw error;
    }
  }
}

function parseCursorCounter(token: string | undefined): number {
  if (!token?.startsWith("c1.")) return 0;
  const raw = token.split(".", 3)[1];
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export class CanonicalSyncCursorStore {
  private readonly repository: ServerOwnedRepository;
  private readonly now: () => number;

  constructor(
    repository: ServerOwnedRepository,
    now: () => number = () => Date.now(),
  ) {
    this.repository = repository;
    this.now = now;
  }

  async advance(
    userId: string,
    envelope: Pick<SyncEnvelope<unknown>, "deviceId" | "deviceSessionId" | "operationId">,
    stream: string,
  ): Promise<string> {
    const owner = requireId(userId, "invalid_user_id", "userId");
    const boundedStream = requireId(stream, "invalid_sync_stream", "stream");
    const rowId = cursorRowId(owner, envelope.deviceId, envelope.deviceSessionId, boundedStream);
    const existing = await this.repository.getForUser<SyncCursorRow>("sync_cursor", owner, rowId);
    const counter = Math.max(this.now(), parseCursorCounter(existing?.cursorToken) + 1);
    const token = `c1.${counter}.${Buffer.from(sha256({ owner, ...envelope, boundedStream }).slice(0, 18)).toString("base64url")}`;
    const updatedAt = new Date(counter).toISOString();
    const row: SyncCursorRow = {
      cursorId: rowId,
      userId: owner,
      deviceId: envelope.deviceId,
      deviceSessionId: envelope.deviceSessionId,
      stream: boundedStream,
      cursorToken: token,
      lastAckedOperationId: envelope.operationId,
      schemaVersion: CANONICAL_SYNC_SCHEMA_VERSION,
      updatedAt,
    };
    if (existing) await this.repository.updateForUser("sync_cursor", owner, rowId, row);
    else await this.repository.createForUser("sync_cursor", owner, rowId, row);
    return token;
  }

  async current(userId: string, deviceId: string, deviceSessionId: string, stream: string): Promise<string | null> {
    const owner = requireId(userId, "invalid_user_id", "userId");
    const row = await this.repository.getForUser<SyncCursorRow>(
      "sync_cursor",
      owner,
      cursorRowId(owner, deviceId, deviceSessionId, stream),
    );
    return row?.cursorToken ?? null;
  }
}

export class CanonicalSyncSecurityGate {
  private readonly repository: OwnerScopedRepository;
  private readonly now: () => number;

  constructor(
    repository: OwnerScopedRepository,
    now: () => number = () => Date.now(),
  ) {
    this.repository = repository;
    this.now = now;
  }

  async assertAuthorized(userId: string, envelope: SyncEnvelope<unknown>): Promise<void> {
    validateSyncEnvelope(envelope);
    const owner = requireId(userId, "invalid_user_id", "userId");
    const devices = await this.repository.listOwned<DeviceRow>("device", owner, {
      queries: [{ field: "deviceId", operator: "equal", value: envelope.deviceId }],
      limit: 2,
    });
    const device = devices.rows[0];
    if (!device || device.revokedAt) {
      throw new ContractError("AUTHORITY_REVOKED", "Device is not active for this user.");
    }

    // Existing paired credentials always stay in the stronger paired-device mode.
    // If a known paired credential is invalid, reject it here and never fall through.
    const pairedSession = await this.repository.getOwned<DeviceSessionRow>("device_session", owner, envelope.deviceSessionId);
    if (pairedSession) {
      if (pairedSession.state !== "ACTIVE" || pairedSession.revokedAt ||
          (pairedSession.expiresAt && Date.parse(pairedSession.expiresAt) <= this.now())) {
        throw new ContractError("AUTHORITY_REVOKED", "Device session is revoked or expired.");
      }
      if (pairedSession.phoneDeviceId !== envelope.deviceId && pairedSession.watchDeviceId !== envelope.deviceId) {
        throw new ContractError("AUTHORITY_REVOKED", "Device does not belong to the active paired device session.");
      }
      return;
    }

    if (!envelope.deviceSessionId.startsWith(PHONE_SYNC_SESSION_PREFIX)) {
      throw new ContractError("AUTHORITY_REVOKED", "Device session is missing.");
    }
    if (device.deviceClass.trim().toLowerCase() !== "phone") {
      throw new ContractError("AUTHORITY_REVOKED", "Phone-only sync sessions cannot authorize a Watch.");
    }
    const authenticatedSessionId = boundAuthenticatedSessionId(envelope);
    if (!authenticatedSessionId) {
      throw new ContractError("AUTHORITY_REVOKED", "Phone-only reconciliation requires the current authenticated session.");
    }

    const sessionHash = appwriteSessionBindingHash(authenticatedSessionId);
    const metadataRows = await this.repository.listOwned<PhoneSessionMetadataRow>("user_session_metadata", owner, {
      queries: [{ field: "appwriteSessionIdHash", operator: "equal", value: sessionHash }],
      limit: 2,
    });
    if (metadataRows.rows.length !== 1) {
      throw new ContractError("AUTHORITY_REVOKED", "Authenticated Phone session metadata is missing or ambiguous.");
    }
    const metadata = metadataRows.rows[0]!;
    if (metadata.revokedAt || metadata.userId !== owner || metadata.appwriteSessionIdHash !== sessionHash ||
        metadata.deviceId !== envelope.deviceId) {
      throw new ContractError("AUTHORITY_REVOKED", "Authenticated Phone session metadata is revoked or mismatched.");
    }
    const expectedLocator = phoneSyncSessionLocator(owner, envelope.deviceId, sessionHash);
    if (envelope.deviceSessionId !== expectedLocator) {
      throw new ContractError("AUTHORITY_REVOKED", "Phone-only sync session locator is invalid for this authenticated session and device.");
    }
  }
}
