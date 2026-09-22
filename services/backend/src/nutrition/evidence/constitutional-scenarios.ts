export type NutritionConstitutionInvariant =
  | "UNKNOWN_NOT_ZERO"
  | "NOT_REPORTED_NOT_ZERO"
  | "NOT_APPLICABLE_NOT_ZERO"
  | "KNOWN_ZERO_DISTINCT"
  | "UNKNOWN_LICENSE_FAIL_CLOSED"
  | "RIGHTS_GATED_NO_PRODUCTION"
  | "BENCHMARK_ONLY_NO_PRODUCTION"
  | "PACKAGED_LOOKUP_ISOLATED"
  | "USDA_PRODUCTION_AUTHORITY"
  | "GUIDELINE_NOT_COMPOSITION"
  | "ALIAS_NOT_NUTRIENT_AUTHORITY"
  | "CROSS_COUNTRY_PRESERVE_UNCERTAINTY"
  | "VERSION_REQUIRED"
  | "CHECKSUM_REQUIRED"
  | "COMMERCIAL_RIGHTS_REQUIRED"
  | "LLM_NOT_TRUTH_ORACLE"
  | "BENCHMARK_NO_DOMAIN_MUTATION"
  | "NUTRITION_NO_TRAINING_PUNISHMENT"
  | "YOUTH_NO_APPEARANCE_PRESSURE"
  | "DETERMINISTIC_REPLAY";

export type ConstitutionalNutritionScenario = {
  schemaVersion: 1;
  scenarioId: string;
  invariant: NutritionConstitutionInvariant;
  countryCode: "GLOBAL" | "US" | "NP" | "IN" | "BD";
  oracle: "DETERMINISTIC_CONSTITUTION";
  expected: "INVARIANT_MUST_HOLD";
  forbiddenOutcomes: readonly string[];
};

const INVARIANTS: readonly { invariant: NutritionConstitutionInvariant; forbiddenOutcomes: readonly string[] }[] = [
  { invariant: "UNKNOWN_NOT_ZERO", forbiddenOutcomes: ["UNKNOWN_COERCED_TO_0"] },
  { invariant: "NOT_REPORTED_NOT_ZERO", forbiddenOutcomes: ["NOT_REPORTED_COERCED_TO_0", "NOT_REPORTED_COERCED_TO_UNKNOWN"] },
  { invariant: "NOT_APPLICABLE_NOT_ZERO", forbiddenOutcomes: ["NOT_APPLICABLE_COERCED_TO_0", "NOT_APPLICABLE_COERCED_TO_UNKNOWN"] },
  { invariant: "KNOWN_ZERO_DISTINCT", forbiddenOutcomes: ["KNOWN_ZERO_LOST", "KNOWN_ZERO_COERCED_TO_UNKNOWN"] },
  { invariant: "UNKNOWN_LICENSE_FAIL_CLOSED", forbiddenOutcomes: ["UNKNOWN_LICENSE_PROMOTED_TO_AUTHORITY"] },
  { invariant: "RIGHTS_GATED_NO_PRODUCTION", forbiddenOutcomes: ["RIGHTS_GATED_SOURCE_USED_AS_PRODUCTION_TRUTH"] },
  { invariant: "BENCHMARK_ONLY_NO_PRODUCTION", forbiddenOutcomes: ["BENCHMARK_SOURCE_WRITES_CANONICAL_NUTRIENTS"] },
  { invariant: "PACKAGED_LOOKUP_ISOLATED", forbiddenOutcomes: ["PACKAGED_PROVIDER_PROMOTED_TO_GENERIC_COMPOSITION"] },
  { invariant: "USDA_PRODUCTION_AUTHORITY", forbiddenOutcomes: ["USDA_PROVENANCE_DROPPED", "FDC_DATA_TYPE_DROPPED"] },
  { invariant: "GUIDELINE_NOT_COMPOSITION", forbiddenOutcomes: ["GUIDELINE_VALUE_USED_AS_FOOD_COMPOSITION"] },
  { invariant: "ALIAS_NOT_NUTRIENT_AUTHORITY", forbiddenOutcomes: ["ALIAS_MATCH_ALONE_COPIES_NUTRIENTS"] },
  { invariant: "CROSS_COUNTRY_PRESERVE_UNCERTAINTY", forbiddenOutcomes: ["REGIONAL_VARIANT_SILENTLY_TREATED_AS_EXACT"] },
  { invariant: "VERSION_REQUIRED", forbiddenOutcomes: ["UNVERSIONED_SOURCE_ACCEPTED"] },
  { invariant: "CHECKSUM_REQUIRED", forbiddenOutcomes: ["PROVENANCE_WITHOUT_FINGERPRINT_ACCEPTED"] },
  { invariant: "COMMERCIAL_RIGHTS_REQUIRED", forbiddenOutcomes: ["PUBLIC_AVAILABILITY_ASSUMED_COMMERCIAL_PERMISSION"] },
  { invariant: "LLM_NOT_TRUTH_ORACLE", forbiddenOutcomes: ["LLM_OUTPUT_BECOMES_CANONICAL_NUTRIENT_TRUTH", "LLM_OVERRIDES_EVIDENCE_GATE"] },
  { invariant: "BENCHMARK_NO_DOMAIN_MUTATION", forbiddenOutcomes: ["BENCHMARK_WRITES_DIET_RANKING", "BENCHMARK_WRITES_TODAY", "BENCHMARK_WRITES_APPWRITE"] },
  { invariant: "NUTRITION_NO_TRAINING_PUNISHMENT", forbiddenOutcomes: ["MISSED_NUTRITION_TARGET_ADDS_EXERCISE", "HIGHER_INTAKE_MAKES_WORKOUT_HARDER", "UNDERFUELING_MAKES_WORKOUT_HARDER"] },
  { invariant: "YOUTH_NO_APPEARANCE_PRESSURE", forbiddenOutcomes: ["YOUTH_APPEARANCE_OPTIMIZATION", "YOUTH_RESTRICTIVE_DIET_PRESSURE"] },
  { invariant: "DETERMINISTIC_REPLAY", forbiddenOutcomes: ["SAME_INPUT_DIFFERENT_EVIDENCE_DECISION"] },
] as const;

const COUNTRIES = ["GLOBAL", "US", "NP", "IN", "BD"] as const;

/** 20 constitutional invariants x 5 jurisdiction contexts = exactly 100 scenarios. */
export const CONSTITUTIONAL_NUTRITION_SCENARIOS: readonly ConstitutionalNutritionScenario[] = INVARIANTS.flatMap((entry, invariantIndex) =>
  COUNTRIES.map((countryCode, countryIndex) => ({
    schemaVersion: 1 as const,
    scenarioId: `nutrition-constitution-${String(invariantIndex + 1).padStart(2, "0")}-${String(countryIndex + 1).padStart(2, "0")}`,
    invariant: entry.invariant,
    countryCode,
    oracle: "DETERMINISTIC_CONSTITUTION" as const,
    expected: "INVARIANT_MUST_HOLD" as const,
    forbiddenOutcomes: entry.forbiddenOutcomes,
  })),
);
