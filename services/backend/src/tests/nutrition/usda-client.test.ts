import assert from "node:assert/strict";
import test from "node:test";
import { FdcApiClient, FdcApiError, type Transport } from "../../nutrition/nutrients/usdaClient.ts";

function mockTransport(responses: Array<{ status: number; headers: Record<string, string>; body: string }>): Transport {
  let index = 0;
  return {
    async request() {
      const response = responses[Math.min(index, responses.length - 1)]!;
      index += 1;
      const headers = new Headers(response.headers);
      return { status: response.status, headers, text: response.body };
    },
  };
}

const VALID = { status: 200, headers: { "X-RateLimit-Limit": "1000", "X-RateLimit-Remaining": "999" }, body: JSON.stringify({ foods: [{ fdcId: 999001, dataType: "Foundation", description: "Rice, white, cooked" }] }) };

test("client reads key from env and calls search", async () => {
  process.env.USDA_FDC_API_KEY = "test-key";
  let requestBody = "";
  let apiKey = "";
  const client = new FdcApiClient({
    async request(input) {
      requestBody = input.body ?? "";
      apiKey = input.headers["X-Api-Key"] ?? "";
      return { status: VALID.status, headers: new Headers(VALID.headers), text: VALID.body };
    },
  }, { baseUrl: "https://example.invalid/fdc/v1" });
  const result = await client.search("  rice  ", 500);
  assert.equal(result.foods.length, 1);
  assert.equal(result.foods[0]!.fdcId, 999001);
  assert.equal(apiKey, "test-key");
  assert.deepEqual(JSON.parse(requestBody), { query: "rice", pageSize: 50, pageNumber: 1 });
  delete process.env.USDA_FDC_API_KEY;
});

test("client throws when key is missing", () => {
  delete process.env.USDA_FDC_API_KEY;
  assert.throws(
    () => new FdcApiClient(mockTransport([])),
    (error: unknown) => error instanceof FdcApiError && error.code === "missing_api_key",
  );
});

test("client honors Retry-After on 429 then succeeds", async () => {
  process.env.USDA_FDC_API_KEY = "test-key";
  let attempts = 0;
  const delays: number[] = [];
  const transport: Transport = {
    async request() {
      attempts += 1;
      if (attempts === 1) {
        return { status: 429, headers: new Headers({ "Retry-After": "0.01" }), text: "" };
      }
      return { status: VALID.status, headers: new Headers(VALID.headers), text: VALID.body };
    },
  };
  const client = new FdcApiClient(transport, {
    baseUrl: "https://example.invalid",
    maxRetries: 2,
    sleep: async (ms) => { delays.push(ms); },
  });
  const result = await client.search("rice");
  assert.equal(result.foods[0]?.fdcId, 999001);
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [10]);
  delete process.env.USDA_FDC_API_KEY;
});

test("client exhausts bounded retries on repeated 429", async () => {
  process.env.USDA_FDC_API_KEY = "test-key";
  let attempts = 0;
  const transport: Transport = {
    async request() {
      attempts += 1;
      return { status: 429, headers: new Headers(), text: "" };
    },
  };
  const client = new FdcApiClient(transport, {
    baseUrl: "https://example.invalid",
    maxRetries: 2,
    sleep: async () => {},
  });
  await assert.rejects(
    client.search("rice"),
    (error: unknown) => error instanceof FdcApiError && error.code === "rate_limited" && error.status === 429 && error.retryable === true,
  );
  assert.equal(attempts, 3);
  delete process.env.USDA_FDC_API_KEY;
});

test("client retries transient server and network failures", async () => {
  let attempts = 0;
  const delays: number[] = [];
  const transport: Transport = {
    async request() {
      attempts += 1;
      if (attempts === 1) throw new FdcApiError("network_error", "temporary", null, true);
      if (attempts === 2) return { status: 503, headers: new Headers({ "Retry-After": "0" }), text: "temporary" };
      return { status: VALID.status, headers: new Headers(VALID.headers), text: VALID.body };
    },
  };
  const client = new FdcApiClient(transport, {
    apiKey: "test-key",
    maxRetries: 3,
    sleep: async (ms) => { delays.push(ms); },
  });
  assert.equal((await client.search("rice")).foods.length, 1);
  assert.equal(attempts, 3);
  assert.equal(delays.length, 2);
});

test("client retries a sporadic 404 from the fixed food-search endpoint", async () => {
  let attempts = 0;
  const transport: Transport = {
    async request() {
      attempts += 1;
      if (attempts === 1) return { status: 404, headers: new Headers(), text: "upstream route unavailable" };
      return { status: VALID.status, headers: new Headers(VALID.headers), text: VALID.body };
    },
  };
  const client = new FdcApiClient(transport, { apiKey: "test-key", maxRetries: 1, sleep: async () => {} });
  assert.equal((await client.search("rice")).foods.length, 1);
  assert.equal(attempts, 2);
});

test("client rejects blank queries and malformed successful responses", async () => {
  const client = new FdcApiClient(mockTransport([{ status: 200, headers: {}, body: "{}" }]), { apiKey: "test-key" });
  await assert.rejects(() => client.search("   "), (error: unknown) => error instanceof FdcApiError && error.code === "invalid_request");
  await assert.rejects(() => client.search("rice"), (error: unknown) => error instanceof FdcApiError && error.code === "malformed_response");
});

test("client exposes rate limit headers", async () => {
  process.env.USDA_FDC_API_KEY = "test-key";
  const client = new FdcApiClient(mockTransport([VALID]), { baseUrl: "https://example.invalid" });
  await client.search("rice");
  assert.equal(client.lastRateLimit.limit, "1000");
  assert.equal(client.lastRateLimit.remaining, "999");
  delete process.env.USDA_FDC_API_KEY;
});

test("searchNutritionRecords normalizes FDC rows without inventing missing nutrients", async () => {
  process.env.USDA_FDC_API_KEY = "test-key";
  const body = JSON.stringify({ foods: [
    {
      fdcId: 123,
      dataType: "Survey (FNDDS)",
      description: "Rice, white, cooked",
      foodNutrients: [
        { nutrientId: 1008, value: 130 },
        { nutrientId: 1003, value: 2.7 },
        { nutrientId: 1005, value: 28.2 },
      ],
    },
    { fdcId: 999, dataType: "Unsupported future type", description: "Ignored", foodNutrients: [] },
  ] });
  const client = new FdcApiClient(mockTransport([{ status: 200, headers: {}, body }]), { baseUrl: "https://example.invalid" });
  const rows = await client.searchNutritionRecords("rice", 20, 6);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.dataType, "FNDDS");
  assert.equal(rows[0]!.normalizedName, "rice white cooked");
  assert.equal(rows[0]!.energyKcal, 130);
  assert.equal(rows[0]!.proteinG, 2.7);
  assert.equal(rows[0]!.carbG, 28.2);
  assert.equal(rows[0]!.fatG, null);
  assert.equal(rows[0]!.fiberG, null);
  assert.equal(rows[0]!.sodiumMg, null);
  delete process.env.USDA_FDC_API_KEY;
});

test("searchNutritionRecords prefers canonical kcal id order", async () => {
  process.env.USDA_FDC_API_KEY = "test-key";
  const body = JSON.stringify({ foods: [{
    fdcId: 124,
    dataType: "Foundation",
    description: "Test food",
    foodNutrients: [
      { nutrientId: 2047, value: 111 },
      { nutrientId: 1008, value: 222 },
      { nutrientId: 1003, value: 9 },
    ],
  }] });
  const client = new FdcApiClient(mockTransport([{ status: 200, headers: {}, body }]), { baseUrl: "https://example.invalid" });
  const rows = await client.searchNutritionRecords("test");
  assert.equal(rows[0]!.energyKcal, 222);
  delete process.env.USDA_FDC_API_KEY;
});
