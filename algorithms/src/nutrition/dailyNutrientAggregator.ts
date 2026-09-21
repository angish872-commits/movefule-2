import type { CanonicalNutrientId } from "./nutrientRegistry";
import type { NutrientUnit } from "./nutrientCalculator";
import {
  calculateNutrientCoverage,
  type NutrientCoverage,
} from "./coverage";

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
  coverage: NutrientCoverage;
  /**
   * Compatibility projections. Coverage policy is owned by coverage.ts.
   */
  knownEntryCount: number;
  totalEntryCount: number;
  entryCoverage: number;
  complete: boolean;
}

/**
 * Aggregates known amounts without converting missing nutrient data to zero.
 *
 * Coverage math is delegated to coverage.ts. knownAmount is the sum of known
 * values only; callers must inspect coverage before treating it as total daily
 * intake.
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
    let unit: NutrientUnit | null = null;

    for (const entry of entries) {
      const value = entry.nutrients.find(
        (nutrient) => nutrient.nutrientId === nutrientId,
      );

      if (value && unit === null) {
        unit = value.unit;
      }

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
    }

    if (unit === null) continue;

    const coverage = calculateNutrientCoverage(entries, nutrientId);

    aggregates.push({
      nutrientId,
      knownAmount: coverage.knownEntries > 0 ? knownAmount : null,
      unit,
      coverage,
      knownEntryCount: coverage.knownEntries,
      totalEntryCount: coverage.totalRelevantEntries,
      entryCoverage: coverage.ratio,
      complete: coverage.state === "COMPLETE",
    });
  }

  return aggregates.sort((a, b) =>
    a.nutrientId.localeCompare(b.nutrientId),
  );
}
