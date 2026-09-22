import assert from "node:assert/strict";
import test from "node:test";
import { DensityLibrary, type FoodDensityRecord } from "../../nutrition/portion/densityLibrary.ts";

const records: FoodDensityRecord[] = [
  {
    densityId: "rice-cooked-v1", foodKey: "rice:white", preparation: "cooked", physicalForm: "loose",
    densityCentralGPerMl: 0.72, densityMinGPerMl: 0.65, densityMaxGPerMl: 0.8,
    sourceId: "weighed-study", sourceRevision: "1", evidenceQuality: "MEASURED", sampleCount: 40,
    regionCuisine: "global", effectiveFrom: "2026-08-01T00:00:00Z",
  },
  {
    densityId: "rice-raw-v1", foodKey: "rice:white", preparation: "raw", physicalForm: "loose",
    densityCentralGPerMl: 0.88, densityMinGPerMl: 0.8, densityMaxGPerMl: 0.95,
    sourceId: "weighed-study", sourceRevision: "1", evidenceQuality: "MEASURED", sampleCount: 40,
    effectiveFrom: "2026-08-01T00:00:00Z",
  },
];

test("density library resolves food + preparation + form with provenance", () => {
  const result = new DensityLibrary(records).resolve({ foodKey: "rice:white", preparation: "cooked", physicalForm: "loose", at: "2026-08-10T00:00:00Z" });
  assert.ok(result);
  assert.equal(result?.densityId, "rice-cooked-v1");
  assert.equal(result?.centralGPerMl, 0.72);
  assert.equal(result?.sourceRevision, "1");
});

test("density library refuses unmatched preparation instead of using generic 1.0 g/ml", () => {
  const result = new DensityLibrary(records).resolve({ foodKey: "rice:white", preparation: "fried", physicalForm: "loose", at: "2026-08-10T00:00:00Z" });
  assert.equal(result, null);
});

test("invalid density intervals are rejected at library construction", () => {
  assert.throws(() => new DensityLibrary([{ ...records[0]!, densityMinGPerMl: 0.9, densityMaxGPerMl: 0.7 }]));
});
