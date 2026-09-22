import {
  MealContractError,
  type ConfirmedMeal,
} from "./contracts.ts";
import { MealStore } from "./store.ts";
import type { OwnerScopedRepository, RepositoryRow, ServerOwnedRepository } from "../foundation/repository.ts";

export interface ConfirmedMealStoreLike {
  persist(userId: string, meal: ConfirmedMeal): void | Promise<void>;
  list(userId: string, localDate?: string): ConfirmedMeal[] | Promise<ConfirmedMeal[]>;
  get(userId: string, mealId: string): ConfirmedMeal | null | Promise<ConfirmedMeal | null>;
}

export function createConfirmedMealStoreResolver<Context extends { userId: string; accessToken?: string }>(options: {
  mealStore: MealStore;
  repositoryFor: (context: Context) => OwnerScopedRepository | undefined;
  serverRepository?: ServerOwnedRepository;
}): (context: Context) => ConfirmedMealStoreLike {
  return (context) => {
    const repository = options.repositoryFor(context);
    return repository && options.serverRepository
      ? new AppwriteConfirmedMealStore(repository, options.serverRepository)
      : new LocalConfirmedMealStore(options.mealStore);
  };
}

/** Local adapter keeps the route contract usable for deterministic fixtures. */
export class LocalConfirmedMealStore implements ConfirmedMealStoreLike {
  private readonly store: MealStore;

  constructor(store: MealStore) {
    this.store = store;
  }

  persist(): void {
    // MealStore already owns the in-memory confirmed meal and totals.
  }

  list(userId: string, localDate?: string): ConfirmedMeal[] {
    return this.store.listConfirmedMeals(userId, localDate);
  }

  get(userId: string, mealId: string): ConfirmedMeal | null {
    try {
      return this.store.getConfirmedMeal(userId, mealId);
    } catch (error) {
      if (error instanceof MealContractError && error.code === "meal_not_found") return null;
      throw error;
    }
  }
}

type MealRow = {
  mealId: string;
  userId: string;
  sourceDraftId: string;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
};

type MealItemRow = {
  mealItemId: string;
  mealId: string;
  userId: string;
  name: string;
  quantity: number;
  quantityUnit: string;
  nutritionJson: string;
  createdAt: string;
};

type MealRevisionRow = {
  mealRevisionId: string;
  mealId: string;
  userId: string;
  revision: number;
  payloadJson: string;
  createdAt: string;
};

function rowData<T extends Record<string, unknown>>(row: RepositoryRow<T>): T {
  return row as T;
}

function parseMealPayload(value: unknown, userId: string, mealId: string): ConfirmedMeal | null {
  if (typeof value !== "string") return null;
  try {
    const meal = JSON.parse(value) as Partial<ConfirmedMeal>;
    if (meal.userId !== userId || meal.mealId !== mealId || (meal.status !== "CONFIRMED" && meal.status !== "DELETED")) return null;
    if (!Array.isArray(meal.items) || !meal.totals || typeof meal.localDate !== "string") return null;
    return meal as ConfirmedMeal;
  } catch {
    return null;
  }
}

/**
 * Request-owner persistence for mutable meal/item rows plus server-authority
 * persistence for immutable meal_revision history. Canonical revision payloads
 * are append-only and satisfy the foundation payload-hash/idempotency columns.
 */
export class AppwriteConfirmedMealStore implements ConfirmedMealStoreLike {
  private readonly now: () => number;
  private readonly repository: OwnerScopedRepository;
  private readonly serverRepository: ServerOwnedRepository;

  constructor(
    repository: OwnerScopedRepository,
    serverRepository: ServerOwnedRepository,
    options: { now?: () => number } = {},
  ) {
    this.repository = repository;
    this.serverRepository = serverRepository;
    this.now = options.now ?? (() => Date.now());
  }

  async persist(userId: string, meal: ConfirmedMeal): Promise<void> {
    const existing = await this.repository.getOwned<MealRow>("meal", userId, meal.mealId);
    const current = existing ? await this.get(userId, meal.mealId) : null;
    if (current && current.currentRevision >= meal.currentRevision) return;

    const timestamp = new Date(this.now()).toISOString();
    if (!existing) {
      await this.repository.createOwned<MealRow>("meal", userId, meal.mealId, {
        mealId: meal.mealId,
        userId,
        sourceDraftId: meal.sourceDraftId,
        confirmedAt: new Date(meal.confirmedAtEpochMillis).toISOString(),
        createdAt: new Date(meal.createdAtEpochMillis).toISOString(),
        updatedAt: new Date(meal.updatedAtEpochMillis).toISOString(),
      });
    }
    try {
      if (!existing) {
        for (const [index, item] of meal.items.entries()) {
          const itemId = `${meal.mealId}_${index + 1}`;
          await this.repository.createOwned<MealItemRow>("meal_item", userId, itemId, {
            mealItemId: itemId,
            mealId: meal.mealId,
            userId,
            name: item.displayName,
            quantity: item.portionGrams,
            quantityUnit: "g",
            nutritionJson: JSON.stringify(item),
            createdAt: timestamp,
          });
        }
      }
      const revisionId = `${meal.mealId}_${meal.currentRevision}`;
      if (await this.serverRepository.getForUser<MealRevisionRow>("meal_revision", userId, revisionId)) return;
      const payloadJson = JSON.stringify(meal);
      await this.serverRepository.createForUser<MealRevisionRow>("meal_revision", userId, revisionId, {
        mealRevisionId: revisionId,
        mealId: meal.mealId,
        userId,
        revision: meal.currentRevision,
        payloadJson,
        createdAt: timestamp,
      });
    } catch {
      throw new MealContractError(
        "meal_persistence_incomplete",
        "The confirmed meal was created but its immutable revision was not fully stored; retry the same confirmation.",
        true,
      );
    }
  }

  async list(userId: string, localDate?: string): Promise<ConfirmedMeal[]> {
    const result = await this.serverRepository.listForUser<MealRevisionRow>("meal_revision", userId, { limit: 100 });
    const latest = new Map<string, ConfirmedMeal>();
    for (const row of result.rows) {
      const data = rowData(row);
      const meal = parseMealPayload(data.payloadJson, userId, data.mealId);
      if (!meal || (localDate !== undefined && meal.localDate !== localDate)) continue;
      const prior = latest.get(meal.mealId);
      if (!prior || meal.currentRevision >= prior.currentRevision) latest.set(meal.mealId, meal);
    }
    return [...latest.values()]
      .filter((meal) => meal.status === "CONFIRMED")
      .sort((left, right) => right.confirmedAtEpochMillis - left.confirmedAtEpochMillis);
  }

  async get(userId: string, mealId: string): Promise<ConfirmedMeal | null> {
    const result = await this.serverRepository.listForUser<MealRevisionRow>("meal_revision", userId, {
      queries: [{ field: "mealId", operator: "equal", value: mealId }],
      limit: 100,
    });
    const meals = result.rows
      .map((row) => rowData(row))
      .sort((left, right) => right.revision - left.revision)
      .map((row) => parseMealPayload(row.payloadJson, userId, mealId))
      .filter((meal): meal is ConfirmedMeal => meal !== null);
    return meals[0] ?? null;
  }
}
