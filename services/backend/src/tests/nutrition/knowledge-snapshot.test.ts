import assert from "node:assert/strict";
import test from "node:test";
import { fdcIdFromDensityReference, productionDensityRangeForFdcId, productionDensityRecordsFromSnapshot } from "../../nutrition/identity/knowledgeSnapshot.ts";

test("knowledge snapshot admits USDA-derived density but excludes rights-gated FAO density", () => {
  const rows = productionDensityRecordsFromSnapshot({ density_records: [
    { density_id: "u1", source_id: "usda_fdc", source_version: "04-2026", food_name: "Rice cooked", preparation: "any", physical_form: "any", density_central_g_ml: .8, density_min_g_ml: .75, density_max_g_ml: .85, evidence_quality: "DERIVED", source_reference: "FoodData Central fdcId 123" },
    { density_id: "f1", source_id: "fao_infoods_density", source_version: "2", food_name: "Rice cooked", preparation: "any", physical_form: "any", density_central_g_ml: .8, density_min_g_ml: .7, density_max_g_ml: .9, evidence_quality: "REVIEWED" },
  ] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.sourceId, "usda_fdc");
});

test("FDC id is recovered only from USDA density provenance", () => {
  assert.equal(fdcIdFromDensityReference({ source_id: "usda_fdc", source_reference: "FoodData Central fdcId 123456" }), 123456);
  assert.equal(fdcIdFromDensityReference({ source_id: "fao_infoods_density", source_reference: "fdcId 123456" }), null);
});


test("exact FDC density resolution binds volume-to-mass evidence to the selected nutrition record", () => {
  const snapshot = { density_records: [
    { density_id: "a", source_id: "usda_fdc", source_version: "2026-04", food_name: "Rice cooked", preparation: "any", physical_form: "any", density_central_g_ml: 0.8, density_min_g_ml: 0.7, density_max_g_ml: 0.9, evidence_quality: "DERIVED", source_reference: "FoodData Central fdcId 123" },
    { density_id: "b", source_id: "usda_fdc", source_version: "2026-04", food_name: "Yogurt", preparation: "any", physical_form: "any", density_central_g_ml: 1.05, density_min_g_ml: 1.0, density_max_g_ml: 1.1, evidence_quality: "DERIVED", source_reference: "FoodData Central fdcId 456" },
  ] };
  assert.equal(productionDensityRangeForFdcId(snapshot, 123)?.centralGPerMl, 0.8);
  assert.equal(productionDensityRangeForFdcId(snapshot, 999), null);
});
