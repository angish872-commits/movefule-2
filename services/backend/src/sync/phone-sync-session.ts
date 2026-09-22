import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";

export const PHONE_SYNC_SESSION_PREFIX = "phone-sync-v1.";

type DeviceRow = {
  deviceId: string;
  userId: string;
  platform?: string;
  deviceClass: string;
  appVersion?: string;
  revokedAt?: string;
};

export type PhoneSessionMetadataRow = {
  sessionMetaId: string;
  userId: string;
  appwriteSessionIdHash: string;
  deviceId?: string;
  platform: string;
  appVersion: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string;
};

export type PhoneSyncSession = {
  mode: "PHONE_ONLY";
  deviceId: string;
  deviceSessionId: string;
};

const requireId = (value: unknown, code: string, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) {
    throw new ContractError(code, `${label} is required.`);
  }
  return value.trim();
};

export const appwriteSessionBindingHash = (sessionId: string): string =>
  sha256({ purpose: "appwrite-session-metadata-v1", sessionId });

const metadataRowId = (userId: string, sessionHash: string): string =>
  `session-meta-${sha256({ purpose: "phone-sync-session-metadata-v1", userId, sessionHash }).slice(0, 48)}`;

export const phoneSyncSessionLocator = (userId: string, deviceId: string, sessionHash: string): string =>
  `${PHONE_SYNC_SESSION_PREFIX}${sha256({ purpose: "phone-sync-locator-v1", userId, deviceId, sessionHash }).slice(0, 48)}`;

export class PhoneSyncSessionService {
  private readonly repository: OwnerScopedRepository;
  private readonly now: () => Date;

  public constructor(repository: OwnerScopedRepository, now: () => Date = () => new Date()) {
    this.repository = repository;
    this.now = now;
  }

  public async acquire(userId: string, authenticatedSessionId: string, deviceId: string): Promise<PhoneSyncSession> {
    const owner = requireId(userId, "invalid_user_id", "userId");
    const sessionId = requireId(authenticatedSessionId, "invalid_session", "authenticated session");
    const phoneId = requireId(deviceId, "invalid_device_id", "deviceId");
    const devices = await this.repository.listOwned<DeviceRow>("device", owner, {
      queries: [{ field: "deviceId", operator: "equal", value: phoneId }],
      limit: 2,
    });
    const device = devices.rows[0];
    if (!device || device.revokedAt) {
      throw new ContractError("AUTHORITY_REVOKED", "Phone device is unknown or revoked for the authenticated owner.");
    }
    if (device.deviceId !== phoneId || device.userId !== owner) {
      throw new ContractError("AUTHORITY_REVOKED", "Phone device ownership does not match the authenticated owner.");
    }
    if (device.deviceClass.trim().toLowerCase() !== "phone") {
      throw new ContractError("AUTHORITY_REVOKED", "Only a registered Phone may acquire a Phone-only sync session.");
    }

    const sessionHash = appwriteSessionBindingHash(sessionId);
    const rows = await this.repository.listOwned<PhoneSessionMetadataRow>("user_session_metadata", owner, {
      queries: [{ field: "appwriteSessionIdHash", operator: "equal", value: sessionHash }],
      limit: 2,
    });
    if (rows.rows.length > 1) {
      throw new ContractError("AUTHORITY_REVOKED", "Authenticated session metadata is ambiguous.");
    }

    const now = this.now().toISOString();
    let metadata = rows.rows[0];
    if (metadata) {
      if (metadata.revokedAt) {
        throw new ContractError("AUTHORITY_REVOKED", "Authenticated session metadata is revoked.");
      }
      if (metadata.appwriteSessionIdHash !== sessionHash || metadata.userId !== owner || metadata.deviceId !== phoneId) {
        throw new ContractError("AUTHORITY_REVOKED", "Authenticated session metadata does not match this owner and Phone.");
      }
    } else {
      const rowId = metadataRowId(owner, sessionHash);
      metadata = await this.repository.createOwned<PhoneSessionMetadataRow>("user_session_metadata", owner, rowId, {
        sessionMetaId: rowId,
        userId: owner,
        appwriteSessionIdHash: sessionHash,
        deviceId: phoneId,
        platform: device.platform?.trim() || "android",
        appVersion: device.appVersion?.trim() || "unknown",
        createdAt: now,
        lastSeenAt: now,
      });
    }

    return {
      mode: "PHONE_ONLY",
      deviceId: phoneId,
      deviceSessionId: phoneSyncSessionLocator(owner, phoneId, metadata.appwriteSessionIdHash),
    };
  }
}
