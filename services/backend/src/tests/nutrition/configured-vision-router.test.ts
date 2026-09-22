import assert from "node:assert/strict";
import test from "node:test";
import { MemoryModelConfigurationStore } from "../../nutrition/vision/config/modelConfiguration.ts";
import { ConfiguredVisionRouter } from "../../nutrition/vision/configuredVisionRouter.ts";

const scene = { scene_warnings: [], regions: [{ box_2d: [100,100,900,900], mask: [], segmentation_confidence: .9, overlap_state: "NONE", visual_portion_estimate: { minimum_grams: 90, central_grams: 160, maximum_grams: 240, confidence: .55, assumptions: ["single image"] }, candidates: [{ name: "steamed rice", search_terms: ["steamed rice"], food_type: "BASIC", preparations: [{ label: "steamed", confidence: .9 }], confidence: .9, uncertainty_notes: [] }] }] };

test("database-configured vision router falls back from OpenRouter to Gemini and sticks to the successful provider for candidates", async () => {
  let openRouterCalls = 0;
  let geminiCalls = 0;
  const store = new MemoryModelConfigurationStore([
    { modelConfigId: "or", taskType: "food_vision", provider: "openrouter", modelName: "google/gemini-2.5-flash", temperature: .1, maxOutputTokens: 1000, timeoutMs: 1000, maxAttempts: 1, retryBaseDelayMs: 0, priority: 1 },
    { modelConfigId: "g", taskType: "food_vision", provider: "gemini", modelName: "gemini-test", temperature: .1, maxOutputTokens: 1000, timeoutMs: 1000, maxAttempts: 1, retryBaseDelayMs: 0, priority: 2 },
  ]);
  const router = new ConfiguredVisionRouter({
    imageStore: { read: async () => ({ bytes: Buffer.from("image"), mediaType: "image/jpeg" }) },
    configStore: store,
    secrets: { openrouterApiKey: "or-secret", geminiApiKey: "g-secret" },
    fetcher: async (input) => {
      if (String(input).includes("openrouter.ai")) { openRouterCalls += 1; return new Response("down", { status: 503 }); }
      geminiCalls += 1;
      return new Response(JSON.stringify({ output_text: JSON.stringify(scene) }), { status: 200 });
    },
  });
  const segmentation = await router.segment({ imageReference: "img", checksum: "x" });
  assert.equal(segmentation.provider, "gemini-food-scene-candidate-only");
  const candidates = await router.generateCandidates({ imageReference: "img", regionId: "region-1", checksum: "x" });
  assert.equal(candidates.candidates[0]?.name, "steamed rice");
  assert.equal(openRouterCalls, 1);
  assert.equal(geminiCalls, 1, "candidate request must reuse the successful Gemini scene cache");
});

test("database route without its server-side secret is skipped rather than exposing or fabricating a credential", async () => {
  const store = new MemoryModelConfigurationStore([{ modelConfigId: "or", taskType: "food_vision", provider: "openrouter", modelName: "x/y", temperature: .1, maxOutputTokens: 1000, timeoutMs: 1000, maxAttempts: 1, retryBaseDelayMs: 0, priority: 1 }]);
  const router = new ConfiguredVisionRouter({ imageStore: { read: async () => ({ bytes: Buffer.from("image"), mediaType: "image/jpeg" }) }, configStore: store, secrets: {} });
  await assert.rejects(() => router.segment({ imageReference: "img" }), /food_vision_not_configured/);
});
