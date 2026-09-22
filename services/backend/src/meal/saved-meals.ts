import { createHash, randomUUID } from "node:crypto";
import {
  MealContractError,
  type NutritionItem,
  type SavedMeal,
  type SavedMealItem,
  type SaveMealInput,
} from "./contracts.ts";
import { clone, totalsForItems, validateItems } from "./nutrition.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";

type IdempotentRecord = { requestHash: string; value: SavedMeal };

const scopedKey = (userId: string, value: string): string => `${userId}:${value}`;
const hash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function requireUserId(userId: string): void {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new MealContractError("invalid_user_id", "A user id is required.");
  }
}


export function normalizeSavedMealName(value: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 100) {
    throw new MealContractError("invalid_saved_meal_name", "name must be between 1 and 100 characters.");
  }
  return value.trim();
}

export function normalizeSavedMealItems(value: unknown): NutritionItem[] {
  return validateItems(value);
}

export type SavedMealStoreOptions = {
  now?: () => number;
  idFactory?: () => string;
};

export type SaveMealResult = {
  status: "CREATED" | "DUPLICATE";
  savedMeal: SavedMeal;
};

export interface SavedMealStoreLike {
  create(userId: string, input: SaveMealInput): SaveMealResult | Promise<SaveMealResult>;
  list(userId: string, query?: string): SavedMeal[] | Promise<SavedMeal[]>;
  get(userId: string, savedMealId: string): SavedMeal | Promise<SavedMeal>;
}

/** In-memory adapter for the saved_meal/saved_meal_item Appwrite tables. */
export class SavedMealStore implements SavedMealStoreLike {
  private readonly savedMeals = new Map<string, SavedMeal>();
  private readonly idempotency = new Map<string, IdempotentRecord>();
  private readonly now: () => number;
  private readonly idFactory: () => string;

  constructor(options: SavedMealStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  create(userId: string, input: SaveMealInput): SaveMealResult {
    requireUserId(userId);
    const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
    const name = normalizeSavedMealName(input.name);
    const items = normalizeSavedMealItems(input.items);
    const requestHash = hash({ name, items });
    const key = scopedKey(userId, idempotencyKey);
    const prior = this.idempotency.get(key);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        throw new MealContractError("idempotency_key_reused", "Saved meal idempotency key was reused with different input.");
      }
      return { status: "DUPLICATE", savedMeal: clone(prior.value) };
    }

    const timestamp = this.now();
    const savedMealId = this.idFactory();
    const totals = totalsForItems(items);
    const savedMealItems = items.map((item, index): SavedMealItem => ({
      savedMealItemId: this.idFactory(),
      savedMealId,
      userId,
      sortOrder: index,
      displayName: item.displayName,
      grams: item.portionGrams,
      portionJson: {
        grams: item.portionGrams,
        unit: "g",
      },
      nutrientsJson: totalsForItems([item]),
    }));
    const savedMeal: SavedMeal = {
      savedMealId,
      userId,
      name,
      currentRevision: 1,
      totalEnergyKcal: totals.energyKcal,
      totalProteinG: totals.proteinGrams,
      items: savedMealItems,
      createdAtEpochMillis: timestamp,
      updatedAtEpochMillis: timestamp,
    };
    this.savedMeals.set(scopedKey(userId, savedMealId), savedMeal);
    this.idempotency.set(key, { requestHash, value: savedMeal });
    return { status: "CREATED", savedMeal: clone(savedMeal) };
  }

  list(userId: string, query?: string): SavedMeal[] {
    requireUserId(userId);
    const normalizedQuery = query?.trim().toLocaleLowerCase();
    return [...this.savedMeals.values()]
      .filter((item) => item.userId === userId && !item.deletedAtEpochMillis)
      .filter((item) => !normalizedQuery || item.name.toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => right.updatedAtEpochMillis - left.updatedAtEpochMillis)
      .map(clone);
  }

  get(userId: string, savedMealId: string): SavedMeal {
    requireUserId(userId);
    const savedMeal = this.savedMeals.get(scopedKey(userId, savedMealId));
    if (!savedMeal || savedMeal.deletedAtEpochMillis) {
      throw new MealContractError("saved_meal_not_found", "Saved meal was not found.");
    }
    return clone(savedMeal);
  }
}

type AppwriteSavedMealRow = {
  savedMealId: string;
  userId: string;
  name: string;
  currentRevision: number;
  totalEnergyKcal: number;
  totalProteinG: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

type AppwriteSavedMealItemRow = {
  savedMealItemId: string;
  savedMealId: string;
  userId: string;
  sortOrder: number;
  foodRef?: string;
  displayName: string;
  grams?: number;
  portionJson: string;
  nutrientsJson: string;
};

function stableSavedMealId(userId: string, idempotencyKey: string): string {
  return `sm_${createHash("sha256").update(`${userId}:${idempotencyKey}`).digest("hex").slice(0, 32)}`;
}

function epochFromDate(value: unknown): number {
  const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function rowData<T extends Record<string, unknown>>(row: RepositoryRow<T>): T {
  return row as T;
}

/** Session-scoped Appwrite adapter for saved_meal and saved_meal_item. */
export class AppwriteSavedMealStore implements SavedMealStoreLike {
  private readonly repository: OwnerScopedRepository;
  private readonly now: () => number;

  constructor(repository: OwnerScopedRepository, options: { now?: () => number } = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => Date.now());
  }

  async create(userId: string, input: SaveMealInput): Promise<SaveMealResult> {
    requireUserId(userId);
    const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
    const name = normalizeSavedMealName(input.name);
    const items = normalizeSavedMealItems(input.items);
    const savedMealId = stableSavedMealId(userId, idempotencyKey);
    const existing = await this.repository.getOwned<AppwriteSavedMealRow>("saved_meal", userId, savedMealId);
    if (existing) {
      const prior = await this.hydrate(existing);
      if (prior.name !== name || hashItems(prior.items) !== hashItems(items)) {
        throw new MealContractError("idempotency_key_reused", "Saved meal idempotency key was reused with different input.");
      }
      return { status: "DUPLICATE", savedMeal: prior };
    }

    const timestamp = new Date(this.now()).toISOString();
    const totals = totalsForItems(items);
    const created = await this.repository.createOwned<AppwriteSavedMealRow>("saved_meal", userId, savedMealId, {
      savedMealId,
      userId,
      name,
      currentRevision: 1,
      totalEnergyKcal: totals.energyKcal,
      totalProteinG: totals.proteinGrams,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    try {
      for (const [index, item] of items.entries()) {
        await this.repository.createOwned<AppwriteSavedMealItemRow>("saved_meal_item", userId, `${savedMealId}_${index + 1}`, {
          savedMealItemId: `${savedMealId}_${index + 1}`,
          savedMealId,
          userId,
          sortOrder: index,
          displayName: item.displayName,
          grams: item.portionGrams,
          portionJson: JSON.stringify({ grams: item.portionGrams, unit: "g" }),
          nutrientsJson: JSON.stringify(totalsForItems([item])),
        });
      }
    } catch {
      throw new MealContractError(
        "saved_meal_persistence_incomplete",
        "The saved meal was created but its items were not fully stored; retry with the same idempotency key.",
        true,
      );
    }
    return { status: "CREATED", savedMeal: await this.hydrate(created) };
  }

  async list(userId: string, query?: string): Promise<SavedMeal[]> {
    requireUserId(userId);
    const result = await this.repository.listOwned<AppwriteSavedMealRow>("saved_meal", userId, { limit: 100 });
    const normalizedQuery = query?.trim().toLocaleLowerCase();
    const meals = await Promise.all(result.rows.map((row) => this.hydrate(row)));
    return meals
      .filter((meal) => !meal.deletedAtEpochMillis)
      .filter((meal) => !normalizedQuery || meal.name.toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => right.updatedAtEpochMillis - left.updatedAtEpochMillis);
  }

  async get(userId: string, savedMealId: string): Promise<SavedMeal> {
    requireUserId(userId);
    const row = await this.repository.getOwned<AppwriteSavedMealRow>("saved_meal", userId, savedMealId);
    if (!row) throw new MealContractError("saved_meal_not_found", "Saved meal was not found.");
    return this.hydrate(row);
  }

  private async hydrate(row: RepositoryRow<AppwriteSavedMealRow>): Promise<SavedMeal> {
    const data = rowData(row);
    const itemRows = await this.repository.listOwned<AppwriteSavedMealItemRow>("saved_meal_item", data.userId, {
      queries: [{ field: "savedMealId", operator: "equal", value: data.savedMealId }],
      limit: 100,
    });
    return {
      savedMealId: data.savedMealId,
      userId: data.userId,
      name: data.name,
      currentRevision: data.currentRevision,
      totalEnergyKcal: data.totalEnergyKcal,
      totalProteinG: data.totalProteinG,
      items: itemRows.rows
        .map((itemRow) => rowData(itemRow))
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          savedMealItemId: item.savedMealItemId,
          savedMealId: item.savedMealId,
          userId: item.userId,
          sortOrder: item.sortOrder,
          ...(item.foodRef ? { foodRef: item.foodRef } : {}),
          displayName: item.displayName,
          ...(item.grams === undefined ? {} : { grams: item.grams }),
          portionJson: parseJsonObject(item.portionJson),
          nutrientsJson: parseTotals(item.nutrientsJson),
        })),
      createdAtEpochMillis: epochFromDate(data.createdAt),
      updatedAtEpochMillis: epochFromDate(data.updatedAt),
      ...(data.deletedAt ? { deletedAtEpochMillis: epochFromDate(data.deletedAt) } : {}),
    };
  }
}

function hashItems(items: NutritionItem[] | SavedMealItem[]): string {
  return createHash("sha256").update(JSON.stringify(items.map((item) => ({
    displayName: item.displayName,
    grams: "portionGrams" in item ? item.portionGrams : item.grams,
    nutrients: "energyKcal" in item ? totalsForItems([item]) : item.nutrientsJson,
  })))).digest("hex");
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function parseTotals(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as SavedMeal["items"][number]["nutrientsJson"];
  } catch {
    // Return a safe zero projection for a malformed legacy row; validation of
    // new writes happens before persistence.
  }
  return { energyKcal: 0, proteinGrams: 0, carbGrams: 0, fatGrams: 0, fiberGrams: 0 };
}

function requireIdempotencyKey(value: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 200) {
    throw new MealContractError("invalid_idempotency_key", "A non-empty idempotency key is required.");
  }
  return value.trim();
}
