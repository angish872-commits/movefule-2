import type { MealImageStore } from "../../meal/local-image-store.ts";
import { FOOD_VISION_TASK_TYPE, type ModelConfigurationStore, type ModelRoute } from "./config/modelConfiguration.ts";
import type { CandidateGenerationResult, CandidateProvider, CandidateRequest } from "./candidateProviderAdapter.ts";
import { GeminiFoodSceneAdapter } from "./providers/geminiFoodSceneAdapter.ts";
import { OpenRouterFoodSceneAdapter, type OpenRouterUsage } from "./providers/openRouterFoodSceneAdapter.ts";
import type { SegmentationAdapter, SegmentationAnalysis, SegmentationRequest } from "./segmentationAdapter.ts";

export type VisionRouterSecrets = {
  openrouterApiKey?: string;
  geminiApiKey?: string;
};

export type ConfiguredVisionRouterOptions = {
  imageStore: Pick<MealImageStore, "read">;
  configStore: ModelConfigurationStore;
  secrets: VisionRouterSecrets;
  appUrl?: string;
  appName?: string;
  fetcher?: typeof fetch;
  onOpenRouterUsage?: (usage: OpenRouterUsage) => void | Promise<void>;
};

function configuredSecret(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  const upper = normalized.toUpperCase();
  if (upper.startsWith("REPLACE_") || upper === "REPLACE_ME" || upper.includes("PLACEHOLDER")) return null;
  return normalized;
}

function routeKey(input: { imageReference: string; checksum?: string }): string {
  return `${input.imageReference}|${input.checksum ?? ""}`;
}

export class ConfiguredVisionRouter implements SegmentationAdapter, CandidateProvider {
  readonly name = "configured-food-vision-router";
  private readonly selected = new Map<string, SegmentationAdapter & CandidateProvider>();
  private readonly options: ConfiguredVisionRouterOptions;

  constructor(options: ConfiguredVisionRouterOptions) { this.options = options; }

  async segment(input: SegmentationRequest): Promise<SegmentationAnalysis> {
    const key = routeKey(input);
    const errors: string[] = [];
    for (const route of await this.options.configStore.activeRoutes(FOOD_VISION_TASK_TYPE)) {
      const adapter = this.adapterFor(route);
      if (!adapter) continue;
      try {
        const result = await adapter.segment(input);
        this.selected.set(key, adapter);
        if (this.selected.size > 128) this.selected.delete(this.selected.keys().next().value as string);
        return result;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "provider_error");
      }
    }
    throw new Error(errors.length > 0 ? `food_vision_all_routes_failed:${errors.join("|")}` : "food_vision_not_configured");
  }

  async generateCandidates(input: CandidateRequest): Promise<CandidateGenerationResult> {
    const key = routeKey(input);
    const selected = this.selected.get(key);
    if (selected) return selected.generateCandidates(input);
    // Defensive path when candidate generation is invoked before segmentation.
    const errors: string[] = [];
    for (const route of await this.options.configStore.activeRoutes(FOOD_VISION_TASK_TYPE)) {
      const adapter = this.adapterFor(route);
      if (!adapter) continue;
      try {
        const result = await adapter.generateCandidates(input);
        this.selected.set(key, adapter);
        return result;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "provider_error");
      }
    }
    throw new Error(errors.length > 0 ? `food_vision_all_routes_failed:${errors.join("|")}` : "food_vision_not_configured");
  }

  private adapterFor(route: ModelRoute): (SegmentationAdapter & CandidateProvider) | null {
    if (route.provider === "openrouter") {
      const apiKey = configuredSecret(this.options.secrets.openrouterApiKey);
      if (!apiKey) return null;
      return new OpenRouterFoodSceneAdapter({
        apiKey,
        imageStore: this.options.imageStore,
        model: route.modelName,
        temperature: route.temperature,
        maxOutputTokens: route.maxOutputTokens,
        timeoutMs: route.timeoutMs,
        maxAttempts: route.maxAttempts,
        retryBaseDelayMs: route.retryBaseDelayMs,
        ...(route.providerOptions ? { providerOptions: route.providerOptions } : {}),
        ...(this.options.appUrl ? { appUrl: this.options.appUrl } : {}),
        ...(this.options.appName ? { appName: this.options.appName } : {}),
        ...(this.options.fetcher ? { fetcher: this.options.fetcher } : {}),
        ...(this.options.onOpenRouterUsage ? { onUsage: this.options.onOpenRouterUsage } : {}),
      });
    }
    if (route.provider === "gemini") {
      const apiKey = configuredSecret(this.options.secrets.geminiApiKey);
      if (!apiKey) return null;
      return new GeminiFoodSceneAdapter({
        apiKey,
        imageStore: this.options.imageStore,
        model: route.modelName,
        timeoutMs: route.timeoutMs,
        maxAttempts: route.maxAttempts,
        retryBaseDelayMs: route.retryBaseDelayMs,
        ...(this.options.fetcher ? { fetcher: this.options.fetcher } : {}),
      });
    }
    return null;
  }
}
