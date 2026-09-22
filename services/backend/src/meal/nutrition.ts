import {
  MealContractError,
  type AggregateNutrientCode,
  type NutritionItem,
  type NutritionTotals,
} from "./contracts.ts";

const isFiniteNonNegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isNullableFiniteNonNegative = (value: unknown): value is number | null => value === null || isFiniteNonNegative(value);
const round = (value: number): number => Math.round(value * 100) / 100;
const roundNullable = (value: number | null): number | null => value === null ? null : round(value);

function unknownCodes(items: readonly NutritionItem[]): AggregateNutrientCode[] {
  const unknown: AggregateNutrientCode[] = [];
  if (items.some((item) => item.carbGrams === null)) unknown.push("CARBOHYDRATE");
  if (items.some((item) => item.fatGrams === null)) unknown.push("FAT");
  if (items.some((item) => item.fiberGrams === null)) unknown.push("FIBER");
  return unknown;
}

export function totalsForItems(items: NutritionItem[]): NutritionTotals {
  const unknownNutrients = unknownCodes(items);
  return {
    energyKcal: round(items.reduce((sum, item) => sum + item.energyKcal, 0)),
    proteinGrams: round(items.reduce((sum, item) => sum + item.proteinGrams, 0)),
    carbGrams: round(items.reduce((sum, item) => sum + (item.carbGrams ?? 0), 0)),
    fatGrams: round(items.reduce((sum, item) => sum + (item.fatGrams ?? 0), 0)),
    fiberGrams: round(items.reduce((sum, item) => sum + (item.fiberGrams ?? 0), 0)),
    ...(unknownNutrients.length ? { unknownNutrients } : {}),
  };
}

/** Adds legacy numeric aggregates while retaining an explicit incomplete-data marker. */
export function addNutritionTotals(left: NutritionTotals, right: NutritionTotals): NutritionTotals {
  const unknownNutrients = [...new Set([...(left.unknownNutrients ?? []), ...(right.unknownNutrients ?? [])])];
  return {
    energyKcal: round(left.energyKcal + right.energyKcal),
    proteinGrams: round(left.proteinGrams + right.proteinGrams),
    carbGrams: round(left.carbGrams + right.carbGrams),
    fatGrams: round(left.fatGrams + right.fatGrams),
    fiberGrams: round(left.fiberGrams + right.fiberGrams),
    ...(unknownNutrients.length ? { unknownNutrients } : {}),
  };
}

/**
 * Validates a legacy-compatible item while preserving the canonical distinction
 * between unknown and a real measured/reported zero. Canonical evidence fields
 * are intentionally not accepted from this generic validator; server-owned
 * adapters attach them after source validation.
 */
export function validateItems(value: unknown): NutritionItem[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw new MealContractError("invalid_items", "items must contain between 1 and 50 nutrition items.");
  }
  const items = value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new MealContractError("invalid_items", `Item ${index + 1} must be an object.`);
    const item = raw as Record<string, unknown>;
    const displayName = typeof item.displayName === "string" ? item.displayName.trim() : "";
    if (!displayName) throw new MealContractError("invalid_items", `Item ${index + 1} needs a displayName.`);
    for (const field of ["portionGrams", "energyKcal", "proteinGrams"] as const) {
      if (!isFiniteNonNegative(item[field])) throw new MealContractError("invalid_items", `Item ${index + 1} has invalid ${field}.`);
    }
    for (const field of ["carbGrams", "fatGrams", "fiberGrams"] as const) {
      if (item[field] !== undefined && !isNullableFiniteNonNegative(item[field])) throw new MealContractError("invalid_items", `Item ${index + 1} has invalid ${field}.`);
    }
    const confidence = item.confidence === undefined ? "medium" : item.confidence;
    if (confidence !== "low" && confidence !== "medium" && confidence !== "high") throw new MealContractError("invalid_items", `Item ${index + 1} has invalid confidence.`);
    const rangeValue = item.energyRangeKcal;
    const range = rangeValue && typeof rangeValue === "object" && !Array.isArray(rangeValue) ? rangeValue as Record<string, unknown> : undefined;
    const min = range?.min ?? item.energyKcal;
    const max = range?.max ?? item.energyKcal;
    if (!isFiniteNonNegative(min) || !isFiniteNonNegative(max) || min > max) throw new MealContractError("invalid_items", `Item ${index + 1} has an invalid energy range.`);
    return {
      itemId: typeof item.itemId === "string" && item.itemId.trim().length > 0 ? item.itemId.trim() : `item-${index + 1}`,
      displayName,
      portionGrams: round(item.portionGrams as number),
      energyKcal: round(item.energyKcal as number),
      proteinGrams: round(item.proteinGrams as number),
      carbGrams: roundNullable((item.carbGrams ?? null) as number | null),
      fatGrams: roundNullable((item.fatGrams ?? null) as number | null),
      fiberGrams: roundNullable((item.fiberGrams ?? null) as number | null),
      confidence,
      energyRangeKcal: { min: round(min), max: round(max) },
    } satisfies NutritionItem;
  });
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.itemId)) throw new MealContractError("invalid_items", "itemId values must be unique.");
    ids.add(item.itemId);
  }
  return items;
}

/**
 * Server-only validation path for trusted adapters. Numeric fields receive the
 * exact same validation as client input, then already-derived canonical
 * metadata is copied back. HTTP correction/manual paths must continue using
 * validateItems/correctionItems so clients cannot claim trusted provenance.
 */
export function validateServerOwnedItems(value: readonly NutritionItem[]): NutritionItem[] {
  const validated = validateItems(value);
  return validated.map((item, index) => {
    const source = value[index]!;
    return {
      ...item,
      ...(source.foodIdentity ? { foodIdentity: clone(source.foodIdentity) } : {}),
      ...(source.portionEvidence ? { portionEvidence: clone(source.portionEvidence) } : {}),
      ...(source.nutritionSnapshot ? { nutritionSnapshot: clone(source.nutritionSnapshot) } : {}),
    };
  });
}

export function correctionItems(value: unknown): NutritionItem[] {
  if (!Array.isArray(value)) throw new MealContractError("invalid_items", "Corrected items must be an array.");
  return validateItems(value);
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
