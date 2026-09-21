import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";
import {
  nutrientDefinition,
  type CanonicalNutrientId,
} from "./nutrientRegistry";
import type { NutrientUnit } from "./nutrientCalculator";
import {
  resolveBasisRatio,
  type ConsumptionBasis,
  type DensityEvidence,
} from "./basis";

export type FoodNutrientSource =
  | "USDA"
  | "OPEN_FOOD_FACTS"
  | "MOVEFUEL_VERIFIED"
  | "NUTRITION_LABEL";

export interface SourceNutrient {
  nutrientId: CanonicalNutrientId;
  /**
   * Null means the provider did not report this nutrient.
   * Missing is never converted to zero.
   */
  amount: number | null;
  unit: NutrientUnit;
  basis: ConsumptionBasis;
}

export interface FoodAuthorityRecord {
  foodId: string;
  source: FoodNutrientSource;
  sourceReference: string;
  sourceRevision?: string;
  nutrients: readonly SourceNutrient[];
  verified: boolean;
}

export interface ScaledNutrientValue {
  nutrientId: CanonicalNutrientId;
  amount: number | null;
  unit: NutrientUnit;
  missing: boolean;
  source: FoodNutrientSource;
  sourceReference: string;
  sourceRevision?: string;
}

export interface FullNutrientVector {
  foodId: string;
  consumedBasis: ConsumptionBasis;
  nutrients: readonly ScaledNutrientValue[];
  unknownNutrients: readonly CanonicalNutrientId[];
}

const MASS_FACTORS_TO_G: Record<Exclude<NutrientUnit, "kcal">, number> = {
  g: 1,
  mg: 0.001,
  ug: 0.000001,
};

function convertNutrientUnit(
  amount: number,
  from: NutrientUnit,
  to: NutrientUnit,
): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (from === to) return amount;

  if (from === "kcal" || to === "kcal") {
    return null;
  }

  const grams = amount * MASS_FACTORS_TO_G[from];
  return grams / MASS_FACTORS_TO_G[to];
}

function scaleNutrient(
  record: FoodAuthorityRecord,
  source: SourceNutrient,
  consumedBasis: ConsumptionBasis,
  density: DensityEvidence | null,
): ScaledNutrientValue {
  const definition = nutrientDefinition(source.nutrientId);
  const canonicalUnit = definition.canonicalUnit;

  if (source.amount === null) {
    return {
      nutrientId: source.nutrientId,
      amount: null,
      unit: canonicalUnit,
      missing: true,
      source: record.source,
      sourceReference: record.sourceReference,
      sourceRevision: record.sourceRevision,
    };
  }

  const normalized = convertNutrientUnit(
    source.amount,
    source.unit,
    canonicalUnit,
  );

  const ratio = resolveBasisRatio(
    source.basis,
    consumedBasis,
    density,
  );

  if (normalized === null || ratio === null || !Number.isFinite(ratio)) {
    return {
      nutrientId: source.nutrientId,
      amount: null,
      unit: canonicalUnit,
      missing: true,
      source: record.source,
      sourceReference: record.sourceReference,
      sourceRevision: record.sourceRevision,
    };
  }

  return {
    nutrientId: source.nutrientId,
    amount: normalized * ratio,
    unit: canonicalUnit,
    missing: false,
    source: record.source,
    sourceReference: record.sourceReference,
    sourceRevision: record.sourceRevision,
  };
}

/**
 * MF-028 Trusted Nutrient Calculator.
 *
 * Camera, barcode, search, manual entry, recipes and YouTube imports should
 * converge here after identity/source resolution. This engine scales trusted
 * source nutrient facts to the consumed basis; it does not invent food
 * composition, micronutrient references or adequacy.
 */
export function calculateTrustedNutrients(
  context: AlgorithmContext,
  record: FoodAuthorityRecord | null,
  consumedBasis: ConsumptionBasis | null,
  evidence: EvidenceRef[] = [],
  density: DensityEvidence | null = null,
): AlgorithmResult<FullNutrientVector> {
  if (record === null) {
    return {
      algorithmId: "MF-028",
      status: "HOLD",
      reasonCodes: ["NO_TRUSTED_FOOD_RECORD"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  if (consumedBasis === null) {
    return {
      algorithmId: "MF-028",
      status: "NEEDS_CONFIRMATION",
      reasonCodes: ["CONSUMED_BASIS_UNKNOWN"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const nutrients = record.nutrients.map((nutrient) =>
    scaleNutrient(record, nutrient, consumedBasis, density),
  );

  const unknownNutrients = nutrients
    .filter((nutrient) => nutrient.missing)
    .map((nutrient) => nutrient.nutrientId);

  return {
    algorithmId: "MF-028",
    status: unknownNutrients.length > 0 ? "PARTIAL" : "SUCCESS",
    output: {
      foodId: record.foodId,
      consumedBasis,
      nutrients,
      unknownNutrients,
    },
    reasonCodes: [
      ...(record.verified ? [] : ["SOURCE_NOT_MOVEFUEL_VERIFIED"]),
      ...(unknownNutrients.length > 0
        ? ["ONE_OR_MORE_NUTRIENTS_UNKNOWN"]
        : []),
    ],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
