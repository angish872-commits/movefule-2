/**
 * Food-candidate provider contracts (Phase 6, provider-independent).
 *
 * A candidate provider turns a segmented region into up to three plausible
 * food candidates. Provider confidence is NOT final system confidence. The
 * provider never supplies authoritative calories or nutrients; candidate
 * names are resolved through the existing USDA/recipe resolver later. Unknown
 * output stays UNKNOWN/UNCLEAR rather than guessing.
 */

import type { FoodTypeKind } from "../algorithm/contracts.ts";

export const CANDIDATE_POLICY_VERSION = 1 as const;

export const MAX_CANDIDATES_PER_REGION = 3 as const;

export type PreparationCandidate = {
  label: string;
  confidence: number;
};

export type RegionFoodCandidate = {
  name: string;
  /** Normalized search terms for the existing USDA/recipe resolver. */
  searchTerms: readonly string[];
  foodType: FoodTypeKind;
  preparationCandidates: readonly PreparationCandidate[];
  /** Provider confidence (0..1). Never exposed as final system confidence. */
  providerConfidence: number;
  modelProviderVersion: string;
  uncertaintyNotes: readonly string[];
};

export type CandidateGenerationStatus = "COMPLETED" | "UNKNOWN" | "UNAVAILABLE";

export type CandidateGenerationResult = {
  provider: string;
  providerVersion: string;
  regionId: string;
  status: CandidateGenerationStatus;
  candidates: readonly RegionFoodCandidate[];
  warnings: readonly string[];
};

export type CandidateRequest = {
  imageReference: string;
  regionId: string;
  mimeType?: string;
  checksum?: string;
  correlationId?: string;
  ownerUserId?: string;
};

export interface CandidateProvider {
  readonly name: string;
  generateCandidates(input: CandidateRequest): Promise<CandidateGenerationResult>;
}

/** Verify the shape of a provider result and that no nutrient values leaked. */
export function validateCandidateGenerationResult(result: unknown): string[] {
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    return ["invalid_result"];
  }
  const record = result as Record<string, unknown>;
  const errors: string[] = [];
  if (!["COMPLETED", "UNKNOWN", "UNAVAILABLE"].includes(String(record.status))) {
    errors.push("invalid_status");
  }
  if (!Array.isArray(record.candidates)) {
    errors.push("candidates_must_be_array");
    return errors;
  }
  const candidates = record.candidates as unknown[];
  if (candidates.length > MAX_CANDIDATES_PER_REGION) {
    errors.push("too_many_candidates");
  }
  for (const [index, rawCandidate] of candidates.entries()) {
    if (typeof rawCandidate !== "object" || rawCandidate === null || Array.isArray(rawCandidate)) {
      errors.push(`candidates[${index}].invalid_candidate`);
      continue;
    }
    const candidate = rawCandidate as Record<string, unknown>;
    if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
      errors.push(`candidates[${index}].blank_name`);
    }
    if (!Array.isArray(candidate.searchTerms)) {
      errors.push(`candidates[${index}].search_terms_must_be_array`);
    }
    if (typeof candidate.providerConfidence !== "number" || !Number.isFinite(candidate.providerConfidence)) {
      errors.push(`candidates[${index}].invalid_confidence`);
    } else if (candidate.providerConfidence < 0 || candidate.providerConfidence > 1) {
      errors.push(`candidates[${index}].confidence_out_of_range`);
    }
    const allowedFoodTypes = ["BASIC", "PACKAGED", "PREPARED", "MIXED_DISH", "LIQUID", "UNCLEAR"];
    if (candidate.foodType !== undefined && !allowedFoodTypes.includes(String(candidate.foodType))) {
      errors.push(`candidates[${index}].invalid_food_type`);
    }
    // The provider contract carries no nutrient keys.
    for (const nutrientKey of ["calories", "energyKcal", "proteinG", "carbG", "fatG", "fiberG", "sodiumMg", "nutrients"]) {
      if (nutrientKey in candidate) {
        errors.push(`candidates[${index}].contains_${nutrientKey}`);
      }
    }
  }
  return errors;
}

export class CandidateProviderError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "CandidateProviderError";
  }
}
