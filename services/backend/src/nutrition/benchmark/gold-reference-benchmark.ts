export type NutrientKnowledgeState = "KNOWN" | "UNKNOWN" | "NOT_REPORTED" | "NOT_APPLICABLE";

export type GoldNutrientValue = Readonly<{
  state: NutrientKnowledgeState;
  value: number | null;
  unit: "kcal" | "g" | "mg";
}>;

export type MeasuredNutritionSeed = Readonly<{
  sampleId: string;
  energyKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  massG: number;
}>;

export type GoldNutritionReferenceCase = Readonly<{
  caseId: string;
  foodIdentity: string;
  aliases: readonly string[];
  preparation: string | null;
  country: string | null;
  region: string | null;
  sourceId: "NUTRITION5K";
  sourceVersion: "CVPR_2021_DATASET";
  sourceRecordId: string;
  servingBasis: Readonly<{ type: "MEASURED_PLATE"; amountG: number | null }>;
  evidenceClass: "BENCHMARK_MEASURED";
  provenance: readonly string[];
  licence: "CC BY 4.0";
  useClass: "BENCHMARK_ONLY";
  reviewerStatus: "REVIEWED_SEED_DERIVATION";
  nutrients: Readonly<{
    energyKcal: GoldNutrientValue;
    proteinG: GoldNutrientValue;
    carbG: GoldNutrientValue;
    fatG: GoldNutrientValue;
    fiberG: GoldNutrientValue;
    sodiumMg: GoldNutrientValue;
  }>;
}>;

const known = (value: number, unit: GoldNutrientValue["unit"]): GoldNutrientValue => Object.freeze({ state: "KNOWN", value, unit });
const unknown = (unit: GoldNutrientValue["unit"]): GoldNutrientValue => Object.freeze({ state: "UNKNOWN", value: null, unit });
const notReported = (unit: GoldNutrientValue["unit"]): GoldNutrientValue => Object.freeze({ state: "NOT_REPORTED", value: null, unit });
const notApplicable = (unit: GoldNutrientValue["unit"]): GoldNutrientValue => Object.freeze({ state: "NOT_APPLICABLE", value: null, unit });

const VARIANTS = Object.freeze([
  "MEASURED_COMPLETE",
  "ENERGY_UNKNOWN",
  "PROTEIN_UNKNOWN",
  "CARB_UNKNOWN",
  "FAT_UNKNOWN",
  "MASS_UNKNOWN",
  "PREPARATION_UNKNOWN",
  "REGION_UNKNOWN",
  "UNREPORTED_MICRONUTRIENTS",
  "NOT_APPLICABLE_CONTROL",
] as const);

type GoldVariant = typeof VARIANTS[number];

function validateSeed(seed: MeasuredNutritionSeed): void {
  if (!seed.sampleId.trim()) throw new Error("gold_seed_id_required");
  for (const [name, value] of Object.entries({
    energyKcal: seed.energyKcal,
    proteinG: seed.proteinG,
    carbG: seed.carbG,
    fatG: seed.fatG,
    massG: seed.massG,
  })) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`gold_seed_invalid:${name}`);
  }
}

function caseFor(seed: MeasuredNutritionSeed, variant: GoldVariant): GoldNutritionReferenceCase {
  const energy = variant === "ENERGY_UNKNOWN" ? unknown("kcal") : known(seed.energyKcal, "kcal");
  const protein = variant === "PROTEIN_UNKNOWN" ? unknown("g") : known(seed.proteinG, "g");
  const carb = variant === "CARB_UNKNOWN" ? unknown("g") : known(seed.carbG, "g");
  const fat = variant === "FAT_UNKNOWN" ? unknown("g") : known(seed.fatG, "g");
  const controlNotApplicable = variant === "NOT_APPLICABLE_CONTROL";
  return Object.freeze({
    caseId: `${seed.sampleId}:${variant}`,
    foodIdentity: `Nutrition5k measured plate ${seed.sampleId}`,
    aliases: Object.freeze([seed.sampleId]),
    preparation: variant === "PREPARATION_UNKNOWN" ? null : "MEASURED_MIXED_PLATE",
    country: "US",
    region: variant === "REGION_UNKNOWN" ? null : "CALIFORNIA_CAFETERIA",
    sourceId: "NUTRITION5K",
    sourceVersion: "CVPR_2021_DATASET",
    sourceRecordId: seed.sampleId,
    servingBasis: Object.freeze({ type: "MEASURED_PLATE", amountG: variant === "MASS_UNKNOWN" ? null : seed.massG }),
    evidenceClass: "BENCHMARK_MEASURED",
    provenance: Object.freeze(["Nutrition5k dish-level measured metadata", `seed:${seed.sampleId}`, `variant:${variant}`]),
    licence: "CC BY 4.0",
    useClass: "BENCHMARK_ONLY",
    reviewerStatus: "REVIEWED_SEED_DERIVATION",
    nutrients: Object.freeze({
      energyKcal: energy,
      proteinG: protein,
      carbG: carb,
      fatG: fat,
      fiberG: controlNotApplicable ? notApplicable("g") : notReported("g"),
      sodiumMg: variant === "UNREPORTED_MICRONUTRIENTS" ? notReported("mg") : unknown("mg"),
    }),
  });
}

/**
 * Expands measured source rows into missingness/provenance controls without
 * fabricating additional nutrient numbers. Ten reviewed measured seeds produce
 * exactly 100 benchmark reference cases.
 */
export function buildGoldNutritionReferenceCases(seeds: readonly MeasuredNutritionSeed[]): readonly GoldNutritionReferenceCase[] {
  const seen = new Set<string>();
  const cases: GoldNutritionReferenceCase[] = [];
  for (const seed of seeds) {
    validateSeed(seed);
    if (seen.has(seed.sampleId)) throw new Error(`gold_seed_duplicate:${seed.sampleId}`);
    seen.add(seed.sampleId);
    for (const variant of VARIANTS) cases.push(caseFor(seed, variant));
  }
  return Object.freeze(cases);
}

/** Known numeric zero is a fact. Unknown has no numeric value. */
export function benchmarkKnownZero(unit: GoldNutrientValue["unit"]): GoldNutrientValue {
  return known(0, unit);
}

/** Conflicting observations stay separate; this benchmark layer never averages source facts. */
export function preserveConflictingEvidence<T extends { sourceRecordId: string }>(observations: readonly T[]): readonly T[] {
  return Object.freeze(observations.map((observation) => Object.freeze({ ...observation })));
}
