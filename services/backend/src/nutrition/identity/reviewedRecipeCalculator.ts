/**
 * Deterministic reviewed-recipe calculator (TypeScript port of the Python RecipeCalculator).
 *
 * Resolves a regional recipe against FDC nutrient rows to produce a
 * deterministic per-100g estimate and a full NutritionSource. Mirrors the
 * Python implementation so both produce identical numbers given the same
 * inputs.
 */

import type { NutritionSource, FoodDataType, NutrientRange } from "../algorithm/contracts.ts";
import { normalizeNutrientRows, type CanonicalNutrientName } from "../nutrients/nutrientNormalizer.ts";
import { calculateNutrientRange } from "../nutrients/nutrientCalculator.ts";

export type RecipeIngredientInput = {
  fdcId: number;
  name: string;
  rawGrams: number;
  /** Optional override of the FDC nutrient rows for the ingredient. */
  nutrientRows?: readonly { nutrientId: number; amount: number; basisGrams?: number }[];
};

export type RecipeInput = {
  recipeId: string;
  name: string;
  aliases?: readonly string[];
  regionTags?: readonly string[];
  ingredients: readonly RecipeIngredientInput[];
  cookingMethod?: string;
  addedWaterGrams?: number;
  addedOilGheeGrams?: number;
  finalCookedWeightGrams?: number;
  servings?: number;
  reviewerStatus?: "REVIEWED_RECIPE_ESTIMATE" | "UNREVIEWED_RECIPE_ESTIMATE";
  evidence?: string;
  minimumVariantMultiplier?: number;
  maximumVariantMultiplier?: number;
};

export type RecipePortion = {
  pieces: number;
  minimumGrams: number;
  centralGrams: number;
  maximumGrams: number;
};

export type ResolvedIngredient = {
  fdcId: number;
  name: string;
  rawGrams: number;
  /** False when no FDC nutrient rows resolved for this ingredient. */
  matched: boolean;
};

export type RecipeResolved = {
  recipeId: string;
  name: string;
  source: NutritionSource;
  ingredients: readonly ResolvedIngredient[];
  /** Whole-recipe totals (grams units scaled by raw grams, before dividing by cooked weight). */
  totals: Partial<Record<CanonicalNutrientName, number>>;
  per100g: Partial<Record<CanonicalNutrientName, number>>;
  servings: number;
  finalCookedWeightGrams: number | null;
  portionPerServing: RecipePortion;
  evidence: string;
};

export type IngredientNutrientProvider = (fdcId: number) => readonly {
  nutrientId: number;
  amount: number;
  basisGrams?: number;
}[];

export class ReviewedRecipeCalculator {
  private readonly ingredientNutrients: IngredientNutrientProvider;

  constructor(ingredientNutrients: IngredientNutrientProvider) {
    this.ingredientNutrients = ingredientNutrients;
  }

  resolve(input: RecipeInput): RecipeResolved {
    // Python parity: total_weight = sum(raw_grams) + added_water_grams.
    // added_oil_ghee_grams is NOT added to weight (parity with Python);
    // oil/ghee nutrients enter only via an explicit ingredient row.
    const totalWeight =
      input.ingredients.reduce((sum, ingredient) => sum + ingredient.rawGrams, 0) +
      (input.addedWaterGrams ?? 0);

    const totals: Partial<Record<CanonicalNutrientName, number>> = {};
    const ingredients: ResolvedIngredient[] = [];
    for (const ingredient of input.ingredients) {
      const rows = ingredient.nutrientRows ?? this.ingredientNutrients(ingredient.fdcId);
      const normalized = normalizeNutrientRows(rows);
      ingredients.push({ fdcId: ingredient.fdcId, name: ingredient.name, rawGrams: ingredient.rawGrams, matched: Object.keys(normalized).length > 0 });
      // Python parity: total_nutrients[id] += amount_per_100 * raw_grams / 100.0
      for (const [name, basis] of Object.entries(normalized) as Array<
        [CanonicalNutrientName, { amount: number; basisGrams: number }]
      >) {
        totals[name] = (totals[name] ?? 0) + (basis.amount * ingredient.rawGrams) / basis.basisGrams;
      }
    }

    const base = input.finalCookedWeightGrams ?? totalWeight;
    if (base <= 0) {
      throw new Error(`recipe ${input.recipeId}: final weight must be positive.`);
    }

    const per100g: Partial<Record<CanonicalNutrientName, number>> = {};
    for (const [name, amount] of Object.entries(totals) as Array<[CanonicalNutrientName, number]>) {
      // Python parity: amount / base * 100.0
      per100g[name] = (amount / base) * 100;
    }

    const portionPerServing = this.portionPerServing(input, base);
    return {
      recipeId: input.recipeId,
      name: input.name,
      source: {
        source: "MOVEFUEL_RECIPE",
        fdcId: null,
        recipeRevisionId: input.recipeId,
        dataType: input.reviewerStatus ?? "UNREVIEWED_RECIPE_ESTIMATE",
        description: input.name,
      },
      ingredients,
      totals,
      per100g,
      servings: input.servings ?? 1,
      finalCookedWeightGrams: input.finalCookedWeightGrams ?? null,
      portionPerServing,
      evidence: input.evidence ?? "",
    };
  }

  /** Min/central/max grams for one serving based on cooked weight per serving. */
  private portionPerServing(input: RecipeInput, cookedWeightGrams: number): RecipePortion {
    const servings = input.servings ?? 1;
    const central = cookedWeightGrams / servings;
    const minMultiplier = input.minimumVariantMultiplier ?? 0.85;
    const maxMultiplier = input.maximumVariantMultiplier ?? 1.2;
    return {
      pieces: 1,
      minimumGrams: central * minMultiplier,
      centralGrams: central,
      maximumGrams: central * maxMultiplier,
    };
  }
}

/** Scale a per-100g profile by a portion to get min/central/max nutrients. */
export function recipeNutrientRange(
  per100g: Partial<Record<CanonicalNutrientName, number>>,
  portionGrams: { minimumGrams: number; centralGrams: number; maximumGrams: number },
  name: CanonicalNutrientName,
): NutrientRange {
  const per100 = per100g[name];
  if (per100 === undefined) return { minimum: null, central: null, maximum: null };
  return calculateNutrientRange(
    { amount: per100, unit: name === "energyKcal" ? "kcal" : name === "sodiumMg" ? "mg" : "g", basisGrams: 100 },
    portionGrams,
  );
}
