import { randomUUID } from "node:crypto";
import { sha256 } from "../domain/sync-store.ts";
import { ContractError } from "../shared/contracts.ts";

export type DeviceTrustState = "ACTIVE" | "REVOKED";

export type DeviceTrustSession = {
  deviceSessionId: string;
  userId: string;
  phoneDeviceId: string;
  watchDeviceId: string;
  state: DeviceTrustState;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
};

/** Fail closed when an optional persisted trust expiry is invalid or elapsed. */
export function isDeviceTrustSessionActive(
  session: Pick<DeviceTrustSession, "state" | "expiresAt">,
  nowEpochMillis = Date.now(),
): boolean {
  if (session.state !== "ACTIVE") return false;
  if (session.expiresAt === undefined) return true;
  const expiresAtEpochMillis = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAtEpochMillis) && expiresAtEpochMillis > nowEpochMillis;
}

type IdempotencyRecord = { requestHash: string; session: DeviceTrustSession };

const clone = <T>(value: T): T => structuredClone(value);

function requireId(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) {
    throw new ContractError(code, message);
  }
  return value.trim();
}

/** Owner-scoped trust state used to authorize a user's watch without issuing a second credential. */
export class DeviceTrustStore {
  private readonly sessions = new Map<string, DeviceTrustSession>();
  private readonly byPair = new Map<string, string>();
  private readonly idempotency = new Map<string, IdempotencyRecord>();
  private readonly now: () => number;
  private readonly idFactory: () => string;

  constructor(options: { now?: () => number; idFactory?: () => string } = {}) {
    this.now = options.now ?? (() => Date.now());
    this.idFactory = options.idFactory ?? (() => randomUUID());
  }

  trust(userId: string, input: { phoneDeviceId: string; watchDeviceId: string; idempotencyKey: string; expiresAt?: string }): { session: DeviceTrustSession; created: boolean } {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const phoneDeviceId = requireId(input.phoneDeviceId, "invalid_device_id", "phoneDeviceId is required.");
    const watchDeviceId = requireId(input.watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    const idempotencyKey = requireId(input.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const expiresAt = input.expiresAt === undefined ? undefined : requireId(input.expiresAt, "invalid_expires_at", "expiresAt is invalid.");
    if (expiresAt !== undefined && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= this.now())) {
      throw new ContractError("invalid_expires_at", "expiresAt must be a valid future timestamp.");
    }
    const requestHash = sha256({ owner, phoneDeviceId, watchDeviceId, expiresAt });
    const idempotencyKeyScoped = `${owner}:${idempotencyKey}`;
    const prior = this.idempotency.get(idempotencyKeyScoped);
    if (prior) {
      if (prior.requestHash !== requestHash) throw new ContractError("idempotency_key_reused", "Trust idempotency key was reused with different devices.");
      return { session: clone(prior.session), created: false };
    }
    const pairKey = `${owner}:${phoneDeviceId}:${watchDeviceId}`;
    const existingId = this.byPair.get(pairKey);
    const existing = existingId ? this.sessions.get(existingId) : undefined;
    if (existing && isDeviceTrustSessionActive(existing, this.now())) {
      this.idempotency.set(idempotencyKeyScoped, { requestHash, session: existing });
      return { session: clone(existing), created: false };
    }
    const issuedAt = new Date(this.now()).toISOString();
    const session: DeviceTrustSession = {
      deviceSessionId: this.idFactory(),
      userId: owner,
      phoneDeviceId,
      watchDeviceId,
      state: "ACTIVE",
      issuedAt,
      ...(expiresAt === undefined ? {} : { expiresAt }),
    };
    this.sessions.set(session.deviceSessionId, session);
    this.byPair.set(pairKey, session.deviceSessionId);
    this.idempotency.set(idempotencyKeyScoped, { requestHash, session });
    return { session: clone(session), created: true };
  }

  list(userId: string): DeviceTrustSession[] {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    return [...this.sessions.values()].filter((session) => session.userId === owner).map(clone);
  }

  revoke(userId: string, deviceSessionId: string): DeviceTrustSession {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const id = requireId(deviceSessionId, "invalid_device_session", "deviceSessionId is required.");
    const session = this.sessions.get(id);
    if (!session || session.userId !== owner) throw new ContractError("device_session_not_found", "Device trust session was not found.");
    if (session.state === "REVOKED") return clone(session);
    session.state = "REVOKED";
    session.revokedAt = new Date(this.now()).toISOString();
    return clone(session);
  }

  isTrustedWatch(userId: string, watchDeviceId: string): boolean {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const watch = requireId(watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    return [...this.sessions.values()].some((session) => session.userId === owner && session.watchDeviceId === watch && isDeviceTrustSessionActive(session, this.now()));
  }

  isTrustedPair(userId: string, phoneDeviceId: string, watchDeviceId: string): boolean {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const phone = requireId(phoneDeviceId, "invalid_device_id", "phoneDeviceId is required.");
    const watch = requireId(watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    const id = this.byPair.get(`${owner}:${phone}:${watch}`);
    const session = id === undefined ? undefined : this.sessions.get(id);
    return session !== undefined && isDeviceTrustSessionActive(session, this.now());
  }
}
