import { randomUUID } from "node:crypto";
import { sha256 } from "../domain/sync-store.ts";
import { ContractError } from "../shared/contracts.ts";
import { DeviceTrustStore } from "./device-trust.ts";

export type DeviceCommandState = "PENDING" | "SENT" | "ACKNOWLEDGED" | "FAILED";
export type DeviceCommandType = "SYNC_SUMMARY" | "REFRESH_HEALTH" | "RECONCILE";

export type DeviceCommand = {
  commandId: string;
  userId: string;
  targetDeviceId: string;
  commandType: DeviceCommandType;
  objectId?: string;
  objectRevision?: number;
  state: DeviceCommandState;
  requestedAtEpochMillis: number;
  acknowledgedAtEpochMillis?: number;
  errorCode?: string;
};

export type DeviceCommandInput = {
  operationId?: string;
  idempotencyKey: string;
  targetDeviceId: string;
  commandType: DeviceCommandType;
  objectId?: string;
  objectRevision?: number;
};

const clone = <T>(value: T): T => structuredClone(value);
const validTypes = new Set<DeviceCommandType>(["SYNC_SUMMARY", "REFRESH_HEALTH", "RECONCILE"]);

function requireString(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) throw new ContractError(code, message);
  return value.trim();
}

export class DeviceCommandStore {
  private readonly commands = new Map<string, DeviceCommand>();
  private readonly unique = new Map<string, string>();
  private readonly idempotency = new Map<string, { requestHash: string; command: DeviceCommand }>();
  private readonly trust: DeviceTrustStore;
  private readonly now: () => number;
  private readonly idFactory: () => string;

  constructor(options: { trust: DeviceTrustStore; now?: () => number; idFactory?: () => string }) {
    this.trust = options.trust;
    this.now = options.now ?? (() => Date.now());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  enqueue(userId: string, input: DeviceCommandInput): { command: DeviceCommand; created: boolean } {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const targetDeviceId = requireString(input.targetDeviceId, "invalid_device_id", "targetDeviceId is required.");
    const idempotencyKey = requireString(input.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    if (input.operationId !== undefined) requireString(input.operationId, "invalid_operation_id", "operationId is invalid.");
    if (!validTypes.has(input.commandType)) throw new ContractError("invalid_command_type", "commandType is unsupported.");
    if (!this.trust.isTrustedWatch(owner, targetDeviceId)) throw new ContractError("device_not_trusted", "The target watch does not have an active owner trust session.");
    if (input.objectRevision !== undefined && (!Number.isInteger(input.objectRevision) || input.objectRevision < 0)) throw new ContractError("invalid_revision", "objectRevision must be a non-negative integer.");
    const requestHash = sha256({ owner, targetDeviceId, commandType: input.commandType, objectId: input.objectId, objectRevision: input.objectRevision });
    const idempotencyId = `${owner}:${idempotencyKey}`;
    const prior = this.idempotency.get(idempotencyId);
    if (prior) {
      if (prior.requestHash !== requestHash) throw new ContractError("idempotency_key_reused", "Device command idempotency key was reused with different input.");
      return { command: clone(prior.command), created: false };
    }
    const uniqueKey = `${owner}:${targetDeviceId}:${input.commandType}:${input.objectId ?? ""}:${input.objectRevision ?? ""}`;
    const existingId = this.unique.get(uniqueKey);
    const existing = existingId ? this.commands.get(existingId) : undefined;
    if (existing && existing.state !== "FAILED") {
      this.idempotency.set(idempotencyId, { requestHash, command: existing });
      return { command: clone(existing), created: false };
    }
    const command: DeviceCommand = {
      commandId: this.idFactory(),
      userId: owner,
      targetDeviceId,
      commandType: input.commandType,
      ...(input.objectId ? { objectId: input.objectId } : {}),
      ...(input.objectRevision === undefined ? {} : { objectRevision: input.objectRevision }),
      state: "PENDING",
      requestedAtEpochMillis: this.now(),
    };
    this.commands.set(command.commandId, command);
    this.unique.set(uniqueKey, command.commandId);
    this.idempotency.set(idempotencyId, { requestHash, command });
    return { command: clone(command), created: true };
  }

  markSent(userId: string, commandId: string): DeviceCommand {
    const command = this.requireOwned(userId, commandId);
    if (command.state === "ACKNOWLEDGED" || command.state === "FAILED") throw new ContractError("command_terminal", "A terminal device command cannot be sent again.");
    command.state = "SENT";
    return clone(command);
  }

  acknowledge(userId: string, commandId: string, result: "ACKNOWLEDGED" | "FAILED", errorCode?: string): DeviceCommand {
    const command = this.requireOwned(userId, commandId);
    if (command.state === "ACKNOWLEDGED" || command.state === "FAILED") return clone(command);
    if (!this.trust.isTrustedWatch(userId, command.targetDeviceId)) throw new ContractError("device_not_trusted", "The target watch no longer has an active owner trust session.");
    command.state = result;
    command.acknowledgedAtEpochMillis = this.now();
    if (result === "FAILED" && errorCode) command.errorCode = requireString(errorCode, "invalid_error_code", "errorCode is invalid.");
    return clone(command);
  }

  list(userId: string, targetDeviceId?: string): DeviceCommand[] {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    return [...this.commands.values()]
      .filter((command) => command.userId === owner && (targetDeviceId === undefined || command.targetDeviceId === targetDeviceId))
      .sort((left, right) => left.requestedAtEpochMillis - right.requestedAtEpochMillis)
      .map(clone);
  }

  private requireOwned(userId: string, commandId: string): DeviceCommand {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const id = requireString(commandId, "invalid_command_id", "commandId is required.");
    const command = this.commands.get(id);
    if (!command || command.userId !== owner) throw new ContractError("command_not_found", "Device command was not found.");
    return command;
  }
}
