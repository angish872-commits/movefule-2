/**
 * MoveFuel-2 deterministic nutrient calculation.
 *
 * Migrated from the old MoveFuel nutrientCalculator.ts.
 *
 * Canonical formula:
 *   calculated = sourceAmount * selectedFoodGrams / sourceBasisGrams
 *
 * The source basis is never guessed. Missing source nutrients stay missing.
 * Rounding is presentation-only.
 */

export type NutrientUnit = "kcal" | "g" | "mg" | "ug";

export type NutrientBasis = {
  amount: number;
  unit: NutrientUnit;
  basisGrams: number;
};

export type CalculatedNutrient = {
  amount: number;
  unit: NutrientUnit;
  selectedGrams: number;
  formulaVersion: 1;
  missing: false;
};

export type MissingNutrient = {
  amount: null;
  unit: NutrientUnit;
  selectedGrams: number;
  formulaVersion: 1;
  missing: true;
};

export type CalculatedNutrientResult = CalculatedNutrient | MissingNutrient;

export type BasisErrorCode =
  | "invalid_basis"
  | "invalid_amount"
  | "invalid_selected_grams"
  | "invalid_ratio";

export class BasisError extends Error {
  public readonly code: BasisErrorCode;

  constructor(code: BasisErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "BasisError";
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function validatePositive(
  label: string,
  value: unknown,
  code: BasisErrorCode,
): asserts value is number {
  if (!isFiniteNumber(value) || value <= 0) {
    throw new BasisError(code, `${label} must be a finite positive number.`);
  }
}

function validateNonNegative(
  label: string,
  value: unknown,
  code: BasisErrorCode,
): asserts value is number {
  if (!isFiniteNumber(value) || value < 0) {
    throw new BasisError(code, `${label} must be a finite non-negative number.`);
  }
}

export function calculateNutrient(
  basis: NutrientBasis,
  selectedGrams: number,
): CalculatedNutrientResult {
  validateNonNegative("basis.amount", basis.amount, "invalid_amount");
  validatePositive("basis.basisGrams", basis.basisGrams, "invalid_basis");
  validateNonNegative(
    "selectedGrams",
    selectedGrams,
    "invalid_selected_grams",
  );

  const ratio = basis.amount / basis.basisGrams;
  if (!Number.isFinite(ratio)) {
    throw new BasisError("invalid_ratio", "basis ratio is not finite.");
  }

  return {
    amount: ratio * selectedGrams,
    unit: basis.unit,
    selectedGrams,
    formulaVersion: 1,
    missing: false,
  };
}

export function calculateOptionalNutrient(
  basis: NutrientBasis | null | undefined,
  selectedGrams: number,
  unitWhenMissing: NutrientUnit,
): CalculatedNutrientResult {
  validateNonNegative(
    "selectedGrams",
    selectedGrams,
    "invalid_selected_grams",
  );

  if (basis === null || basis === undefined) {
    return {
      amount: null,
      unit: unitWhenMissing,
      selectedGrams,
      formulaVersion: 1,
      missing: true,
    };
  }

  return calculateNutrient(basis, selectedGrams);
}

export function calculateNutrientRounded(
  basis: NutrientBasis,
  selectedGrams: number,
  decimals = 2,
): number | null {
  const result = calculateNutrient(basis, selectedGrams);
  return result.missing ? null : round(result.amount, decimals);
}

export function round(value: number, decimals: number): number {
  const factor = 10 ** Math.max(0, Math.trunc(decimals));
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateNutrientRange(
  basis: NutrientBasis,
  portion: {
    minimumGrams: number;
    centralGrams: number;
    maximumGrams: number;
  },
  decimals = 2,
): {
  minimum: number | null;
  central: number | null;
  maximum: number | null;
} {
  return {
    minimum: calculateNutrientRounded(
      basis,
      portion.minimumGrams,
      decimals,
    ),
    central: calculateNutrientRounded(
      basis,
      portion.centralGrams,
      decimals,
    ),
    maximum: calculateNutrientRounded(
      basis,
      portion.maximumGrams,
      decimals,
    ),
  };
}
