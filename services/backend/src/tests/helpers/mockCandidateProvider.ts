/**
 * Deterministic mock candidate provider (Phase 6).
 *
 * Fixture-driven, repeatable and free. Unknown regions return UNKNOWN with
 * no invented candidates. The provider never returns nutrient values.
 */

import type { FoodTypeKind } from "../../nutrition/algorithm/contracts.ts";
import {
  type CandidateGenerationResult,
  type CandidateProvider,
  type CandidateRequest,
  type PreparationCandidate,
  type RegionFoodCandidate,
} from "../../nutrition/vision/candidateProviderAdapter.ts";

export type MockCandidateFixture = {
  name: string;
  searchTerms?: readonly string[];
  foodType?: FoodTypeKind;
  preparationCandidates?: readonly PreparationCandidate[];
  providerConfidence?: number;
  uncertaintyNotes?: readonly string[];
};

export type MockCandidateConfig = {
  /** Region id → candidate fixtures (max 3 per region). */
  byRegion?: Readonly<Record<string, readonly MockCandidateFixture[]>>;
  /** Default fixtures applied to any region without a specific entry. */
  default?: readonly MockCandidateFixture[];
  status?: CandidateGenerationResult["status"];
};

const DEFAULT_FIXTURES: readonly MockCandidateFixture[] = [
  {
    name: "Dumplings, steamed",
    searchTerms: ["dumplings", "steamed"],
    foodType: "PREPARED",
    preparationCandidates: [
      { label: "steamed", confidence: 0.9 },
      { label: "fried", confidence: 0.1 },
    ],
    providerConfidence: 0.82,
    uncertaintyNotes: [],
  },
];

export class MockCandidateProvider implements CandidateProvider {
  readonly name = "mock-candidates";
  readonly providerVersion = "0.1.0";
  private readonly config: MockCandidateConfig;

  constructor(config: MockCandidateConfig = {}) {
    this.config = config;
  }

  async generateCandidates(input: CandidateRequest): Promise<CandidateGenerationResult> {
    if (this.config.status === "UNAVAILABLE") {
      return {
        provider: this.name,
        providerVersion: this.providerVersion,
        regionId: input.regionId,
        status: "UNAVAILABLE",
        candidates: [],
        warnings: ["mock candidate provider unavailable"],
      };
    }

    const fixtures = this.config.byRegion?.[input.regionId] ?? this.config.default ?? DEFAULT_FIXTURES;
    const candidates: RegionFoodCandidate[] = fixtures.slice(0, 3).map((fixture) => ({
      name: fixture.name,
      searchTerms: fixture.searchTerms ?? [fixture.name.toLowerCase()],
      foodType: fixture.foodType ?? "PREPARED",
      preparationCandidates: fixture.preparationCandidates ?? [],
      providerConfidence: fixture.providerConfidence ?? 0.8,
      modelProviderVersion: this.providerVersion,
      uncertaintyNotes: fixture.uncertaintyNotes ?? [],
    }));

    if (candidates.length === 0) {
      return {
        provider: this.name,
        providerVersion: this.providerVersion,
        regionId: input.regionId,
        status: "UNKNOWN",
        candidates: [],
        warnings: ["no candidates identified for this region"],
      };
    }

    return {
      provider: this.name,
      providerVersion: this.providerVersion,
      regionId: input.regionId,
      status: "COMPLETED",
      candidates,
      warnings: [],
    };
  }
}
