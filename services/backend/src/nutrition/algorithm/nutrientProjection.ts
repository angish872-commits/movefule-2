import { calculateNutrientRange } from "../nutrients/nutrientCalculator.ts";
import type { NutrientRange } from "./contracts.ts";
import type { PortionEstimate } from "../portion/portionEstimator.ts";
import type {
  ImageEstimateRequest,
  NutrientDistributionRange,
  NutrientSet,
  Per100gNutrients,
  SourceBackedNutrientDistribution,
} from "./imageEstimateContracts.ts";

export function requestHash(request: ImageEstimateRequest): string {
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, canonicalize(child)]),
      );
    }
    return value;
  };
  return JSON.stringify(canonicalize(request));
}

export function emptyNutrients(): NutrientSet {
  return {
    energyKcal: { minimum: null, central: null, maximum: null },
    proteinG: { minimum: null, central: null, maximum: null },
    carbG: { minimum: null, central: null, maximum: null },
    fatG: { minimum: null, central: null, maximum: null },
    fiberG: { minimum: null, central: null, maximum: null },
    sodiumMg: { minimum: null, central: null, maximum: null },
  };
}

function nullableNutrientRange(
  amount: number | null,
  unit: "g" | "mg",
  portion: { minimumGrams: number; centralGrams: number; maximumGrams: number },
): NutrientRange {
  if (amount === null) return { minimum: null, central: null, maximum: null };
  return calculateNutrientRange({ amount, unit, basisGrams: 100 }, portion);
}

export function computeNutrientsFromPortion(per100g: Per100gNutrients, portion: PortionEstimate): NutrientSet {
  const grams = { minimumGrams: portion.minimumGrams, centralGrams: portion.centralGrams, maximumGrams: portion.maximumGrams };
  return {
    energyKcal: calculateNutrientRange({ amount: per100g.energyKcal, unit: "kcal", basisGrams: 100 }, grams),
    proteinG: calculateNutrientRange({ amount: per100g.proteinG, unit: "g", basisGrams: 100 }, grams),
    carbG: nullableNutrientRange(per100g.carbG, "g", grams),
    fatG: nullableNutrientRange(per100g.fatG, "g", grams),
    fiberG: nullableNutrientRange(per100g.fiberG, "g", grams),
    sodiumMg: nullableNutrientRange(per100g.sodiumMg, "mg", grams),
  };
}

function distributionRange(amountPer100g: number | null, portion: PortionEstimate): NutrientDistributionRange {
  if (amountPer100g === null) return { p10: null, p50: null, p90: null };
  const mass = portion.massDistribution ?? {
    p10Grams: portion.minimumGrams,
    p50Grams: portion.centralGrams,
    p90Grams: portion.maximumGrams,
    version: null,
  };
  const scale = (grams: number): number => Math.round((amountPer100g * grams / 100) * 1000) / 1000;
  return { p10: scale(mass.p10Grams), p50: scale(mass.p50Grams), p90: scale(mass.p90Grams) };
}

export function computeSourceBackedNutrientDistribution(per100g: Per100gNutrients, portion: PortionEstimate): SourceBackedNutrientDistribution {
  return {
    basis: "PER_100_G_SOURCE_X_MASS_DISTRIBUTION",
    massDistributionVersion: portion.massDistribution?.version ?? null,
    nutrients: {
      energyKcal: distributionRange(per100g.energyKcal, portion),
      proteinG: distributionRange(per100g.proteinG, portion),
      carbG: distributionRange(per100g.carbG, portion),
      fatG: distributionRange(per100g.fatG, portion),
      fiberG: distributionRange(per100g.fiberG, portion),
      sodiumMg: distributionRange(per100g.sodiumMg, portion),
    },
  };
}
