import { MockPixelQualityAssessor } from "../helpers/mockPixelQualityAssessor.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { MetadataOnlyQualityAssessor } from "../../nutrition/vision/qualityAssessment.ts";
import { MockSegmentationAdapter } from "../helpers/mockSegmentationAdapter.ts";
import { MockCandidateProvider } from "../helpers/mockCandidateProvider.ts";
import { PortionEstimator } from "../../nutrition/portion/portionEstimator.ts";
import { ClarificationEngine } from "../../nutrition/confidence/clarification.ts";
import {
  ImageEstimatePipeline,
  EstimateAccessError,
  ImageEstimatePipelineError,
  type FoodSourceResolution,
  type ImageEstimateRequest,
  type Per100gNutrients,
} from "../../nutrition/algorithm/imageEstimatePipeline.ts";
import type { CandidateGenerationResult, CandidateProvider } from "../../nutrition/vision/candidateProviderAdapter.ts";
import type { PortionEvidenceRecord } from "../../nutrition/portion/portionEvidence.ts";
import type { NutritionSource } from "../../nutrition/algorithm/contracts.ts";

const PER100G: Per100gNutrients = { energyKcal: 200, proteinG: 8, carbG: 30, fatG: 5, fiberG: 1, sodiumMg: 400 };
const SOURCE: NutritionSource = { source: "USDA_FDC", fdcId: 999001, recipeRevisionId: null, dataType: "FNDDS", description: "Dumplings, steamed" };

function manualGrams(grams: number): PortionEvidenceRecord {
  return {
    evidenceType: "MANUAL_GRAMS",
    suppliedValue: grams,
    unit: "g",
    source: "user",
    reliabilityTier: 1,
    collectedAt: "2026-08-06T00:00:00Z",
    assumptions: [],
    validationState: "CONFIRMED",
  };
}

function request(overrides: Partial<ImageEstimateRequest> = {}): ImageEstimateRequest {
  return {
    requestId: "req-1",
    ownerUserId: "user-a",
    imageReference: "tmp://img-1",
    mimeType: "image/jpeg",
    widthPx: 1200,
    heightPx: 900,
    checksum: "abc",
    correlationId: "corr-1",
    ...overrides,
  };
}

function defaultResolveFood(candidates: readonly { name: string }[]): FoodSourceResolution {
  const name = candidates[0]?.name.toLowerCase() ?? "";
  if (name.includes("dumpling") || name.includes("rice") || name.includes("momo")) {
    return { source: SOURCE, per100g: PER100G };
  }
  return { source: null };
}

function makePipeline(options: {
  resolveFood?: (candidates: readonly { name: string }[]) => FoodSourceResolution;
  collectEvidence?: (regionId: string) => readonly PortionEvidenceRecord[];
  pixelIssues?: string[];
  segmentation?: MockSegmentationAdapter;
  candidate?: CandidateProvider;
} = {}) {
  const segmentationCalls = { count: 0 };
  const candidateCalls = { count: 0 };
  const segmentation = options.segmentation ?? new MockSegmentationAdapter({ regions: [{ regionId: "region-1" }] });
  const candidate = options.candidate ?? new MockCandidateProvider({ byRegion: { "region-1": [{ name: "Dumplings, steamed", foodType: "PREPARED", providerConfidence: 0.85 }] } });

  const wrappedSegmentation = {
    name: "wrapped-seg",
    segment: async (input: Parameters<MockSegmentationAdapter["segment"]>[0]) => {
      segmentationCalls.count += 1;
      return segmentation.segment(input);
    },
  };
  const wrappedCandidate: CandidateProvider = {
    name: "wrapped-candidate",
    generateCandidates: async (input) => {
      candidateCalls.count += 1;
      return candidate.generateCandidates(input);
    },
  };

  const pipeline = new ImageEstimatePipeline({
    qualityAssessor: new MetadataOnlyQualityAssessor(),
    pixelQualityAssessor: new MockPixelQualityAssessor((options.pixelIssues ?? []) as never[]),
    segmentationAdapter: wrappedSegmentation,
    candidateProvider: wrappedCandidate,
    portionEstimator: new PortionEstimator(),
    clarificationEngine: new ClarificationEngine(),
    resolveFood: options.resolveFood ?? defaultResolveFood,
    collectEvidence: (context) => (options.collectEvidence ? options.collectEvidence(context.regionId) : [manualGrams(200)]),
  });

  return { pipeline, segmentationCalls, candidateCalls };
}

test("source resolved produces nutrients and COMPLETED_NEEDS_CONFIRMATION", async () => {
  const { pipeline } = makePipeline();
  const result = await pipeline.run(request());
  assert.equal(result.state, "COMPLETED_NEEDS_CONFIRMATION");
  const item = result.items[0]!;
  assert.equal(item.selectedSource?.fdcId, 999001);
  // 200 kcal per 100g * 200g / 100 = 400 kcal.
  assert.equal(item.nutrients?.energyKcal.central, 400);
  assert.equal(result.confirmed, false);
  assert.equal(result.requiresUserConfirmation, true);
});

test("source unresolved produces null nutrients, never generic values", async () => {
  const { pipeline } = makePipeline({ resolveFood: () => ({ source: null }) });
  const result = await pipeline.run(request());
  assert.equal(result.state, "NUTRITION_SOURCE_NOT_RESOLVED");
  const item = result.items[0]!;
  assert.equal(item.selectedSource, null);
  assert.equal(item.nutrients, null);
});

test("low-quality image requests a retake", async () => {
  const { pipeline } = makePipeline({ pixelIssues: ["FOOD_NOT_VISIBLE"] });
  const result = await pipeline.run(request());
  assert.equal(result.state, "IMAGE_RETAKE_REQUIRED");
  assert.equal(result.items.length, 0);
});

test("provider unavailable keeps manual fallback", async () => {
  const { pipeline } = makePipeline({ segmentation: new MockSegmentationAdapter({ status: "UNAVAILABLE" }) });
  const result = await pipeline.run(request());
  assert.equal(result.state, "PROVIDER_UNAVAILABLE");
  assert.equal(result.items.length, 0);
  assert.deepEqual(result.warnings, ["segmentation did not return usable regions", "mock segmentation provider unavailable"]);
});

test("multiple foods remain separate items", async () => {
  const { pipeline } = makePipeline({
    segmentation: new MockSegmentationAdapter({ regions: [{ regionId: "region-1" }, { regionId: "region-2" }] }),
    candidate: new MockCandidateProvider({
      default: [
        { name: "Dumplings, steamed", foodType: "PREPARED", providerConfidence: 0.85 },
        { name: "Steamed rice", foodType: "BASIC", providerConfidence: 0.9 },
      ],
    }),
  });
  const result = await pipeline.run(request());
  assert.equal(result.items.length, 2);
  assert.equal(new Set(result.items.map((item) => item.regionId)).size, 2);
  assert.equal(new Set(result.items.map((item) => item.itemId)).size, 2);
  assert.deepEqual(result.items.map((item) => item.segmentation?.regionId), ["region-1", "region-2"]);
  assert.ok(result.items.every((item) => item.segmentation?.bbox.width));
});

test("user correction recomputes deterministically without calling vision again", async () => {
  const { pipeline, segmentationCalls, candidateCalls } = makePipeline();
  const result = await pipeline.run(request());
  assert.equal(result.state, "COMPLETED_NEEDS_CONFIRMATION");
  const segmentationBefore = segmentationCalls.count;
  const candidateBefore = candidateCalls.count;

  const corrected = pipeline.applyCorrection(result.resultId, "user-a", result.items[0]!.itemId, {
    kind: "portion_grams",
    minimumGrams: 290,
    centralGrams: 300,
    maximumGrams: 310,
  });
  assert.equal(corrected.items[0]!.portion?.centralGrams, 300);
  // 200 kcal per 100g * 300g / 100 = 600 kcal.
  assert.equal(corrected.items[0]!.nutrients?.energyKcal.central, 600);
  assert.equal(segmentationCalls.count, segmentationBefore, "segmentation must not be re-invoked");
  assert.equal(candidateCalls.count, candidateBefore, "candidate provider must not be re-invoked");
  assert.equal(corrected.confirmed, false);
});

test("selecting a candidate resolves the source without vision", async () => {
  const { pipeline, segmentationCalls, candidateCalls } = makePipeline({
    candidate: new MockCandidateProvider({
      byRegion: {
        "region-1": [
          { name: "Unknown dish", foodType: "UNCLEAR", providerConfidence: 0.3 },
          { name: "Dumplings, steamed", foodType: "PREPARED", providerConfidence: 0.85 },
        ],
      },
    }),
  });
  const result = await pipeline.run(request());
  assert.equal(result.state, "NUTRITION_SOURCE_NOT_RESOLVED");
  const before = segmentationCalls.count + candidateCalls.count;
  const corrected = pipeline.applyCorrection(result.resultId, "user-a", result.items[0]!.itemId, { kind: "select_candidate", candidateIndex: 1 });
  assert.equal(corrected.items[0]!.selectedSource?.fdcId, 999001);
  assert.equal(corrected.items[0]!.selectedCandidateIndex, 1);
  assert.equal(corrected.items[0]!.candidates[0]!.name, "Unknown dish", "candidate order remains stable for the client");
  assert.equal(segmentationCalls.count + candidateCalls.count, before, "vision must not be re-invoked");
});

test("explicit candidate selection constrains source resolution to that food", async () => {
  const resolverInputs: string[][] = [];
  const { pipeline } = makePipeline({
    candidate: new MockCandidateProvider({ byRegion: { "region-1": [
      { name: "Chicken curry", foodType: "MIXED_DISH", providerConfidence: 0.95 },
      { name: "Paneer curry", foodType: "MIXED_DISH", providerConfidence: 0.65 },
    ] } }),
    resolveFood: (candidates) => {
      resolverInputs.push(candidates.map((candidate) => candidate.name));
      return candidates[0]?.name === "Paneer curry" ? { source: SOURCE, per100g: PER100G } : { source: null };
    },
  });
  const initial = await pipeline.run(request());
  const corrected = pipeline.applyCorrection(initial.resultId, "user-a", "item-1", { kind: "select_candidate", candidateIndex: 1 });
  assert.deepEqual(resolverInputs.at(-1), ["Paneer curry"]);
  assert.equal(corrected.items[0]?.selectedCandidateIndex, 1);
  assert.equal(corrected.items[0]?.selectedSource?.fdcId, 999001);
});

test("result is never confirmed automatically", async () => {
  const { pipeline } = makePipeline();
  const result = await pipeline.run(request());
  assert.equal(result.confirmed, false);
  const corrected = pipeline.applyCorrection(result.resultId, "user-a", result.items[0]!.itemId, { kind: "portion_grams", minimumGrams: 100, centralGrams: 110, maximumGrams: 120 });
  assert.equal(corrected.confirmed, false);
});

test("duplicate requests are idempotent", async () => {
  const { pipeline, segmentationCalls } = makePipeline();
  const first = await pipeline.run(request());
  const second = await pipeline.run(request());
  assert.equal(second.resultId, first.resultId);
  assert.deepEqual(second, first);
  assert.equal(segmentationCalls.count, 1, "second identical request must reuse the cached result");
});

test("reusing a requestId for a different request is rejected", async () => {
  const { pipeline } = makePipeline();
  await pipeline.run(request());
  await assert.rejects(
    pipeline.run(request({ imageReference: "tmp://img-2" })),
    (error: unknown) => error instanceof ImageEstimatePipelineError && error.code === "idempotency_key_reused",
  );
});

test("request idempotency is stable across object property order", async () => {
  const { pipeline, segmentationCalls } = makePipeline();
  const first = request({ requestId: "stable-order" });
  const reordered = Object.fromEntries(Object.entries(first).reverse()) as ImageEstimateRequest;
  await pipeline.run(first);
  await pipeline.run(reordered);
  assert.equal(segmentationCalls.count, 1);
});

test("corrections reject zero grams and unknown item ids", async () => {
  const { pipeline } = makePipeline();
  const result = await pipeline.run(request());
  assert.throws(
    () => pipeline.applyCorrection(result.resultId, "user-a", "item-missing", { kind: "portion_grams", minimumGrams: 100, centralGrams: 100, maximumGrams: 100 }),
    (error: unknown) => error instanceof ImageEstimatePipelineError && error.code === "estimate_item_not_found",
  );
  assert.throws(
    () => pipeline.applyCorrection(result.resultId, "user-a", "item-1", { kind: "portion_grams", minimumGrams: 0, centralGrams: 0, maximumGrams: 0 }),
    (error: unknown) => error instanceof ImageEstimatePipelineError && error.code === "invalid_correction",
  );
});

test("malformed provider response yields PROVIDER_UNAVAILABLE", async () => {
  const malformed: CandidateProvider = {
    name: "bad-candidates",
    generateCandidates: async (): Promise<CandidateGenerationResult> => ({
      provider: "bad",
      providerVersion: "x",
      regionId: "region-1",
      status: "COMPLETED",
      candidates: [
        { name: "a", searchTerms: ["a"], foodType: "BASIC", preparationCandidates: [], providerConfidence: 0.9, modelProviderVersion: "x", uncertaintyNotes: [] },
        { name: "b", searchTerms: ["b"], foodType: "BASIC", preparationCandidates: [], providerConfidence: 0.9, modelProviderVersion: "x", uncertaintyNotes: [] },
        { name: "c", searchTerms: ["c"], foodType: "BASIC", preparationCandidates: [], providerConfidence: 0.9, modelProviderVersion: "x", uncertaintyNotes: [] },
        { name: "d", searchTerms: ["d"], foodType: "BASIC", preparationCandidates: [], providerConfidence: 0.9, modelProviderVersion: "x", uncertaintyNotes: [] },
        { name: "e", searchTerms: ["e"], foodType: "BASIC", preparationCandidates: [], providerConfidence: 0.9, modelProviderVersion: "x", uncertaintyNotes: [] },
      ],
      warnings: [],
    }),
  };
  const { pipeline } = makePipeline({ candidate: malformed });
  const result = await pipeline.run(request());
  assert.equal(result.state, "PROVIDER_UNAVAILABLE");
});

test("user A cannot access user B estimate", async () => {
  const { pipeline } = makePipeline();
  const result = await pipeline.run(request({ ownerUserId: "user-a" }));
  assert.throws(
    () => pipeline.getResult(result.resultId, "user-b"),
    (error: unknown) => error instanceof EstimateAccessError,
  );
  assert.throws(
    () => pipeline.applyCorrection(result.resultId, "user-b", result.items[0]!.itemId, { kind: "portion_grams", minimumGrams: 1, centralGrams: 1, maximumGrams: 1 }),
    (error: unknown) => error instanceof EstimateAccessError,
  );
  const ownerRead = pipeline.getResult(result.resultId, "user-a");
  assert.equal(ownerRead.resultId, result.resultId);
});

test("invalid request returns INVALID_REQUEST", async () => {
  const { pipeline } = makePipeline();
  const result = await pipeline.run(request({ imageReference: "" }));
  assert.equal(result.state, "INVALID_REQUEST");
  assert.equal(result.confirmed, false);
});

test("clarification questions are produced when portion is insufficient", async () => {
  const { pipeline } = makePipeline({ collectEvidence: () => [] });
  const result = await pipeline.run(request());
  assert.equal(result.state, "PORTION_INSUFFICIENT");
  assert.ok(result.items[0]!.clarificationQuestions.some((question) => question.questionId === "MANUAL_ENTRY"));
});
