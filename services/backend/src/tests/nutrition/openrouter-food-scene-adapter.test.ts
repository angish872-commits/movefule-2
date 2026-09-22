import assert from "node:assert/strict";
import test from "node:test";
import { OpenRouterFoodSceneAdapter } from "../../nutrition/vision/providers/openRouterFoodSceneAdapter.ts";

const scene = {
  scene_warnings: [],
  regions: [{
    box_2d: [100, 200, 700, 800],
    mask: [[0, 0], [1000, 0], [1000, 1000], [0, 1000]],
    segmentation_confidence: 0.91,
    overlap_state: "NONE",
    visual_portion_estimate: {
      minimum_grams: 120,
      central_grams: 200,
      maximum_grams: 280,
      confidence: 0.6,
      assumptions: ["single plate photo"],
    },
    candidates: [{
      name: "dal bhat",
      search_terms: ["dal bhat", "lentils rice"],
      food_type: "MIXED_DISH",
      preparations: [{ label: "cooked", confidence: 0.88 }],
      confidence: 0.9,
      uncertainty_notes: ["oil amount not visible"],
    }],
  }],
};

function okBody() {
  return { model: "google/gemini-2.5-flash", choices: [{ message: { content: JSON.stringify(scene) } }], usage: { prompt_tokens: 120, completion_tokens: 60, total_tokens: 180, cost: 0.0012 } };
}

test("OpenRouter adapter uses bearer auth, multimodal input, strict JSON schema and never sends nutrition authority", async () => {
  let sent: Record<string, unknown> = {};
  let auth = "";
  let endpoint = "";
  const usages: unknown[] = [];
  const adapter = new OpenRouterFoodSceneAdapter({
    apiKey: "sk-or-test-secret",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake-image"), mediaType: "image/jpeg" }) },
    appUrl: "https://movefuel.example",
    appName: "MoveFuel",
    onUsage: (usage) => { usages.push(usage); },
    fetcher: async (input, init) => {
      endpoint = String(input);
      auth = new Headers(init?.headers).get("authorization") ?? "";
      sent = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(okBody()), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const segmentation = await adapter.segment({ imageReference: "img-or", checksum: "abc" });
  const candidates = await adapter.generateCandidates({ imageReference: "img-or", regionId: "region-1", checksum: "abc" });
  assert.equal(segmentation.regions.length, 1);
  assert.deepEqual(
    [segmentation.regions[0]?.visualPortionEstimate?.minimumGrams, segmentation.regions[0]?.visualPortionEstimate?.centralGrams, segmentation.regions[0]?.visualPortionEstimate?.maximumGrams],
    [110.00000000000001, 200, 310],
  );
  assert.equal(candidates.candidates[0]?.name, "dal bhat");
  assert.equal(endpoint, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(auth, "Bearer sk-or-test-secret");
  assert.equal((sent.response_format as any).type, "json_schema");
  assert.equal((sent.response_format as any).json_schema.strict, true);
  const serialized = JSON.stringify(sent);
  assert.ok(serialized.includes("data:image/jpeg;base64"));
  assert.equal(serialized.includes("visual_portion_estimate"), true);
  assert.equal(serialized.includes("protein_g"), false);
  assert.equal(usages.length, 1);
  assert.equal((usages[0] as any).totalTokens, 180);
  assert.equal((usages[0] as any).costUsd, 0.0012);
});

test("OpenRouter adapter rejects leaked nutrient fields", async () => {
  const leaked: any = structuredClone(scene);
  leaked.regions[0].candidates[0].calories = 650;
  const adapter = new OpenRouterFoodSceneAdapter({
    apiKey: "secret",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake"), mediaType: "image/jpeg" }) },
    fetcher: async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(leaked) } }] }), { status: 200 }),
  });
  await assert.rejects(() => adapter.segment({ imageReference: "leak" }), /openrouter_scene_nutrition_leak_rejected/);
});

test("OpenRouter malformed JSON is classified as a provider response failure", async () => {
  const adapter = new OpenRouterFoodSceneAdapter({
    apiKey: "secret",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake"), mediaType: "image/jpeg" }) },
    fetcher: async () => new Response("not-json", { status: 200 }),
  });
  await assert.rejects(() => adapter.segment({ imageReference: "malformed" }), /invalid_provider_response/);
});

test("OpenRouter adapter honors Retry-After and fails closed on exhausted rate limits", async () => {
  let calls = 0;
  const adapter = new OpenRouterFoodSceneAdapter({
    apiKey: "secret",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake"), mediaType: "image/jpeg" }) },
    maxAttempts: 2,
    retryBaseDelayMs: 0,
    fetcher: async () => {
      calls += 1;
      if (calls === 1) return new Response("limited", { status: 429, headers: { "retry-after": "0.01" } });
      return new Response(JSON.stringify(okBody()), { status: 200 });
    },
  });
  assert.equal((await adapter.segment({ imageReference: "retry" })).regions.length, 1);
  assert.equal(calls, 2);

  const blocked = new OpenRouterFoodSceneAdapter({
    apiKey: "secret",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake"), mediaType: "image/jpeg" }) },
    maxAttempts: 1,
    retryBaseDelayMs: 0,
    fetcher: async () => new Response("limited", { status: 429 }),
  });
  await assert.rejects(() => blocked.segment({ imageReference: "blocked" }), /openrouter_scene_rate_limited/);
});

test("OpenRouter scene cache is owner scoped even when image references collide", async () => {
  let calls = 0;
  const adapter = new OpenRouterFoodSceneAdapter({
    apiKey: "secret",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake"), mediaType: "image/jpeg" }) },
    fetcher: async () => {
      calls += 1;
      return new Response(JSON.stringify(okBody()), { status: 200 });
    },
  });
  await adapter.segment({ imageReference: "same-object", checksum: "same", ownerUserId: "user-a" });
  await adapter.generateCandidates({ imageReference: "same-object", checksum: "same", regionId: "region-1", ownerUserId: "user-a" });
  await adapter.segment({ imageReference: "same-object", checksum: "same", ownerUserId: "user-b" });
  assert.equal(calls, 2);
});
