import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBarcode } from "../../nutrition/packaged/barcode.ts";
import { OpenFoodFactsClient } from "../../nutrition/packaged/openFoodFactsClient.ts";

const barcode = "3017624010701";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

test("barcode normalization validates GTIN check digit", () => {
  assert.equal(normalizeBarcode("3017 6240-10701"), barcode);
  assert.throws(() => normalizeBarcode("3017624010702"), /check digit/i);
  assert.throws(() => normalizeBarcode("123"), /GTIN/i);
});

test("Open Food Facts success preserves provider provenance, unknowns, units and serving basis", async () => {
  let request: RequestInfo | URL | undefined;
  let headers: HeadersInit | undefined;
  const client = new OpenFoodFactsClient({
    userAgent: "MoveFuel/1.0 (support@example.invalid)",
    fetchImpl: (async (input, init) => {
      request = input;
      headers = init?.headers;
      return jsonResponse({
        status: 1,
        product: {
          code: barcode,
          product_name: "Hazelnut spread",
          brands: "Example",
          rev: 42,
          serving_size: "15 g",
          serving_quantity: "15",
          serving_quantity_unit: "g",
          quantity: "350 g",
          nutriments: {
            "energy-kcal_100g": 539,
            proteins_100g: 6.3,
            carbohydrates_100g: 57.5,
            fat_100g: 30.9,
            fiber_100g: null,
            sodium_100g: 0.041,
          },
        },
      });
    }) as typeof fetch,
  });
  const result = await client.lookup(barcode);
  assert.equal(result.status, "FOUND");
  if (result.status !== "FOUND") return;
  assert.equal(result.record.sourceType, "OPEN_FOOD_FACTS");
  assert.equal(result.record.sourceReference, `barcode:${barcode}`);
  assert.equal(result.record.sourceRevision, "rev:42");
  assert.equal(result.record.servingGrams, 15);
  assert.equal(result.record.nutrientsPer100g.fiberG, null);
  assert.equal(result.record.nutrientsPer100g.sodiumMg, 41);
  assert.match(String(request), /api\/v2\/product\/3017624010701\.json/);
  assert.equal(new Headers(headers).get("user-agent"), "MoveFuel/1.0 (support@example.invalid)");
});

test("Open Food Facts not-found is a review fallback, not fabricated nutrition", async () => {
  const client = new OpenFoodFactsClient({
    userAgent: "MoveFuel/1.0 (support@example.invalid)",
    fetchImpl: (async () => jsonResponse({ status: 0 })) as typeof fetch,
  });
  assert.deepEqual(await client.lookup(barcode), { status: "NOT_FOUND", barcode });
});

test("Open Food Facts malformed product fails closed when core nutrients are absent", async () => {
  const client = new OpenFoodFactsClient({
    userAgent: "MoveFuel/1.0 (support@example.invalid)",
    fetchImpl: (async () => jsonResponse({ status: 1, product: { code: barcode, product_name: "Incomplete", nutriments: {} } })) as typeof fetch,
  });
  const result = await client.lookup(barcode);
  assert.equal(result.status, "MALFORMED");
});

test("Open Food Facts timeout is bounded and returns unavailable", async () => {
  const client = new OpenFoodFactsClient({
    userAgent: "MoveFuel/1.0 (support@example.invalid)",
    timeoutMs: 250,
    fetchImpl: ((_: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })) as typeof fetch,
  });
  const result = await client.lookup(barcode);
  assert.deepEqual(result, { status: "UNAVAILABLE", barcode, reason: "TIMEOUT" });
});

test("Open Food Facts rate limits remain distinct from not-found", async () => {
  const client = new OpenFoodFactsClient({
    userAgent: "MoveFuel/1.0 (support@example.invalid)",
    fetchImpl: (async () => jsonResponse({ status: 0 }, 429)) as typeof fetch,
  });
  assert.deepEqual(await client.lookup(barcode), { status: "UNAVAILABLE", barcode, reason: "RATE_LIMITED" });
});

test("milliliter serving is not silently converted to grams", async () => {
  const client = new OpenFoodFactsClient({
    userAgent: "MoveFuel/1.0 (support@example.invalid)",
    fetchImpl: (async () => jsonResponse({
      status: 1,
      product: {
        code: barcode,
        product_name: "Drink",
        serving_quantity: "250",
        serving_quantity_unit: "ml",
        nutriments: { "energy-kcal_100g": 40, proteins_100g: 0 },
      },
    })) as typeof fetch,
  });
  const result = await client.lookup(barcode);
  assert.equal(result.status, "FOUND");
  if (result.status === "FOUND") assert.equal(result.record.servingGrams, null);
});
