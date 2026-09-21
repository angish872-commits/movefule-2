export type MassUnit = "g" | "mg" | "kg" | "oz" | "lb";
export type VolumeUnit = "ml" | "l" | "tsp" | "tbsp" | "cup" | "fl_oz";

export type ConsumptionBasis =
  | { kind: "MASS"; amount: number; unit: MassUnit }
  | { kind: "VOLUME"; amount: number; unit: VolumeUnit }
  | { kind: "COUNT"; amount: number; unit: "piece" }
  | { kind: "SERVING"; amount: number; unit: "serving" }
  | { kind: "PACKAGE"; amount: number; unit: "package" };

export interface DensityEvidence {
  gramsPerMl: number;
  sourceReference: string;
  sourceRevision?: string;
}

const MASS_TO_GRAMS: Record<MassUnit, number> = {
  g: 1,
  mg: 0.001,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
};

const VOLUME_TO_ML: Record<VolumeUnit, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  cup: 236.5882365,
  fl_oz: 29.5735295625,
};

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive number`);
  }
  return value;
}

export function massToGrams(amount: number, unit: MassUnit): number {
  return positive(amount, "mass amount") * MASS_TO_GRAMS[unit];
}

export function volumeToMl(amount: number, unit: VolumeUnit): number {
  return positive(amount, "volume amount") * VOLUME_TO_ML[unit];
}

export function volumeToGrams(
  amount: number,
  unit: VolumeUnit,
  density: DensityEvidence | null,
): number | null {
  if (density === null) return null;
  positive(density.gramsPerMl, "density.gramsPerMl");
  return volumeToMl(amount, unit) * density.gramsPerMl;
}

/**
 * Returns consumed/source ratio only when the source basis and consumption
 * basis are compatible. It never assumes 1 ml == 1 g.
 */
export function resolveBasisRatio(
  source: ConsumptionBasis,
  consumed: ConsumptionBasis,
  density: DensityEvidence | null = null,
): number | null {
  if (source.kind === "MASS" && consumed.kind === "MASS") {
    return massToGrams(consumed.amount, consumed.unit) /
      massToGrams(source.amount, source.unit);
  }

  if (source.kind === "VOLUME" && consumed.kind === "VOLUME") {
    return volumeToMl(consumed.amount, consumed.unit) /
      volumeToMl(source.amount, source.unit);
  }

  if (source.kind === "MASS" && consumed.kind === "VOLUME") {
    const grams = volumeToGrams(consumed.amount, consumed.unit, density);
    if (grams === null) return null;
    return grams / massToGrams(source.amount, source.unit);
  }

  if (source.kind === "VOLUME" && consumed.kind === "MASS") {
    if (density === null) return null;
    positive(density.gramsPerMl, "density.gramsPerMl");
    const sourceMl = volumeToMl(source.amount, source.unit);
    const sourceGrams = sourceMl * density.gramsPerMl;
    return massToGrams(consumed.amount, consumed.unit) / sourceGrams;
  }

  if (source.kind === consumed.kind) {
    return positive(consumed.amount, "consumed amount") /
      positive(source.amount, "source amount");
  }

  return null;
}
