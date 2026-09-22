/**
 * Candidate evidence graph for the canonical MoveFuel nutrition engine.
 *
 * Candidate-only vision providers may disagree or emit aliases for the same
 * visible food. This graph fuses corroborating identity/preparation evidence
 * without treating duplicate aliases as independent foods. It carries no
 * nutrient values and cannot resolve calories by itself.
 */

import type { FoodTypeKind } from "../algorithm/contracts.ts";
import type { PreparationCandidate, RegionFoodCandidate } from "./candidateProviderAdapter.ts";

export const CANDIDATE_GRAPH_VERSION = "1.0.0";

export type CandidateEvidenceSet = {
  provider: string;
  providerVersion: string;
  weight: number;
  candidates: readonly RegionFoodCandidate[];
};

export type CandidateGraphNode = {
  nodeId: string;
  canonicalName: string;
  normalizedIdentity: string;
  aliases: readonly string[];
  foodType: FoodTypeKind;
  providerSupport: readonly string[];
  supportCount: number;
  fusedIdentityConfidence: number;
  preparations: readonly PreparationCandidate[];
  searchTerms: readonly string[];
  uncertaintyNotes: readonly string[];
};

export type CandidateGraph = {
  version: typeof CANDIDATE_GRAPH_VERSION;
  nodes: readonly CandidateGraphNode[];
  providerCount: number;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function normalizeCandidateIdentity(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedTokens(value: string): Set<string> {
  return new Set(normalizeCandidateIdentity(value).split(" ").filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function candidateAliases(candidate: RegionFoodCandidate): string[] {
  return [...new Set([candidate.name, ...candidate.searchTerms].map((value) => normalizeCandidateIdentity(value)).filter(Boolean))];
}

function sameCandidateIdentity(a: RegionFoodCandidate, b: RegionFoodCandidate): boolean {
  const aAliases = candidateAliases(a);
  const bAliases = candidateAliases(b);
  if (aAliases.some((alias) => bAliases.includes(alias))) return true;

  // Conservative fuzzy aliasing: require strong token overlap and the same
  // food type. This avoids merging related but distinct foods such as chicken
  // curry and chicken breast merely because both contain "chicken".
  if (a.foodType !== b.foodType) return false;
  const similarity = jaccard(normalizedTokens(a.name), normalizedTokens(b.name));
  return similarity >= 0.82;
}

function fuseIndependentSupport(entries: readonly { confidence: number; weight: number }[]): number {
  if (entries.length === 0) return 0;
  if (entries.length === 1) return clamp01(entries[0]!.confidence);
  // Weighted noisy-OR rewards corroboration but remains bounded. Provider
  // weight is deliberately capped so one provider cannot manufacture certainty.
  let miss = 1;
  for (const entry of entries) {
    const effective = clamp01(entry.confidence) * Math.max(0.15, Math.min(1, entry.weight));
    miss *= 1 - effective;
  }
  return clamp01(1 - miss);
}

function mergePreparations(entries: readonly { candidate: RegionFoodCandidate; weight: number }[]): PreparationCandidate[] {
  const buckets = new Map<string, { label: string; evidence: { confidence: number; weight: number }[] }>();
  for (const entry of entries) {
    for (const prep of entry.candidate.preparationCandidates) {
      const key = normalizeCandidateIdentity(prep.label);
      if (!key) continue;
      const bucket = buckets.get(key) ?? { label: prep.label.trim(), evidence: [] };
      bucket.evidence.push({ confidence: clamp01(prep.confidence), weight: entry.weight });
      buckets.set(key, bucket);
    }
  }
  return [...buckets.values()]
    .map((bucket) => ({ label: bucket.label, confidence: fuseIndependentSupport(bucket.evidence) }))
    .sort((a, b) => b.confidence - a.confidence || a.label.localeCompare(b.label))
    .slice(0, 4);
}

function chooseFoodType(entries: readonly { candidate: RegionFoodCandidate; weight: number }[]): FoodTypeKind {
  const scores = new Map<FoodTypeKind, number>();
  for (const { candidate, weight } of entries) {
    scores.set(candidate.foodType, (scores.get(candidate.foodType) ?? 0) + clamp01(candidate.providerConfidence) * Math.max(0.15, Math.min(1, weight)));
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "UNCLEAR";
}

export function buildCandidateGraph(sets: readonly CandidateEvidenceSet[]): CandidateGraph {
  const validSets = sets.filter((set) => set.candidates.length > 0 && Number.isFinite(set.weight) && set.weight > 0);
  const buckets: { entries: { provider: string; providerVersion: string; candidate: RegionFoodCandidate; weight: number }[] }[] = [];

  for (const set of validSets) {
    for (const candidate of set.candidates) {
      let bucket = buckets.find((candidateBucket) => candidateBucket.entries.some((entry) => sameCandidateIdentity(entry.candidate, candidate)));
      if (!bucket) {
        bucket = { entries: [] };
        buckets.push(bucket);
      }
      // One provider contributes at most one evidence point to a node. If a
      // provider emitted aliases twice, keep only its stronger candidate.
      const existing = bucket.entries.findIndex((entry) => entry.provider === set.provider);
      const next = { provider: set.provider, providerVersion: set.providerVersion, candidate, weight: set.weight };
      if (existing < 0) bucket.entries.push(next);
      else if (candidate.providerConfidence > bucket.entries[existing]!.candidate.providerConfidence) bucket.entries[existing] = next;
    }
  }

  const nodes = buckets.map((bucket, index): CandidateGraphNode => {
    const strongest = [...bucket.entries].sort((a, b) => b.candidate.providerConfidence - a.candidate.providerConfidence)[0]!;
    const aliases = [...new Set(bucket.entries.flatMap((entry) => [entry.candidate.name, ...entry.candidate.searchTerms]).map((value) => value.trim()).filter(Boolean))];
    const searchTerms = [...new Set(aliases.map((value) => normalizeCandidateIdentity(value)).filter(Boolean))];
    const providerSupport = [...new Set(bucket.entries.map((entry) => entry.provider))].sort();
    const confidence = fuseIndependentSupport(bucket.entries.map((entry) => ({ confidence: entry.candidate.providerConfidence, weight: entry.weight })));
    return {
      nodeId: `candidate-node-${index + 1}`,
      canonicalName: strongest.candidate.name.trim(),
      normalizedIdentity: normalizeCandidateIdentity(strongest.candidate.name),
      aliases,
      foodType: chooseFoodType(bucket.entries),
      providerSupport,
      supportCount: providerSupport.length,
      fusedIdentityConfidence: confidence,
      preparations: mergePreparations(bucket.entries),
      searchTerms,
      uncertaintyNotes: [...new Set(bucket.entries.flatMap((entry) => entry.candidate.uncertaintyNotes))],
    };
  }).sort((a, b) => b.fusedIdentityConfidence - a.fusedIdentityConfidence || b.supportCount - a.supportCount || a.canonicalName.localeCompare(b.canonicalName));

  return {
    version: CANDIDATE_GRAPH_VERSION,
    nodes,
    providerCount: new Set(validSets.map((set) => set.provider)).size,
  };
}

export function graphCandidates(graph: CandidateGraph, limit = 3): RegionFoodCandidate[] {
  return graph.nodes.slice(0, Math.max(1, limit)).map((node) => ({
    name: node.canonicalName,
    searchTerms: node.searchTerms,
    foodType: node.foodType,
    preparationCandidates: node.preparations,
    providerConfidence: node.fusedIdentityConfidence,
    modelProviderVersion: `candidate-graph@${CANDIDATE_GRAPH_VERSION}:${node.providerSupport.join("+") || "unknown"}`,
    uncertaintyNotes: [
      ...node.uncertaintyNotes,
      `candidate evidence support=${node.supportCount}/${Math.max(1, graph.providerCount)}`,
    ],
  }));
}
