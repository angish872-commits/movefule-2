/**
 * Gemini candidate-only food scene adapter.
 *
 * One cloud call may provide visible food regions/masks plus 1-3 identity and
 * preparation candidates. It is intentionally forbidden from returning grams,
 * calories, macros, micronutrients, recipes for hidden ingredients, or a final
 * nutrition answer. Physical portion estimation and nutrition lookup remain
 * separate deterministic stages.
 */

import type { MealImageStore } from "../../../meal/local-image-store.ts";
import {
  type CandidateGenerationResult,
  type CandidateProvider,
  type CandidateRequest,
  type PreparationCandidate,
  type RegionFoodCandidate,
  validateCandidateGenerationResult,
} from "../candidateProviderAdapter.ts";
import type { FoodTypeKind } from "../../algorithm/contracts.ts";
import {
  type SegmentationAdapter,
  type SegmentationAnalysis,
  type SegmentationRegion,
  type SegmentationRequest,
  validateSegmentationAnalysis,
} from "../segmentationAdapter.ts";

export const GEMINI_FOOD_SCENE_ADAPTER_VERSION = "2.3.0";
const DEFAULT_MODEL = "gemini-3.6-flash";
// The Interactions request/response shape below is the current v1beta schema.
// Keep the API revision explicit so the response remains compatible with the
// `steps[].content[]` parser during the provider migration window.
const INTERACTIONS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const INTERACTIONS_API_REVISION = "2026-05-20";
const MAX_REGIONS = 12;
const MAX_MASK_POINTS = 64;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type SceneContext = {
  countryPrior?: string;
  cuisinePrior?: string;
  mealTimePrior?: string;
};

type RawPreparation = { label: string; confidence: number };
type RawVisualPortion = {
  minimum_grams: number;
  central_grams: number;
  maximum_grams: number;
  confidence: number;
  assumptions: string[];
};
type RawCandidate = {
  name: string;
  search_terms: string[];
  food_type: FoodTypeKind;
  preparations: RawPreparation[];
  confidence: number;
  uncertainty_notes: string[];
};
type RawRegion = {
  box_2d: number[];
  mask: number[][];
  segmentation_confidence: number;
  overlap_state: "NONE" | "PARTIAL" | "HEAVY";
  visual_portion_estimate: RawVisualPortion;
  candidates: RawCandidate[];
};
type RawScene = {
  scene_warnings: string[];
  regions: RawRegion[];
};

type SceneCacheEntry = {
  createdAtMs: number;
  analysis: SegmentationAnalysis;
  candidatesByRegion: Map<string, readonly RegionFoodCandidate[]>;
};

const sceneSchema = {
  type: "object",
  properties: {
    scene_warnings: { type: "array", items: { type: "string" } },
    regions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          box_2d: { type: "array", items: { type: "integer" } },
          mask: { type: "array", items: { type: "array", items: { type: "integer" } } },
          segmentation_confidence: { type: "number" },
          overlap_state: { type: "string", enum: ["NONE", "PARTIAL", "HEAVY"] },
          visual_portion_estimate: {
            type: "object",
            properties: {
              minimum_grams: { type: "number" },
              central_grams: { type: "number" },
              maximum_grams: { type: "number" },
              confidence: { type: "number" },
              assumptions: { type: "array", items: { type: "string" } },
            },
            required: ["minimum_grams", "central_grams", "maximum_grams", "confidence", "assumptions"],
          },
          candidates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                search_terms: { type: "array", items: { type: "string" } },
                food_type: { type: "string", enum: ["BASIC", "PACKAGED", "PREPARED", "MIXED_DISH", "LIQUID", "UNCLEAR"] },
                preparations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { label: { type: "string" }, confidence: { type: "number" } },
                    required: ["label", "confidence"],
                  },
                },
                confidence: { type: "number" },
                uncertainty_notes: { type: "array", items: { type: "string" } },
              },
              required: ["name", "search_terms", "food_type", "preparations", "confidence", "uncertainty_notes"],
            },
          },
        },
        required: ["box_2d", "mask", "segmentation_confidence", "overlap_state", "visual_portion_estimate", "candidates"],
      },
    },
  },
  required: ["scene_warnings", "regions"],
} as const;

const FORBIDDEN_NUTRITION_KEYS = new Set([
  "calories", "calorie", "energy", "energykcal",
  "protein", "proteing", "carbs", "carbohydrate", "fat", "fiber", "sodium", "nutrients", "micronutrients",
]);

function hasForbiddenNutritionKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenNutritionKey);
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (FORBIDDEN_NUTRITION_KEYS.has(normalized)) return true;
    if (hasForbiddenNutritionKey(child)) return true;
  }
  return false;
}

function validNumber01(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function valid1000(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000;
}

function visualPortion(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const rawMinimum = Number(record.minimum_grams);
  const rawCentral = Number(record.central_grams);
  const rawMaximum = Number(record.maximum_grams);
  if (![rawMinimum, rawCentral, rawMaximum].every(Number.isFinite) || rawMinimum <= 0 || rawCentral <= 0 || rawMaximum <= 0 || rawMinimum > rawCentral || rawCentral > rawMaximum || rawMaximum > 5_000) return null;
  const minimumGrams = Math.max(1, Math.min(rawMinimum, rawCentral * 0.55));
  const maximumGrams = Math.min(5_000, Math.max(rawMaximum, rawCentral * 1.55));
  return {
    method: "MONOCULAR_MODEL_PRIOR" as const,
    minimumGrams,
    centralGrams: rawCentral,
    maximumGrams,
    confidence: validNumber01(record.confidence) ? Math.min(record.confidence, 0.65) : 0.35,
    assumptions: cleanStrings(record.assumptions, 6).filter((note) => !/calorie|nutrient|density/i.test(note)),
  };
}

function cleanStrings(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, max);
}

function promptFor(context: SceneContext): string {
  const priors = [
    context.countryPrior ? `country hint: ${context.countryPrior}` : "",
    context.cuisinePrior ? `cuisine hint: ${context.cuisinePrior}` : "",
    context.mealTimePrior ? `meal-time hint: ${context.mealTimePrior}` : "",
  ].filter(Boolean).join("; ");
  return [
    "You are MoveFuel's visible-food scene recognizer.",
    "Detect only food visibly present in the image. Return one region per visually separable food component; do not automatically sum multiple plates.",
    "box_2d must be [ymin,xmin,ymax,xmax] normalized to 0..1000. mask is a contour polygon of [x,y] points normalized to 0..1000; keep the polygon concise.",
    "For each region provide visual_portion_estimate as a deliberately broad, non-authoritative minimum/central/maximum gram prior based only on visible portion cues. Include assumptions and keep confidence at or below 0.65.",
    "For each region return at most 3 plausible food identity candidates and preparation candidates supported by visible evidence.",
    "Food type must be BASIC, PACKAGED, PREPARED, MIXED_DISH, LIQUID, or UNCLEAR.",
    "Use context hints only as soft re-ranking priors. Strong visual evidence always wins.",
    "Do not invent hidden oil, sauce, ingredients, fillings, brand, restaurant, or recipe details.",
    "Do not output calories, energy, protein, carbohydrate, fat, fiber, sodium, micronutrients, density, or any nutrient value. Grams are permitted only inside visual_portion_estimate and are never authoritative.",
    "If the food is unclear, use UNCLEAR and low confidence rather than guessing. If no food is visible, return an empty regions array.",
    priors ? `Optional soft priors: ${priors}` : "No regional prior was supplied.",
  ].join("\n");
}

function extractInteractionOutputText(body: Record<string, unknown>): string | null {
  // `output_text` is an SDK convenience field. Raw REST responses expose model
  // output through `steps[].content[].text`, so support that canonical shape.
  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text;
  if (!Array.isArray(body.steps)) return null;
  const chunks: string[] = [];
  for (const step of body.steps) {
    if (!step || typeof step !== "object" || Array.isArray(step)) continue;
    const stepRecord = step as Record<string, unknown>;
    if (stepRecord.type !== "model_output" || !Array.isArray(stepRecord.content)) continue;
    for (const block of stepRecord.content) {
      if (!block || typeof block !== "object" || Array.isArray(block)) continue;
      const content = block as Record<string, unknown>;
      if (content.type === "text" && typeof content.text === "string" && content.text.trim()) chunks.push(content.text);
    }
  }
  return chunks.length > 0 ? chunks.join("\n") : null;
}

function cacheKey(input: { imageReference: string; checksum?: string; ownerUserId?: string }): string {
  return `${input.ownerUserId ?? "anonymous"}|${input.imageReference}|${input.checksum ?? ""}`;
}

function retryAfterDelayMs(response: Response | null): number | null {
  if (!response) return null;
  const value = response.headers.get("retry-after")?.trim();
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(30_000, Math.round(seconds * 1000));
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  return Math.max(0, Math.min(30_000, date - Date.now()));
}

export type GeminiFoodSceneAdapterOptions = {
  apiKey: string;
  imageStore: Pick<MealImageStore, "read">;
  model?: string;
  /** Override only for provider migrations/tests; default follows the current official Interactions REST path. */
  endpoint?: string;
  fetcher?: FetchLike;
  context?: SceneContext;
  cacheTtlMs?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  retryBaseDelayMs?: number;
};

/** Implements both SegmentationAdapter and CandidateProvider to share one call. */
export class GeminiFoodSceneAdapter implements SegmentationAdapter, CandidateProvider {
  readonly name = "gemini-food-scene-candidate-only";
  #apiKey: string;
  private readonly imageStore: Pick<MealImageStore, "read">;
  private readonly model: string;
  private readonly endpoint: string;
  private readonly fetcher: FetchLike;
  private readonly context: SceneContext;
  private readonly cacheTtlMs: number;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryBaseDelayMs: number;
  private readonly cache = new Map<string, SceneCacheEntry>();
  private readonly inFlight = new Map<string, Promise<SceneCacheEntry>>();

  constructor(options: GeminiFoodSceneAdapterOptions) {
    if (!options.apiKey.trim()) throw new Error("gemini_not_configured");
    this.#apiKey = options.apiKey;
    this.imageStore = options.imageStore;
    this.model = options.model?.trim() || DEFAULT_MODEL;
    this.endpoint = options.endpoint?.trim() || INTERACTIONS_ENDPOINT;
    this.fetcher = options.fetcher ?? fetch;
    this.context = options.context ?? {};
    this.cacheTtlMs = options.cacheTtlMs ?? 2 * 60_000;
    this.timeoutMs = Math.max(250, options.timeoutMs ?? 12_000);
    this.maxAttempts = Math.min(4, Math.max(1, options.maxAttempts ?? 3));
    this.retryBaseDelayMs = Math.max(0, options.retryBaseDelayMs ?? 750);
  }

  async segment(input: SegmentationRequest): Promise<SegmentationAnalysis> {
    const entry = await this.scene(input);
    return entry.analysis;
  }

  async generateCandidates(input: CandidateRequest): Promise<CandidateGenerationResult> {
    const entry = await this.scene(input);
    const candidates = entry.candidatesByRegion.get(input.regionId) ?? [];
    const result: CandidateGenerationResult = {
      provider: this.name,
      providerVersion: `${this.model}@${GEMINI_FOOD_SCENE_ADAPTER_VERSION}`,
      regionId: input.regionId,
      status: candidates.length > 0 ? "COMPLETED" : "UNKNOWN",
      candidates,
      warnings: candidates.length > 0 ? [] : ["no identity candidate for region"],
    };
    const errors = validateCandidateGenerationResult(result);
    if (errors.length > 0) throw new Error(`gemini_candidate_contract:${errors.join(",")}`);
    return result;
  }

  private async scene(input: { imageReference: string; mimeType?: string; checksum?: string; correlationId?: string }): Promise<SceneCacheEntry> {
    const key = cacheKey(input);
    const existing = this.cache.get(key);
    if (existing && Date.now() - existing.createdAtMs <= this.cacheTtlMs) return existing;
    const running = this.inFlight.get(key);
    if (running) return running;
    const task = this.fetchScene(input).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, task);
    return task;
  }

  private async fetchScene(input: { imageReference: string; mimeType?: string; checksum?: string; correlationId?: string }): Promise<SceneCacheEntry> {
    const started = Date.now();
    const image = await this.imageStore.read(input.imageReference);
    if (image.bytes.byteLength <= 0 || image.bytes.byteLength > 20 * 1024 * 1024) throw new Error("gemini_image_size_rejected");
    const mimeType = input.mimeType || image.mediaType;
    const requestBody = JSON.stringify({
      model: this.model,
      input: [
        { type: "text", text: promptFor(this.context) },
        { type: "image", data: image.bytes.toString("base64"), mime_type: mimeType },
      ],
      response_format: { type: "text", mime_type: "application/json", schema: sceneSchema },
      generation_config: { thinking_level: "minimal" },
    });

    let response: Response | null = null;
    let lastFailure = "gemini_scene_unavailable";
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        response = await this.fetcher(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.#apiKey,
            "Api-Revision": INTERACTIONS_API_REVISION,
          },
          body: requestBody,
          signal: controller.signal,
        });
        if (response.ok) break;
        if (response.status === 429) lastFailure = "gemini_scene_rate_limited";
        else if (response.status === 408 || response.status >= 500) lastFailure = "gemini_scene_unavailable";
        else throw new Error(`gemini_scene_http_${response.status}`);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") lastFailure = "gemini_scene_timeout";
        else if (error instanceof Error && error.message.startsWith("gemini_scene_http_")) throw error;
        else lastFailure = "gemini_scene_unavailable";
      } finally {
        clearTimeout(timer);
      }
      const providerDelay = retryAfterDelayMs(response);
      response = null;
      if (attempt < this.maxAttempts && (this.retryBaseDelayMs > 0 || providerDelay !== null)) {
        // Respect provider Retry-After when present. Otherwise use bounded
        // exponential backoff; short 250ms retry loops amplify 429 storms.
        const exponential = Math.min(this.retryBaseDelayMs * (2 ** (attempt - 1)), 8_000);
        const delay = Math.max(providerDelay ?? 0, exponential);
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    if (!response) throw new Error(lastFailure);
    const body = await response.json() as Record<string, unknown>;
    const outputText = extractInteractionOutputText(body);
    if (!outputText) throw new Error("invalid_provider_response");
    let raw: unknown;
    try { raw = JSON.parse(outputText); } catch { throw new Error("invalid_provider_response"); }
    if (hasForbiddenNutritionKey(raw)) throw new Error("gemini_scene_nutrition_leak_rejected");
    const parsed = this.parseScene(raw, Date.now() - started);
    this.cache.set(cacheKey(input), parsed);
    if (this.cache.size > 64) this.cache.delete(this.cache.keys().next().value as string);
    return parsed;
  }

  private parseScene(raw: unknown, latencyMs: number): SceneCacheEntry {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("invalid_provider_response");
    const record = raw as Record<string, unknown>;
    if (!Array.isArray(record.regions)) throw new Error("invalid_provider_response");
    const warnings = cleanStrings(record.scene_warnings, 12);
    const regions: SegmentationRegion[] = [];
    const candidatesByRegion = new Map<string, readonly RegionFoodCandidate[]>();

    for (const [index, value] of record.regions.slice(0, MAX_REGIONS).entries()) {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_provider_region");
      const region = value as Record<string, unknown>;
      if (!Array.isArray(region.box_2d) || region.box_2d.length !== 4 || !region.box_2d.every(valid1000)) throw new Error("invalid_provider_bbox");
      const [ymin, xmin, ymax, xmax] = region.box_2d as [number, number, number, number];
      if (!(ymin < ymax && xmin < xmax)) throw new Error("invalid_provider_bbox");
      if (!validNumber01(region.segmentation_confidence)) throw new Error("invalid_provider_segmentation_confidence");
      if (!["NONE", "PARTIAL", "HEAVY"].includes(String(region.overlap_state))) throw new Error("invalid_provider_overlap");
      const portion = visualPortion(region.visual_portion_estimate);
      if (!portion) throw new Error("invalid_provider_visual_portion");
      const regionId = `region-${index + 1}`;
      const mask = Array.isArray(region.mask) ? region.mask.slice(0, MAX_MASK_POINTS) : [];
      const polygon = mask
        .filter((point): point is number[] => Array.isArray(point) && point.length === 2 && point.every(valid1000))
        .map((point) => [point[0]! / 1000, point[1]! / 1000] as const);
      const regionWarnings: string[] = [];
      if (mask.length > 0 && polygon.length < 3) regionWarnings.push("mask polygon rejected; bbox retained");
      if (region.overlap_state === "HEAVY") regionWarnings.push("heavy food-region overlap");
      regions.push({
        regionId,
        bbox: { x: xmin! / 1000, y: ymin! / 1000, width: (xmax! - xmin!) / 1000, height: (ymax! - ymin!) / 1000 },
        ...(polygon.length >= 3 ? { maskPolygon: polygon } : {}),
        visualPortionEstimate: portion,
        segmentationConfidence: region.segmentation_confidence as number,
        overlapState: region.overlap_state as SegmentationRegion["overlapState"],
        warnings: regionWarnings,
      });

      const candidateValues = Array.isArray(region.candidates) ? region.candidates.slice(0, 3) : [];
      const candidates = candidateValues.map((candidate) => this.parseCandidate(candidate)).filter((candidate): candidate is RegionFoodCandidate => candidate !== null);
      candidatesByRegion.set(regionId, candidates);
    }

    const analysis: SegmentationAnalysis = {
      provider: this.name,
      providerVersion: `${this.model}@${GEMINI_FOOD_SCENE_ADAPTER_VERSION}`,
      status: "COMPLETED",
      regions,
      latencyMs,
      warnings,
    };
    const errors = validateSegmentationAnalysis(analysis);
    if (errors.length > 0) throw new Error(`gemini_segmentation_contract:${errors.join(",")}`);
    return { createdAtMs: Date.now(), analysis, candidatesByRegion };
  }

  private parseCandidate(value: unknown): RegionFoodCandidate | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const foodType = String(raw.food_type) as FoodTypeKind;
    if (!name || !["BASIC", "PACKAGED", "PREPARED", "MIXED_DISH", "LIQUID", "UNCLEAR"].includes(foodType)) return null;
    if (!validNumber01(raw.confidence)) return null;
    const preparations: PreparationCandidate[] = Array.isArray(raw.preparations)
      ? raw.preparations.slice(0, 4).flatMap((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return [];
        const item = value as Record<string, unknown>;
        const label = typeof item.label === "string" ? item.label.trim() : "";
        if (!label || !validNumber01(item.confidence)) return [];
        return [{ label, confidence: item.confidence }];
      })
      : [];
    return {
      name,
      searchTerms: cleanStrings(raw.search_terms, 6).length > 0 ? cleanStrings(raw.search_terms, 6) : [name],
      foodType,
      preparationCandidates: preparations,
      providerConfidence: raw.confidence,
      modelProviderVersion: `${this.model}@${GEMINI_FOOD_SCENE_ADAPTER_VERSION}`,
      uncertaintyNotes: cleanStrings(raw.uncertainty_notes, 8),
    };
  }
}
