import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";

export type PersonalFood = {
  personalFoodId: string;
  userId: string;
  name: string;
  basisAmount: number;
  basisUnit: string;
  energyKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  provenanceNote?: string;
  revision: number;
  createdAtEpochMillis: number;
  updatedAtEpochMillis: number;
  deletedAtEpochMillis?: number;
};

export type PersonalFoodInput = Omit<PersonalFood, "personalFoodId" | "userId" | "revision" | "createdAtEpochMillis" | "updatedAtEpochMillis" | "deletedAtEpochMillis"> & {
  idempotencyKey: string;
};

export type PersonalFoodUpdateInput = Partial<Omit<PersonalFoodInput, "idempotencyKey">> & {
  expectedRevision: number;
};

export type PersonalFoodMutationResult = {
  status: "CREATED" | "UPDATED" | "DUPLICATE" | "DELETED";
  food: PersonalFood;
};

export class PersonalFoodContractError extends Error {
  public readonly code:
    | "invalid_personal_food"
    | "personal_food_not_found"
    | "personal_food_revision_conflict"
    | "personal_food_idempotency_reused";
  public readonly retryable: boolean;

  constructor(
    code: PersonalFoodContractError["code"],
    message: string,
    retryable = false,
  ) {
    super(message);
    this.name = "PersonalFoodContractError";
    this.code = code;
    this.retryable = retryable;
  }
}

export interface PersonalFoodStoreLike {
  create(userId: string, input: PersonalFoodInput): PersonalFoodMutationResult | Promise<PersonalFoodMutationResult>;
  list(userId: string): PersonalFood[] | Promise<PersonalFood[]>;
  update(userId: string, personalFoodId: string, input: PersonalFoodUpdateInput): PersonalFoodMutationResult | Promise<PersonalFoodMutationResult>;
  delete(userId: string, personalFoodId: string, expectedRevision: number): PersonalFoodMutationResult | Promise<PersonalFoodMutationResult>;
}

type PersonalFoodStoreOptions = {
  now?: () => number;
  idFactory?: () => string;
};

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PersonalFoodContractError("invalid_personal_food", `${field} is required.`);
  }
  return value.trim();
}

function requireNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new PersonalFoodContractError("invalid_personal_food", `${field} must be a non-negative number.`);
  }
  return value;
}

function requireRevision(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new PersonalFoodContractError("invalid_personal_food", "expectedRevision must be a positive integer.");
  }
  return value as number;
}

function validateInput(input: PersonalFoodInput): Omit<PersonalFoodInput, "idempotencyKey"> & { idempotencyKey: string } {
  const idempotencyKey = requireText(input.idempotencyKey, "idempotencyKey");
  return {
    idempotencyKey,
    name: requireText(input.name, "name").slice(0, 256),
    basisAmount: requireNonNegativeNumber(input.basisAmount, "basisAmount"),
    basisUnit: requireText(input.basisUnit, "basisUnit").slice(0, 32),
    energyKcal: requireNonNegativeNumber(input.energyKcal, "energyKcal"),
    proteinG: requireNonNegativeNumber(input.proteinG, "proteinG"),
    carbG: requireNonNegativeNumber(input.carbG, "carbG"),
    fatG: requireNonNegativeNumber(input.fatG, "fatG"),
    fiberG: requireNonNegativeNumber(input.fiberG, "fiberG"),
    ...(input.provenanceNote === undefined ? {} : { provenanceNote: requireText(input.provenanceNote, "provenanceNote").slice(0, 1024) }),
  };
}

function userKey(userId: string, id: string): string {
  return `${userId}:${id}`;
}

function clone(food: PersonalFood): PersonalFood {
  return { ...food };
}

export class PersonalFoodStore implements PersonalFoodStoreLike {
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly foods = new Map<string, PersonalFood>();
  private readonly idempotency = new Map<string, { requestHash: string; result: PersonalFoodMutationResult }>();

  constructor(options: PersonalFoodStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.idFactory = options.idFactory ?? (() => `personal-food-${Math.random().toString(36).slice(2, 12)}`);
  }

  create(userId: string, input: PersonalFoodInput): PersonalFoodMutationResult {
    const valid = validateInput(input);
    const key = userKey(userId, valid.idempotencyKey);
    const requestHash = sha256({ userId, input: valid });
    const prior = this.idempotency.get(key);
    if (prior) {
      if (prior.requestHash !== requestHash) throw new PersonalFoodContractError("personal_food_idempotency_reused", "The idempotency key is already bound to another food.");
      return { status: "DUPLICATE", food: clone(prior.result.food) };
    }
    const timestamp = this.now();
    const food: PersonalFood = {
      personalFoodId: this.idFactory(),
      userId,
      name: valid.name,
      basisAmount: valid.basisAmount,
      basisUnit: valid.basisUnit,
      energyKcal: valid.energyKcal,
      proteinG: valid.proteinG,
      carbG: valid.carbG,
      fatG: valid.fatG,
      fiberG: valid.fiberG,
      ...(valid.provenanceNote === undefined ? {} : { provenanceNote: valid.provenanceNote }),
      revision: 1,
      createdAtEpochMillis: timestamp,
      updatedAtEpochMillis: timestamp,
    };
    const result = { status: "CREATED" as const, food };
    this.foods.set(userKey(userId, food.personalFoodId), food);
    this.idempotency.set(key, { requestHash, result });
    return { status: result.status, food: clone(food) };
  }

  list(userId: string): PersonalFood[] {
    return [...this.foods.values()]
      .filter((food) => food.userId === userId && food.deletedAtEpochMillis === undefined)
      .sort((left, right) => right.updatedAtEpochMillis - left.updatedAtEpochMillis || left.name.localeCompare(right.name))
      .map(clone);
  }

  update(userId: string, personalFoodId: string, input: PersonalFoodUpdateInput): PersonalFoodMutationResult {
    const food = this.require(userId, personalFoodId);
    const expectedRevision = requireRevision(input.expectedRevision);
    if (food.revision !== expectedRevision) throw new PersonalFoodContractError("personal_food_revision_conflict", "The personal food revision is stale; refresh before editing.", true);
    const next: PersonalFood = {
      ...food,
      ...(input.name === undefined ? {} : { name: requireText(input.name, "name").slice(0, 256) }),
      ...(input.basisAmount === undefined ? {} : { basisAmount: requireNonNegativeNumber(input.basisAmount, "basisAmount") }),
      ...(input.basisUnit === undefined ? {} : { basisUnit: requireText(input.basisUnit, "basisUnit").slice(0, 32) }),
      ...(input.energyKcal === undefined ? {} : { energyKcal: requireNonNegativeNumber(input.energyKcal, "energyKcal") }),
      ...(input.proteinG === undefined ? {} : { proteinG: requireNonNegativeNumber(input.proteinG, "proteinG") }),
      ...(input.carbG === undefined ? {} : { carbG: requireNonNegativeNumber(input.carbG, "carbG") }),
      ...(input.fatG === undefined ? {} : { fatG: requireNonNegativeNumber(input.fatG, "fatG") }),
      ...(input.fiberG === undefined ? {} : { fiberG: requireNonNegativeNumber(input.fiberG, "fiberG") }),
      ...(input.provenanceNote === undefined ? {} : { provenanceNote: requireText(input.provenanceNote, "provenanceNote").slice(0, 1024) }),
      revision: food.revision + 1,
      updatedAtEpochMillis: this.now(),
    };
    this.foods.set(userKey(userId, personalFoodId), next);
    return { status: "UPDATED", food: clone(next) };
  }

  delete(userId: string, personalFoodId: string, expectedRevision: number): PersonalFoodMutationResult {
    const food = this.require(userId, personalFoodId);
    const revision = requireRevision(expectedRevision);
    if (food.revision !== revision) throw new PersonalFoodContractError("personal_food_revision_conflict", "The personal food revision is stale; refresh before deleting.", true);
    const next: PersonalFood = { ...food, revision: food.revision + 1, updatedAtEpochMillis: this.now(), deletedAtEpochMillis: this.now() };
    this.foods.set(userKey(userId, personalFoodId), next);
    return { status: "DELETED", food: clone(next) };
  }

  private require(userId: string, personalFoodId: string): PersonalFood {
    const food = this.foods.get(userKey(userId, personalFoodId));
    if (!food || food.deletedAtEpochMillis !== undefined) throw new PersonalFoodContractError("personal_food_not_found", "Personal food was not found.");
    return food;
  }
}

type AppwritePersonalFoodRow = {
  personalFoodId: string;
  userId: string;
  name: string;
  basisAmount: number;
  basisUnit: string;
  energyKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  provenanceNote?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

function fromRow(row: RepositoryRow<AppwritePersonalFoodRow>): PersonalFood {
  const data = row as AppwritePersonalFoodRow;
  return {
    personalFoodId: data.personalFoodId,
    userId: data.userId,
    name: data.name,
    basisAmount: data.basisAmount,
    basisUnit: data.basisUnit,
    energyKcal: data.energyKcal,
    proteinG: data.proteinG,
    carbG: data.carbG,
    fatG: data.fatG,
    fiberG: data.fiberG,
    ...(data.provenanceNote === undefined ? {} : { provenanceNote: data.provenanceNote }),
    revision: data.revision,
    createdAtEpochMillis: Date.parse(data.createdAt),
    updatedAtEpochMillis: Date.parse(data.updatedAt),
    ...(data.deletedAt === undefined ? {} : { deletedAtEpochMillis: Date.parse(data.deletedAt) }),
  };
}

function toRow(userId: string, food: PersonalFood, now: number): AppwritePersonalFoodRow {
  return {
    personalFoodId: food.personalFoodId,
    userId,
    name: food.name,
    basisAmount: food.basisAmount,
    basisUnit: food.basisUnit,
    energyKcal: food.energyKcal,
    proteinG: food.proteinG,
    carbG: food.carbG,
    fatG: food.fatG,
    fiberG: food.fiberG,
    ...(food.provenanceNote === undefined ? {} : { provenanceNote: food.provenanceNote }),
    revision: food.revision,
    createdAt: new Date(food.createdAtEpochMillis).toISOString(),
    updatedAt: new Date(now).toISOString(),
    ...(food.deletedAtEpochMillis === undefined ? {} : { deletedAt: new Date(food.deletedAtEpochMillis).toISOString() }),
  };
}

export class AppwritePersonalFoodStore implements PersonalFoodStoreLike {
  private readonly repository: OwnerScopedRepository;
  private readonly now: () => number;

  constructor(repository: OwnerScopedRepository, options: { now?: () => number } = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => Date.now());
  }

  async create(userId: string, input: PersonalFoodInput): Promise<PersonalFoodMutationResult> {
    const valid = validateInput(input);
    const rowId = `pf-${sha256({ userId, idempotencyKey: valid.idempotencyKey }).slice(0, 28)}`;
    const existing = await this.repository.getOwned<AppwritePersonalFoodRow>("personal_food", userId, rowId);
    if (existing) {
      const food = fromRow(existing);
      const same = food.name === valid.name && food.basisAmount === valid.basisAmount && food.basisUnit === valid.basisUnit && food.energyKcal === valid.energyKcal && food.proteinG === valid.proteinG && food.carbG === valid.carbG && food.fatG === valid.fatG && food.fiberG === valid.fiberG;
      if (!same) throw new PersonalFoodContractError("personal_food_idempotency_reused", "The idempotency key is already bound to another food.");
      return { status: "DUPLICATE", food };
    }
    const timestamp = this.now();
    const food: PersonalFood = {
      personalFoodId: rowId,
      userId,
      name: valid.name,
      basisAmount: valid.basisAmount,
      basisUnit: valid.basisUnit,
      energyKcal: valid.energyKcal,
      proteinG: valid.proteinG,
      carbG: valid.carbG,
      fatG: valid.fatG,
      fiberG: valid.fiberG,
      ...(valid.provenanceNote === undefined ? {} : { provenanceNote: valid.provenanceNote }),
      revision: 1,
      createdAtEpochMillis: timestamp,
      updatedAtEpochMillis: timestamp,
    };
    const row = await this.repository.createOwned<AppwritePersonalFoodRow>("personal_food", userId, rowId, toRow(userId, food, timestamp));
    return { status: "CREATED", food: fromRow(row) };
  }

  async list(userId: string): Promise<PersonalFood[]> {
    const result = await this.repository.listOwned<AppwritePersonalFoodRow>("personal_food", userId, { limit: 100 });
    return result.rows.map(fromRow).filter((food) => food.deletedAtEpochMillis === undefined).sort((left, right) => right.updatedAtEpochMillis - left.updatedAtEpochMillis || left.name.localeCompare(right.name));
  }

  async update(userId: string, personalFoodId: string, input: PersonalFoodUpdateInput): Promise<PersonalFoodMutationResult> {
    const row = await this.repository.getOwned<AppwritePersonalFoodRow>("personal_food", userId, personalFoodId);
    if (!row) throw new PersonalFoodContractError("personal_food_not_found", "Personal food was not found.");
    const food = fromRow(row);
    const expectedRevision = requireRevision(input.expectedRevision);
    if (food.revision !== expectedRevision) throw new PersonalFoodContractError("personal_food_revision_conflict", "The personal food revision is stale; refresh before editing.", true);
    const changes: Partial<AppwritePersonalFoodRow> = {
      ...(input.name === undefined ? {} : { name: requireText(input.name, "name").slice(0, 256) }),
      ...(input.basisAmount === undefined ? {} : { basisAmount: requireNonNegativeNumber(input.basisAmount, "basisAmount") }),
      ...(input.basisUnit === undefined ? {} : { basisUnit: requireText(input.basisUnit, "basisUnit").slice(0, 32) }),
      ...(input.energyKcal === undefined ? {} : { energyKcal: requireNonNegativeNumber(input.energyKcal, "energyKcal") }),
      ...(input.proteinG === undefined ? {} : { proteinG: requireNonNegativeNumber(input.proteinG, "proteinG") }),
      ...(input.carbG === undefined ? {} : { carbG: requireNonNegativeNumber(input.carbG, "carbG") }),
      ...(input.fatG === undefined ? {} : { fatG: requireNonNegativeNumber(input.fatG, "fatG") }),
      ...(input.fiberG === undefined ? {} : { fiberG: requireNonNegativeNumber(input.fiberG, "fiberG") }),
      ...(input.provenanceNote === undefined ? {} : { provenanceNote: requireText(input.provenanceNote, "provenanceNote").slice(0, 1024) }),
      revision: food.revision + 1,
      updatedAt: new Date(this.now()).toISOString(),
    };
    const updated = await this.repository.updateOwned<AppwritePersonalFoodRow>("personal_food", userId, personalFoodId, changes);
    return { status: "UPDATED", food: fromRow(updated) };
  }

  async delete(userId: string, personalFoodId: string, expectedRevision: number): Promise<PersonalFoodMutationResult> {
    const row = await this.repository.getOwned<AppwritePersonalFoodRow>("personal_food", userId, personalFoodId);
    if (!row) throw new PersonalFoodContractError("personal_food_not_found", "Personal food was not found.");
    const food = fromRow(row);
    const revision = requireRevision(expectedRevision);
    if (food.revision !== revision) throw new PersonalFoodContractError("personal_food_revision_conflict", "The personal food revision is stale; refresh before deleting.", true);
    const deletedAt = this.now();
    const updated = await this.repository.updateOwned<AppwritePersonalFoodRow>("personal_food", userId, personalFoodId, {
      revision: food.revision + 1,
      updatedAt: new Date(deletedAt).toISOString(),
      deletedAt: new Date(deletedAt).toISOString(),
    });
    return { status: "DELETED", food: fromRow(updated) };
  }
}
