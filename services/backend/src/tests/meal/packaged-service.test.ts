import assert from "node:assert/strict";
import test from "node:test";
import { PackagedFoodService } from "../../nutrition/packaged/service.ts";

test("packaged service delegates exact lookup and preserves manual fallback", async () => {
  const service = new PackagedFoodService({ lookup: async () => ({ status: "NOT_FOUND", barcode: "3017624010701" }) });
  const result = await service.resolve("3017624010701");
  assert.deepEqual(result, { status: "MANUAL_FALLBACK", barcode: "3017624010701", reason: "NOT_FOUND" });
});

test("packaged service caches usable barcode results but never caches provider failures", async () => {
  let calls = 0;
  let now = 0;
  const service = new PackagedFoodService({
    lookup: async (barcode) => {
      calls += 1;
      return calls === 1
        ? { status: "FOUND", record: {
          barcode, productName: "Example", brand: null, sourceType: "OPEN_FOOD_FACTS", sourceReference: `barcode:${barcode}`, sourceRevision: null,
          nutrientsPer100g: { energyKcal: 100, proteinG: 5, carbG: 10, fatG: 2, fiberG: 1, sodiumMg: 0 }, servingGrams: 20, servingLabel: "20 g", quantityLabel: null, limitations: [],
        } }
        : { status: "UNAVAILABLE", barcode, reason: "RATE_LIMITED" };
    },
  }, { now: () => now });

  await service.resolve("3017624010701");
  await service.resolve("3017 6240-10701");
  assert.equal(calls, 1, "normalized barcode results should be cached");

  now += 86_400_001;
  await service.resolve("3017624010701");
  await service.resolve("3017624010701");
  assert.equal(calls, 3, "provider failures should not be cached");
});
