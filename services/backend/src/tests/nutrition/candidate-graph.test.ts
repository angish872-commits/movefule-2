import assert from "node:assert/strict";
import test from "node:test";
import { buildCandidateGraph, graphCandidates } from "../../nutrition/vision/candidateGraph.ts";
import type { RegionFoodCandidate } from "../../nutrition/vision/candidateProviderAdapter.ts";

function candidate(name: string, confidence: number, searchTerms: string[] = [], prep: { label: string; confidence: number }[] = []): RegionFoodCandidate {
  return { name, searchTerms, foodType: "BASIC", preparationCandidates: prep, providerConfidence: confidence, modelProviderVersion: "test", uncertaintyNotes: [] };
}

test("candidate graph fuses corroborating provider identities without duplicating one provider", () => {
  const graph = buildCandidateGraph([
    { provider: "vision-a", providerVersion: "1", weight: 1, candidates: [candidate("Steamed white rice", 0.72, ["white rice"], [{ label: "steamed", confidence: 0.7 }])] },
    { provider: "vision-b", providerVersion: "2", weight: 0.9, candidates: [candidate("White rice", 0.78, ["steamed white rice"], [{ label: "steamed", confidence: 0.8 }])] },
  ]);
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.nodes[0]!.supportCount, 2);
  assert.ok(graph.nodes[0]!.fusedIdentityConfidence > 0.78);
  assert.equal(graph.nodes[0]!.preparations[0]?.label, "steamed");
  const visible = graphCandidates(graph);
  assert.equal(visible.length, 1);
  assert.match(visible[0]!.modelProviderVersion, /candidate-graph/);
});

test("candidate graph keeps materially different foods separate", () => {
  const graph = buildCandidateGraph([
    { provider: "vision-a", providerVersion: "1", weight: 1, candidates: [candidate("Chicken curry", 0.8)] },
    { provider: "vision-b", providerVersion: "1", weight: 1, candidates: [candidate("Grilled chicken breast", 0.82)] },
  ]);
  assert.equal(graph.nodes.length, 2);
});
