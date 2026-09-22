import type { MoveFuelEvidenceUse, NutrientObservation } from "./contracts.ts";

export type GoldReferenceCase = {
  schemaVersion: 1;
  caseId: string;
  reviewStatus: "SOURCE_RULE_REVIEWED";
  truthBasis: "SOURCE_POLICY_PLUS_SYNTHETIC_SENTINEL";
  sourceId: string;
  requestedUse: MoveFuelEvidenceUse;
  expectedUseAllowed: boolean;
  observation: NutrientObservation;
  expectedObservationState: NutrientObservation["state"];
  expectedNumericValue: number | null;
  oracle: "DETERMINISTIC_EVIDENCE_POLICY";
};

type SourceUseSeed = {
  sourceId: string;
  requestedUse: MoveFuelEvidenceUse;
  expectedUseAllowed: boolean;
};

const SOURCE_USE_SEEDS: readonly SourceUseSeed[] = [
  { sourceId: "USDA_FDC_2026_04", requestedUse: "PRODUCTION_NUTRIENT_LOOKUP", expectedUseAllowed: true },
  { sourceId: "USDA_FDC_2026_04", requestedUse: "BENCHMARK_VALIDATION", expectedUseAllowed: true },
  { sourceId: "USDA_FDC_2026_04", requestedUse: "PACKAGED_LOOKUP", expectedUseAllowed: false },
  { sourceId: "OPEN_FOOD_FACTS_LIVE_2026_08_30", requestedUse: "PACKAGED_LOOKUP", expectedUseAllowed: true },
  { sourceId: "OPEN_FOOD_FACTS_LIVE_2026_08_30", requestedUse: "BENCHMARK_VALIDATION", expectedUseAllowed: true },
  { sourceId: "OPEN_FOOD_FACTS_LIVE_2026_08_30", requestedUse: "PRODUCTION_NUTRIENT_LOOKUP", expectedUseAllowed: false },
  { sourceId: "NEPAL_DFTQC_PUBLICATIONS_2026_08_30", requestedUse: "REGIONAL_REFERENCE", expectedUseAllowed: true },
  { sourceId: "NEPAL_DFTQC_PUBLICATIONS_2026_08_30", requestedUse: "BENCHMARK_VALIDATION", expectedUseAllowed: true },
  { sourceId: "NEPAL_DFTQC_PUBLICATIONS_2026_08_30", requestedUse: "PRODUCTION_NUTRIENT_LOOKUP", expectedUseAllowed: false },
  { sourceId: "INDIA_IFCT_2017", requestedUse: "REGIONAL_REFERENCE", expectedUseAllowed: true },
  { sourceId: "INDIA_IFCT_2017", requestedUse: "BENCHMARK_VALIDATION", expectedUseAllowed: true },
  { sourceId: "INDIA_IFCT_2017", requestedUse: "PRODUCTION_NUTRIENT_LOOKUP", expectedUseAllowed: false },
  { sourceId: "BANGLADESH_FCT_2013", requestedUse: "REGIONAL_REFERENCE", expectedUseAllowed: true },
  { sourceId: "BANGLADESH_FCT_2013", requestedUse: "BENCHMARK_VALIDATION", expectedUseAllowed: true },
  { sourceId: "BANGLADESH_FCT_2013", requestedUse: "PRODUCTION_NUTRIENT_LOOKUP", expectedUseAllowed: false },
  { sourceId: "WHO_HEALTHY_DIET_2026", requestedUse: "GUIDELINE_RULE", expectedUseAllowed: true },
  { sourceId: "WHO_HEALTHY_DIET_2026", requestedUse: "PRODUCTION_NUTRIENT_LOOKUP", expectedUseAllowed: false },
  { sourceId: "FAO_INFOODS_STANDARDS_2022", requestedUse: "GUIDELINE_RULE", expectedUseAllowed: true },
  { sourceId: "FAO_INFOODS_STANDARDS_2022", requestedUse: "PRODUCTION_NUTRIENT_LOOKUP", expectedUseAllowed: false },
  { sourceId: "UNKNOWN_LICENSE_FIXTURE", requestedUse: "PRODUCTION_NUTRIENT_LOOKUP", expectedUseAllowed: false },
] as const;

const OBSERVATION_SEEDS: readonly NutrientObservation[] = [
  { state: "KNOWN", value: 0, unit: "g/100g" },
  { state: "KNOWN", value: 12.5, unit: "g/100g" },
  { state: "UNKNOWN", value: null, unit: "g/100g" },
  { state: "NOT_REPORTED", value: null, unit: "g/100g" },
  { state: "NOT_APPLICABLE", value: null, unit: null },
] as const;

/**
 * The first Gold set intentionally benchmarks source routing and missing-value
 * semantics, not copied nutrient-table values. Numeric observations are
 * synthetic sentinels used only to prove state handling; they are not nutrient
 * claims about any real food. 20 reviewed source/use seeds x 5 observation
 * states = exactly 100 cases.
 */
export const GOLD_REFERENCE_CASES: readonly GoldReferenceCase[] = SOURCE_USE_SEEDS.flatMap((sourceSeed, sourceIndex) =>
  OBSERVATION_SEEDS.map((observation, observationIndex) => ({
    schemaVersion: 1 as const,
    caseId: `gold-ref-${String(sourceIndex + 1).padStart(2, "0")}-${String(observationIndex + 1).padStart(2, "0")}`,
    reviewStatus: "SOURCE_RULE_REVIEWED" as const,
    truthBasis: "SOURCE_POLICY_PLUS_SYNTHETIC_SENTINEL" as const,
    sourceId: sourceSeed.sourceId,
    requestedUse: sourceSeed.requestedUse,
    expectedUseAllowed: sourceSeed.expectedUseAllowed,
    observation,
    expectedObservationState: observation.state,
    expectedNumericValue: observation.state === "KNOWN" ? observation.value : null,
    oracle: "DETERMINISTIC_EVIDENCE_POLICY" as const,
  })),
);
