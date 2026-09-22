import assert from "node:assert/strict";
import test from "node:test";
import { VisionEnsembleCandidateProvider } from "../../nutrition/vision/visionEnsemble.ts";
import type { CandidateProvider, CandidateRequest, RegionFoodCandidate } from "../../nutrition/vision/candidateProviderAdapter.ts";

const request: CandidateRequest = { imageReference: "img", regionId: "r1" };
const rice: RegionFoodCandidate = { name: "White rice", searchTerms: ["rice"], foodType: "BASIC", preparationCandidates: [{ label: "steamed", confidence: 0.8 }], providerConfidence: 0.8, modelProviderVersion: "p", uncertaintyNotes: [] };
function provider(name: string, value: RegionFoodCandidate[] | Error): CandidateProvider {
  return { name, async generateCandidates(input) { if (value instanceof Error) throw value; return { provider: name, providerVersion: "1", regionId: input.regionId, status: "COMPLETED", candidates: value, warnings: [] }; } };
}

test("vision ensemble survives one provider failure", async () => {
  const ensemble = new VisionEnsembleCandidateProvider([{ provider: provider("broken", new Error("down")) }, { provider: provider("good", [rice]) }]);
  const result = await ensemble.generateCandidates(request);
  assert.equal(result.status, "COMPLETED");
  assert.equal(result.candidates[0]?.name, "White rice");
  assert.ok(result.warnings.some((warning) => warning.includes("broken:unavailable")));
});

test("vision ensemble increases support when independent providers corroborate", async () => {
  const second = { ...rice, name: "Steamed white rice", searchTerms: ["white rice"], providerConfidence: 0.75 };
  const ensemble = new VisionEnsembleCandidateProvider([{ provider: provider("a", [rice]) }, { provider: provider("b", [second]) }]);
  const result = await ensemble.generateCandidates(request);
  assert.equal(result.candidates.length, 1);
  assert.ok(result.candidates[0]!.providerConfidence > 0.8);
});
