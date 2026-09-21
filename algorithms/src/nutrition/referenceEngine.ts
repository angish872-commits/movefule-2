import type { CanonicalNutrientId } from "./nutrientRegistry";
import type { NutrientUnit } from "./nutrientCalculator";
import type { DailyNutrientAggregate } from "./dailyNutrientAggregator";

export type NutrientReferenceType = "RDA" | "AI" | "EAR" | "UL" | "AMDR";

export type ReferenceCategory =
  | "GENERAL"
  | "MALE"
  | "FEMALE"
  | "PREGNANCY"
  | "LACTATION";

export interface NutrientReference {
  nutrientId: CanonicalNutrientId;
  referenceType: NutrientReferenceType;
  amount: number;
  unit: NutrientUnit;
  ageMinYears: number;
  ageMaxYears: number;
  applicableCategory: ReferenceCategory;
  source: string;
  sourceVersion: string;
}

export interface ReferenceProfile {
  ageYears: number;
  applicableCategory: ReferenceCategory;
}

export type NutrientDataStatus =
  | "OK"
  | "INCOMPLETE_DATA"
  | "UNKNOWN"
  | "NO_REFERENCE";

export type UpperLimitStatus =
  | "NOT_AVAILABLE"
  | "BELOW_OR_EQUAL"
  | "ABOVE";

export interface NutrientReferenceAssessment {
  nutrientId: CanonicalNutrientId;
  consumedKnown: number | null;
  unit: NutrientUnit | null;
  entryCoverage: number;
  dataStatus: NutrientDataStatus;
  primaryReference: NutrientReference | null;
  percentOfReference: number | null;
  upperLimit: NutrientReference | null;
  upperLimitStatus: UpperLimitStatus;
}

function applies(
  reference: NutrientReference,
  profile: ReferenceProfile,
): boolean {
  const ageMatches =
    profile.ageYears >= reference.ageMinYears &&
    profile.ageYears <= reference.ageMaxYears;

  const categoryMatches =
    reference.applicableCategory === "GENERAL" ||
    reference.applicableCategory === profile.applicableCategory;

  return ageMatches && categoryMatches;
}

function primaryReference(
  references: readonly NutrientReference[],
): NutrientReference | null {
  // RDA/AI are individual-facing reference values. EAR and AMDR are retained
  // as distinct metadata and must not be silently presented as the same thing.
  return references.find((reference) => reference.referenceType === "RDA") ??
    references.find((reference) => reference.referenceType === "AI") ??
    null;
}

export function selectNutrientReferences(
  profile: ReferenceProfile,
  references: readonly NutrientReference[],
): readonly NutrientReference[] {
  if (
    !Number.isFinite(profile.ageYears) ||
    profile.ageYears < 0
  ) {
    return [];
  }

  return references.filter((reference) => applies(reference, profile));
}

/**
 * Evaluates consumed nutrient facts against versioned references.
 *
 * minimumCoverage is a product/data-quality setting supplied by the caller.
 * The engine intentionally does not hard-code a threshold and never claims
 * adequacy from incomplete data.
 */
export function evaluateNutrientReferences(
  profile: ReferenceProfile,
  aggregate: readonly DailyNutrientAggregate[],
  references: readonly NutrientReference[],
  minimumCoverage: number,
): readonly NutrientReferenceAssessment[] {
  if (
    !Number.isFinite(minimumCoverage) ||
    minimumCoverage < 0 ||
    minimumCoverage > 1
  ) {
    throw new Error("minimumCoverage must be between 0 and 1");
  }

  const applicable = selectNutrientReferences(profile, references);
  const ids = new Set<CanonicalNutrientId>([
    ...aggregate.map((value) => value.nutrientId),
    ...applicable.map((reference) => reference.nutrientId),
  ]);

  const output: NutrientReferenceAssessment[] = [];

  for (const nutrientId of ids) {
    const consumed = aggregate.find(
      (value) => value.nutrientId === nutrientId,
    ) ?? null;

    const nutrientReferences = applicable.filter(
      (reference) => reference.nutrientId === nutrientId,
    );

    const primary = primaryReference(nutrientReferences);
    const ul =
      nutrientReferences.find(
        (reference) => reference.referenceType === "UL",
      ) ?? null;

    if (consumed === null || consumed.knownAmount === null) {
      output.push({
        nutrientId,
        consumedKnown: null,
        unit: consumed?.unit ?? primary?.unit ?? ul?.unit ?? null,
        entryCoverage: consumed?.entryCoverage ?? 0,
        dataStatus:
          primary === null && ul === null ? "NO_REFERENCE" : "UNKNOWN",
        primaryReference: primary,
        percentOfReference: null,
        upperLimit: ul,
        upperLimitStatus: "NOT_AVAILABLE",
      });
      continue;
    }

    if (consumed.entryCoverage < minimumCoverage) {
      output.push({
        nutrientId,
        consumedKnown: consumed.knownAmount,
        unit: consumed.unit,
        entryCoverage: consumed.entryCoverage,
        dataStatus: "INCOMPLETE_DATA",
        primaryReference: primary,
        percentOfReference: null,
        upperLimit: ul,
        upperLimitStatus: "NOT_AVAILABLE",
      });
      continue;
    }

    const percentOfReference =
      primary !== null &&
      primary.unit === consumed.unit &&
      primary.amount > 0
        ? (consumed.knownAmount / primary.amount) * 100
        : null;

    const upperLimitStatus: UpperLimitStatus =
      ul === null || ul.unit !== consumed.unit
        ? "NOT_AVAILABLE"
        : consumed.knownAmount > ul.amount
          ? "ABOVE"
          : "BELOW_OR_EQUAL";

    output.push({
      nutrientId,
      consumedKnown: consumed.knownAmount,
      unit: consumed.unit,
      entryCoverage: consumed.entryCoverage,
      dataStatus:
        primary === null && ul === null ? "NO_REFERENCE" : "OK",
      primaryReference: primary,
      percentOfReference,
      upperLimit: ul,
      upperLimitStatus,
    });
  }

  return output.sort((a, b) =>
    a.nutrientId.localeCompare(b.nutrientId),
  );
}
