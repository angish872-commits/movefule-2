import assert from "node:assert/strict";
import test from "node:test";
import { createConfiguredGeminiFoodSceneAdapter } from "../../nutrition/vision/configuredVision.ts";

test("configured vision adapter consumes a server-side key without exposing it in its public name", () => {
  const adapter = createConfiguredGeminiFoodSceneAdapter(
    { read: async () => ({ bytes: Buffer.from("x"), mediaType: "image/jpeg" }) },
    { apiKey: "private-test-key", model: "gemini-3.6-flash", fetcher: async () => new Response("", { status: 500 }) },
  );
  assert.equal(adapter.name, "gemini-food-scene-candidate-only");
  assert.equal(JSON.stringify(adapter).includes("private-test-key"), false);
});
