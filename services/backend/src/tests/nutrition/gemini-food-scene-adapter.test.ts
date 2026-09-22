import assert from "node:assert/strict";
import test from "node:test";
import { GeminiFoodSceneAdapter } from "../../nutrition/vision/providers/geminiFoodSceneAdapter.ts";

const scene = {
  scene_warnings: [],
  regions: [{
    box_2d: [100, 200, 700, 800],
    mask: [[0, 0], [1000, 0], [1000, 1000], [0, 1000]],
    segmentation_confidence: 0.91,
    overlap_state: "NONE",
    visual_portion_estimate: {
      minimum_grams: 90,
      central_grams: 160,
      maximum_grams: 230,
      confidence: 0.58,
      assumptions: ["single image"],
    },
    candidates: [{
      name: "steamed momo",
      search_terms: ["steamed momo", "dumpling steamed"],
      food_type: "PREPARED",
      preparations: [{ label: "steamed", confidence: 0.9 }],
      confidence: 0.88,
      uncertainty_notes: ["filling is not visible"],
    }],
  }],
};

test("Gemini scene adapter shares one candidate-only call between segmentation and identity", async () => {
  let calls = 0;
  let sent: Record<string, unknown> | null = null;
  let endpoint = "";
  const adapter = new GeminiFoodSceneAdapter({
    apiKey: "test-key",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake-image"), mediaType: "image/jpeg" }) },
    fetcher: async (_input, init) => {
      endpoint = String(_input);
      calls += 1;
      sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(scene) }] }] }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const segmentation = await adapter.segment({ imageReference: "img-1", mimeType: "image/jpeg", checksum: "abc" });
  assert.equal(segmentation.regions.length, 1);
  assert.deepEqual(segmentation.regions[0]?.bbox, { x: 0.2, y: 0.1, width: 0.6, height: 0.6 });
  assert.equal(segmentation.regions[0]?.maskPolygon?.length, 4);
  assert.equal(segmentation.regions[0]?.visualPortionEstimate?.centralGrams, 160);
  const candidates = await adapter.generateCandidates({ imageReference: "img-1", regionId: "region-1", mimeType: "image/jpeg", checksum: "abc" });
  assert.equal(calls, 1, "segmentation + identity should reuse the same scene call");
  assert.equal(candidates.candidates[0]?.name, "steamed momo");
  assert.equal(candidates.candidates[0]?.preparationCandidates[0]?.label, "steamed");
  assert.equal("calories" in (candidates.candidates[0] as object), false);
  const requestJson = JSON.stringify(sent);
  assert.equal(endpoint, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.ok(requestJson.includes("gemini-3.6-flash"));
  assert.ok(requestJson.includes("thinking_level"));
  // The output schema itself must contain identity/geometry fields, not nutrients.
  const responseFormat = (sent?.response_format ?? {}) as Record<string, unknown>;
  assert.equal(JSON.stringify(responseFormat).includes("visual_portion_estimate"), true);
  assert.equal(JSON.stringify(responseFormat).includes("protein_g"), false);
});

test("Gemini scene adapter rejects any provider response that leaks nutrient keys", async () => {
  const leaked = structuredClone(scene) as any;
  leaked.regions[0].candidates[0].calories = 500;
  const adapter = new GeminiFoodSceneAdapter({
    apiKey: "test-key",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake-image"), mediaType: "image/jpeg" }) },
    fetcher: async () => new Response(JSON.stringify({ output_text: JSON.stringify(leaked) }), { status: 200 }),
  });
  await assert.rejects(() => adapter.segment({ imageReference: "img-leak" }), /nutrition_leak_rejected/);
});

test("Gemini HTTP errors fail closed and never fabricate a scene", async () => {
  const adapter = new GeminiFoodSceneAdapter({
    apiKey: "test-key",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake-image"), mediaType: "image/jpeg" }) },
    fetcher: async () => new Response("quota", { status: 429 }),
    maxAttempts: 1,
    retryBaseDelayMs: 0,
  });
  await assert.rejects(() => adapter.segment({ imageReference: "img-429" }), /gemini_scene_rate_limited/);
});

test("Gemini candidate-only transport retries transient failures without weakening the nutrition firewall", async () => {
  let calls = 0;
  const adapter = new GeminiFoodSceneAdapter({
    apiKey: "test-key",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake-image"), mediaType: "image/jpeg" }) },
    maxAttempts: 2,
    retryBaseDelayMs: 0,
    fetcher: async () => {
      calls += 1;
      if (calls === 1) return new Response("temporary", { status: 503 });
      return new Response(JSON.stringify({ output_text: JSON.stringify(scene) }), { status: 200 });
    },
  });
  const result = await adapter.segment({ imageReference: "img-retry" });
  assert.equal(calls, 2);
  assert.equal(result.regions.length, 1);
  const candidates = await adapter.generateCandidates({ imageReference: "img-retry", regionId: "region-1" });
  assert.equal("calories" in (candidates.candidates[0] as object), false);
  assert.equal("estimated_grams" in (candidates.candidates[0] as object), false);
});

test("Gemini candidate-only transport classifies timeouts without returning fabricated candidates", async () => {
  const adapter = new GeminiFoodSceneAdapter({
    apiKey: "test-key",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake-image"), mediaType: "image/jpeg" }) },
    timeoutMs: 250,
    maxAttempts: 1,
    retryBaseDelayMs: 0,
    fetcher: async (_input, init) => await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      }, { once: true });
    }),
  });
  await assert.rejects(() => adapter.segment({ imageReference: "img-timeout" }), /gemini_scene_timeout/);
});

test("Gemini scene adapter honors Retry-After before retrying a rate-limited request", async () => {
  let calls = 0;
  const started = Date.now();
  const adapter = new GeminiFoodSceneAdapter({
    apiKey: "test-key",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake-image"), mediaType: "image/jpeg" }) },
    maxAttempts: 2,
    retryBaseDelayMs: 0,
    fetcher: async () => {
      calls += 1;
      if (calls === 1) return new Response("rate limited", { status: 429, headers: { "Retry-After": "0.02" } });
      return new Response(JSON.stringify({ output_text: JSON.stringify(scene) }), { status: 200 });
    },
  });
  const result = await adapter.segment({ imageReference: "img-retry-after" });
  assert.equal(result.regions.length, 1);
  assert.equal(calls, 2);
  assert.ok(Date.now() - started >= 15);
});

test("Gemini scene cache is owner scoped even when image references collide", async () => {
  let calls = 0;
  const adapter = new GeminiFoodSceneAdapter({
    apiKey: "test-key",
    imageStore: { read: async () => ({ bytes: Buffer.from("fake-image"), mediaType: "image/jpeg" }) },
    fetcher: async () => {
      calls += 1;
      return new Response(JSON.stringify({ output_text: JSON.stringify(scene) }), { status: 200 });
    },
  });
  await adapter.segment({ imageReference: "same-object", checksum: "same", ownerUserId: "user-a" });
  await adapter.generateCandidates({ imageReference: "same-object", checksum: "same", regionId: "region-1", ownerUserId: "user-a" });
  await adapter.segment({ imageReference: "same-object", checksum: "same", ownerUserId: "user-b" });
  assert.equal(calls, 2);
});
