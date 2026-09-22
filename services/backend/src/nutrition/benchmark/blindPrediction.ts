/** Blind-benchmark output helpers. These functions never accept ground truth. */
import type { ImageEstimateResult, NutrientSet } from "../algorithm/imageEstimatePipeline.ts";

export const BLIND_PREDICTION_SCHEMA_VERSION = "movefuel-blind-prediction-v6-1" as const;

export type BlindPredictionRow = {
  sample_id: string;
  category: string;
  predicted_min_g: number;
  predicted_central_g: number;
  predicted_max_g: number;
  predicted_min_kcal: number;
  predicted_central_kcal: number;
  predicted_max_kcal: number;
  predicted_min_protein_g: number | null;
  predicted_central_protein_g: number | null;
  predicted_max_protein_g: number | null;
  predicted_min_carb_g: number | null;
  predicted_central_carb_g: number | null;
  predicted_max_carb_g: number | null;
  predicted_min_fat_g: number | null;
  predicted_central_fat_g: number | null;
  predicted_max_fat_g: number | null;
  prediction_state: string;
  algorithm_version: string;
  model_version: string;
};

function sumRequired(values: readonly (number | null | undefined)[]): number | null {
  let total = 0;
  for (const value of values) {
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    total += value;
  }
  return total;
}

function nutrientTotals(items: readonly { nutrients: NutrientSet | null }[], key: keyof NutrientSet): [number | null, number | null, number | null] {
  const ranges = items.map((item) => item.nutrients?.[key]);
  return [
    sumRequired(ranges.map((range) => range?.minimum)),
    sumRequired(ranges.map((range) => range?.central)),
    sumRequired(ranges.map((range) => range?.maximum)),
  ];
}

export function blindPredictionFromEstimate(input: {
  sampleId: string;
  category: string;
  result: ImageEstimateResult;
  algorithmVersion: string;
  modelVersion: string;
}): BlindPredictionRow | null {
  const items = input.result.items;
  if (items.length === 0) return null;
  if (items.some((item) => item.portion === null || item.portion.confidence === "INSUFFICIENT")) return null;
  const minG = sumRequired(items.map((item) => item.portion?.minimumGrams));
  const centralG = sumRequired(items.map((item) => item.portion?.centralGrams));
  const maxG = sumRequired(items.map((item) => item.portion?.maximumGrams));
  const [minKcal, centralKcal, maxKcal] = nutrientTotals(items, "energyKcal");
  if (minG === null || centralG === null || maxG === null || minKcal === null || centralKcal === null || maxKcal === null) return null;
  const protein = nutrientTotals(items, "proteinG");
  const carb = nutrientTotals(items, "carbG");
  const fat = nutrientTotals(items, "fatG");
  return {
    sample_id: input.sampleId,
    category: input.category,
    predicted_min_g: minG,
    predicted_central_g: centralG,
    predicted_max_g: maxG,
    predicted_min_kcal: minKcal,
    predicted_central_kcal: centralKcal,
    predicted_max_kcal: maxKcal,
    predicted_min_protein_g: protein[0],
    predicted_central_protein_g: protein[1],
    predicted_max_protein_g: protein[2],
    predicted_min_carb_g: carb[0],
    predicted_central_carb_g: carb[1],
    predicted_max_carb_g: carb[2],
    predicted_min_fat_g: fat[0],
    predicted_central_fat_g: fat[1],
    predicted_max_fat_g: fat[2],
    prediction_state: input.result.state,
    algorithm_version: input.algorithmVersion,
    model_version: input.modelVersion,
  };
}
