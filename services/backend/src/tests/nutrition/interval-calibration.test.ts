import assert from "node:assert/strict";
import test from "node:test";
import { applyCalibrationProfile, fitEmpiricalCalibration } from "../../nutrition/confidence/intervalCalibration.ts";

test("calibration profile is not produced from too few weighed samples", () => {
  const profile = fitEmpiricalCalibration({
    profileId: "p", scopeKey: "depth", portionEstimatorVersion: "2.0.0", benchmarkVersion: "b1",
    samples: Array.from({ length: 10 }, () => ({ predictedCentralGrams: 100, actualGrams: 100 })),
  });
  assert.equal(profile, null);
});

test("held-out weighed samples create a reproducible multiplicative interval profile", () => {
  const ratios = Array.from({ length: 40 }, (_, index) => 0.8 + index * 0.01);
  const profile = fitEmpiricalCalibration({
    profileId: "p", scopeKey: "depth", portionEstimatorVersion: "2.0.0", benchmarkVersion: "b1", targetCoverage: 0.9,
    calibratedAt: "2026-08-10T00:00:00Z",
    samples: ratios.map((ratio) => ({ predictedCentralGrams: 100, actualGrams: 100 * ratio })),
  });
  assert.ok(profile);
  assert.equal(profile?.sampleCount, 40);
  assert.ok((profile?.lowerMultiplier ?? 0) < (profile?.medianMultiplier ?? 0));
  assert.ok((profile?.upperMultiplier ?? 0) > (profile?.medianMultiplier ?? 0));
  const applied = applyCalibrationProfile({ minimumGrams: 95, centralGrams: 100, maximumGrams: 105 }, profile);
  assert.equal(applied.calibrated, true);
  assert.ok(applied.minimumGrams <= applied.centralGrams);
  assert.ok(applied.centralGrams <= applied.maximumGrams);
});
