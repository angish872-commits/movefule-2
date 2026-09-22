import { readFile } from "node:fs/promises";
import path from "node:path";
import { OpenRouterFoodSceneAdapter } from "../src/nutrition/vision/providers/openRouterFoodSceneAdapter.ts";
import { LiveImageEstimateService } from "../src/nutrition/service/liveImageEstimateService.ts";
import { MemoryModelConfigurationStore, FOOD_VISION_TASK_TYPE } from "../src/nutrition/vision/config/modelConfiguration.ts";

const imagePath = process.argv[2];
if (!imagePath) throw new Error("usage: live-openrouter-food-scene-smoke.ts <image-path>");
const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey || apiKey.toUpperCase().startsWith("REPLACE_")) throw new Error("openrouter_not_configured");
const ext = path.extname(imagePath).toLowerCase();
const mediaType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
const model = process.env.OPENROUTER_FOOD_VISION_MODEL?.trim() || "google/gemini-2.5-flash";

const imageStore = {
  async read(_objectId: string) {
    return { bytes: await readFile(imagePath), mediaType: mediaType as "image/png" | "image/webp" | "image/jpeg" };
  },
};

const adapter = new OpenRouterFoodSceneAdapter({
  apiKey,
  model,
  imageStore,
  context: { countryPrior: process.env.MOVEFUEL_COUNTRY_PRIOR?.trim() || "United States" },
});

try {
  const segmentation = await adapter.segment({ imageReference: imagePath, mimeType: mediaType });
  const regions = [];
  for (const region of segmentation.regions) {
    const candidates = await adapter.generateCandidates({ imageReference: imagePath, mimeType: mediaType, regionId: region.regionId });
    regions.push({
      regionId: region.regionId,
      bbox: region.bbox,
      overlapState: region.overlapState,
      segmentationConfidence: region.segmentationConfidence,
      visualPortionEstimate: region.visualPortionEstimate ?? null,
      candidates: candidates.candidates.map((c) => ({
        name: c.name,
        foodType: c.foodType,
        confidence: c.providerConfidence,
        preparations: c.preparationCandidates.map((p) => ({ label: p.label, confidence: p.confidence })),
        uncertainty: c.uncertaintyNotes,
      })),
    });
  }
  console.log(JSON.stringify({
    status: "COMPLETED",
    provider: segmentation.provider,
    providerVersion: segmentation.providerVersion,
    latencyMs: segmentation.latencyMs,
    regionCount: segmentation.regions.length,
    regions,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    status: "FAILED",
    error: error instanceof Error ? error.message : "unknown_error",
  }, null, 2));
  process.exitCode = 2;
}
