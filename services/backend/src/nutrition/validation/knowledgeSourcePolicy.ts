/**
 * Step-1 internet knowledge-source policy.
 *
 * A downloadable dataset is not automatically authoritative for every job.
 * This module keeps source purpose explicit at the algorithm boundary.
 */

export type KnowledgeSourceRole =
  | "canonical_nutrition"
  | "volume_to_mass_density"
  | "benchmark_ground_truth"
  | "regional_food_composition_reference";

export type CommercialUsePolicy =
  | "allowed"
  | "allowed_with_terms_and_attribution"
  | "allowed_with_attribution"
  | "hold_until_rights_review"
  | "legal_review_required_for_product_integration"
  | "reference_only_until_exact_terms_review";

export type KnowledgeSourcePolicy = {
  sourceId: string;
  role: KnowledgeSourceRole;
  authorityTier: number;
  status: string;
  commercialUse: CommercialUsePolicy;
  licence: string;
  region: string;
};

export type SourceUse =
  | "NUTRITION_AUTHORITY"
  | "DENSITY_EVIDENCE"
  | "DENSITY_VALIDATION_REFERENCE"
  | "BENCHMARK_GROUND_TRUTH"
  | "REGIONAL_REFERENCE";

export type SourceUseDecision = {
  allowed: boolean;
  reason:
    | "ROLE_MATCH_APPROVED"
    | "ROLE_MISMATCH"
    | "RIGHTS_REVIEW_REQUIRED"
    | "REFERENCE_ONLY"
    | "BENCHMARK_NOT_NUTRITION_AUTHORITY";
};

export function decideSourceUse(source: KnowledgeSourcePolicy, use: SourceUse): SourceUseDecision {
  const rightsBlocked = source.commercialUse === "hold_until_rights_review"
    || source.commercialUse === "legal_review_required_for_product_integration"
    || source.commercialUse === "reference_only_until_exact_terms_review";

  // Research/validation may examine a density source that is not yet cleared
  // to be embedded in a commercial product. Production DENSITY_EVIDENCE stays
  // fail-closed until the rights gate is explicitly resolved.
  if (use === "DENSITY_VALIDATION_REFERENCE") {
    return source.role === "volume_to_mass_density"
      ? { allowed: true, reason: "ROLE_MATCH_APPROVED" }
      : { allowed: false, reason: "ROLE_MISMATCH" };
  }

  if (rightsBlocked) {
    return { allowed: false, reason: "RIGHTS_REVIEW_REQUIRED" };
  }

  if (use === "NUTRITION_AUTHORITY") {
    if (source.role === "benchmark_ground_truth") {
      return { allowed: false, reason: "BENCHMARK_NOT_NUTRITION_AUTHORITY" };
    }
    if (source.role === "regional_food_composition_reference") {
      // Regional source metadata may be useful for research/aliasing, but a
      // numeric record must be explicitly reviewed before it becomes a final
      // nutrition authority in MoveFuel.
      return { allowed: false, reason: "REFERENCE_ONLY" };
    }
    return source.role === "canonical_nutrition"
      ? { allowed: true, reason: "ROLE_MATCH_APPROVED" }
      : { allowed: false, reason: "ROLE_MISMATCH" };
  }

  if (use === "DENSITY_EVIDENCE") {
    return source.role === "volume_to_mass_density"
      ? { allowed: true, reason: "ROLE_MATCH_APPROVED" }
      : { allowed: false, reason: "ROLE_MISMATCH" };
  }

  if (use === "BENCHMARK_GROUND_TRUTH") {
    return source.role === "benchmark_ground_truth"
      ? { allowed: true, reason: "ROLE_MATCH_APPROVED" }
      : { allowed: false, reason: "ROLE_MISMATCH" };
  }

  return source.role === "regional_food_composition_reference"
    ? { allowed: true, reason: "ROLE_MATCH_APPROVED" }
    : { allowed: false, reason: "ROLE_MISMATCH" };
}

export function sortSourcesForUse(sources: readonly KnowledgeSourcePolicy[], use: SourceUse): KnowledgeSourcePolicy[] {
  return [...sources]
    .filter((source) => decideSourceUse(source, use).allowed)
    .sort((a, b) => a.authorityTier - b.authorityTier || a.sourceId.localeCompare(b.sourceId));
}
