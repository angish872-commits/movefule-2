import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import { isDeviceTrustSessionActive, type DeviceTrustSession } from "./device-trust.ts";

type DeviceRow = {
  deviceId: string;
  userId: string;
  platform: string;
  deviceClass: string;
  appVersion: string;
  revokedAt?: string;
};

type DeviceSessionRow = {
  deviceSessionId: string;
  userId: string;
  phoneDeviceId: string;
  watchDeviceId: string;
  state: "ACTIVE" | "REVOKED";
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
};

export type DeviceTrustStoreLike = {
  trust(userId: string, input: { phoneDeviceId: string; watchDeviceId: string; idempotencyKey: string; expiresAt?: string }): { session: DeviceTrustSession; created: boolean } | Promise<{ session: DeviceTrustSession; created: boolean }>;
  list(userId: string): DeviceTrustSession[] | Promise<DeviceTrustSession[]>;
  revoke(userId: string, deviceSessionId: string): DeviceTrustSession | Promise<DeviceTrustSession>;
  isTrustedWatch(userId: string, watchDeviceId: string): boolean | Promise<boolean>;
  isTrustedPair(userId: string, phoneDeviceId: string, watchDeviceId: string): boolean | Promise<boolean>;
};

function requireId(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) throw new ContractError(code, message);
  return value.trim();
}

function fromRow(row: RepositoryRow<DeviceSessionRow>): DeviceTrustSession {
  const value = row as DeviceSessionRow;
  return {
    deviceSessionId: value.deviceSessionId,
    userId: value.userId,
    phoneDeviceId: value.phoneDeviceId,
    watchDeviceId: value.watchDeviceId,
    state: value.state,
    issuedAt: value.issuedAt,
    ...(value.expiresAt ? { expiresAt: value.expiresAt } : {}),
    ...(value.revokedAt ? { revokedAt: value.revokedAt } : {}),
  };
}

/** Appwrite adapter for the reviewed owner-scoped device_session table. */
export class AppwriteDeviceTrustStore implements DeviceTrustStoreLike {
  private readonly repository: OwnerScopedRepository;
  private readonly now: () => number;

  constructor(repository: OwnerScopedRepository, options: { now?: () => number } = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => Date.now());
  }

  async trust(userId: string, input: { phoneDeviceId: string; watchDeviceId: string; idempotencyKey: string; expiresAt?: string }): Promise<{ session: DeviceTrustSession; created: boolean }> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const phoneDeviceId = requireId(input.phoneDeviceId, "invalid_device_id", "phoneDeviceId is required.");
    const watchDeviceId = requireId(input.watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    requireId(input.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const expiresAt = input.expiresAt === undefined ? undefined : requireId(input.expiresAt, "invalid_expires_at", "expiresAt is invalid.");
    if (expiresAt !== undefined && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= this.now())) {
      throw new ContractError("invalid_expires_at", "expiresAt must be a valid future timestamp.");
    }
    await this.ensureDevice(owner, phoneDeviceId, "ANDROID", "PHONE");
    await this.ensureDevice(owner, watchDeviceId, "WEAR_OS", "WATCH");
    const active = await this.repository.listOwned<DeviceSessionRow>("device_session", owner, {
      queries: [
        { field: "phoneDeviceId", operator: "equal", value: phoneDeviceId },
        { field: "watchDeviceId", operator: "equal", value: watchDeviceId },
        { field: "state", operator: "equal", value: "ACTIVE" },
      ],
      limit: 10,
    });
    const activeSession = active.rows.map(fromRow).find((session) => isDeviceTrustSessionActive(session, this.now()));
    if (activeSession) return { session: activeSession, created: false };
    const issuedAt = new Date(this.now()).toISOString();
    const deviceSessionId = `trust-${sha256({ owner, phoneDeviceId, watchDeviceId, idempotencyKey: input.idempotencyKey, expiresAt }).slice(0, 48)}`;
    const data: DeviceSessionRow = { deviceSessionId, userId: owner, phoneDeviceId, watchDeviceId, state: "ACTIVE", issuedAt, ...(expiresAt === undefined ? {} : { expiresAt }) };
    const existing = await this.repository.getOwned<DeviceSessionRow>("device_session", owner, deviceSessionId);
    if (existing) return { session: fromRow(existing), created: false };
    const created = await this.repository.createOwned<DeviceSessionRow>("device_session", owner, deviceSessionId, data);
    return { session: fromRow(created), created: true };
  }

  private async ensureDevice(userId: string, deviceId: string, platform: string, deviceClass: string): Promise<void> {
    const existing = await this.repository.getOwned<DeviceRow>("device", userId, deviceId);
    if (existing) return;
    await this.repository.createOwned<DeviceRow>("device", userId, deviceId, {
      deviceId,
      userId,
      platform,
      deviceClass,
      appVersion: "unknown",
    });
  }

  async list(userId: string): Promise<DeviceTrustSession[]> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const result = await this.repository.listOwned<DeviceSessionRow>("device_session", owner, { limit: 100 });
    return result.rows.map(fromRow);
  }

  async revoke(userId: string, deviceSessionId: string): Promise<DeviceTrustSession> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const id = requireId(deviceSessionId, "invalid_device_session", "deviceSessionId is required.");
    const existing = await this.repository.getOwned<DeviceSessionRow>("device_session", owner, id);
    if (!existing) throw new ContractError("device_session_not_found", "Device trust session was not found.");
    if (existing.state === "REVOKED") return fromRow(existing);
    return fromRow(await this.repository.updateOwned<DeviceSessionRow>("device_session", owner, id, {
      state: "REVOKED",
      revokedAt: new Date(this.now()).toISOString(),
    }));
  }

  async isTrustedWatch(userId: string, watchDeviceId: string): Promise<boolean> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const watch = requireId(watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    const result = await this.repository.listOwned<DeviceSessionRow>("device_session", owner, {
      queries: [{ field: "watchDeviceId", operator: "equal", value: watch }, { field: "state", operator: "equal", value: "ACTIVE" }],
      limit: 1,
    });
    return result.rows.map(fromRow).some((session) => isDeviceTrustSessionActive(session, this.now()));
  }

  async isTrustedPair(userId: string, phoneDeviceId: string, watchDeviceId: string): Promise<boolean> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const phone = requireId(phoneDeviceId, "invalid_device_id", "phoneDeviceId is required.");
    const watch = requireId(watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    const result = await this.repository.listOwned<DeviceSessionRow>("device_session", owner, {
      queries: [
        { field: "phoneDeviceId", operator: "equal", value: phone },
        { field: "watchDeviceId", operator: "equal", value: watch },
        { field: "state", operator: "equal", value: "ACTIVE" },
      ],
      limit: 1,
    });
    return result.rows.map(fromRow).some((session) => isDeviceTrustSessionActive(session, this.now()));
  }
}
