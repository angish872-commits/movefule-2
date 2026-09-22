import assert from "node:assert/strict";
import test from "node:test";
import { SidecarDepthScaleAdapter, DEPTH_SCALE_SIDECAR_SCHEMA } from "../../nutrition/portion/sidecarDepthScaleAdapter.ts";
import { depthScaleResultToVolume } from "../../nutrition/portion/depthScaleAdapter.ts";

const region = {
  regionId: "r1",
  bbox: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
  segmentationConfidence: 0.95,
  overlapState: "NONE" as const,
  warnings: [],
};

test("sidecar adapter replays calibrated physical evidence without mass/nutrition truth", async () => {
  const adapter = new SidecarDepthScaleAdapter({
    schema: DEPTH_SCALE_SIDECAR_SCHEMA,
    regions: [{
      status: "COMPLETED", provider: "nutrition5k-rgbd", providerVersion: "v1", regionId: "r1", method: "DEVICE_DEPTH",
      scale: { calibrationId: "cal", sourceId: "rig", sourceRevision: "paper", minimumCmPerPixel: 0.07, centralCmPerPixel: 0.077, maximumCmPerPixel: 0.084, quality: "MEASURED" },
      heightSamples: [{ pixelArea: 100, minimumHeightCm: 1, centralHeightCm: 2, maximumHeightCm: 3, confidence: 0.95 }],
      validCoverageFraction: 0.98, supportPlaneConfidence: 0.95, warnings: [],
    }],
  });
  const out = await adapter.analyzeRegion({ imageReference: "x", region });
  assert.equal(out.status, "COMPLETED");
  assert.ok(depthScaleResultToVolume(out)?.centralMl! > 1);
});

test("sidecar rejects completed monocular evidence with no physical scale", () => {
  assert.throws(() => new SidecarDepthScaleAdapter({
    schema: DEPTH_SCALE_SIDECAR_SCHEMA,
    regions: [{
      status: "COMPLETED", provider: "relative-depth", providerVersion: "v1", regionId: "r1", method: "MONOCULAR_CALIBRATED",
      scale: null, heightSamples: [{ pixelArea: 1, minimumHeightCm: 1, centralHeightCm: 1, maximumHeightCm: 1 }],
      validCoverageFraction: 1, supportPlaneConfidence: 1, warnings: [],
    }],
  }), /invalid_depth_scale_sidecar/);
});
