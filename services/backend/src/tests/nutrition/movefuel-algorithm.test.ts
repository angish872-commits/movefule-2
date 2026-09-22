import assert from "node:assert/strict";
import test from "node:test";
import { createMoveFuelAlgorithm, MOVEFUEL_ALGORITHM_VERSION } from "../../nutrition/algorithm/moveFuelAlgorithm.ts";
import { StaticDepthScaleAdapter } from "../../nutrition/portion/depthScaleAdapter.ts";
import { MetadataOnlyQualityAssessor } from "../../nutrition/vision/qualityAssessment.ts";
import { MockSegmentationAdapter } from "../helpers/mockSegmentationAdapter.ts";
import { MockCandidateProvider } from "../helpers/mockCandidateProvider.ts";

const region = { regionId: "r1", bbox: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, segmentationConfidence: 0.95, overlapState: "NONE" as const, warnings: [] };
const depth = new StaticDepthScaleAdapter({
  status: "COMPLETED",
  provider: "device-depth",
  providerVersion: "1",
  method: "DEVICE_DEPTH",
  scale: { calibrationId: "cam", sourceId: "intrinsics", sourceRevision: "1", minimumCmPerPixel: 0.095, centralCmPerPixel: 0.1, maximumCmPerPixel: 0.105, quality: "MEASURED" },
  heightSamples: [{ pixelArea: 1000, minimumHeightCm: 9, centralHeightCm: 10, maximumHeightCm: 11, confidence: 0.95 }],
  validCoverageFraction: 0.96,
  supportPlaneConfidence: 0.94,
  warnings: [],
});

test("canonical algorithm turns metric depth + identity-bound density into a mass and source-backed nutrient distribution", async () => {
  const pipeline = createMoveFuelAlgorithm({
    qualityAssessor: new MetadataOnlyQualityAssessor(),
    segmentationAdapter: new MockSegmentationAdapter({ regions: [region] }),
    candidateProvider: new MockCandidateProvider({ default: [{ name: "Rice, cooked", searchTerms: ["rice cooked"], foodType: "BASIC", preparationCandidates: [{ label: "cooked", confidence: 0.95 }], providerConfidence: 0.95 }] }),
    resolveFood: () => ({
      source: { source: "USDA_FDC", fdcId: 1, recipeRevisionId: null, dataType: "FOUNDATION", description: "Rice, cooked" },
      per100g: { energyKcal: 130, proteinG: 2.7, carbG: 28, fatG: 0.3, fiberG: 0.4, sodiumMg: 1 },
      matchQuality: 0.98,
      resolutionConfidence: 0.96,
      resolvedCandidateIndex: 0,
      resolvedPreparation: { label: "cooked", confidence: 0.95 },
    }),
    depthScaleAdapter: depth,
    resolveDensityForSource: () => ({ minimumGPerMl: 0.75, centralGPerMl: 0.8, maximumGPerMl: 0.85, densityId: "rice-cooked", sourceId: "weighed-density", sourceRevision: "1", evidenceQuality: "REVIEWED" }),
  });
  const result = await pipeline.run({ requestId: "v4-e2e", ownerUserId: "u1", imageReference: "img://1", widthPx: 1000, heightPx: 1000 });
  const item = result.items[0]!;
  assert.equal(MOVEFUEL_ALGORITHM_VERSION, "4.3.0");
  assert.equal(item.portion?.centralGrams, 80);
  assert.equal(item.portion?.fusionMethod, "SINGLE_EVIDENCE");
  assert.equal(item.portion?.physicalEvidenceGraph?.containsPhysicalMeasurement, true);
  assert.equal(item.portion?.massDistribution?.p50Grams, 80);
  assert.equal(item.nutrients?.energyKcal.central, 104);
  assert.equal(item.nutrientDistribution?.nutrients.energyKcal.p50, 104);
  assert.equal(item.nutrientDistribution?.massDistributionVersion, "1.0.0");
  assert.equal(item.selectedPreparation?.label, "cooked");
  assert.equal(result.confirmed, false);
});

test("canonical algorithm returns source-backed calories from a broad visual prior and requires review", async () => {
  const visualRegion = {
    ...region,
    visualPortionEstimate: {
      method: "MONOCULAR_MODEL_PRIOR" as const,
      minimumGrams: 90,
      centralGrams: 160,
      maximumGrams: 260,
      confidence: 0.55,
      assumptions: ["single overhead photo"],
    },
  };
  const pipeline = createMoveFuelAlgorithm({
    qualityAssessor: new MetadataOnlyQualityAssessor(),
    segmentationAdapter: new MockSegmentationAdapter({ regions: [visualRegion] }),
    candidateProvider: new MockCandidateProvider({ default: [{ name: "Rice, cooked", searchTerms: ["rice cooked"], foodType: "BASIC", preparationCandidates: [{ label: "cooked", confidence: 0.9 }], providerConfidence: 0.9 }] }),
    resolveFood: () => ({
      source: { source: "USDA_FDC", fdcId: 1, recipeRevisionId: null, dataType: "FOUNDATION", description: "Rice, cooked" },
      per100g: { energyKcal: 130, proteinG: 2.7, carbG: 28, fatG: 0.3, fiberG: 0.4, sodiumMg: 1 },
      matchQuality: 0.95,
      resolutionConfidence: 0.9,
    }),
  });

  const result = await pipeline.run({ requestId: "visual-prior-e2e", ownerUserId: "u1", imageReference: "img://visual" });
  const item = result.items[0]!;
  assert.equal(result.state, "NEEDS_CLARIFICATION");
  assert.equal(item.portion?.confidence, "LOW");
  assert.equal(item.portion?.centralGrams, 160);
  assert.deepEqual(item.portion?.evidenceUsed, ["VISUAL_MODEL_PORTION_PRIOR"]);
  assert.equal(item.portion?.physicalEvidenceGraph?.containsPhysicalMeasurement, false);
  assert.equal(item.nutrients?.energyKcal.central, 208);
  assert.equal(item.requiresUserConfirmation, true);
  assert.equal(result.confirmed, false);
});

test("scene-level manual grams are not multiplied across multiple food regions", async () => {
  const secondRegion = {
    ...region,
    regionId: "r2",
    bbox: { x: 0.55, y: 0.1, width: 0.35, height: 0.8 },
  };
  const pipeline = createMoveFuelAlgorithm({
    qualityAssessor: new MetadataOnlyQualityAssessor(),
    segmentationAdapter: new MockSegmentationAdapter({ regions: [region, secondRegion] }),
    candidateProvider: new MockCandidateProvider({
      default: [{
        name: "Rice, cooked",
        searchTerms: ["rice cooked"],
        foodType: "BASIC",
        preparationCandidates: [{ label: "cooked", confidence: 0.95 }],
        providerConfidence: 0.95,
      }],
    }),
    resolveFood: () => ({
      source: { source: "USDA_FDC", fdcId: 1, recipeRevisionId: null, dataType: "FOUNDATION", description: "Rice, cooked" },
      per100g: { energyKcal: 130, proteinG: 2.7, carbG: 28, fatG: 0.3, fiberG: 0.4, sodiumMg: 1 },
      matchQuality: 0.98,
      resolutionConfidence: 0.96,
      resolvedCandidateIndex: 0,
    }),
  });

  const result = await pipeline.run({
    requestId: "multi-food-scene-mass",
    ownerUserId: "u1",
    imageReference: "img://multi",
    manualGrams: 450,
  });

  assert.equal(result.state, "PORTION_INSUFFICIENT");
  assert.deepEqual(result.items.map((item) => item.portion?.centralGrams), [0, 0]);
  assert.ok(result.items.every((item) => item.portion?.selectedEvidenceType !== "MANUAL_GRAMS"));
});
