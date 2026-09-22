/**
 * Authoritative nutrition resolver for MoveFuel's photo-estimation pipeline.
 *
 * Vision is candidate-only. This resolver compares every plausible visual
 * candidate against trusted nutrition records and selects the strongest JOINT
 * vision + catalogue match. It deliberately abstains when two different food
 * identities remain too close, rather than accepting the first query that
 * happens to resolve.
 *
 * Missing nutrient values remain unresolved; they are never zero-filled.
 */

import type { FoodTypeKind, NutritionSource } from "../algorithm/contracts.ts";
import type { RegionFoodCandidate } from "../vision/candidateProviderAdapter.ts";
import { SourceResolver, type RankedCandidate, type SearchableFood } from "./foodResolver.ts";
import type { Per100gNutrients, FoodSourceResolution } from "../algorithm/imageEstimatePipeline.ts";

export const KNOWLEDGE_NUTRITION_RESOLVER_VERSION = "2.0.0";

export type NutritionRecord = SearchableFood & {
  energyKcal?: number | null;
  proteinG?: number | null;
  carbG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
};

export type KnowledgeNutritionResolverOptions = {
  search: (query: string, limit?: number) => readonly NutritionRecord[];
  reviewedRecipeResolve?: (candidate: RegionFoodCandidate) => { source: NutritionSource; per100g: Partial<Per100gNutrients> } | null;
  /** Minimum joint visual + knowledge score accepted for automatic resolution. */
  minimumJointScore?: number;
  /** Minimum lead over a competing DIFFERENT food identity. */
  minimumJointMargin?: number;
};

type ResolutionProposal = {
  source: NutritionSource;
  per100g: Per100gNutrients;
  candidate: RegionFoodCandidate;
  candidateIndex: number;
  query: string;
  jointScore: number;
  sourceMatchQuality: number;
  matchReasons: readonly string[];
  recipe: boolean;
  preparationLabel: string | null;
  preparationConfidence: number;
};

function finiteNonNegative(value: number | null | undefined): value is number {
  return value !== undefined && value !== null && Number.isFinite(value) && value >= 0;
}

function optionalNutrient(value: number | null | undefined): number | null {
  return finiteNonNegative(value) ? value : null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function completeCore(record: NutritionRecord): Per100gNutrients | null {
  // The current confirmed-meal contract persists energy, protein, carbs, fat
  // and fibre as numbers. Automatic source resolution therefore requires all
  // five; accepting an incomplete row would either dead-end confirmation or
  // silently turn an unknown nutrient into zero. Sodium remains nullable.
  if (
    !finiteNonNegative(record.energyKcal) ||
    !finiteNonNegative(record.proteinG) ||
    !finiteNonNegative(record.carbG) ||
    !finiteNonNegative(record.fatG) ||
    !finiteNonNegative(record.fiberG)
  ) return null;
  return {
    energyKcal: record.energyKcal,
    proteinG: record.proteinG,
    carbG: record.carbG,
    fatG: record.fatG,
    fiberG: record.fiberG,
    sodiumMg: optionalNutrient(record.sodiumMg),
  };
}

function lexicalQuality(candidate: RankedCandidate): number {
  const lexical = candidate.scoreComponents.lexical ?? 0;
  if (candidate.matchReasons.includes("barcode_match") || candidate.matchReasons.includes("exact_name")) return 1;
  if (candidate.matchReasons.includes("name_phrase_match")) return 0.92;
  if (candidate.matchReasons.includes("substring_name")) return 0.84;
  if (candidate.matchReasons.includes("description_match")) return 0.72;
  if (candidate.matchReasons.includes("token_overlap")) return lexical >= 40 ? 0.65 : 0.52;
  return clamp01(lexical / 100);
}

function dataTypeQuality(dataType: SearchableFood["dataType"]): number {
  switch (dataType) {
    case "FOUNDATION": return 1;
    case "FNDDS": return 0.96;
    case "BRANDED": return 0.9;
    case "SR_LEGACY": return 0.82;
    case "REVIEWED_RECIPE_ESTIMATE": return 0.82;
    case "UNREVIEWED_RECIPE_ESTIMATE": return 0.45;
    case "EXPERIMENTAL": return 0.35;
  }
}

function sourceQuality(candidate: RankedCandidate): number {
  const prep = candidate.matchReasons.includes("preparation_conflict")
    ? 0
    : candidate.matchReasons.includes("preparation_match") ? 1 : 0.6;
  return clamp01(
    lexicalQuality(candidate) * 0.72 +
    dataTypeQuality(candidate.food.dataType) * 0.18 +
    prep * 0.10
  );
}

function queryPrior(query: string, candidate: RegionFoodCandidate, preparationLabel: string | null): number {
  const normalized = normalizeIdentity(query);
  const candidateName = normalizeIdentity(candidate.name);
  const preparation = normalizeIdentity(preparationLabel ?? "");
  const primary = normalizeIdentity([candidate.name, preparation].filter(Boolean).join(" "));
  if (preparation && normalized === primary) return 1;
  if (normalized === candidateName) return 0.98;
  return 0.9; // provider-supplied identity alias/search term
}

function jointScore(candidate: RegionFoodCandidate, sourceMatch: number, query: string, preparationConfidence = 0.5, preparationLabel: string | null = null): number {
  return clamp01(
    clamp01(candidate.providerConfidence) * 0.50 +
    sourceMatch * 0.35 +
    clamp01(preparationConfidence) * 0.10 +
    queryPrior(query, candidate, preparationLabel) * 0.05
  );
}

function sameIdentity(a: ResolutionProposal, b: ResolutionProposal): boolean {
  if (a.source.source === "USDA_FDC" && b.source.source === "USDA_FDC" && a.source.fdcId === b.source.fdcId) return true;
  return normalizeIdentity(a.candidate.name) === normalizeIdentity(b.candidate.name);
}

export class KnowledgeNutritionResolver {
  private readonly search: KnowledgeNutritionResolverOptions["search"];
  private readonly reviewedRecipeResolve: KnowledgeNutritionResolverOptions["reviewedRecipeResolve"];
  private readonly minimumJointScore: number;
  private readonly minimumJointMargin: number;

  constructor(options: KnowledgeNutritionResolverOptions) {
    this.search = options.search;
    this.reviewedRecipeResolve = options.reviewedRecipeResolve;
    this.minimumJointScore = clamp01(options.minimumJointScore ?? 0.64);
    this.minimumJointMargin = clamp01(options.minimumJointMargin ?? 0.07);
  }

  resolve(candidates: readonly RegionFoodCandidate[], _itemType: FoodTypeKind): FoodSourceResolution {
    const proposals: ResolutionProposal[] = [];

    for (const [candidateIndex, candidate] of candidates.slice(0, 3).entries()) {
      // Preparation is part of food identity. Evaluate multiple plausible
      // preparation candidates rather than binding the source search to only
      // the provider's first preparation guess.
      const preparationEvidence = candidate.preparationCandidates
        .filter((entry) => entry.label.trim() && Number.isFinite(entry.confidence))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
      const queryEvidence = [
        ...preparationEvidence.map((entry) => ({ query: [candidate.name, entry.label.trim()].join(" "), preparationLabel: entry.label.trim(), preparationConfidence: clamp01(entry.confidence) })),
        { query: candidate.name.trim(), preparationLabel: null, preparationConfidence: preparationEvidence[0]?.confidence ?? 0.5 },
        ...candidate.searchTerms.map((term) => ({ query: term.trim(), preparationLabel: null, preparationConfidence: preparationEvidence[0]?.confidence ?? 0.5 })),
      ].filter((entry) => entry.query);
      const seenQueries = new Set<string>();
      const queries = queryEvidence.filter((entry) => {
        const key = normalizeIdentity(entry.query);
        if (!key || seenQueries.has(key)) return false;
        seenQueries.add(key);
        return true;
      }).slice(0, 8);

      for (const queryEvidenceItem of queries) {
        const query = queryEvidenceItem.query;
        const rows = [...this.search(query, 40)];
        const resolver = new SourceResolver((_searchQuery, limit) => rows.slice(0, limit ?? 20));
        const result = resolver.resolve(query);
        if (result.status !== "RESOLVED") continue;
        const row = rows.find((entry) => entry.fdcId === result.source.fdcId);
        const per100g = row ? completeCore(row) : null;
        if (!per100g) continue;
        const ranked = result.candidates.find((entry) => entry.food.fdcId === result.source.fdcId) ?? result.candidates[0];
        if (!ranked) continue;
        const matchQuality = sourceQuality(ranked);
        proposals.push({
          source: result.source,
          per100g,
          candidate,
          candidateIndex,
          query,
          jointScore: jointScore(candidate, matchQuality, query, queryEvidenceItem.preparationConfidence, queryEvidenceItem.preparationLabel),
          sourceMatchQuality: matchQuality,
          matchReasons: ranked.matchReasons,
          recipe: false,
          preparationLabel: queryEvidenceItem.preparationLabel,
          preparationConfidence: queryEvidenceItem.preparationConfidence,
        });
      }

      const recipe = this.reviewedRecipeResolve?.(candidate) ?? null;
      if (recipe) {
        const per100g = recipe.per100g;
        if (finiteNonNegative(per100g.energyKcal) && finiteNonNegative(per100g.proteinG)) {
          const sourceMatchQuality = recipe.source.dataType === "REVIEWED_RECIPE_ESTIMATE" ? 0.82 : 0.55;
          const complete: Per100gNutrients = {
            energyKcal: per100g.energyKcal,
            proteinG: per100g.proteinG,
            carbG: optionalNutrient(per100g.carbG),
            fatG: optionalNutrient(per100g.fatG),
            fiberG: optionalNutrient(per100g.fiberG),
            sodiumMg: optionalNutrient(per100g.sodiumMg),
          };
          proposals.push({
            source: recipe.source,
            per100g: complete,
            candidate,
            candidateIndex,
            query: candidate.name,
            jointScore: jointScore(candidate, sourceMatchQuality, candidate.name, candidate.preparationCandidates[0]?.confidence ?? 0.5, candidate.preparationCandidates[0]?.label ?? null),
            sourceMatchQuality,
            matchReasons: ["reviewed_recipe"],
            recipe: true,
            preparationLabel: candidate.preparationCandidates[0]?.label ?? null,
            preparationConfidence: candidate.preparationCandidates[0]?.confidence ?? 0.5,
          });
        }
      }
    }

    if (proposals.length === 0) return { source: null, matchQuality: 0, resolutionConfidence: 0 };

    // Deduplicate repeated aliases resolving to the same source/candidate, keeping
    // only the strongest joint proposal.
    const deduped = new Map<string, ResolutionProposal>();
    for (const proposal of proposals) {
      const sourceKey = proposal.source.source === "USDA_FDC"
        ? `fdc:${proposal.source.fdcId}`
        : `recipe:${proposal.source.recipeRevisionId ?? proposal.source.description}`;
      const key = `${proposal.candidateIndex}:${sourceKey}`;
      const previous = deduped.get(key);
      if (!previous || proposal.jointScore > previous.jointScore) deduped.set(key, proposal);
    }
    const ranked = [...deduped.values()].sort((a, b) => b.jointScore - a.jointScore || b.sourceMatchQuality - a.sourceMatchQuality || a.candidateIndex - b.candidateIndex);
    const selected = ranked[0]!;
    if (selected.jointScore < this.minimumJointScore) {
      return { source: null, matchQuality: selected.sourceMatchQuality, resolutionConfidence: selected.jointScore };
    }

    const competing = ranked.find((proposal) => !sameIdentity(selected, proposal));
    if (competing && selected.jointScore - competing.jointScore < this.minimumJointMargin) {
      return {
        source: null,
        matchQuality: selected.sourceMatchQuality,
        resolutionConfidence: selected.jointScore,
        resolutionWarnings: ["food identity remains ambiguous across visual and nutrition-source candidates"],
      };
    }

    return {
      source: selected.source,
      per100g: selected.per100g,
      matchQuality: selected.sourceMatchQuality,
      resolutionConfidence: selected.jointScore,
      resolvedCandidateIndex: selected.candidateIndex,
      resolutionQuery: selected.query,
      resolutionWarnings: selected.matchReasons.includes("preparation_conflict") ? ["nutrition source preparation conflicts with the visual preparation candidate"] : [],
      resolvedPreparation: selected.preparationLabel ? { label: selected.preparationLabel, confidence: selected.preparationConfidence } : null,
    };
  }
}
