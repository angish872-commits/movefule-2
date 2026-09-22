import { sha256 } from "../domain/sync-store.ts";
import type { RepositoryRow, ServerOwnedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import type { DeviceCommand, DeviceCommandInput } from "./device-commands.ts";
import type { DeviceTrustStoreLike } from "./appwrite-device-trust.ts";

type DeviceCommandRow = {
  commandId: string;
  userId: string;
  targetDeviceId: string;
  commandType: DeviceCommand["commandType"];
  objectId?: string;
  objectRevision?: number;
  operationId: string;
  idempotencyKey: string;
  requestHash: string;
  payloadHash: string;
  state: DeviceCommand["state"];
  requestedAt: string;
  expiresAt: string;
  acknowledgedAt?: string;
  errorCode?: string;
};

export type DeviceCommandStoreLike = {
  enqueue(userId: string, input: DeviceCommandInput): { command: DeviceCommand; created: boolean } | Promise<{ command: DeviceCommand; created: boolean }>;
  list(userId: string, targetDeviceId?: string): DeviceCommand[] | Promise<DeviceCommand[]>;
  acknowledge(userId: string, commandId: string, result: "ACKNOWLEDGED" | "FAILED", errorCode?: string): DeviceCommand | Promise<DeviceCommand>;
};

function requireId(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) throw new ContractError(code, message);
  return value.trim();
}

function fromRow(row: RepositoryRow<DeviceCommandRow>): DeviceCommand {
  const value = row as DeviceCommandRow;
  return {
    commandId: value.commandId,
    userId: value.userId,
    targetDeviceId: value.targetDeviceId,
    commandType: value.commandType,
    ...(value.objectId ? { objectId: value.objectId } : {}),
    ...(value.objectRevision === undefined ? {} : { objectRevision: value.objectRevision }),
    state: value.state,
    requestedAtEpochMillis: Date.parse(value.requestedAt),
    ...(value.acknowledgedAt ? { acknowledgedAtEpochMillis: Date.parse(value.acknowledgedAt) } : {}),
    ...(value.errorCode ? { errorCode: value.errorCode } : {}),
  };
}

/** Server-only Appwrite adapter for the canonical device_command control plane. */
export class AppwriteDeviceCommandStore implements DeviceCommandStoreLike {
  private readonly repository: ServerOwnedRepository;
  private readonly trust: DeviceTrustStoreLike;
  private readonly now: () => number;

  constructor(
    repository: ServerOwnedRepository,
    trust: DeviceTrustStoreLike,
    now: () => number = () => Date.now(),
  ) {
    this.repository = repository;
    this.trust = trust;
    this.now = now;
  }

  async enqueue(userId: string, input: DeviceCommandInput): Promise<{ command: DeviceCommand; created: boolean }> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const targetDeviceId = requireId(input.targetDeviceId, "invalid_device_id", "targetDeviceId is required.");
    const idempotencyKey = requireId(input.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    if (!(await this.trust.isTrustedWatch(owner, targetDeviceId))) throw new ContractError("device_not_trusted", "The target watch does not have an active owner trust session.");
    if (input.objectRevision !== undefined && (!Number.isInteger(input.objectRevision) || input.objectRevision < 0)) {
      throw new ContractError("invalid_revision", "objectRevision must be a non-negative integer.");
    }
    const payload = {
      targetDeviceId,
      commandType: input.commandType,
      objectId: input.objectId ?? null,
      objectRevision: input.objectRevision ?? null,
    };
    const payloadHash = sha256(payload);
    const requestHash = sha256({ ...payload, idempotencyKey });
    const operationId = input.operationId?.trim() || `device-op-${sha256({ owner, targetDeviceId, idempotencyKey }).slice(0, 48)}`;
    const existing = await this.repository.listForUser<DeviceCommandRow>("device_command", owner, {
      queries: [{ field: "idempotencyKey", operator: "equal", value: idempotencyKey }],
      limit: 2,
    });
    const prior = existing.rows[0];
    if (prior) {
      if (prior.requestHash !== requestHash) throw new ContractError("idempotency_key_reused", "Device command idempotency key was reused with different input.");
      return { command: fromRow(prior), created: false };
    }
    const timestamp = this.now();
    const commandId = `command-${sha256({ owner, operationId }).slice(0, 48)}`;
    const data: DeviceCommandRow = {
      commandId,
      userId: owner,
      targetDeviceId,
      commandType: input.commandType,
      ...(input.objectId === undefined ? {} : { objectId: input.objectId }),
      ...(input.objectRevision === undefined ? {} : { objectRevision: input.objectRevision }),
      operationId,
      idempotencyKey,
      requestHash,
      payloadHash,
      state: "PENDING",
      requestedAt: new Date(timestamp).toISOString(),
      expiresAt: new Date(timestamp + 24 * 60 * 60 * 1000).toISOString(),
    };
    const created = await this.repository.createForUser<DeviceCommandRow>("device_command", owner, commandId, data);
    return { command: fromRow(created), created: true };
  }

  async list(userId: string, targetDeviceId?: string): Promise<DeviceCommand[]> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const result = await this.repository.listForUser<DeviceCommandRow>("device_command", owner, {
      queries: targetDeviceId ? [{ field: "targetDeviceId", operator: "equal", value: targetDeviceId }] : [],
      limit: 100,
    });
    return result.rows.map(fromRow).sort((left, right) => left.requestedAtEpochMillis - right.requestedAtEpochMillis);
  }

  async acknowledge(userId: string, commandId: string, result: "ACKNOWLEDGED" | "FAILED", errorCode?: string): Promise<DeviceCommand> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const id = requireId(commandId, "invalid_command_id", "commandId is required.");
    if (result !== "ACKNOWLEDGED" && result !== "FAILED") throw new ContractError("invalid_command_result", "result is invalid.");
    const existing = await this.repository.getForUser<DeviceCommandRow>("device_command", owner, id);
    if (!existing) throw new ContractError("command_not_found", "Device command was not found.");
    if (existing.state === "ACKNOWLEDGED" || existing.state === "FAILED") return fromRow(existing);
    if (!(await this.trust.isTrustedWatch(owner, existing.targetDeviceId))) throw new ContractError("device_not_trusted", "The target watch no longer has an active owner trust session.");
    const updated = await this.repository.updateForUser<DeviceCommandRow>("device_command", owner, id, {
      state: result,
      acknowledgedAt: new Date(this.now()).toISOString(),
      ...(result === "FAILED" && errorCode ? { errorCode: requireId(errorCode, "invalid_error_code", "errorCode is invalid.") } : {}),
    });
    return fromRow(updated);
  }
}
