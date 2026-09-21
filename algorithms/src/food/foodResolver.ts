import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export type FoodProvider = "USDA" | "OPEN_FOOD_FACTS" | "MOVEFUEL_VERIFIED";

export interface FoodCandidate {
  provider: FoodProvider;
  providerFoodId: string;
  displayName: string;
  brand?: string;
  generic: boolean;
  confidence: number;
  verified: boolean;
  barcode?: string;
}

export interface FoodResolutionInput {
  query?: string;
  barcode?: string;
  candidates: readonly FoodCandidate[];
}

export interface FoodResolutionOutput {
  selected: FoodCandidate | null;
  alternatives: FoodCandidate[];
  needsConfirmation: boolean;
}

function rank(candidate: FoodCandidate, barcode?: string): number {
  let score = Math.max(0, Math.min(1, candidate.confidence));
  if (candidate.verified) score += 0.15;
  if (barcode && candidate.barcode === barcode) score += 0.35;

  if (candidate.generic && candidate.provider === "USDA") score += 0.08;
  if (!candidate.generic && candidate.provider === "OPEN_FOOD_FACTS") score += 0.08;

  return score;
}

/**
 * Shared food identity resolver used by camera, barcode, search, recipes,
 * manual entry and YouTube imports.
 */
export function resolveFoodIdentity(
  context: AlgorithmContext,
  input: FoodResolutionInput,
  evidence: EvidenceRef[] = [],
): AlgorithmResult<FoodResolutionOutput> {
  if (input.candidates.length === 0) {
    return {
      algorithmId: "MF-021",
      status: "HOLD",
      output: {
        selected: null,
        alternatives: [],
        needsConfirmation: true,
      },
      reasonCodes: ["NO_FOOD_CANDIDATES"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const ranked = [...input.candidates].sort(
    (a, b) => rank(b, input.barcode) - rank(a, input.barcode),
  );

  const selected = ranked[0];
  const runnerUp = ranked[1];

  const selectedScore = rank(selected, input.barcode);
  const runnerUpScore = runnerUp ? rank(runnerUp, input.barcode) : 0;
  const margin = selectedScore - runnerUpScore;

  const needsConfirmation = selectedScore < 0.8 || margin < 0.12;

  return {
    algorithmId: "MF-021",
    status: needsConfirmation ? "NEEDS_CONFIRMATION" : "SUCCESS",
    output: {
      selected,
      alternatives: ranked.slice(1),
      needsConfirmation,
    },
    reasonCodes: needsConfirmation
      ? ["FOOD_IDENTITY_AMBIGUOUS"]
      : ["FOOD_IDENTITY_RESOLVED"],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
