import { createHash } from "node:crypto";

export type IdempotencyRecord = {
  userId: string;
  key: string;
  requestHash: string;
  state: "in_progress" | "completed" | "rejected";
  result?: unknown;
  createdAtEpochMillis: number;
  completedAtEpochMillis?: number;
};

export type IdempotencyClaim =
  | { outcome: "claimed"; record: IdempotencyRecord }
  | { outcome: "replay"; record: IdempotencyRecord }
  | { outcome: "conflict"; record: IdempotencyRecord };

export interface IdempotencyStore {
  claim(userId: string, key: string, requestHash: string): Promise<IdempotencyClaim>;
  complete(userId: string, key: string, result: unknown): Promise<IdempotencyRecord>;
  reject(userId: string, key: string, result: unknown): Promise<IdempotencyRecord>;
}

export class IdempotencyError extends Error {
  public readonly code: "invalid_key" | "claim_missing" | "claim_not_owned";

  constructor(code: "invalid_key" | "claim_missing" | "claim_not_owned", message: string) {
    super(message);
    this.name = "IdempotencyError";
    this.code = code;
  }
}

export function validateIdempotencyKey(key: unknown): string {
  if (typeof key !== "string") throw new IdempotencyError("invalid_key", "Idempotency key must be a string.");
  const normalized = key.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    throw new IdempotencyError("invalid_key", "Idempotency key must contain 1 to 200 characters.");
  }
  return normalized;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(object).sort().map((key) => [key, stableValue(object[key])]));
}

export function hashRequest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

const storageKey = (userId: string, key: string) => `${userId}\u0000${key}`;

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  async claim(userId: string, key: string, requestHash: string): Promise<IdempotencyClaim> {
    const normalizedKey = validateIdempotencyKey(key);
    const mapKey = storageKey(userId, normalizedKey);
    const prior = this.records.get(mapKey);
    if (prior) {
      return prior.requestHash === requestHash
        ? { outcome: "replay", record: { ...prior } }
        : { outcome: "conflict", record: { ...prior } };
    }
    const record: IdempotencyRecord = {
      userId,
      key: normalizedKey,
      requestHash,
      state: "in_progress",
      createdAtEpochMillis: Date.now(),
    };
    this.records.set(mapKey, record);
    return { outcome: "claimed", record: { ...record } };
  }

  async complete(userId: string, key: string, result: unknown): Promise<IdempotencyRecord> {
    return this.finish(userId, key, "completed", result);
  }

  async reject(userId: string, key: string, result: unknown): Promise<IdempotencyRecord> {
    return this.finish(userId, key, "rejected", result);
  }

  private finish(
    userId: string,
    key: string,
    state: "completed" | "rejected",
    result: unknown,
  ): IdempotencyRecord {
    const normalizedKey = validateIdempotencyKey(key);
    const mapKey = storageKey(userId, normalizedKey);
    const current = this.records.get(mapKey);
    if (!current) throw new IdempotencyError("claim_missing", "The idempotency key has not been claimed.");
    if (current.userId !== userId) throw new IdempotencyError("claim_not_owned", "The idempotency key belongs to another user.");
    const updated: IdempotencyRecord = {
      ...current,
      state,
      result,
      completedAtEpochMillis: Date.now(),
    };
    this.records.set(mapKey, updated);
    return { ...updated };
  }
}
