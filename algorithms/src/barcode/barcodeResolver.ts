import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export type BarcodeProvider = "OPEN_FOOD_FACTS" | "USDA";

export interface BarcodeCandidate {
  provider: BarcodeProvider;
  barcode: string;
  providerFoodId: string;
  name: string;
  brand?: string;
  servingGrams?: number;
  exactBarcodeMatch: boolean;
  updatedAt?: string;
}

export interface BarcodeResolution {
  normalizedBarcode: string;
  selected: BarcodeCandidate | null;
  alternates: BarcodeCandidate[];
  requiresReview: boolean;
}

export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  return digits;
}

function providerPriority(candidate: BarcodeCandidate): number {
  if (!candidate.exactBarcodeMatch) return 0;
  return candidate.provider === "OPEN_FOOD_FACTS" ? 2 : 1;
}

/**
 * OFF and USDA are evidence providers. MoveFuel owns conflict resolution,
 * provenance, serving normalization, and final user confirmation.
 */
export function resolveBarcodeCandidates(
  context: AlgorithmContext,
  rawBarcode: string,
  candidates: readonly BarcodeCandidate[],
  evidence: EvidenceRef[] = [],
): AlgorithmResult<BarcodeResolution> {
  const normalized = normalizeBarcode(rawBarcode);

  if (!normalized) {
    return {
      algorithmId: "MF-037",
      status: "HOLD",
      reasonCodes: ["INVALID_BARCODE_FORMAT"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const exact = candidates
    .filter(
      (candidate) =>
        normalizeBarcode(candidate.barcode) === normalized &&
        candidate.exactBarcodeMatch,
    )
    .sort((a, b) => providerPriority(b) - providerPriority(a));

  if (exact.length === 0) {
    return {
      algorithmId: "MF-043",
      status: "PARTIAL",
      output: {
        normalizedBarcode: normalized,
        selected: null,
        alternates: [...candidates],
        requiresReview: true,
      },
      reasonCodes: ["BARCODE_NOT_FOUND_USE_FALLBACK_SEARCH"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const selected = exact[0];
  const alternates = exact.slice(1);

  const conflictingIdentity = alternates.some((candidate) => {
    const sameName =
      candidate.name.trim().toLowerCase() === selected.name.trim().toLowerCase();
    const sameBrand =
      (candidate.brand ?? "").trim().toLowerCase() ===
      (selected.brand ?? "").trim().toLowerCase();
    return !(sameName && sameBrand);
  });

  return {
    algorithmId: conflictingIdentity ? "MF-039" : "MF-038",
    status: conflictingIdentity ? "NEEDS_CONFIRMATION" : "SUCCESS",
    output: {
      normalizedBarcode: normalized,
      selected,
      alternates,
      requiresReview: conflictingIdentity,
    },
    reasonCodes: conflictingIdentity
      ? ["BARCODE_PROVIDER_IDENTITY_CONFLICT"]
      : ["EXACT_BARCODE_MATCH"],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
