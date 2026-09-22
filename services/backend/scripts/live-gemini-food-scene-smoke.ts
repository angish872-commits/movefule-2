import { readFile } from "node:fs/promises";
import path from "node:path";
import { GeminiFoodSceneAdapter } from "../src/nutrition/vision/providers/geminiFoodSceneAdapter.ts";

const imagePath = process.argv[2];
if (!imagePath) throw new Error("usage: live-gemini-food-scene-smoke.ts <image-path>");
const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey || apiKey.toUpperCase().startsWith("REPLACE_")) throw new Error("gemini_not_configured");
const configuredTimeoutMs = Number(process.env.MOVEFUEL_GEMINI_TIMEOUT_MS ?? "12000");
const timeoutMs = Number.isFinite(configuredTimeoutMs) ? Math.max(250, Math.min(configuredTimeoutMs, 120_000)) : 12_000;
const ext = path.extname(imagePath).toLowerCase();
const mediaType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
const imageStore = {
  async read(_objectId: string) {
    return { bytes: await readFile(imagePath), mediaType: mediaType as "image/png" | "image/webp" | "image/jpeg" };
  },
};
const adapter = new GeminiFoodSceneAdapter({
  apiKey,
  model: process.env.MOVEFUEL_FOOD_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-3.6-flash",
  imageStore,
  timeoutMs,
  context: { countryPrior: process.env.MOVEFUEL_COUNTRY_PRIOR?.trim() || "United States" },
});
try {
  const segmentation = await adapter.segment({ imageReference: imagePath, mimeType: mediaType });
  const regions = [];
  for (const region of segmentation.regions) {
    const candidates = await adapter.generateCandidates({
      imageReference: imagePath,
      mimeType: mediaType,
      regionId: region.regionId,
    });
    regions.push({
      regionId: region.regionId,
      bbox: region.bbox,
      maskPolygon: region.maskPolygon ?? null,
      segmentationConfidence: region.segmentationConfidence,
      overlapState: region.overlapState,
      candidates: candidates.candidates.map((c) => ({
        name: c.name,
        foodType: c.foodType,
        confidence: c.providerConfidence,
        preparations: c.preparationCandidates,
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
  // Sanitized: never serialize request/response bodies or secrets.
  console.error(JSON.stringify({
    status: "FAILED",
    error: error instanceof Error ? error.message : "unknown_error",
  }, null, 2));
  process.exitCode = 2;
}
