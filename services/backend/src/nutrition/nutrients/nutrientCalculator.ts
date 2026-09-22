/**
 * Deterministic nutrient calculation.
 *
 * Only uses the documented basis-conversion formula:
 *
 *   calculated = sourceAmount * selectedFoodGrams / sourceBasisGrams
 *
 * The basis is never assumed; it must be provided. Decimal-safe arithmetic
 * is applied, and display rounding happens only at the presentation
 * boundary.
 */

export type NutrientBasis = {
  /** Amount in the source record for the stated basis. */
  amount: number;
  /** Unit of `amount` (e.g. "g", "mg", "kcal", "ug"). */
  unit: "g" | "mg" | "kcal" | "ug";
  /** Gram weight the source amount is expressed per. */
  basisGrams: number;
};

export type CalculatedNutrient = {
  amount: number;
  unit: "g" | "mg" | "kcal" | "ug";
  /** Grams the calculation was scaled to. */
  selectedGrams: number;
  formulaVersion: 1;
  missing: false;
};

export type MissingNutrient = {
  amount: null;
  unit: "g" | "mg" | "kcal" | "ug";
  selectedGrams: number;
  formulaVersion: 1;
  missing: true;
};

export type CalculatedNutrientResult = CalculatedNutrient | MissingNutrient;

export type BasisErrorCode = "invalid_basis" | "invalid_amount" | "invalid_selected_grams" | "invalid_ratio";

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

function validatePositive(label: string, value: unknown, code: BasisErrorCode): asserts value is number {
  if (!isFiniteNumber(value) || value <= 0) {
    throw new BasisError(code, `${label} must be a finite positive number.`);
  }
}

function validateNonNegative(label: string, value: unknown, code: BasisErrorCode): asserts value is number {
  if (!isFiniteNumber(value) || value < 0) {
    throw new BasisError(code, `${label} must be a finite non-negative number.`);
  }
}

/**
 * Scale a source nutrient amount to the selected food grams. Zero is a valid
 * source nutrient amount (for example 0 g fiber per 100 g); only the source
 * basis weight must be strictly positive.
 *
 * Throws BasisError when the basis is invalid; a caller that cannot
 * establish a valid basis must treat the nutrient as missing rather than
 * guessing.
 */
export function calculateNutrient(basis: NutrientBasis, selectedGrams: number): CalculatedNutrientResult {
  validateNonNegative("basis.amount", basis.amount, "invalid_amount");
  validatePositive("basis.basisGrams", basis.basisGrams, "invalid_basis");
  validateNonNegative("selectedGrams", selectedGrams, "invalid_selected_grams");

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

/** Convenience: scale and round for presentation only. */
export function calculateNutrientRounded(basis: NutrientBasis, selectedGrams: number, decimals = 2): number | null {
  const result = calculateNutrient(basis, selectedGrams);
  return result.missing ? null : round(result.amount, decimals);
}

export function round(value: number, decimals: number): number {
  const factor = 10 ** Math.max(0, Math.trunc(decimals));
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Compute a min/central/max nutrient range from a basis and portion range. */
export function calculateNutrientRange(
  basis: NutrientBasis,
  portion: { minimumGrams: number; centralGrams: number; maximumGrams: number },
  decimals = 2,
): { minimum: number | null; central: number | null; maximum: number | null } {
  return {
    minimum: calculateNutrientRounded(basis, portion.minimumGrams, decimals),
    central: calculateNutrientRounded(basis, portion.centralGrams, decimals),
    maximum: calculateNutrientRounded(basis, portion.maximumGrams, decimals),
  };
}
