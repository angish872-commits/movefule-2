import assert from "node:assert/strict";
import test from "node:test";
import { MockCandidateProvider } from "../helpers/mockCandidateProvider.ts";
import { validateCandidateGenerationResult } from "../../nutrition/vision/candidateProviderAdapter.ts";
import type { CandidateRequest } from "../../nutrition/vision/candidateProviderAdapter.ts";

const REQUEST: CandidateRequest = { imageReference: "tmp://img", regionId: "region-1", checksum: "abc" };

test("candidate provider returns a top-one candidate", async () => {
  const provider = new MockCandidateProvider();
  const result = await provider.generateCandidates(REQUEST);
  assert.equal(result.status, "COMPLETED");
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]!.name, "Dumplings, steamed");
  assert.equal(validateCandidateGenerationResult(result).length, 0);
});

test("candidate provider returns up to three candidates", async () => {
  const provider = new MockCandidateProvider({
    byRegion: {
      "region-1": [
        { name: "Chicken momo", foodType: "MIXED_DISH", providerConfidence: 0.8 },
        { name: "Vegetable momo", foodType: "MIXED_DISH", providerConfidence: 0.5 },
        { name: "Paneer momo", foodType: "MIXED_DISH", providerConfidence: 0.3 },
      ],
    },
  });
  const result = await provider.generateCandidates(REQUEST);
  assert.equal(result.candidates.length, 3);
});

test("unknown food returns UNKNOWN with no invented candidates", async () => {
  const provider = new MockCandidateProvider({ byRegion: { "region-1": [] } });
  const result = await provider.generateCandidates(REQUEST);
  assert.equal(result.status, "UNKNOWN");
  assert.equal(result.candidates.length, 0);
});

test("mixed dish candidate carries preparation candidates", async () => {
  const provider = new MockCandidateProvider({
    byRegion: {
      "region-1": [
        {
          name: "Chicken curry",
          foodType: "MIXED_DISH",
          preparationCandidates: [
            { label: "cooked", confidence: 0.7 },
            { label: "fried", confidence: 0.3 },
          ],
        },
      ],
    },
  });
  const result = await provider.generateCandidates(REQUEST);
  assert.equal(result.candidates[0]!.foodType, "MIXED_DISH");
  assert.ok(result.candidates[0]!.preparationCandidates.length >= 1);
});

test("liquid candidate is typed LIQUID", async () => {
  const provider = new MockCandidateProvider({ byRegion: { "region-1": [{ name: "Dal soup", foodType: "LIQUID" }] } });
  const result = await provider.generateCandidates(REQUEST);
  assert.equal(result.candidates[0]!.foodType, "LIQUID");
});

test("packaged candidate is typed PACKAGED", async () => {
  const provider = new MockCandidateProvider({ byRegion: { "region-1": [{ name: "Yogurt cup", foodType: "PACKAGED" }] } });
  const result = await provider.generateCandidates(REQUEST);
  assert.equal(result.candidates[0]!.foodType, "PACKAGED");
});

test("provider unavailable is UNAVAILABLE", async () => {
  const provider = new MockCandidateProvider({ status: "UNAVAILABLE" });
  const result = await provider.generateCandidates(REQUEST);
  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(result.candidates.length, 0);
});

test("no nutrient values are allowed in candidate output", async () => {
  const provider = new MockCandidateProvider({ byRegion: { "region-1": [{ name: "Rice" }] } });
  const result = await provider.generateCandidates(REQUEST);
  const candidate = result.candidates[0] as unknown as Record<string, unknown>;
  for (const key of ["calories", "energyKcal", "proteinG", "carbG", "fatG", "fiberG", "sodiumMg", "nutrients"]) {
    assert.equal(key in candidate, false, `candidate must not carry ${key}`);
  }
});

test("a malformed candidate that carries calories is rejected", () => {
  const malformed = {
    provider: "mock",
    providerVersion: "0.1.0",
    regionId: "region-1",
    status: "COMPLETED",
    candidates: [{ name: "Rice", searchTerms: ["rice"], foodType: "BASIC", preparationCandidates: [], providerConfidence: 0.9, modelProviderVersion: "x", uncertaintyNotes: [], calories: 130 }],
    warnings: [],
  };
  const errors = validateCandidateGenerationResult(malformed);
  assert.ok(errors.some((error) => error.includes("contains_calories")));
});
