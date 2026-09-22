/**
 * Food-source resolver and source-ranking policy (versioned).
 *
 * Resolves a food search against the FDC catalogue using a configurable,
 * versioned ranking policy. A high-quality database type is never sufficient
 * on its own: text queries must have a meaningful lexical match (or an exact
 * barcode match) before a source can be accepted. Ambiguous top results are
 * deliberately returned for user review instead of being silently guessed.
 */

import {
  type FoodDataType,
  type NutritionSource,
  nutritionSourceUnresolved,
} from "../algorithm/contracts.ts";

export type SourceRankingConfig = {
  version: number;
  /** Weight per ranking factor; configuration, not scientific fact. */
  weights: {
    lexical: number;
    dataTypeSuitability: number;
    barcode: number;
    preparation: number;
  };
  /** Minimum weighted lexical evidence for a non-barcode text resolution. */
  minimumLexicalScore?: number;
  /** Minimum total score for an accepted resolution. */
  minimumTotalScore?: number;
  /** Require this margin over #2 unless the match is exact or preferred type is explicit. */
  minimumTopMargin?: number;
};

export const DEFAULT_RANKING_CONFIG: SourceRankingConfig = {
  version: 2,
  weights: {
    lexical: 1.0,
    dataTypeSuitability: 0.6,
    barcode: 1.5,
    preparation: 0.4,
  },
  minimumLexicalScore: 40,
  minimumTotalScore: 70,
  minimumTopMargin: 8,
};

export type SearchableFood = {
  fdcId: number;
  dataType: FoodDataType;
  description: string;
  normalizedName: string;
  gtinUpc?: string;
  brandName?: string;
  /** Portion gram weights, when available. */
  portionGramWeights?: readonly number[];
  /** Nutrient ids present in this record. */
  nutrientIds?: readonly number[];
  /** Published date (ISO). */
  publicationDate?: string;
};

export type RankedCandidate = {
  food: SearchableFood;
  score: number;
  scoreComponents: Record<string, number>;
  matchReasons: readonly string[];
};

export type ResolverResult =
  | { status: "RESOLVED"; source: NutritionSource; candidates: readonly RankedCandidate[] }
  | { status: "NEEDS_USER_REVIEW"; reason: "NUTRITION_SOURCE_NOT_RESOLVED"; candidates: readonly RankedCandidate[] };

const normalizeText = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ");

const tokens = (value: string): string[] => normalizeText(value).split(" ").filter(Boolean);

const tokenOverlap = (query: string, candidate: string): number => {
  const queryTokens = new Set(tokens(query));
  const candidateTokens = new Set(tokens(candidate));
  if (queryTokens.size === 0 || candidateTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of queryTokens) if (candidateTokens.has(token)) intersection += 1;
  return intersection / queryTokens.size;
};

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

const PREPARATION_TERMS = ["cooked", "raw", "steamed", "fried", "boiled", "baked", "roasted"] as const;

export class SourceResolver {
  private readonly search: (query: string, limit?: number) => SearchableFood[];
  private readonly config: SourceRankingConfig;

  constructor(search: (query: string, limit?: number) => SearchableFood[], config: SourceRankingConfig = DEFAULT_RANKING_CONFIG) {
    this.search = search;
    this.config = config;
  }

  /** Direct barcode/GTIN lookup takes priority (Branded Foods). */
  resolveByBarcode(gtin: string): NutritionSource | null {
    const normalized = digitsOnly(gtin);
    if (!normalized) return null;
    const candidates = this.search(gtin, 5);
    const exact = candidates.find((food) => food.gtinUpc && digitsOnly(food.gtinUpc) === normalized);
    if (!exact) return null;
    return {
      source: "USDA_FDC",
      fdcId: exact.fdcId,
      recipeRevisionId: null,
      dataType: exact.dataType,
      description: exact.description,
    };
  }

  /** Rank candidates for a text query. Unrelated database-quality rows are excluded. */
  rank(query: string, limit = 20): RankedCandidate[] {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];
    const foods = this.search(query, limit * 3);
    return foods
      .map((food) => this.scoreFood(food, query))
      .filter((candidate) => (candidate.scoreComponents.lexical ?? 0) > 0 || (candidate.scoreComponents.barcode ?? 0) > 0)
      .sort((a, b) => b.score - a.score || a.food.fdcId - b.food.fdcId)
      .slice(0, limit);
  }

  /** Resolve with a preferred data type; otherwise reject ambiguous or weak matches. */
  resolve(query: string, preferredDataType?: FoodDataType): ResolverResult {
    const ranked = this.rank(query, 20);
    if (ranked.length === 0) return this.needsReview(ranked);

    const preferred = preferredDataType
      ? ranked.find((candidate) => candidate.food.dataType === preferredDataType)
      : undefined;
    const selected = preferred ?? ranked[0]!;

    const lexical = selected.scoreComponents.lexical ?? 0;
    const barcode = selected.scoreComponents.barcode ?? 0;
    const minimumLexical = this.config.minimumLexicalScore ?? 40;
    const minimumTotal = this.config.minimumTotalScore ?? 70;
    if (barcode <= 0 && lexical < minimumLexical) return this.needsReview(ranked);
    if (selected.score < minimumTotal) return this.needsReview(ranked);

    const exact = selected.matchReasons.includes("exact_name") || selected.matchReasons.includes("barcode_match");
    if (!preferredDataType && !exact && ranked.length > 1) {
      const margin = selected.score - ranked[1]!.score;
      if (margin < (this.config.minimumTopMargin ?? 8)) return this.needsReview(ranked);
    }

    return {
      status: "RESOLVED",
      source: {
        source: "USDA_FDC",
        fdcId: selected.food.fdcId,
        recipeRevisionId: null,
        dataType: selected.food.dataType,
        description: selected.food.description,
      },
      candidates: ranked,
    };
  }

  /** Return the structured unresolved result for a failed lookup. */
  unresolved(): ReturnType<typeof nutritionSourceUnresolved> {
    return nutritionSourceUnresolved();
  }

  private needsReview(candidates: readonly RankedCandidate[]): ResolverResult {
    return { status: "NEEDS_USER_REVIEW", reason: "NUTRITION_SOURCE_NOT_RESOLVED", candidates };
  }

  private scoreFood(food: SearchableFood, query: string): RankedCandidate {
    const normalizedQuery = normalizeText(query);
    const normalizedName = normalizeText(food.normalizedName);
    const normalizedDescription = normalizeText(food.description);
    const components: Record<string, number> = {};
    const reasons: string[] = [];

    if (normalizedName === normalizedQuery) {
      components.lexical = 100 * this.config.weights.lexical;
      reasons.push("exact_name");
    } else if (normalizedName.startsWith(`${normalizedQuery} `) || normalizedName.includes(` ${normalizedQuery} `) || normalizedName.endsWith(` ${normalizedQuery}`)) {
      components.lexical = 70 * this.config.weights.lexical;
      reasons.push("name_phrase_match");
    } else if (normalizedName.includes(normalizedQuery)) {
      components.lexical = 60 * this.config.weights.lexical;
      reasons.push("substring_name");
    } else if (normalizedDescription.includes(normalizedQuery)) {
      components.lexical = 45 * this.config.weights.lexical;
      reasons.push("description_match");
    } else {
      const overlap = Math.max(tokenOverlap(normalizedQuery, normalizedName), tokenOverlap(normalizedQuery, normalizedDescription));
      components.lexical = overlap >= 0.75 ? 40 * this.config.weights.lexical : overlap >= 0.5 ? 25 * this.config.weights.lexical : 0;
      if (components.lexical > 0) reasons.push("token_overlap");
    }

    const suitability: Record<FoodDataType, number> = {
      BRANDED: 50,
      FOUNDATION: 90,
      FNDDS: 85,
      SR_LEGACY: 50,
      EXPERIMENTAL: 10,
      REVIEWED_RECIPE_ESTIMATE: 60,
      UNREVIEWED_RECIPE_ESTIMATE: 20,
    };
    components.dataTypeSuitability = suitability[food.dataType] * this.config.weights.dataTypeSuitability;

    const normalizedBarcodeQuery = digitsOnly(normalizedQuery);
    if (food.gtinUpc && normalizedBarcodeQuery.length >= 8 && digitsOnly(food.gtinUpc) === normalizedBarcodeQuery) {
      components.barcode = 100 * this.config.weights.barcode;
      reasons.push("barcode_match");
    } else {
      components.barcode = 0;
    }

    const queryPrep = PREPARATION_TERMS.find((term) => tokens(normalizedQuery).includes(term));
    const foodPrep = PREPARATION_TERMS.find((term) => tokens(normalizedDescription).includes(term));
    if (queryPrep && foodPrep === queryPrep) {
      components.preparation = 30 * this.config.weights.preparation;
      reasons.push("preparation_match");
    } else if (queryPrep && foodPrep && foodPrep !== queryPrep) {
      components.preparation = -30 * this.config.weights.preparation;
      reasons.push("preparation_conflict");
    } else {
      components.preparation = 0;
    }

    const score = components.lexical + components.dataTypeSuitability + components.barcode + components.preparation;
    return { food, score, scoreComponents: components, matchReasons: reasons };
  }
}
