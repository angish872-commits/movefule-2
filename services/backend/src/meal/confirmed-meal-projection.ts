import {
  MealContractError,
  type ConfirmedMeal,
  type DailyMealTotals,
} from "./contracts.ts";
import { freezeCanonicalFoodItems } from "./canonical-food.ts";
import { addNutritionTotals, clone, correctionItems, totalsForItems } from "./nutrition.ts";
import type { ConfirmedMealDeleteInput, ConfirmedMealRevisionInput, IdempotentRecord } from "./store-types.ts";
import { hash, requireIdempotencyKey, requireLocalDate, requireUserId, userScopedKey, zeroTotals } from "./store-support.ts";

export class ConfirmedMealProjection {
  private readonly meals = new Map<string, ConfirmedMeal>();
  private readonly dailyTotals = new Map<string, DailyMealTotals>();
  private readonly mutationIdempotency = new Map<string, IdempotentRecord<ConfirmedMeal>>();
  private readonly now: () => number;

  constructor(now: () => number) { this.now = now; }

  add(meal: ConfirmedMeal): DailyMealTotals {
    const frozenItems = freezeCanonicalFoodItems(meal.items, {
      mealId: meal.mealId,
      revision: meal.currentRevision,
      sourceDraftId: meal.sourceDraftId,
      createdAtEpochMillis: meal.updatedAtEpochMillis,
    });
    meal.items = frozenItems;
    meal.totals = totalsForItems(frozenItems);
    this.meals.set(userScopedKey(meal.userId, meal.mealId), clone(meal));
    return this.rebuildDailyTotals(meal.userId, meal.localDate);
  }

  getDailyTotals(userId: string, localDate: string): DailyMealTotals {
    requireUserId(userId);
    const date = requireLocalDate(localDate);
    return clone(this.dailyTotals.get(userScopedKey(userId, date)) ?? { localDate: date, ...zeroTotals(), confirmedMealCount: 0 });
  }

  hydrate(userId: string, meals: readonly ConfirmedMeal[]): void {
    requireUserId(userId);
    const prefix = `${userId}:`;
    for (const key of [...this.meals.keys()]) if (key.startsWith(prefix)) this.meals.delete(key);
    for (const key of [...this.dailyTotals.keys()]) if (key.startsWith(prefix)) this.dailyTotals.delete(key);
    const dates = new Set<string>();
    for (const meal of meals) {
      if (meal.userId !== userId || !meal.mealId.trim()) throw new MealContractError("meal_not_found", "Persisted meal ownership is invalid.");
      this.meals.set(userScopedKey(userId, meal.mealId), clone(meal));
      dates.add(meal.localDate);
    }
    for (const date of dates) this.rebuildDailyTotals(userId, date);
  }

  get(userId: string, mealId: string): ConfirmedMeal {
    const meal = this.meals.get(userScopedKey(userId, mealId));
    if (!meal) throw new MealContractError("meal_not_found", "Confirmed meal was not found.");
    return clone(meal);
  }

  list(userId: string, localDate?: string): ConfirmedMeal[] {
    requireUserId(userId);
    const date = localDate === undefined ? undefined : requireLocalDate(localDate);
    return [...this.meals.values()]
      .filter((meal) => meal.userId === userId && meal.status === "CONFIRMED" && (date === undefined || meal.localDate === date))
      .sort((left, right) => right.confirmedAtEpochMillis - left.confirmedAtEpochMillis || right.mealId.localeCompare(left.mealId))
      .map(clone);
  }

  revise(userId: string, input: ConfirmedMealRevisionInput): ConfirmedMeal {
    requireUserId(userId);
    const current = this.meals.get(userScopedKey(userId, input.mealId));
    if (!current) throw new MealContractError("meal_not_found", "Confirmed meal was not found.");
    const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
    const requestHash = hash({ mealId: input.mealId, expectedRevision: input.expectedRevision, items: input.items });
    const idempotency = userScopedKey(userId, idempotencyKey);
    const prior = this.mutationIdempotency.get(idempotency);
    if (prior) {
      if (prior.requestHash !== requestHash) throw new MealContractError("idempotency_key_reused", "Meal revision idempotency key was reused with different input.");
      return clone(prior.value);
    }
    if (current.status === "DELETED") throw new MealContractError("meal_already_deleted", "Deleted meals cannot be revised.");
    if (input.expectedRevision !== current.currentRevision) throw new MealContractError("draft_revision_conflict", "Confirmed meal revision is stale.");
    const timestamp = this.now();
    const acceptedRevision = current.currentRevision + 1;
    const corrected = correctionItems(input.items);
    const items = freezeCanonicalFoodItems(corrected, {
      mealId: current.mealId,
      revision: acceptedRevision,
      sourceDraftId: current.sourceDraftId,
      createdAtEpochMillis: timestamp,
      correction: true,
    });
    const revised: ConfirmedMeal = {
      ...clone(current),
      currentRevision: acceptedRevision,
      items,
      totals: totalsForItems(items),
      updatedAtEpochMillis: timestamp,
    };
    this.meals.set(userScopedKey(userId, revised.mealId), revised);
    this.rebuildDailyTotals(userId, current.localDate);
    this.mutationIdempotency.set(idempotency, { requestHash, value: revised });
    return clone(revised);
  }

  delete(userId: string, input: ConfirmedMealDeleteInput): ConfirmedMeal {
    requireUserId(userId);
    const current = this.meals.get(userScopedKey(userId, input.mealId));
    if (!current) throw new MealContractError("meal_not_found", "Confirmed meal was not found.");
    const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
    const requestHash = hash({ mealId: input.mealId, expectedRevision: input.expectedRevision, operation: "delete" });
    const idempotency = userScopedKey(userId, idempotencyKey);
    const prior = this.mutationIdempotency.get(idempotency);
    if (prior) {
      if (prior.requestHash !== requestHash) throw new MealContractError("idempotency_key_reused", "Meal deletion idempotency key was reused with different input.");
      return clone(prior.value);
    }
    if (current.status === "DELETED") throw new MealContractError("meal_already_deleted", "Meal is already deleted.");
    if (input.expectedRevision !== current.currentRevision) throw new MealContractError("draft_revision_conflict", "Confirmed meal revision is stale.");
    const timestamp = this.now();
    const tombstone: ConfirmedMeal = {
      ...clone(current), status: "DELETED", currentRevision: current.currentRevision + 1,
      updatedAtEpochMillis: timestamp, deletedAtEpochMillis: timestamp,
    };
    this.meals.set(userScopedKey(userId, tombstone.mealId), tombstone);
    this.rebuildDailyTotals(userId, current.localDate);
    this.mutationIdempotency.set(idempotency, { requestHash, value: tombstone });
    return clone(tombstone);
  }

  private rebuildDailyTotals(userId: string, localDate: string): DailyMealTotals {
    const active = [...this.meals.values()].filter((meal) => meal.userId === userId && meal.localDate === localDate && meal.status === "CONFIRMED");
    let totals = { ...zeroTotals() };
    for (const meal of active) totals = addNutritionTotals(totals, meal.totals);
    const result: DailyMealTotals = { localDate, ...totals, confirmedMealCount: active.length };
    this.dailyTotals.set(userScopedKey(userId, localDate), result);
    return clone(result);
  }
}
