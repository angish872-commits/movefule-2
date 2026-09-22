import type { DataQuality, FoodIdentity } from "../../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

export type RegionalAliasRecord = {
  canonicalName: string;
  aliases: readonly string[];
  countryCodes: readonly string[];
  regionCodes: readonly string[];
  languageTags: readonly string[];
  sourceReference: string;
  sourceRevision: string;
};

export type RegionalIdentityContext = {
  profileCountryCode: string | null;
  currentRegionCode: string | null;
  languageTag: string | null;
};

export type RegionalIdentityMatch = {
  identity: FoodIdentity;
  matchedAlias: string;
  /** Identity context only; never nutrient provenance. */
  nutrientAuthority: false;
};

const normalize = (value: string): string => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

/**
 * Deterministically resolves reviewed regional aliases. Region is a ranking
 * hint only and cannot imply dietary/religious restrictions or nutrient truth.
 */
export function resolveRegionalIdentity(
  query: string,
  records: readonly RegionalAliasRecord[],
  context: RegionalIdentityContext,
): RegionalIdentityMatch | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;
  const candidates = records.flatMap((record) => {
    const names = [record.canonicalName, ...record.aliases];
    const matchedAlias = names.find((name) => normalize(name) === normalizedQuery);
    if (!matchedAlias || !record.sourceReference.trim() || !record.sourceRevision.trim()) return [];
    const countryBoost = context.profileCountryCode && record.countryCodes.includes(context.profileCountryCode) ? 2 : 0;
    const regionBoost = context.currentRegionCode && record.regionCodes.includes(context.currentRegionCode) ? 3 : 0;
    const languageBoost = context.languageTag && record.languageTags.includes(context.languageTag) ? 1 : 0;
    return [{ record, matchedAlias, score: 10 + countryBoost + regionBoost + languageBoost }];
  });
  candidates.sort((a, b) => b.score - a.score || a.record.canonicalName.localeCompare(b.record.canonicalName) || a.record.sourceReference.localeCompare(b.record.sourceReference));
  const winner = candidates[0];
  if (!winner) return null;
  const confidence: DataQuality = winner.score >= 15 ? "HIGH" : winner.score >= 12 ? "MEDIUM" : "LOW";
  return {
    identity: {
      schemaVersion: 1,
      identityId: `regional:${winner.record.sourceReference}:${winner.record.sourceRevision}:${normalize(winner.record.canonicalName).replace(/[^a-z0-9]+/g, "-")}`,
      canonicalName: winner.record.canonicalName,
      preparationCode: null,
      sourceType: "REGIONAL_REVIEWED_ALIAS",
      sourceReference: `${winner.record.sourceReference}@${winner.record.sourceRevision}`,
      aliasCodes: [...winner.record.aliases],
      confidence,
      reasonCodes: ["REVIEWED_ALIAS_MATCH", ...(context.currentRegionCode && winner.record.regionCodes.includes(context.currentRegionCode) ? ["CURRENT_REGION_MATCH"] : [])],
    },
    matchedAlias: winner.matchedAlias,
    nutrientAuthority: false,
  };
}
