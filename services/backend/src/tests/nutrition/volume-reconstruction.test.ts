import assert from "node:assert/strict";
import test from "node:test";
import { reconstructPhysicalVolume, volumeResultToEvidence } from "../../nutrition/portion/volumeReconstruction.ts";

const scale = {
  calibrationId: "cal-plate-1",
  sourceId: "known-reference-card",
  sourceRevision: "v1",
  minimumCmPerPixel: 0.09,
  centralCmPerPixel: 0.1,
  maximumCmPerPixel: 0.11,
  quality: "MEASURED" as const,
};

test("physical volume integrates calibrated pixel area times food height and preserves a range", () => {
  const result = reconstructPhysicalVolume({
    scale,
    provider: "device-depth",
    providerVersion: "1",
    validCoverageFraction: 0.95,
    samples: [
      { pixelArea: 1000, minimumHeightCm: 1.8, centralHeightCm: 2, maximumHeightCm: 2.2, confidence: 0.95 },
      { pixelArea: 500, minimumHeightCm: 0.8, centralHeightCm: 1, maximumHeightCm: 1.2, confidence: 0.9 },
    ],
  });
  assert.ok(result);
  assert.equal(result?.centralMl, 25);
  assert.ok((result?.minimumMl ?? 0) < 25);
  assert.ok((result?.maximumMl ?? 0) > 25);
  assert.equal(result?.confidence, "HIGH");
  const evidence = volumeResultToEvidence(result!, "2026-08-10T00:00:00Z");
  assert.equal(evidence?.evidenceType, "CALIBRATED_DEPTH_VOLUME");
  assert.equal(evidence?.reliabilityTier, 3);
});

test("raw/unproven scale cannot produce an authoritative volume", () => {
  const result = reconstructPhysicalVolume({
    scale: { ...scale, calibrationId: "" },
    provider: "monocular-depth",
    providerVersion: "1",
    samples: [{ pixelArea: 1000, minimumHeightCm: 1, centralHeightCm: 2, maximumHeightCm: 3 }],
  });
  assert.equal(result, null);
});

test("incomplete coverage lowers confidence and never extrapolates invisible food", () => {
  const result = reconstructPhysicalVolume({
    scale,
    provider: "device-depth",
    providerVersion: "1",
    validCoverageFraction: 0.5,
    samples: [{ pixelArea: 1000, minimumHeightCm: 1.8, centralHeightCm: 2, maximumHeightCm: 2.2, confidence: 0.95 }],
  });
  assert.ok(result);
  assert.equal(result?.centralMl, 20, "coverage is a confidence signal, not a multiplier used to invent hidden volume");
  assert.equal(result?.confidence, "LOW");
  assert.ok(result?.uncertainties.some((value) => value.includes("incomplete")));
});
