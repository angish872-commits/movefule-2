import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export type NutrientKey =
  | "energyKcal"
  | "proteinG"
  | "carbohydrateG"
  | "fatG"
  | "fiberG";

export interface NutrientProfilePer100g {
  energyKcal?: number;
  proteinG?: number;
  carbohydrateG?: number;
  fatG?: number;
  fiberG?: number;
}

export interface FoodAuthorityRecord {
  foodId: string;
  source: "USDA" | "OPEN_FOOD_FACTS" | "MOVEFUEL_VERIFIED";
  sourceRevision?: string;
  per100g: NutrientProfilePer100g;
  verified: boolean;
}

export interface ScaledNutrients {
  grams: number;
  nutrients: NutrientProfilePer100g;
  unknownFields: NutrientKey[];
}

const KEYS: readonly NutrientKey[] = [
  "energyKcal",
  "proteinG",
  "carbohydrateG",
  "fatG",
  "fiberG",
];

export function scaleNutrientsPer100g(
  profile: NutrientProfilePer100g,
  grams: number,
): ScaledNutrients {
  if (!Number.isFinite(grams) || grams < 0) {
    throw new Error("grams must be a finite non-negative number");
  }

  const factor = grams / 100;
  const nutrients: NutrientProfilePer100g = {};
  const unknownFields: NutrientKey[] = [];

  for (const key of KEYS) {
    const value = profile[key];
    if (value === undefined || !Number.isFinite(value)) {
      unknownFields.push(key);
      continue;
    }
    nutrients[key] = value * factor;
  }

  return { grams, nutrients, unknownFields };
}

/**
 * Selects the trusted nutrition record. MoveFuel does not invent missing
 * calories/macros. Provider values remain attributable to their source.
 */
export function calculateTrustedNutrients(
  context: AlgorithmContext,
  record: FoodAuthorityRecord | null,
  grams: number | null,
  evidence: EvidenceRef[] = [],
): AlgorithmResult<ScaledNutrients> {
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

  if (grams === null) {
    return {
      algorithmId: "MF-028",
      status: "NEEDS_CONFIRMATION",
      reasonCodes: ["SERVING_MASS_UNKNOWN"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const scaled = scaleNutrientsPer100g(record.per100g, grams);

  return {
    algorithmId: "MF-028",
    status: scaled.unknownFields.length > 0 ? "PARTIAL" : "SUCCESS",
    output: scaled,
    reasonCodes: [
      ...(record.verified ? [] : ["SOURCE_NOT_MOVEFUEL_VERIFIED"]),
      ...(scaled.unknownFields.length > 0
        ? ["ONE_OR_MORE_NUTRIENTS_UNKNOWN"]
        : []),
    ],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
