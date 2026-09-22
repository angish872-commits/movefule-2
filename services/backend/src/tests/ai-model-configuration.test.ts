import assert from "node:assert/strict";
import test from "node:test";
import { FallbackModelConfigurationStore, MemoryModelConfigurationStore, parseModelRoute } from "../nutrition/vision/config/modelConfiguration.ts";

test("model configuration accepts only supported active providers and bounds unsafe values", () => {
  const route = parseModelRoute({ modelConfigId: "or", taskType: "food_vision", provider: "openrouter", modelName: "google/gemini-2.5-flash", temperature: 99, maxOutputTokens: 999999, timeoutMs: 1, retryPolicyJson: '{"maxAttempts":99,"baseDelayMs":99999}', priority: 5, state: "ACTIVE" });
  assert.ok(route);
  assert.equal(route?.temperature, 1);
  assert.equal(route?.maxOutputTokens, 8192);
  assert.equal(route?.timeoutMs, 500);
  assert.equal(route?.maxAttempts, 4);
  assert.equal(route?.retryBaseDelayMs, 8000);
  assert.equal(parseModelRoute({ modelConfigId: "x", taskType: "food_vision", provider: "unknown", modelName: "x", state: "ACTIVE" }), null);
  assert.equal(parseModelRoute({ modelConfigId: "x", taskType: "food_vision", provider: "openrouter", modelName: "x", state: "DISABLED" }), null);
});

test("fallback model store keeps server-secret fallbacks available after database routes", async () => {
  const db = new MemoryModelConfigurationStore([{ modelConfigId: "db", taskType: "food_vision", provider: "openrouter", modelName: "openrouter-model", temperature: 0.1, maxOutputTokens: 1000, timeoutMs: 1000, maxAttempts: 1, retryBaseDelayMs: 0, priority: 1 }]);
  const fallback = new MemoryModelConfigurationStore([{ modelConfigId: "env", taskType: "food_vision", provider: "gemini", modelName: "gemini-test", temperature: 0.1, maxOutputTokens: 1000, timeoutMs: 1000, maxAttempts: 1, retryBaseDelayMs: 0, priority: 20 }]);
  const store = new FallbackModelConfigurationStore([db, fallback]);
  assert.deepEqual((await store.activeRoutes("food_vision")).map((route) => route.modelConfigId), ["db", "env"]);
  const outageStore = new FallbackModelConfigurationStore([{ activeRoutes: async () => { throw new Error("db-down"); } }, fallback]);
  assert.equal((await outageStore.activeRoutes("food_vision"))[0]?.modelConfigId, "env");
});
