/**
 * Leak-resistant helpers for blind algorithm execution.
 *
 * This module accepts only inference-time fields. Ground-truth meal mass,
 * calories, macros, food labels and ingredient lists are deliberately absent.
 */
import type { RegionFoodCandidate } from "../vision/candidateProviderAdapter.ts";
import type { FoodSourceResolution } from "../algorithm/imageEstimatePipeline.ts";
import type { NutritionRecord } from "../identity/knowledgeNutritionResolver.ts";
import { productionDensityRangeForFdcId, productionDensityRangeForRecipeRevisionId, type KnowledgeSnapshot } from "../identity/knowledgeSnapshot.ts";
import type { DensityRange } from "../portion/densityLibrary.ts";

export const BLIND_INFERENCE_MANIFEST_SCHEMA = "movefuel-blind-inference-manifest-v1" as const;

export type BlindInferenceSample = {
  sample_id: string;
  category: string;
  image_path: string;
  mime_type: string;
  width_px: number;
  height_px: number;
  checksum: string | null;
  dataset: string;
  dish_id: string | null;
};

export type BlindInferenceManifest = {
  schema: typeof BLIND_INFERENCE_MANIFEST_SCHEMA;
  sample_count: number;
  samples: readonly BlindInferenceSample[];
};

const ALLOWED_SAMPLE_KEYS = new Set([
  "sample_id", "category", "image_path", "mime_type", "width_px", "height_px",
  "checksum", "dataset", "dish_id",
]);
const FORBIDDEN_KEY = /^(?:actual|true|ground[_-]?truth|label|food[_-]?label|ingredient|ingredients|calorie|calories|kcal|protein|carb|fat|mass|grams?|weight)(?:$|[_-])/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Parse a manifest and fail closed on unapproved fields that could leak answers. */
export function parseBlindInferenceManifest(value: unknown): BlindInferenceManifest {
  const doc = record(value);
  if (!doc || doc.schema !== BLIND_INFERENCE_MANIFEST_SCHEMA || !Array.isArray(doc.samples)) {
    throw new Error("invalid_blind_inference_manifest");
  }
  const samples: BlindInferenceSample[] = [];
  const seen = new Set<string>();
  for (const raw of doc.samples) {
    const row = record(raw);
    if (!row) throw new Error("invalid_blind_inference_sample");
    const unknown = Object.keys(row).filter((key) => !ALLOWED_SAMPLE_KEYS.has(key));
    if (unknown.length > 0) {
      const leaked = unknown.filter((key) => FORBIDDEN_KEY.test(key));
      throw new Error(leaked.length > 0
        ? `blind_inference_ground_truth_field_rejected:${leaked.join(",")}`
        : `blind_inference_unapproved_field_rejected:${unknown.join(",")}`);
    }
    const sampleId = typeof row.sample_id === "string" ? row.sample_id.trim() : "";
    const category = typeof row.category === "string" && row.category.trim() ? row.category.trim() : "global";
    const imagePath = typeof row.image_path === "string" ? row.image_path.trim() : "";
    const mimeType = typeof row.mime_type === "string" ? row.mime_type.trim() : "";
    const width = Number(row.width_px);
    const height = Number(row.height_px);
    const checksum = row.checksum === null || row.checksum === undefined ? null : String(row.checksum).trim();
    const dataset = typeof row.dataset === "string" ? row.dataset.trim() : "";
    const dishId = row.dish_id === null || row.dish_id === undefined ? null : String(row.dish_id).trim();
    if (!sampleId || seen.has(sampleId)) throw new Error("blank_or_duplicate_blind_sample_id");
    if (!imagePath || !mimeType || !Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0 || !dataset) {
      throw new Error(`${sampleId}:invalid_blind_inference_fields`);
    }
    seen.add(sampleId);
    samples.push({ sample_id: sampleId, category, image_path: imagePath, mime_type: mimeType, width_px: width, height_px: height, checksum, dataset, dish_id: dishId });
  }
  const declared = Number(doc.sample_count);
  if (!Number.isInteger(declared) || declared !== samples.length) throw new Error("blind_manifest_sample_count_mismatch");
  return { schema: BLIND_INFERENCE_MANIFEST_SCHEMA, sample_count: samples.length, samples };
}

/** Exact query order used by KnowledgeNutritionResolver; useful for prefetching a synchronous catalogue. */
export function candidateNutritionQueries(candidates: readonly RegionFoodCandidate[]): string[] {
  const out: string[] = [];
  for (const candidate of candidates.slice(0, 3)) {
    const prep = candidate.preparationCandidates[0]?.label?.trim();
    for (const query of [
      [candidate.name, prep].filter(Boolean).join(" "),
      candidate.name.trim(),
      ...candidate.searchTerms.map((term) => term.trim()).filter(Boolean),
    ]) {
      if (query && !out.some((existing) => existing.toLowerCase() === query.toLowerCase())) out.push(query);
    }
  }
  return out.slice(0, 18);
}

export type RuntimeLookupDocument = {
  schema?: string;
  results?: Record<string, readonly NutritionRecord[]>;
};

/** Build a case-insensitive query->records map from the bounded bulk-catalogue helper. */
export function nutritionLookupIndex(doc: RuntimeLookupDocument): Map<string, readonly NutritionRecord[]> {
  const map = new Map<string, readonly NutritionRecord[]>();
  for (const [query, rows] of Object.entries(doc.results ?? {})) {
    if (!Array.isArray(rows)) continue;
    map.set(query.trim().toLowerCase(), rows);
  }
  return map;
}

export function nutritionSearchFromIndex(index: ReadonlyMap<string, readonly NutritionRecord[]>): (query: string, limit?: number) => readonly NutritionRecord[] {
  return (query, limit = 40) => [...(index.get(query.trim().toLowerCase()) ?? [])].slice(0, limit);
}

/** Density is admissible only when tied to the exact source already selected for nutrition. */
export function sourceBoundDensityResolver(snapshot: KnowledgeSnapshot | null): (resolved: FoodSourceResolution) => DensityRange | null {
  return (resolved) => {
    if (!snapshot || !resolved.source) return null;
    if (resolved.source.source === "USDA_FDC" && resolved.source.fdcId !== null) {
      return productionDensityRangeForFdcId(snapshot, resolved.source.fdcId);
    }
    if (resolved.source.source === "MOVEFUEL_RECIPE" && resolved.source.recipeRevisionId) {
      return productionDensityRangeForRecipeRevisionId(snapshot, resolved.source.recipeRevisionId);
    }
    return null;
  };
}
