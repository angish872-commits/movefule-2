import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createPackagedFoodRouteHandler } from "../../http/packaged-food-routes.ts";
import type { PackagedFoodResolution } from "../../nutrition/packaged/packagedFoodService.ts";

async function call(handler: ReturnType<typeof createPackagedFoodRouteHandler>, path: string) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (!await handler(req, res, { userId: "user-a", correlationId: "corr", url })) {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test_server_address_missing");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    return { status: response.status, body: await response.json() as any };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("packaged route remains review-only and never promotes provider lookup to canonical authority", async () => {
  const resolution: PackagedFoodResolution = {
    status: "NEEDS_REVIEW",
    barcode: "3017624010701",
    item: {
      itemId: "barcode:3017624010701",
      displayName: "Reviewed candidate",
      portionGrams: 15,
      energyKcal: 80,
      proteinGrams: 2,
      carbGrams: null,
      fatGrams: 4,
      fiberGrams: null,
      confidence: "high",
      energyRangeKcal: { min: 80, max: 80 },
    },
    sourceRecord: {
      barcode: "3017624010701",
      productName: "Reviewed candidate",
      brand: null,
      sourceType: "OPEN_FOOD_FACTS",
      sourceReference: "barcode:3017624010701",
      sourceRevision: "rev:1",
      nutrientsPer100g: { energyKcal: 533, proteinG: 13, carbG: null, fatG: 27, fiberG: null, sodiumMg: null },
      servingGrams: 15,
      servingLabel: "15 g",
      quantityLabel: null,
      limitations: ["CARBOHYDRATE_UNKNOWN", "FIBER_UNKNOWN"],
    },
  };
  const handler = createPackagedFoodRouteHandler({ resolve: async () => resolution });
  const result = await call(handler, "/v1/nutrition/packaged?barcode=3017624010701");
  assert.equal(result.status, 200);
  assert.equal(result.body.data.requiresUserReview, true);
  assert.equal(result.body.data.canonicalAuthority, false);
  assert.equal(result.body.data.resolution.status, "NEEDS_REVIEW");
  assert.equal(result.body.data.resolution.item.carbGrams, null);
});

test("unconfigured packaged route fails closed to manual/search fallback", async () => {
  const result = await call(createPackagedFoodRouteHandler(), "/v1/nutrition/packaged?barcode=3017624010701");
  assert.equal(result.status, 503);
  assert.equal(result.body.error.code, "packaged_food_provider_not_configured");
});
