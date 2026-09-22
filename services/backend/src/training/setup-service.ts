import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";

export type TrainingSetupInput = {
  experienceBand: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  equipmentCodes: readonly string[];
  environmentCodes: readonly string[];
  availabilityMinutesByDay: Readonly<Record<string, number>>;
  preferenceCodes: readonly string[];
  limitationCodes: readonly string[];
};

export type StoredTrainingSetup = TrainingSetupInput & {
  revision: number;
  updatedAt: string;
};

export class TrainingSetupContractError extends Error {
  public readonly code = "invalid_training_setup" as const;
  public constructor(message: string) {
    super(message);
    this.name = "TrainingSetupContractError";
  }
}

function code(value: unknown, field: string, allowColon = false): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 128) {
    throw new TrainingSetupContractError(`${field} values must be non-empty strings of at most 128 characters.`);
  }
  const trimmed = value.trim();
  if (allowColon && trimmed.includes(":")) {
    const separator = trimmed.indexOf(":");
    const prefix = trimmed.slice(0, separator).trim().toUpperCase().replace(/[\s-]+/g, "_");
    const identity = trimmed.slice(separator + 1).trim();
    if (!/^[A-Z0-9_.]+$/.test(prefix) || !/^[A-Za-z0-9._-]+$/.test(identity)) {
      throw new TrainingSetupContractError(`${field} contains an unsupported scoped code.`);
    }
    return `${prefix}:${identity}`;
  }
  const normalized = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
  if (!/^[A-Z0-9_.]+$/.test(normalized)) throw new TrainingSetupContractError(`${field} contains an unsupported code.`);
  return normalized;
}

function codes(values: readonly string[], field: string, allowColon = false): readonly string[] {
  if (!Array.isArray(values) || values.length > 128) throw new TrainingSetupContractError(`${field} must be an array with at most 128 values.`);
  return [...new Set(values.map((value) => code(value, field, allowColon)))].sort();
}

function availability(value: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TrainingSetupContractError("availabilityMinutesByDay must be an object.");
  const out: Record<string, number> = {};
  for (const [rawDay, rawMinutes] of Object.entries(value)) {
    const day = code(rawDay, "availabilityMinutesByDay");
    if (typeof rawMinutes !== "number" || !Number.isFinite(rawMinutes) || !Number.isInteger(rawMinutes) || rawMinutes < 0 || rawMinutes > 240) {
      throw new TrainingSetupContractError("Availability minutes must be integers from 0 to 240.");
    }
    out[day] = rawMinutes;
  }
  if (Object.keys(out).length === 0) throw new TrainingSetupContractError("At least one explicit availability day is required.");
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right)));
}

function validate(input: TrainingSetupInput): TrainingSetupInput {
  if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(input.experienceBand)) {
    throw new TrainingSetupContractError("experienceBand must be BEGINNER, INTERMEDIATE or ADVANCED.");
  }
  const environmentCodes = codes(input.environmentCodes, "environmentCodes");
  if (environmentCodes.length === 0) throw new TrainingSetupContractError("At least one explicit training environment is required.");
  return {
    experienceBand: input.experienceBand,
    equipmentCodes: codes(input.equipmentCodes, "equipmentCodes"),
    environmentCodes,
    availabilityMinutesByDay: availability(input.availabilityMinutesByDay),
    preferenceCodes: codes(input.preferenceCodes, "preferenceCodes", true),
    limitationCodes: codes(input.limitationCodes, "limitationCodes", true),
  };
}

function parseRow(row: RepositoryRow): StoredTrainingSetup | null {
  if (row.key !== "training_profile" || typeof row.valueJson !== "string") return null;
  try {
    const parsed = JSON.parse(row.valueJson) as TrainingSetupInput;
    const normalized = validate(parsed);
    return {
      ...normalized,
      revision: typeof row.revision === "number" && Number.isInteger(row.revision) && row.revision > 0 ? row.revision : 1,
      updatedAt: typeof row.updatedAt === "string" && Number.isFinite(Date.parse(row.updatedAt)) ? new Date(row.updatedAt).toISOString() : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function rowId(userId: string): string {
  return `training-${sha256(userId.trim()).slice(0, 27)}`;
}

export class TrainingSetupService {
  private readonly local = new Map<string, StoredTrainingSetup>();

  public async get(userId: string, repository?: OwnerScopedRepository): Promise<StoredTrainingSetup | null> {
    const owner = userId.trim();
    if (!owner) throw new TrainingSetupContractError("An authenticated user is required.");
    if (!repository) return this.local.get(owner) ?? null;
    const row = await repository.getOwned("user_preference", owner, rowId(owner));
    return row ? parseRow(row) : null;
  }

  public async save(userId: string, input: TrainingSetupInput, repository?: OwnerScopedRepository): Promise<StoredTrainingSetup> {
    const owner = userId.trim();
    if (!owner) throw new TrainingSetupContractError("An authenticated user is required.");
    const normalized = validate(input);
    const current = await this.get(owner, repository);
    const next: StoredTrainingSetup = {
      ...normalized,
      revision: (current?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    if (!repository) {
      this.local.set(owner, next);
      return next;
    }
    const id = rowId(owner);
    const data = {
      preferenceId: id,
      key: "training_profile",
      valueJson: JSON.stringify(normalized),
      revision: next.revision,
      updatedAt: next.updatedAt,
    };
    if (current) await repository.updateOwned("user_preference", owner, id, data);
    else await repository.createOwned("user_preference", owner, id, data);
    return next;
  }
}
