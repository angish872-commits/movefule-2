import { COVERAGE_POLICY_VERSION } from "../core/versions";
import type { CanonicalNutrientId } from "./nutrientRegistry";

export type CoverageState = "COMPLETE" | "PARTIAL" | "NONE";

export interface CoverageNutrientValue {
  nutrientId: CanonicalNutrientId;
  amount: number | null;
}

export interface CoverageEntry {
  nutrients: readonly CoverageNutrientValue[];
}

export interface NutrientCoverage {
  nutrientId: CanonicalNutrientId;
  knownEntries: number;
  unknownEntries: number;
  totalRelevantEntries: number;
  ratio: number;
  state: CoverageState;
  policyVersion: typeof COVERAGE_POLICY_VERSION;
}

/**
 * Computes coverage only. It does not decide nutritional adequacy.
 *
 * A finite numeric zero is KNOWN and counts toward coverage. Missing values,
 * null values and non-finite numbers are UNKNOWN.
 */
export function calculateNutrientCoverage(
  entries: readonly CoverageEntry[],
  nutrientId: CanonicalNutrientId,
): NutrientCoverage {
  const totalRelevantEntries = entries.length;
  let knownEntries = 0;

  for (const entry of entries) {
    const value = entry.nutrients.find(
      (nutrient) => nutrient.nutrientId === nutrientId,
    );

    if (
      value !== undefined &&
      value.amount !== null &&
      Number.isFinite(value.amount)
    ) {
      knownEntries += 1;
    }
  }

  const unknownEntries = totalRelevantEntries - knownEntries;
  const ratio =
    totalRelevantEntries === 0 ? 0 : knownEntries / totalRelevantEntries;

  const state: CoverageState =
    totalRelevantEntries === 0 || knownEntries === 0
      ? "NONE"
      : knownEntries === totalRelevantEntries
        ? "COMPLETE"
        : "PARTIAL";

  return {
    nutrientId,
    knownEntries,
    unknownEntries,
    totalRelevantEntries,
    ratio,
    state,
    policyVersion: COVERAGE_POLICY_VERSION,
  };
}

export function calculateCoverageForEntries(
  entries: readonly CoverageEntry[],
): readonly NutrientCoverage[] {
  const nutrientIds = new Set<CanonicalNutrientId>();

  for (const entry of entries) {
    for (const nutrient of entry.nutrients) {
      nutrientIds.add(nutrient.nutrientId);
    }
  }

  return [...nutrientIds]
    .sort((a, b) => a.localeCompare(b))
    .map((nutrientId) => calculateNutrientCoverage(entries, nutrientId));
}
