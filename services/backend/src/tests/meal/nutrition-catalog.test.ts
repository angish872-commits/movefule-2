import assert from "node:assert/strict";
import test from "node:test";
import { FdcNutritionCatalogStore, LocalNutritionCatalogStore } from "../../meal/nutrition-catalog.ts";

test("local nutrition catalog searches fixture foods and stays explicitly non-authoritative", () => {
  const store = new LocalNutritionCatalogStore();
  const result = store.search("oatmeal");
  assert.equal(result.source, "local_fixture");
  assert.equal(result.verificationStatus, "fixture_verified");
  assert.equal(result.authorityStatus, "not_claimed");
  assert.ok(result.foods.length > 0);
  assert.equal(result.foods[0]?.basisAmount, 100);
  assert.equal(result.foods[0]?.basisUnit, "g");
  assert.equal(store.get(result.foods[0]!.sourceId)?.sourceId, result.foods[0]!.sourceId);
  assert.equal(store.get("missing-source"), null);
});

test("USDA nutrition catalog preserves provider provenance and omits incomplete nutrients", async () => {
  const store = new FdcNutritionCatalogStore(async () => [
    {
      fdcId: 1, dataType: "FOUNDATION", description: "Banana, raw", normalizedName: "banana raw",
      energyKcal: 89, proteinG: 1.09, carbG: 22.84, fatG: 0.33, fiberG: 2.6,
    },
    {
      fdcId: 2, dataType: "FOUNDATION", description: "Incomplete sample", normalizedName: "incomplete sample",
      energyKcal: 20, proteinG: null, carbG: 4, fatG: 0, fiberG: 1,
    },
  ]);
  const result = await store.search("banana", 10);
  assert.equal(result.source, "usda_fdc");
  assert.equal(result.verificationStatus, "provider_verified");
  assert.equal(result.authorityStatus, "trusted_reference");
  assert.deepEqual(result.foods.map((food) => food.sourceId), ["USDA_FDC:1"]);
  assert.equal(result.foods[0]?.energyKcal, 89);
  assert.equal((await store.get("USDA_FDC:1"))?.displayName, "Banana, raw");
  assert.equal(await store.get("USDA_FDC:2"), null);
});
