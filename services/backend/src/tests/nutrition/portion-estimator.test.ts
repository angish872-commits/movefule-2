import assert from "node:assert/strict";
import test from "node:test";
import { PORTION_ESTIMATOR_VERSION, PortionEstimator } from "../../nutrition/portion/portionEstimator.ts";
import { reliabilityTierOf, type PortionEvidenceRecord, type PortionEvidenceType } from "../../nutrition/portion/portionEvidence.ts";
import type { PortionCalibrationProfile } from "../../nutrition/confidence/intervalCalibration.ts";

function evidence(
  type: PortionEvidenceType,
  suppliedValue: number,
  unit: string,
  validationState: PortionEvidenceRecord["validationState"] = "CONFIRMED",
  extra: Partial<PortionEvidenceRecord> = {},
): PortionEvidenceRecord {
  return {
    evidenceType: type,
    suppliedValue,
    unit,
    source: "test",
    reliabilityTier: reliabilityTierOf(type),
    collectedAt: "2026-08-06T00:00:00Z",
    assumptions: [],
    validationState,
    ...extra,
  };
}

function ordered(estimate: { minimumGrams: number; centralGrams: number; maximumGrams: number }): void {
  assert.ok(estimate.minimumGrams >= 0, "minimum cannot be negative");
  assert.ok(estimate.minimumGrams <= estimate.centralGrams, "minimum <= central");
  assert.ok(estimate.centralGrams <= estimate.maximumGrams, "central <= maximum");
}

test("manual grams is authoritative direct mass without generic geometry", () => {
  const result = new PortionEstimator().estimate({ itemType: "BASIC", evidence: [evidence("MANUAL_GRAMS", 200, "g")] });
  assert.equal(result.confidence, "HIGH");
  assert.deepEqual([result.minimumGrams, result.centralGrams, result.maximumGrams], [198, 200, 202]);
  assert.equal(result.rangeCalibrated, false);
  ordered(result);
});

test("package label mass is HIGH", () => {
  const result = new PortionEstimator().estimate({ itemType: "PACKAGED", evidence: [evidence("PACKAGE_LABEL", 150, "g")] });
  assert.equal(result.confidence, "HIGH");
  assert.equal(result.centralGrams, 150);
});

test("piece count requires a verified per-piece mass", () => {
  const estimator = new PortionEstimator();
  const good = estimator.estimate({ itemType: "PREPARED", pieceBased: true, pieceWeightGrams: 25, evidence: [evidence("PIECE_COUNT", 8, "pieces", "REVIEWED")] });
  assert.equal(good.centralGrams, 200);
  assert.equal(good.confidence, "HIGH");
  const unresolved = estimator.estimate({ itemType: "PREPARED", pieceBased: true, evidence: [evidence("PIECE_COUNT", 8, "pieces", "REVIEWED")] });
  assert.equal(unresolved.confidence, "INSUFFICIENT");
  assert.equal(unresolved.requiresClarification, true);
});

test("plate diameter alone does not fabricate depth, density, or grams", () => {
  const result = new PortionEstimator().estimate({ itemType: "PREPARED", evidence: [evidence("KNOWN_PLATE_DIAMETER", 26, "cm", "REVIEWED")] });
  assert.equal(result.confidence, "INSUFFICIENT");
  assert.equal(result.centralGrams, 0);
  assert.ok(result.uncertainties.some((note) => note.includes("calibrated volume-to-mass")));
});

test("uncalibrated mask area never becomes a fake plate-based gram estimate", () => {
  const result = new PortionEstimator().estimate({ itemType: "PREPARED", evidence: [evidence("SEGMENTATION_AREA", 0.5, "fraction", "ESTIMATED")] });
  assert.equal(result.confidence, "INSUFFICIENT");
  assert.equal(result.centralGrams, 0);
  assert.equal(result.requiresClarification, true);
  assert.ok(result.evidenceRejected.includes("SEGMENTATION_AREA"));
});

test("previous confirmed serving remains a LOW behavioral prior", () => {
  const result = new PortionEstimator().estimate({ itemType: "BASIC", evidence: [evidence("PREVIOUS_CONFIRMED_PORTION", 300, "g")] });
  assert.equal(result.confidence, "LOW");
  assert.equal(result.centralGrams, 300);
  assert.equal(result.requiresClarification, true);
  assert.ok(result.uncertainties.some((note) => note.includes("prior")));
});

test("single-photo visual portion produces a LOW editable prior, never measured mass", () => {
  const result = new PortionEstimator().estimate({
    itemType: "PREPARED",
    evidence: [evidence("VISUAL_MODEL_PORTION_PRIOR", 200, "g", "ESTIMATED", { minimumValue: 110, maximumValue: 310 })],
  });
  assert.equal(result.confidence, "LOW");
  assert.deepEqual([result.minimumGrams, result.centralGrams, result.maximumGrams], [110, 200, 310]);
  assert.equal(result.fusionMethod, "PRIOR_ONLY");
  assert.equal(result.requiresClarification, true);
  assert.equal(result.requiresUserConfirmation, true);
  assert.ok(result.uncertainties.some((note) => note.includes("not a physical measurement")));
  assert.equal(result.physicalEvidenceGraph?.containsPhysicalMeasurement, false);
  assert.equal(result.physicalEvidenceGraph?.containsVisualPrior, true);
});

test("mixed dish does not corrupt known mass; composition uncertainty stays separate", () => {
  const estimator = new PortionEstimator();
  const plain = estimator.estimate({ itemType: "BASIC", evidence: [evidence("MANUAL_GRAMS", 200, "g")] });
  const mixed = estimator.estimate({ itemType: "MIXED_DISH", evidence: [evidence("MANUAL_GRAMS", 200, "g")] });
  assert.equal(mixed.confidence, "HIGH");
  assert.deepEqual([mixed.minimumGrams, mixed.centralGrams, mixed.maximumGrams], [plain.minimumGrams, plain.centralGrams, plain.maximumGrams]);
  assert.ok(mixed.uncertainties.some((note) => note.includes("calorie density")));
});

test("bowl capacity alone is not liquid fill mass", () => {
  const result = new PortionEstimator().estimate({ itemType: "LIQUID", evidence: [evidence("KNOWN_BOWL_VOLUME", 250, "ml", "REVIEWED")] });
  assert.equal(result.confidence, "INSUFFICIENT");
  assert.equal(result.centralGrams, 0);
  assert.ok(result.uncertainties.some((note) => note.includes("liquid requires")));
});

test("calibrated fill volume plus matched density produces a physical mass interval", () => {
  const result = new PortionEstimator().estimate({
    itemType: "LIQUID",
    evidence: [evidence("CONTAINER_FILL_VOLUME", 250, "ml", "REVIEWED", { minimumValue: 240, maximumValue: 260, calibrationId: "bowl-cal-v1" })],
    volumeDensityRange: {
      minimumGPerMl: 0.96,
      centralGPerMl: 1,
      maximumGPerMl: 1.04,
      densityId: "density-test",
      sourceId: "weighed-lab",
      sourceRevision: "1",
      evidenceQuality: "MEASURED",
    },
  });
  assert.equal(result.confidence, "MEDIUM");
  assert.deepEqual([result.minimumGrams, result.centralGrams, result.maximumGrams], [230.4, 250, 270.4]);
  assert.equal(result.requiresClarification, false);
});

test("calibrated volume without matched density stays unresolved", () => {
  const result = new PortionEstimator().estimate({
    itemType: "PREPARED",
    evidence: [evidence("CALIBRATED_DEPTH_VOLUME", 180, "ml", "REVIEWED", { calibrationId: "depth-v2" })],
  });
  assert.equal(result.confidence, "INSUFFICIENT");
  assert.equal(result.centralGrams, 0);
});

test("same-tier conflicting direct evidence widens range and reduces confidence", () => {
  const result = new PortionEstimator().estimate({
    itemType: "BASIC",
    evidence: [evidence("MANUAL_GRAMS", 100, "g"), evidence("PACKAGE_LABEL", 160, "g")],
  });
  assert.equal(result.confidence, "MEDIUM");
  assert.equal(result.centralGrams, 130);
  assert.ok(result.minimumGrams < 100);
  assert.ok(result.maximumGrams > 150);
  assert.ok(result.uncertainties.some((note) => note.includes("conflicts")));
  ordered(result);
});

test("held-out calibration can widen a physical estimate but never changes direct mass", () => {
  const profile: PortionCalibrationProfile = {
    profileId: "p1",
    scopeKey: "depth-volume",
    portionEstimatorVersion: PORTION_ESTIMATOR_VERSION,
    targetCoverage: 0.9,
    lowerMultiplier: 0.8,
    upperMultiplier: 1.25,
    medianMultiplier: 1.05,
    sampleCount: 100,
    benchmarkVersion: "bench-1",
    calibratedAt: "2026-08-10T00:00:00Z",
  };
  const estimator = new PortionEstimator();
  const physical = estimator.estimate({
    itemType: "BASIC",
    evidence: [evidence("CALIBRATED_VOLUME", 100, "ml", "REVIEWED", { minimumValue: 95, maximumValue: 105 })],
    volumeDensityRange: { minimumGPerMl: 1, centralGPerMl: 1, maximumGPerMl: 1, densityId: "d", sourceId: "s", sourceRevision: "1", evidenceQuality: "MEASURED" },
    calibrationProfile: profile,
  });
  assert.equal(physical.rangeCalibrated, true);
  assert.equal(physical.centralGrams, 105);
  assert.equal(physical.minimumGrams, 80);
  assert.equal(physical.maximumGrams, 125);
  const direct = estimator.estimate({ itemType: "BASIC", evidence: [evidence("MANUAL_GRAMS", 100, "g")], calibrationProfile: profile });
  assert.equal(direct.rangeCalibrated, false);
  assert.equal(direct.centralGrams, 100);
});

test("evidence cannot spoof a stronger reliability tier", () => {
  const spoofed = evidence("SEGMENTATION_AREA", 0.5, "fraction", "ESTIMATED", { reliabilityTier: 1 });
  const result = new PortionEstimator().estimate({ itemType: "BASIC", evidence: [spoofed] });
  assert.equal(result.confidence, "INSUFFICIENT");
  assert.ok(result.uncertainties.some((note) => note.includes("reliability_tier_mismatch")));
});

test("negative values are rejected; zero manual grams remains valid", () => {
  const estimator = new PortionEstimator();
  const negative = evidence("MANUAL_GRAMS", -5, "g");
  const rejected = estimator.estimate({ itemType: "BASIC", evidence: [negative] });
  assert.equal(rejected.confidence, "INSUFFICIENT");
  const zero = estimator.estimate({ itemType: "BASIC", evidence: [evidence("MANUAL_GRAMS", 0, "g")] });
  assert.equal(zero.centralGrams, 0);
  ordered(zero);
});

test("estimator output is deterministic", () => {
  const estimator = new PortionEstimator();
  const input = { itemType: "MIXED_DISH" as const, evidence: [evidence("MANUAL_GRAMS", 240, "g")] };
  assert.deepEqual(estimator.estimate(input), estimator.estimate(input));
});

test("Algorithm 4 robustly fuses two physical measurements into a mass distribution", () => {
  const result = new PortionEstimator().estimate({
    itemType: "BASIC",
    evidence: [
      evidence("CALIBRATED_DEPTH_VOLUME", 180, "ml", "REVIEWED", { minimumValue: 165, maximumValue: 195, calibrationId: "depth-a" }),
      evidence("CALIBRATED_VOLUME", 200, "ml", "REVIEWED", { minimumValue: 180, maximumValue: 220, calibrationId: "geometry-b" }),
    ],
    volumeDensityRange: { minimumGPerMl: 1, centralGPerMl: 1, maximumGPerMl: 1, densityId: "rice-density", sourceId: "weighed", sourceRevision: "1", evidenceQuality: "MEASURED" },
  });
  assert.equal(result.fusionMethod, "ROBUST_PRECISION_FUSION");
  assert.ok(result.centralGrams > 180 && result.centralGrams < 200);
  assert.ok(result.massDistribution);
  assert.ok(result.massDistribution!.p10Grams <= result.massDistribution!.p50Grams);
  assert.ok(result.massDistribution!.p50Grams <= result.massDistribution!.p90Grams);
  assert.equal(result.physicalEvidenceGraph?.containsPhysicalMeasurement, true);
});

test("identity-bound serving history cannot overpower calibrated physical evidence", () => {
  const result = new PortionEstimator().estimate({
    itemType: "BASIC",
    evidence: [
      evidence("CALIBRATED_DEPTH_VOLUME", 200, "ml", "REVIEWED", { minimumValue: 185, maximumValue: 215, calibrationId: "depth" }),
      evidence("PREVIOUS_CONFIRMED_PORTION", 420, "g", "CONFIRMED", { minimumValue: 360, maximumValue: 470 }),
    ],
    volumeDensityRange: { minimumGPerMl: 1, centralGPerMl: 1, maximumGPerMl: 1, densityId: "d", sourceId: "s", sourceRevision: "1", evidenceQuality: "MEASURED" },
  });
  assert.equal(result.fusionMethod, "ROBUST_PRECISION_FUSION");
  assert.ok(result.centralGrams < 240, `history moved physical estimate too far: ${result.centralGrams}`);
  assert.ok(result.uncertainties.some((note) => note.includes("weak identity-bound prior")));
});

test("direct reviewed grams reject behavioral serving history", () => {
  const result = new PortionEstimator().estimate({
    itemType: "BASIC",
    evidence: [evidence("MANUAL_GRAMS", 205, "g"), evidence("PREVIOUS_CONFIRMED_PORTION", 450, "g")],
  });
  assert.equal(result.fusionMethod, "DIRECT_AUTHORITY");
  assert.equal(result.centralGrams, 205);
  assert.ok(result.evidenceRejected.includes("PREVIOUS_CONFIRMED_PORTION"));
  assert.ok(result.uncertainties.some((note) => note.includes("ignored because direct mass")));
});
