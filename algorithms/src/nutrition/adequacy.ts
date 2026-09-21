import {
  ADEQUACY_POLICY_VERSION,
  NUTRIENT_REFERENCE_SCHEMA_VERSION,
} from "../core/versions";
import type { DailyNutrientAggregate } from "./dailyNutrientAggregator";
import type { NutrientCoverage } from "./coverage";
import type { CanonicalNutrientId } from "./nutrientRegistry";
import {
  selectNutrientReferences,
  type NutrientReference,
  type NutrientReferenceType,
  type ReferenceProfile,
} from "./referenceEngine";
import type { NutrientUnit } from "./nutrientCalculator";

export type AdequacyDataStatus =
  | "OK"
  | "INCOMPLETE_DATA"
  | "UNKNOWN"
  | "NO_REFERENCE";

export type AdequacyUpperLimitState =
  | "NOT_AVAILABLE"
  | "BELOW_OR_EQUAL"
  | "ABOVE";

export type PrimaryReferenceType = Exclude<NutrientReferenceType, "UL">;

export interface AdequacyPolicy {
  minimumCoverage: number;
}

export interface NutrientAssessment {
  nutrientId: CanonicalNutrientId;
  consumedKnown: number | null;
  coverage: NutrientCoverage;
  referenceType: PrimaryReferenceType | null;
  referenceAmount: number | null;
  referenceUnit: NutrientUnit | null;
  percentOfReference: number | null;
  upperLimit: number | null;
  upperLimitUnit: NutrientUnit | null;
  upperLimitState: AdequacyUpperLimitState;
  dataStatus: AdequacyDataStatus;
  reasonCodes: string[];
  /**
   * All applicable reference records are retained so EAR and AMDR are not
   * discarded when an RDA/AI is chosen for individual-facing comparison.
   */
  applicableReferences: readonly NutrientReference[];
  versions: {
    adequacyPolicyVersion: typeof ADEQUACY_POLICY_VERSION;
    nutrientReferenceSchemaVersion:
      typeof NUTRIENT_REFERENCE_SCHEMA_VERSION;
    referenceSourceVersions: readonly string[];
  };
}

function primaryReference(
  references: readonly NutrientReference[],
): NutrientReference | null {
  return (
    references.find((reference) => reference.referenceType === "RDA") ??
    references.find((reference) => reference.referenceType === "AI") ??
    references.find((reference) => reference.referenceType === "EAR") ??
    references.find((reference) => reference.referenceType === "AMDR") ??
    null
  );
}

function assertConsistentReferenceVersions(
  references: readonly NutrientReference[],
  nutrientId: CanonicalNutrientId,
): readonly string[] {
  const versions = [...new Set(references.map((reference) => reference.sourceVersion))];

  if (versions.length > 1) {
    throw new Error(
      `MIXED_REFERENCE_VERSIONS:${nutrientId}:${versions.join(",")}`,
    );
  }

  return versions;
}

function assertReferenceUnitCompatible(
  consumedUnit: NutrientUnit,
  reference: NutrientReference | null,
  nutrientId: CanonicalNutrientId,
): void {
  if (reference !== null && reference.unit !== consumedUnit) {
    throw new Error(
      `REFERENCE_UNIT_MISMATCH:${nutrientId}:${consumedUnit}:${reference.unit}`,
    );
  }
}

function emptyCoverage(nutrientId: CanonicalNutrientId): NutrientCoverage {
  return {
    nutrientId,
    knownEntries: 0,
    unknownEntries: 0,
    totalRelevantEntries: 0,
    ratio: 0,
    state: "NONE",
    policyVersion: "movefuel-coverage-policy-v1",
  };
}

/**
 * MF-155 Full Nutrient Adequacy Analyzer.
 *
 * This module evaluates already-consumed nutrient facts against already
 * selected reference data. It never invents intake, never treats UNKNOWN as
 * zero, and never produces a percentage when coverage is below policy.
 */
export function evaluateNutrientAdequacy(
  profile: ReferenceProfile,
  aggregates: readonly DailyNutrientAggregate[],
  coverage: readonly NutrientCoverage[],
  references: readonly NutrientReference[],
  policy: AdequacyPolicy,
): readonly NutrientAssessment[] {
  if (
    !Number.isFinite(policy.minimumCoverage) ||
    policy.minimumCoverage < 0 ||
    policy.minimumCoverage > 1
  ) {
    throw new Error("minimumCoverage must be between 0 and 1");
  }

  const applicable = selectNutrientReferences(profile, references);
  const ids = new Set<CanonicalNutrientId>([
    ...aggregates.map((value) => value.nutrientId),
    ...coverage.map((value) => value.nutrientId),
    ...applicable.map((value) => value.nutrientId),
  ]);

  const results: NutrientAssessment[] = [];

  for (const nutrientId of ids) {
    const aggregate =
      aggregates.find((value) => value.nutrientId === nutrientId) ?? null;
    const nutrientCoverage =
      coverage.find((value) => value.nutrientId === nutrientId) ??
      emptyCoverage(nutrientId);
    const nutrientReferences = applicable.filter(
      (value) => value.nutrientId === nutrientId,
    );

    const referenceSourceVersions = assertConsistentReferenceVersions(
      nutrientReferences,
      nutrientId,
    );
    const primary = primaryReference(nutrientReferences);
    const ul =
      nutrientReferences.find((reference) => reference.referenceType === "UL") ??
      null;

    const consumedKnown = aggregate?.knownAmount ?? null;
    const unit = aggregate?.unit ?? primary?.unit ?? ul?.unit ?? null;
    const reasonCodes: string[] = [];

    if (consumedKnown === null) {
      reasonCodes.push("NUTRIENT_INTAKE_UNKNOWN");
      results.push({
        nutrientId,
        consumedKnown: null,
        coverage: nutrientCoverage,
        referenceType:
          primary?.referenceType === "UL"
            ? null
            : (primary?.referenceType ?? null),
        referenceAmount: primary?.amount ?? null,
        referenceUnit: primary?.unit ?? null,
        percentOfReference: null,
        upperLimit: ul?.amount ?? null,
        upperLimitUnit: ul?.unit ?? null,
        upperLimitState: "NOT_AVAILABLE",
        dataStatus:
          primary === null && ul === null ? "NO_REFERENCE" : "UNKNOWN",
        reasonCodes,
        applicableReferences: nutrientReferences,
        versions: {
          adequacyPolicyVersion: ADEQUACY_POLICY_VERSION,
          nutrientReferenceSchemaVersion: NUTRIENT_REFERENCE_SCHEMA_VERSION,
          referenceSourceVersions,
        },
      });
      continue;
    }

    if (nutrientCoverage.ratio < policy.minimumCoverage) {
      reasonCodes.push("NUTRIENT_COVERAGE_BELOW_POLICY");
      results.push({
        nutrientId,
        consumedKnown,
        coverage: nutrientCoverage,
        referenceType:
          primary?.referenceType === "UL"
            ? null
            : (primary?.referenceType ?? null),
        referenceAmount: primary?.amount ?? null,
        referenceUnit: primary?.unit ?? null,
        percentOfReference: null,
        upperLimit: ul?.amount ?? null,
        upperLimitUnit: ul?.unit ?? null,
        upperLimitState: "NOT_AVAILABLE",
        dataStatus: "INCOMPLETE_DATA",
        reasonCodes,
        applicableReferences: nutrientReferences,
        versions: {
          adequacyPolicyVersion: ADEQUACY_POLICY_VERSION,
          nutrientReferenceSchemaVersion: NUTRIENT_REFERENCE_SCHEMA_VERSION,
          referenceSourceVersions,
        },
      });
      continue;
    }

    if (primary === null && ul === null) {
      reasonCodes.push("NO_APPLICABLE_NUTRIENT_REFERENCE");
      results.push({
        nutrientId,
        consumedKnown,
        coverage: nutrientCoverage,
        referenceType: null,
        referenceAmount: null,
        referenceUnit: null,
        percentOfReference: null,
        upperLimit: null,
        upperLimitUnit: null,
        upperLimitState: "NOT_AVAILABLE",
        dataStatus: "NO_REFERENCE",
        reasonCodes,
        applicableReferences: nutrientReferences,
        versions: {
          adequacyPolicyVersion: ADEQUACY_POLICY_VERSION,
          nutrientReferenceSchemaVersion: NUTRIENT_REFERENCE_SCHEMA_VERSION,
          referenceSourceVersions,
        },
      });
      continue;
    }

    if (unit === null) {
      throw new Error(`CONSUMED_UNIT_UNKNOWN:${nutrientId}`);
    }

    assertReferenceUnitCompatible(unit, primary, nutrientId);
    assertReferenceUnitCompatible(unit, ul, nutrientId);

    const percentOfReference =
      primary !== null && primary.amount > 0
        ? (consumedKnown / primary.amount) * 100
        : null;

    const upperLimitState: AdequacyUpperLimitState =
      ul === null
        ? "NOT_AVAILABLE"
        : consumedKnown > ul.amount
          ? "ABOVE"
          : "BELOW_OR_EQUAL";

    results.push({
      nutrientId,
      consumedKnown,
      coverage: nutrientCoverage,
      referenceType:
        primary?.referenceType === "UL"
          ? null
          : (primary?.referenceType ?? null),
      referenceAmount: primary?.amount ?? null,
      referenceUnit: primary?.unit ?? null,
      percentOfReference,
      upperLimit: ul?.amount ?? null,
      upperLimitUnit: ul?.unit ?? null,
      upperLimitState,
      dataStatus: "OK",
      reasonCodes,
      applicableReferences: nutrientReferences,
      versions: {
        adequacyPolicyVersion: ADEQUACY_POLICY_VERSION,
        nutrientReferenceSchemaVersion: NUTRIENT_REFERENCE_SCHEMA_VERSION,
        referenceSourceVersions,
      },
    });
  }

  return results.sort((a, b) =>
    a.nutrientId.localeCompare(b.nutrientId),
  );
}
