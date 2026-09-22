import assert from "node:assert/strict";
import test from "node:test";
import { MockCandidateProvider } from "../helpers/mockCandidateProvider.ts";
import { MockSegmentationAdapter } from "../helpers/mockSegmentationAdapter.ts";
import { LiveImageEstimateService, loadCalibrationProfilesFromFile, loadKnowledgeSnapshotFromFile, loadReviewedRecipeSnapshotFromFile } from "../../nutrition/service/liveImageEstimateService.ts";
import { FdcApiError } from "../../nutrition/nutrients/usdaClient.ts";
import { MemoryServingPriorStore } from "../../nutrition/personalization/servingPriorStore.ts";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

function sceneAdapter(counter: { calls: number }) {
  const segmentation = new MockSegmentationAdapter({
    regions: [{ regionId: "region-1", segmentationConfidence: 0.95 }],
  });
  const candidate = new MockCandidateProvider({
    byRegion: {
      "region-1": [{
        name: "Rice",
        searchTerms: ["rice"],
        foodType: "BASIC",
        providerConfidence: 0.96,
      }],
    },
  });
  return {
    async segment(input: Parameters<typeof segmentation.segment>[0]) {
      counter.calls += 1;
      return segmentation.segment(input);
    },
    async generateCandidates(input: Parameters<typeof candidate.generateCandidates>[0]) {
      counter.calls += 1;
      return candidate.generateCandidates(input);
    },
  };
}

const riceRecord = {
  fdcId: 1001,
  dataType: "FOUNDATION" as const,
  description: "Rice",
  normalizedName: "rice",
  nutrientIds: [1008, 1003, 1005, 1004, 1079],
  energyKcal: 130,
  proteinG: 2.7,
  carbG: 28,
  fatG: 0.3,
  fiberG: 0.4,
  sodiumMg: 1,
};

const imageStore = {
  async read() {
    return { bytes: Buffer.from("not-used-by-test-adapters"), mediaType: "image/jpeg" as const };
  },
};

test("live production path resolves identity/source but abstains from mass without physical evidence", async () => {
  const counter = { calls: 0 };
  const service = new LiveImageEstimateService({
    imageStore,
    sceneAdapter: sceneAdapter(counter),
    nutritionSearch: async () => [riceRecord],
    pixelQualityAssessor: null,
  });

  const result = await service.estimate({
    ownerUserId: "user-a",
    draftId: "draft-1",
    idempotencyKey: "estimate-1",
    imageReference: "object-1",
    mimeType: "image/jpeg",
  });

  assert.equal(service.configured, true);
  assert.equal(service.algorithmVersion, "4.3.0");
  assert.equal(result.state, "PORTION_INSUFFICIENT");
  assert.equal(result.items[0]?.candidates[0]?.name, "Rice");
  assert.equal(result.items[0]?.selectedSource?.fdcId, 1001);
  assert.equal(result.items[0]?.nutrients, null);
  assert.equal(result.confirmed, false);
  assert.equal(counter.calls, 2);
});

test("reviewed gram correction recalculates trusted nutrition without another vision call", async () => {
  const counter = { calls: 0 };
  const service = new LiveImageEstimateService({
    imageStore,
    sceneAdapter: sceneAdapter(counter),
    nutritionSearch: async () => [riceRecord],
    pixelQualityAssessor: null,
  });

  const initial = await service.estimate({
    ownerUserId: "user-a",
    draftId: "draft-2",
    idempotencyKey: "estimate-2",
    imageReference: "object-2",
    mimeType: "image/jpeg",
  });
  const corrected = service.correct(initial.resultId, "user-a", "item-1", {
    kind: "portion_grams",
    minimumGrams: 190,
    centralGrams: 200,
    maximumGrams: 210,
  });

  assert.equal(counter.calls, 2, "correction must not invoke segmentation/AI again");
  assert.equal(corrected.items[0]?.portion?.centralGrams, 200);
  assert.equal(corrected.items[0]?.nutrients?.energyKcal.central, 260);
  assert.equal(corrected.items[0]?.nutrients?.proteinG.central, 5.4);
  assert.equal(corrected.items[0]?.nutrientDistribution?.massDistributionVersion, "1.0.0");
  assert.equal(corrected.items[0]?.nutrientDistribution?.nutrients.energyKcal.p50, 260);
  assert.equal(corrected.confirmed, false);
});

test("manual grams provided before analysis can complete the same candidate-only production path", async () => {
  const counter = { calls: 0 };
  const service = new LiveImageEstimateService({
    imageStore,
    sceneAdapter: sceneAdapter(counter),
    nutritionSearch: async () => [riceRecord],
    pixelQualityAssessor: null,
  });

  const result = await service.estimate({
    ownerUserId: "user-a",
    draftId: "draft-3",
    idempotencyKey: "estimate-3",
    imageReference: "object-3",
    mimeType: "image/jpeg",
    manualGrams: 200,
  });

  assert.equal(result.state, "COMPLETED_NEEDS_CONFIRMATION");
  assert.equal(result.items[0]?.portion?.centralGrams, 200);
  assert.equal(result.items[0]?.nutrients?.energyKcal.central, 260);
  assert.equal(result.requiresUserConfirmation, true);
  assert.equal(result.confirmed, false);
});

test("estimate results remain owner scoped", async () => {
  const counter = { calls: 0 };
  const service = new LiveImageEstimateService({
    imageStore,
    sceneAdapter: sceneAdapter(counter),
    nutritionSearch: async () => [riceRecord],
    pixelQualityAssessor: null,
  });
  const result = await service.estimate({
    ownerUserId: "user-a",
    draftId: "draft-4",
    idempotencyKey: "estimate-4",
    imageReference: "object-4",
  });
  assert.throws(() => service.get(result.resultId, "user-b"), /does not own this estimate/i);
});

test("USDA rate limits remain visible as provider state rather than no-food evidence", async () => {
  const service = new LiveImageEstimateService({
    imageStore,
    sceneAdapter: sceneAdapter({ calls: 0 }),
    nutritionSearch: async () => { throw new FdcApiError("rate_limited", "temporary", 429, true); },
    pixelQualityAssessor: null,
  });
  const result = await service.estimate({
    ownerUserId: "user-rate-limit",
    draftId: "rate-limit-draft",
    idempotencyKey: "rate-limit-request",
    imageReference: "rate-limit-image",
    manualGrams: 100,
  });
  assert.equal(result.state, "NUTRITION_SOURCE_NOT_RESOLVED");
  assert.equal(result.items[0]?.selectedSource, null);
  assert.ok(result.items[0]?.uncertainties.includes("USDA_PROVIDER_RATE_LIMITED"));
  assert.equal(result.confirmed, false);
});

test("live nutrition prefetch bounds catalogue concurrency per visual candidate set", async () => {
  let active = 0;
  let maxActive = 0;
  const segmentation = new MockSegmentationAdapter({ regions: [{ regionId: "region-1", segmentationConfidence: 0.95 }] });
  const candidate = new MockCandidateProvider({ byRegion: { "region-1": [{
    name: "Rice",
    searchTerms: ["rice cooked", "white rice", "steamed rice", "rice plain", "long grain rice", "boiled rice"],
    foodType: "BASIC",
    preparationCandidates: [{ label: "cooked", confidence: 0.9 }],
    providerConfidence: 0.95,
  }] } });
  const service = new LiveImageEstimateService({
    imageStore,
    sceneAdapter: {
      segment: (input) => segmentation.segment(input),
      generateCandidates: (input) => candidate.generateCandidates(input),
    },
    nutritionSearch: async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 3));
      active -= 1;
      return [riceRecord];
    },
    pixelQualityAssessor: null,
  });

  await service.estimate({
    ownerUserId: "user-a",
    draftId: "prefetch-bounded",
    idempotencyKey: "prefetch-bounded",
    imageReference: "object-prefetch-bounded",
    manualGrams: 100,
  });
  assert.ok(maxActive <= 3, `expected at most 3 concurrent catalogue calls, saw ${maxActive}`);
});


test("confirmed servings become a weak identity-bound prior only after the minimum evidence count", async () => {
  const priorStore = new MemoryServingPriorStore({ minimumSamples: 2 });
  const service = new LiveImageEstimateService({
    imageStore,
    sceneAdapter: sceneAdapter({ calls: 0 }),
    nutritionSearch: async () => [riceRecord],
    pixelQualityAssessor: null,
    servingPriorStore: priorStore,
  });

  const first = await service.estimate({ ownerUserId: "user-prior", draftId: "p1", idempotencyKey: "p1", imageReference: "p1", manualGrams: 180 });
  await service.learnConfirmed(first.resultId, "user-prior");
  const beforeMinimum = await service.estimate({ ownerUserId: "user-prior", draftId: "p2", idempotencyKey: "p2-no-mass", imageReference: "p2" });
  assert.equal(beforeMinimum.items[0]?.portion?.centralGrams, 0);

  const second = await service.estimate({ ownerUserId: "user-prior", draftId: "p3", idempotencyKey: "p3", imageReference: "p3", manualGrams: 220 });
  await service.learnConfirmed(second.resultId, "user-prior");
  const learned = await service.estimate({ ownerUserId: "user-prior", draftId: "p4", idempotencyKey: "p4", imageReference: "p4" });
  assert.equal(learned.items[0]?.portion?.fusionMethod, "PRIOR_ONLY");
  assert.equal(learned.items[0]?.portion?.centralGrams, 200);
  assert.equal(learned.items[0]?.portion?.confidence, "LOW");
  assert.equal(learned.items[0]?.portion?.physicalEvidenceGraph?.containsBehavioralPrior, true);

  const otherUser = await service.estimate({ ownerUserId: "other-user", draftId: "p5", idempotencyKey: "p5", imageReference: "p5" });
  assert.equal(otherUser.items[0]?.portion?.centralGrams, 0);
});

test("calibration profile loader accepts valid held-out profiles and fails closed on malformed rows", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "movefuel-calibration-"));
  try {
    const file = path.join(root, "profiles.json");
    await writeFile(file, JSON.stringify({ profiles: [
      { profileId: "valid", scopeKey: "global", algorithmVersion: "3.1.0", targetCoverage: 0.9, lowerMultiplier: 0.8, medianMultiplier: 1, upperMultiplier: 1.2, sampleCount: 100, benchmarkVersion: "blind-1", calibratedAt: "2026-08-15T00:00:00Z" },
      { profileId: "bad", scopeKey: "global", algorithmVersion: "3.1.0", targetCoverage: 5, lowerMultiplier: 1.2, medianMultiplier: 1, upperMultiplier: 0.8, sampleCount: 0, benchmarkVersion: "", calibratedAt: "bad" },
    ] }));
    const profiles = loadCalibrationProfilesFromFile(file);
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0]?.profileId, "valid");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test("knowledge snapshot loader rejects readable JSON without production-cleared density", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "movefuel-knowledge-"));
  try {
    const unsafe = path.join(dir, "unsafe.json");
    const safe = path.join(dir, "safe.json");
    await writeFile(unsafe, JSON.stringify({ density_records: [{ density_id: "fao", source_id: "fao_infoods_density", source_version: "1", food_name: "rice", density_central_g_ml: 0.8, density_min_g_ml: 0.7, density_max_g_ml: 0.9, evidence_quality: "REVIEWED" }] }));
    await writeFile(safe, JSON.stringify({ density_records: [{ density_id: "fdc-1", source_id: "usda_fdc", source_version: "2026-04", food_name: "rice", density_central_g_ml: 0.8, density_min_g_ml: 0.7, density_max_g_ml: 0.9, evidence_quality: "DERIVED", source_reference: "FoodData Central fdcId 1001" }] }));
    assert.equal(loadKnowledgeSnapshotFromFile(unsafe), null);
    assert.equal(loadKnowledgeSnapshotFromFile(path.join(dir, "missing.json")), null);
    assert.equal(loadKnowledgeSnapshotFromFile(safe)?.density_records?.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});


test("reviewed recipe snapshot loader accepts only checksum-valid reviewed artifacts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "movefuel-reviewed-recipes-"));
  try {
    const invalid = path.join(root, "invalid.json");
    await writeFile(invalid, JSON.stringify({ format: "movefuel-reviewed-recipes-v1", snapshotVersion: "r1", generatedAt: "2026-08-17T00:00:00Z", records: [] }));
    assert.equal(loadReviewedRecipeSnapshotFromFile(invalid), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
