export type NutritionEvidenceRole =
  | "PRODUCTION_NUTRITION_AUTHORITY"
  | "PACKAGED_LOOKUP"
  | "REGIONAL_REFERENCE"
  | "BENCHMARK_ONLY"
  | "RESEARCH_ONLY"
  | "REJECTED";

export type EvidenceRightsDecision =
  | "APPROVED"
  | "APPROVED_WITH_SHARE_ALIKE_ISOLATION"
  | "REVIEW_REQUIRED"
  | "REJECTED"
  | "UNKNOWN";

export type NutritionEvidenceSource = Readonly<{
  sourceId: string;
  organization: string;
  title: string;
  role: NutritionEvidenceRole;
  regions: readonly string[];
  licence: string;
  rightsDecision: EvidenceRightsDecision;
  commercialUse: "ALLOWED" | "CONDITIONAL" | "NOT_ALLOWED" | "UNKNOWN";
  mayStoreCanonicalFacts: boolean;
  mayCacheIsolated: boolean;
  attributionRequired: boolean;
  shareAlikeIsolationRequired: boolean;
  sourceVersion: string;
  evidenceClass: "GOVERNMENT_ANALYTICAL" | "GOVERNMENT_COMPILED" | "MANUFACTURER_OR_COMMUNITY_LABEL" | "REGIONAL_REFERENCE" | "BENCHMARK" | "RESEARCH";
  notes: readonly string[];
}>;

/**
 * Reviewed source manifest. Rights decisions are intentionally fail-closed.
 * A publicly downloadable PDF is not treated as permission to create a
 * commercial database product. Source terms must be reviewed again before a
 * future version changes a rightsDecision.
 */
export const NUTRITION_EVIDENCE_SOURCES: readonly NutritionEvidenceSource[] = Object.freeze([
  Object.freeze({
    sourceId: "USDA_FOODDATA_CENTRAL",
    organization: "USDA Agricultural Research Service",
    title: "FoodData Central",
    role: "PRODUCTION_NUTRITION_AUTHORITY",
    regions: Object.freeze(["US", "GLOBAL_REFERENCE"]),
    licence: "CC0 1.0 Universal / public domain",
    rightsDecision: "APPROVED",
    commercialUse: "ALLOWED",
    mayStoreCanonicalFacts: true,
    mayCacheIsolated: true,
    attributionRequired: false,
    shareAlikeIsolationRequired: false,
    sourceVersion: "CONTINUOUS_RELEASE",
    evidenceClass: "GOVERNMENT_ANALYTICAL",
    notes: Object.freeze([
      "FoodData Central states its data are public domain and published under CC0 1.0.",
      "Preserve FDC data type and source record identifier; Branded records are label evidence, not equivalent to Foundation analytical evidence.",
    ]),
  }),
  Object.freeze({
    sourceId: "OPEN_FOOD_FACTS",
    organization: "Open Food Facts",
    title: "Open Food Facts database",
    role: "PACKAGED_LOOKUP",
    regions: Object.freeze(["GLOBAL"]),
    licence: "Open Database License (ODbL) 1.0",
    rightsDecision: "APPROVED_WITH_SHARE_ALIKE_ISOLATION",
    commercialUse: "CONDITIONAL",
    mayStoreCanonicalFacts: false,
    mayCacheIsolated: true,
    attributionRequired: true,
    shareAlikeIsolationRequired: true,
    sourceVersion: "LIVE_DATABASE",
    evidenceClass: "MANUFACTURER_OR_COMMUNITY_LABEL",
    notes: Object.freeze([
      "Keep the OFF-backed database/cache logically isolated from MoveFuel proprietary canonical nutrient evidence.",
      "ODbL attribution/share-alike obligations apply; combining database contents can trigger redistribution obligations.",
      "A product label value is not promoted to laboratory analytical authority.",
    ]),
  }),
  Object.freeze({
    sourceId: "NUTRITION5K",
    organization: "Google Research",
    title: "Nutrition5k",
    role: "BENCHMARK_ONLY",
    regions: Object.freeze(["US", "CALIFORNIA_CAFETERIA"]),
    licence: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    rightsDecision: "APPROVED",
    commercialUse: "ALLOWED",
    mayStoreCanonicalFacts: false,
    mayCacheIsolated: true,
    attributionRequired: true,
    shareAlikeIsolationRequired: false,
    sourceVersion: "CVPR_2021_DATASET",
    evidenceClass: "BENCHMARK",
    notes: Object.freeze([
      "Use as measured benchmark ground truth only, never as the canonical food-composition authority.",
      "The dataset documents California cafeteria bias and must not be treated as globally representative cuisine evidence.",
    ]),
  }),
  Object.freeze({
    sourceId: "NEPAL_DFTQC_FCT_2017",
    organization: "Government of Nepal, Department of Food Technology and Quality Control",
    title: "Nepalese Food Composition Table 2017",
    role: "REGIONAL_REFERENCE",
    regions: Object.freeze(["NP"]),
    licence: "Exact commercial/database reuse grant not verified",
    rightsDecision: "REVIEW_REQUIRED",
    commercialUse: "UNKNOWN",
    mayStoreCanonicalFacts: false,
    mayCacheIsolated: false,
    attributionRequired: true,
    shareAlikeIsolationRequired: false,
    sourceVersion: "2017",
    evidenceClass: "REGIONAL_REFERENCE",
    notes: Object.freeze([
      "FAO/INFOODS lists the table as free access, which is not treated as a commercial reuse licence.",
      "Reference/benchmark comparison only until written product/database reuse rights are verified.",
    ]),
  }),
  Object.freeze({
    sourceId: "INDIA_IFCT_2017",
    organization: "ICMR-National Institute of Nutrition",
    title: "Indian Food Composition Tables 2017",
    role: "REGIONAL_REFERENCE",
    regions: Object.freeze(["IN", "SOUTH_ASIA_REFERENCE"]),
    licence: "Copyright ICMR-NIN; prior written permission required for electronic product reproduction/storage",
    rightsDecision: "REVIEW_REQUIRED",
    commercialUse: "CONDITIONAL",
    mayStoreCanonicalFacts: false,
    mayCacheIsolated: false,
    attributionRequired: true,
    shareAlikeIsolationRequired: false,
    sourceVersion: "2017",
    evidenceClass: "REGIONAL_REFERENCE",
    notes: Object.freeze([
      "Do not ingest the table into a MoveFuel product corpus without written ICMR-NIN permission.",
      "Third-party mirrors or converted files do not change the underlying data rights.",
    ]),
  }),
  Object.freeze({
    sourceId: "BANGLADESH_FCT_2013",
    organization: "University of Dhaka Institute of Nutrition and Food Science / FAO",
    title: "Food Composition Table for Bangladesh",
    role: "REGIONAL_REFERENCE",
    regions: Object.freeze(["BD", "SOUTH_ASIA_REFERENCE"]),
    licence: "Exact commercial/database reuse grant not verified",
    rightsDecision: "REVIEW_REQUIRED",
    commercialUse: "UNKNOWN",
    mayStoreCanonicalFacts: false,
    mayCacheIsolated: false,
    attributionRequired: true,
    shareAlikeIsolationRequired: false,
    sourceVersion: "2013",
    evidenceClass: "REGIONAL_REFERENCE",
    notes: Object.freeze([
      "FAO lists free access and provides PDF/electronic files, but that is not treated as a commercial reuse licence.",
      "Use for reviewed regional comparison/benchmarking until product/database rights are explicitly cleared.",
    ]),
  }),
]);

export function evidenceSource(sourceId: string): NutritionEvidenceSource | null {
  return NUTRITION_EVIDENCE_SOURCES.find((source) => source.sourceId === sourceId) ?? null;
}

export function mayUseAsCanonicalNutritionAuthority(source: NutritionEvidenceSource | null): boolean {
  return source !== null
    && source.role === "PRODUCTION_NUTRITION_AUTHORITY"
    && source.rightsDecision === "APPROVED"
    && source.commercialUse === "ALLOWED"
    && source.mayStoreCanonicalFacts
    && !source.shareAlikeIsolationRequired;
}

export function assertCanonicalNutritionAuthority(sourceId: string): NutritionEvidenceSource {
  const source = evidenceSource(sourceId);
  if (!mayUseAsCanonicalNutritionAuthority(source)) {
    throw new Error(`nutrition_evidence_not_canonical_authority:${sourceId}`);
  }
  return source!;
}
