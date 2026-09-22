/**
 * Nutrient normalization for recipe estimates.
 *
 * FDC per-100g amounts come with a nutrient id and a value per 100g. This
 * module maps raw FDC rows into the standard `NutrientBasis` shape used by
 * `nutrientCalculator.ts` and exposes the FDC nutrient ids we treat as
 * canonical (with the same id → unit mapping used by the Python importer).
 */

export type FdcNutrientRow = {
  nutrientId: number;
  amount: number;
  /** Per what gram basis the amount is expressed (FDC: 100g). */
  basisGrams?: number;
};

export type CanonicalNutrientName =
  | "energyKcal"
  | "proteinG"
  | "carbG"
  | "fatG"
  | "fiberG"
  | "sodiumMg";

/** FDC nutrient ids considered canonical for the core nutrition profile. */
export const CANONICAL_NUTRIENT_IDS: Record<CanonicalNutrientName, readonly number[]> = {
  energyKcal: [1008, 2047, 2048],
  proteinG: [1003],
  carbG: [1005],
  fatG: [1004],
  fiberG: [1079],
  sodiumMg: [1093],
};

const NUTRIENT_UNIT: Record<CanonicalNutrientName, "kcal" | "g" | "mg"> = {
  energyKcal: "kcal",
  proteinG: "g",
  carbG: "g",
  fatG: "g",
  fiberG: "g",
  sodiumMg: "mg",
};

const NUTRIENT_DEFAULT_BASIS_GRAMS = 100;

export function normalizeNutrientRow(
  nutrientId: number,
  amount: number,
  basisGrams = NUTRIENT_DEFAULT_BASIS_GRAMS,
): { name: CanonicalNutrientName; basis: { amount: number; unit: "kcal" | "g" | "mg"; basisGrams: number } } | null {
  const entry = (Object.entries(CANONICAL_NUTRIENT_IDS) as Array<[CanonicalNutrientName, readonly number[]]>).find(([, ids]) =>
    ids.includes(nutrientId),
  );
  if (!entry) return null;
  const [name] = entry;
  return {
    name,
    basis: { amount, unit: NUTRIENT_UNIT[name], basisGrams },
  };
}

/** Pick the first canonical id present in a row set for each nutrient. */
export function normalizeNutrientRows(
  rows: readonly FdcNutrientRow[],
  basisGrams = NUTRIENT_DEFAULT_BASIS_GRAMS,
): Partial<Record<CanonicalNutrientName, { amount: number; unit: "kcal" | "g" | "mg"; basisGrams: number }>> {
  const result: Partial<Record<CanonicalNutrientName, { amount: number; unit: "kcal" | "g" | "mg"; basisGrams: number }>> = {};
  for (const row of rows) {
    const normalized = normalizeNutrientRow(row.nutrientId, row.amount, row.basisGrams ?? basisGrams);
    if (normalized && !result[normalized.name]) {
      result[normalized.name] = normalized.basis;
    }
  }
  return result;
}
