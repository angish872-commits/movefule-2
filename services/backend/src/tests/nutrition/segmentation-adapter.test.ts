import assert from "node:assert/strict";
import test from "node:test";
import { MockSegmentationAdapter } from "../helpers/mockSegmentationAdapter.ts";
import { validateSegmentationAnalysis, type SegmentationAnalysis, type SegmentationRequest } from "../../nutrition/vision/segmentationAdapter.ts";

const REQUEST: SegmentationRequest = { imageReference: "tmp://img", checksum: "abc", correlationId: "corr-1" };

test("mock segmentation returns one region", async () => {
  const adapter = new MockSegmentationAdapter({ regions: [{ regionId: "region-1" }] });
  const analysis = await adapter.segment(REQUEST);
  assert.equal(analysis.status, "COMPLETED");
  assert.equal(analysis.regions.length, 1);
  assert.equal(analysis.regions[0]!.regionId, "region-1");
  assert.equal(validateSegmentationAnalysis(analysis).length, 0);
});

test("mock segmentation returns multiple regions", async () => {
  const adapter = new MockSegmentationAdapter({
    regions: [{ regionId: "region-1" }, { regionId: "region-2" }, { regionId: "region-3" }],
  });
  const analysis = await adapter.segment(REQUEST);
  assert.equal(analysis.regions.length, 3);
  assert.deepEqual(
    analysis.regions.map((region) => region.regionId),
    ["region-1", "region-2", "region-3"],
  );
});

test("mock segmentation returns zero regions", async () => {
  const adapter = new MockSegmentationAdapter({ zeroRegions: true });
  const analysis = await adapter.segment(REQUEST);
  assert.equal(analysis.status, "COMPLETED");
  assert.equal(analysis.regions.length, 0);
});

test("overlapping regions carry an overlap state", async () => {
  const adapter = new MockSegmentationAdapter({
    regions: [
      { regionId: "region-1", overlapState: "PARTIAL" },
      { regionId: "region-2", overlapState: "HEAVY" },
    ],
  });
  const analysis = await adapter.segment(REQUEST);
  assert.ok(analysis.regions.some((region) => region.overlapState === "HEAVY"));
  assert.ok(analysis.regions.some((region) => region.overlapState === "PARTIAL"));
});

test("invalid normalized bounds are rejected by validation", () => {
  const analysis: SegmentationAnalysis = {
    provider: "mock",
    providerVersion: "0.1.0",
    status: "COMPLETED",
    regions: [{ regionId: "r", bbox: { x: 0.9, y: 0.1, width: 0.5, height: 0.5 }, segmentationConfidence: 0.9, overlapState: "NONE", warnings: [] }],
    latencyMs: 1,
    warnings: [],
  };
  const errors = validateSegmentationAnalysis(analysis);
  assert.ok(errors.some((error) => error.includes("invalid_bbox")));
});

test("duplicate region IDs are rejected by validation", () => {
  const analysis: SegmentationAnalysis = {
    provider: "mock",
    providerVersion: "0.1.0",
    status: "COMPLETED",
    regions: [
      { regionId: "r", bbox: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 }, segmentationConfidence: 0.9, overlapState: "NONE", warnings: [] },
      { regionId: "r", bbox: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 }, segmentationConfidence: 0.9, overlapState: "NONE", warnings: [] },
    ],
    latencyMs: 1,
    warnings: [],
  };
  const errors = validateSegmentationAnalysis(analysis);
  assert.ok(errors.some((error) => error.includes("duplicate_region_id")));
});

test("mask unavailable falls back to bounding box", async () => {
  const adapter = new MockSegmentationAdapter({ regions: [{ regionId: "region-1" }], maskless: true });
  const analysis = await adapter.segment(REQUEST);
  assert.equal(analysis.regions.length, 1);
  assert.equal(analysis.regions[0]!.maskReference, undefined);
  assert.ok(analysis.regions[0]!.bbox.width > 0);
});

test("mock segmentation output is deterministic for identical input", async () => {
  const adapter = new MockSegmentationAdapter({});
  const first = await adapter.segment(REQUEST);
  const second = await adapter.segment(REQUEST);
  assert.deepEqual(first, second);
});

test("mock deterministic regions always satisfy the bounding-box contract", async () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const adapter = new MockSegmentationAdapter({});
    const analysis = await adapter.segment({ imageReference: `seed-${seed}`, checksum: `seed-${seed}` });
    const errors = validateSegmentationAnalysis(analysis);
    assert.deepEqual(errors, [], `seed ${seed} violated the contract: ${errors.join(", ")}`);
    for (const region of analysis.regions) {
      assert.ok(region.bbox.x >= 0 && region.bbox.y >= 0, "bbox origin must be non-negative");
      assert.ok(region.bbox.x + region.bbox.width <= 1 + 1e-9, "bbox must fit inside the unit square");
      assert.ok(region.bbox.y + region.bbox.height <= 1 + 1e-9, "bbox must fit inside the unit square");
    }
  }
});

test("segmentation output never carries nutrient values", async () => {
  const adapter = new MockSegmentationAdapter({ regions: [{ regionId: "region-1" }] });
  const analysis = await adapter.segment(REQUEST);
  assert.equal("nutrients" in analysis, false);
  assert.equal("calories" in analysis, false);
});
