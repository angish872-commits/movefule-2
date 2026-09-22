import { createHash } from "node:crypto";

export type EvidenceClass =
  | "AUTHORITATIVE_COMPOSITION"
  | "PACKAGED_PROVIDER"
  | "REGIONAL_REFERENCE"
  | "GUIDELINE"
  | "RESEARCH_EVIDENCE";

export type SourceRole =
  | "PRODUCTION_NUTRITION_AUTHORITY"
  | "PACKAGED_LOOKUP"
  | "REGIONAL_REFERENCE"
  | "BENCHMARK_ONLY"
  | "GUIDELINE_AUTHORITY";

export type LicenseStatus = "PUBLIC_DOMAIN" | "VERIFIED_OPEN" | "RIGHTS_GATED" | "UNKNOWN";
export type CommercialUseStatus = "ALLOWED" | "ALLOWED_WITH_OBLIGATIONS" | "REQUIRES_PERMISSION" | "UNKNOWN";

export type MoveFuelEvidenceUse =
  | "PRODUCTION_NUTRIENT_LOOKUP"
  | "PACKAGED_LOOKUP"
  | "BENCHMARK_VALIDATION"
  | "REGIONAL_REFERENCE"
  | "GUIDELINE_RULE"
  | "ALIAS_REFERENCE";

export type EvidenceProvenance = {
  canonicalUri: string;
  licenseUri: string | null;
  retrievedOn: string;
  sourceVersion: string;
  checksum: {
    algorithm: "SHA256";
    scope: "SOURCE_IDENTITY_METADATA";
    value: string;
  };
};

export type EvidenceSourceManifest = {
  schemaVersion: 1;
  sourceId: string;
  organization: string;
  version: string;
  jurisdiction: string;
  evidenceClass: EvidenceClass;
  sourceRoles: readonly SourceRole[];
  licenseStatus: LicenseStatus;
  commercialUseStatus: CommercialUseStatus;
  retentionRedistributionRules: readonly string[];
  reviewDate: string;
  provenance: EvidenceProvenance;
  allowedUses: readonly MoveFuelEvidenceUse[];
  prohibitedUses: readonly MoveFuelEvidenceUse[];
  notes: readonly string[];
};

export type CountryEvidenceManifest = {
  schemaVersion: 1;
  countryCode: "GLOBAL" | "US" | "NP" | "IN" | "BD";
  regionalReferenceSourceIds: readonly string[];
  productionCompositionSourceIds: readonly string[];
  guidelineSourceIds: readonly string[];
  packagedLookupSourceIds: readonly string[];
  rules: readonly string[];
};

export type GuidelineRule = {
  schemaVersion: 1;
  ruleId: string;
  sourceId: string;
  sourceSection: string;
  jurisdiction: "GLOBAL";
  evidenceClass: "GUIDELINE" | "AUTHORITATIVE_COMPOSITION";
  population: string;
  metric: string;
  operator: "LT" | "LTE" | "GTE" | "SEMANTIC";
  threshold: number | null;
  unit: string | null;
  ruleRole: "BENCHMARK" | "DATA_SEMANTIC";
  notes: readonly string[];
};

export type LocalAliasRecord = {
  schemaVersion: 1;
  conceptId: string;
  locale: "en" | "ne" | "hi" | "bn";
  alias: string;
  form: "GENERIC_FOOD" | "COOKED_FOOD" | "INGREDIENT";
  reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW" | "SOURCE_VERIFIED";
  allowedUse: "ALIAS_REFERENCE_ONLY";
};

export type NutrientObservation =
  | { state: "KNOWN"; value: number; unit: string }
  | { state: "UNKNOWN"; value: null; unit: string | null }
  | { state: "NOT_REPORTED"; value: null; unit: string | null }
  | { state: "NOT_APPLICABLE"; value: null; unit: string | null };

export function sourceIdentityChecksum(input: {
  sourceId: string;
  organization: string;
  version: string;
  canonicalUri: string;
  licenseUri: string | null;
  reviewDate: string;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function buildProvenance(input: {
  sourceId: string;
  organization: string;
  version: string;
  canonicalUri: string;
  licenseUri: string | null;
  reviewDate: string;
}): EvidenceProvenance {
  return {
    canonicalUri: input.canonicalUri,
    licenseUri: input.licenseUri,
    retrievedOn: input.reviewDate,
    sourceVersion: input.version,
    checksum: {
      algorithm: "SHA256",
      scope: "SOURCE_IDENTITY_METADATA",
      value: sourceIdentityChecksum(input),
    },
  };
}

export function validateEvidenceSource(source: EvidenceSourceManifest): readonly string[] {
  const errors: string[] = [];
  if (!source.sourceId.trim()) errors.push("SOURCE_ID_REQUIRED");
  if (!source.organization.trim()) errors.push("ORGANIZATION_REQUIRED");
  if (!source.version.trim()) errors.push("VERSION_REQUIRED");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.reviewDate)) errors.push("INVALID_REVIEW_DATE");
  if (!/^[a-f0-9]{64}$/.test(source.provenance.checksum.value)) errors.push("INVALID_PROVENANCE_CHECKSUM");

  const productionAllowed = source.allowedUses.includes("PRODUCTION_NUTRIENT_LOOKUP");
  if ((source.licenseStatus === "UNKNOWN" || source.licenseStatus === "RIGHTS_GATED") && productionAllowed) {
    errors.push("RIGHTS_GATED_SOURCE_CANNOT_BE_PRODUCTION_AUTHORITY");
  }
  if (source.sourceRoles.includes("BENCHMARK_ONLY") && productionAllowed) {
    errors.push("BENCHMARK_ONLY_SOURCE_CANNOT_BE_PRODUCTION_AUTHORITY");
  }
  if (source.sourceRoles.includes("PACKAGED_LOOKUP") && productionAllowed) {
    errors.push("PACKAGED_LOOKUP_CANNOT_BECOME_COMPOSITION_AUTHORITY");
  }
  if (source.sourceRoles.includes("PRODUCTION_NUTRITION_AUTHORITY") && !productionAllowed) {
    errors.push("PRODUCTION_AUTHORITY_MUST_DECLARE_PRODUCTION_LOOKUP_USE");
  }
  return errors;
}

export function evidenceUseAllowed(source: EvidenceSourceManifest, use: MoveFuelEvidenceUse): boolean {
  if (source.prohibitedUses.includes(use) || !source.allowedUses.includes(use)) return false;
  if (use === "PRODUCTION_NUTRIENT_LOOKUP") {
    if (!source.sourceRoles.includes("PRODUCTION_NUTRITION_AUTHORITY")) return false;
    if (source.licenseStatus === "UNKNOWN" || source.licenseStatus === "RIGHTS_GATED") return false;
    if (source.commercialUseStatus === "UNKNOWN" || source.commercialUseStatus === "REQUIRES_PERMISSION") return false;
  }
  if (use === "PACKAGED_LOOKUP" && !source.sourceRoles.includes("PACKAGED_LOOKUP")) return false;
  return true;
}

export function validateNutrientObservation(observation: NutrientObservation): readonly string[] {
  if (observation.state === "KNOWN") {
    return Number.isFinite(observation.value) && observation.value >= 0 ? [] : ["KNOWN_VALUE_MUST_BE_FINITE_NON_NEGATIVE"];
  }
  return observation.value === null ? [] : ["NON_KNOWN_STATE_MUST_NOT_CARRY_VALUE"];
}

export function knownZero(unit: string): NutrientObservation {
  return { state: "KNOWN", value: 0, unit };
}
