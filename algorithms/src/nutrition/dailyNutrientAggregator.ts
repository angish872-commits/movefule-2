import type { CanonicalNutrientId } from "./nutrientRegistry";
import type { NutrientUnit } from "./nutrientCalculator";

export interface LoggedNutrientValue {
  nutrientId: CanonicalNutrientId;
  amount: number | null;
  unit: NutrientUnit;
}

export interface ConfirmedFoodNutrientEntry {
  entryId: string;
  nutrients: readonly LoggedNutrientValue[];
}

export interface DailyNutrientAggregate {
  nutrientId: CanonicalNutrientId;
  knownAmount: number | null;
  unit: NutrientUnit;
  knownEntryCount: number;
  totalEntryCount: number;
  entryCoverage: number;
  complete: boolean;
}

/**
 * Aggregates known amounts without converting missing nutrient data to zero.
 *
 * knownAmount is the sum of known values only. Consumers MUST inspect
 * complete/entryCoverage before treating the amount as total daily intake.
 */
export function aggregateDailyNutrients(
  entries: readonly ConfirmedFoodNutrientEntry[],
): readonly DailyNutrientAggregate[] {
  if (entries.length === 0) return [];

  const nutrientIds = new Set<CanonicalNutrientId>();
  for (const entry of entries) {
    for (const nutrient of entry.nutrients) {
      nutrientIds.add(nutrient.nutrientId);
    }
  }

  const aggregates: DailyNutrientAggregate[] = [];

  for (const nutrientId of nutrientIds) {
    let knownAmount = 0;
    let knownEntryCount = 0;
    let unit: NutrientUnit | null = null;

    for (const entry of entries) {
      const value = entry.nutrients.find(
        (nutrient) => nutrient.nutrientId === nutrientId,
      );
      if (!value || value.amount === null || !Number.isFinite(value.amount)) {
        continue;
      }

      if (unit !== null && unit !== value.unit) {
        throw new Error(
          `Unit mismatch for ${nutrientId}: ${unit} vs ${value.unit}`,
        );
      }

      unit = value.unit;
      knownAmount += value.amount;
      knownEntryCount += 1;
    }

    if (unit === null) continue;

    const entryCoverage = knownEntryCount / entries.length;

    aggregates.push({
      nutrientId,
      knownAmount: knownEntryCount > 0 ? knownAmount : null,
      unit,
      knownEntryCount,
      totalEntryCount: entries.length,
      entryCoverage,
      complete: knownEntryCount === entries.length,
    });
  }

  return aggregates.sort((a, b) =>
    a.nutrientId.localeCompare(b.nutrientId),
  );
}
