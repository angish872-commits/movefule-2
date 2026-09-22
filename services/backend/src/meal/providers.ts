import {
  type MealAnalyzerProvider,
  type MealAnalysisInput,
  type MealProviderResult,
} from "./contracts.ts";
import { cloneFixtureItems, fixtureByKey } from "./nutrition-fixtures.ts";
import { totalsForItems } from "./nutrition.ts";

const emptyTotals = () => ({
  energyKcal: 0,
  proteinGrams: 0,
  carbGrams: 0,
  fatGrams: 0,
  fiberGrams: 0,
});

/**
 * Offline provider used only for deterministic development/contract fixtures.
 * It never analyzes a real image and production server composition never
 * selects it for camera/photo nutrition authority.
 */
export class DeterministicLocalMealAnalyzer implements MealAnalyzerProvider {
  public readonly name = "local_deterministic" as const;
  public readonly version = "nutrition-fixture-v2";
  private readonly allowNonSampleFixtures: boolean;

  constructor(options: { allowNonSampleFixtures?: boolean } = {}) {
    this.allowNonSampleFixtures = options.allowNonSampleFixtures === true;
  }

  async analyze(input: MealAnalysisInput): Promise<MealProviderResult> {
    const fixtureKey = /^fixture:([a-z0-9-]+)$/i.exec(input.draft.note?.trim() ?? "")?.[1]?.toLowerCase();
    const fixture = fixtureKey ? fixtureByKey(fixtureKey) : undefined;
    if ((!this.allowNonSampleFixtures && input.draft.sourceType !== "sample") || !fixture) {
      return {
        state: "FAILED",
        provider: this.name,
        providerVersion: this.version,
        items: [],
        totals: emptyTotals(),
        errorCode: "provider_not_configured",
      };
    }
    const items = cloneFixtureItems(fixture);
    return {
      state: "COMPLETED",
      provider: this.name,
      providerVersion: this.version,
      items,
      totals: totalsForItems(items),
    };
  }
}

export const deterministicLocalMealAnalyzer = new DeterministicLocalMealAnalyzer();
/** Explicit test/development fixture adapter; never select this in production composition. */
export const developmentFixtureMealAnalyzer = new DeterministicLocalMealAnalyzer({ allowNonSampleFixtures: true });

/**
 * Compatibility boundary for clients that still submit provider="gemini" to
 * the legacy meal-analysis endpoint. The old Gemini nutrient decoder has been
 * removed. Real image analysis lives at /v1/meals/estimates and uses the
 * candidate-only production pipeline.
 */
export class CandidateOnlyImageRouteRequiredAnalyzer implements MealAnalyzerProvider {
  public readonly name = "gemini" as const;
  public readonly version = "candidate-only-image-route-required-v1";

  async analyze(_input: MealAnalysisInput): Promise<MealProviderResult> {
    return {
      state: "FAILED",
      provider: this.name,
      providerVersion: this.version,
      items: [],
      totals: emptyTotals(),
      errorCode: "provider_not_implemented",
    };
  }
}

export const candidateOnlyImageRouteRequiredAnalyzer = new CandidateOnlyImageRouteRequiredAnalyzer();

export type MealProviderResolver = (provider: "local" | "gemini") => MealAnalyzerProvider;

export const defaultMealProviderResolver: MealProviderResolver = (provider) =>
  provider === "gemini" ? candidateOnlyImageRouteRequiredAnalyzer : deterministicLocalMealAnalyzer;

export const DeterministicMealAnalyzer = DeterministicLocalMealAnalyzer;
