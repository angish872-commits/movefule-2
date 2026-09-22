/** Server-only environment wiring for the candidate-only Gemini food scene adapter. */

import type { MealImageStore } from "../../meal/local-image-store.ts";
import { GeminiFoodSceneAdapter, type GeminiFoodSceneAdapterOptions } from "./providers/geminiFoodSceneAdapter.ts";

function configuredSecret(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  const upper = normalized.toUpperCase();
  if (upper.startsWith("REPLACE_") || upper === "REPLACE_ME" || upper.includes("PLACEHOLDER")) return null;
  return normalized;
}

export type ConfiguredFoodVisionOptions = {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  context?: GeminiFoodSceneAdapterOptions["context"];
  fetcher?: GeminiFoodSceneAdapterOptions["fetcher"];
};

export function createConfiguredGeminiFoodSceneAdapter(
  imageStore: Pick<MealImageStore, "read">,
  options: ConfiguredFoodVisionOptions = {},
): GeminiFoodSceneAdapter {
  const apiKey = configuredSecret(options.apiKey) ?? configuredSecret(process.env.GEMINI_API_KEY);
  if (!apiKey) throw new Error("gemini_food_scene_not_configured");
  const model = options.model?.trim()
    || process.env.MOVEFUEL_FOOD_VISION_MODEL?.trim()
    || process.env.GEMINI_MODEL?.trim()
    || "gemini-3.6-flash";
  return new GeminiFoodSceneAdapter({
    apiKey,
    imageStore,
    model,
    ...(options.endpoint ? { endpoint: options.endpoint } : {}),
    ...(options.context ? { context: options.context } : {}),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
  });
}
