/**
 * Resilient candidate-only vision ensemble for the canonical MoveFuel nutrition engine.
 *
 * Segmentation remains separate. This layer asks one or more candidate
 * providers about the same segmented region, tolerates partial provider
 * failure, and fuses candidate evidence through CandidateGraph.
 */

import type { CandidateGenerationResult, CandidateProvider, CandidateRequest } from "./candidateProviderAdapter.ts";
import { buildCandidateGraph, graphCandidates, type CandidateEvidenceSet } from "./candidateGraph.ts";

export const VISION_ENSEMBLE_VERSION = "1.0.0";

export type VisionEnsembleMember = {
  provider: CandidateProvider;
  weight?: number;
};

export class VisionEnsembleCandidateProvider implements CandidateProvider {
  readonly name = "movefuel-vision-ensemble";
  private readonly members: readonly VisionEnsembleMember[];

  constructor(members: readonly VisionEnsembleMember[]) {
    if (members.length === 0) throw new Error("vision_ensemble_requires_provider");
    this.members = [...members];
  }

  async generateCandidates(input: CandidateRequest): Promise<CandidateGenerationResult> {
    const outcomes = await Promise.all(this.members.map(async (member) => {
      try {
        const result = await member.provider.generateCandidates(input);
        return { member, result, error: null as string | null };
      } catch (error) {
        return { member, result: null, error: error instanceof Error ? error.name : "provider_error" };
      }
    }));

    const usable = outcomes.filter((outcome) => outcome.result && outcome.result.status !== "UNAVAILABLE" && outcome.result.candidates.length > 0);
    const warnings = outcomes.flatMap((outcome) => {
      if (outcome.error) return [`${outcome.member.provider.name}:unavailable:${outcome.error}`];
      if (!outcome.result) return [`${outcome.member.provider.name}:unavailable`];
      return [...outcome.result.warnings];
    });

    if (usable.length === 0) {
      const anyResponded = outcomes.some((outcome) => outcome.result !== null && outcome.result.status !== "UNAVAILABLE");
      return {
        provider: this.name,
        providerVersion: VISION_ENSEMBLE_VERSION,
        regionId: input.regionId,
        status: anyResponded ? "UNKNOWN" : "UNAVAILABLE",
        candidates: [],
        warnings,
      };
    }

    const sets: CandidateEvidenceSet[] = usable.map((outcome) => ({
      provider: outcome.result!.provider || outcome.member.provider.name,
      providerVersion: outcome.result!.providerVersion,
      weight: outcome.member.weight ?? 1,
      candidates: outcome.result!.candidates,
    }));
    const graph = buildCandidateGraph(sets);
    const candidates = graphCandidates(graph, 3);
    return {
      provider: this.name,
      providerVersion: VISION_ENSEMBLE_VERSION,
      regionId: input.regionId,
      status: candidates.length > 0 ? "COMPLETED" : "UNKNOWN",
      candidates,
      warnings: [
        ...warnings,
        ...(graph.providerCount < this.members.length ? [`ensemble_partial_support:${graph.providerCount}/${this.members.length}`] : []),
      ],
    };
  }
}
