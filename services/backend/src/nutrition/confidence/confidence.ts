/**
 * Confidence model. Combines independent components with a versioned
 * policy. One provider's confidence is never exposed as total system
 * confidence.
 */

import type { ConfidenceLevel } from "../algorithm/contracts.ts";

export type ConfidenceComponents = {
  identity: number; // 0..1 (top-1 provider confidence, when present)
  segmentationQuality: number; // 0..1
  portionEvidence: number; // 0..1
  preparationCertainty: number; // 0..1
  sourceMatchQuality: number; // 0..1
  recipeReviewStatus: number; // 0..1 (1 for reviewed recipes / direct FDC)
  completeness: number; // 0..1 (fraction of core nutrients present)
};

export type ConfidencePolicy = {
  version: number;
  weights: {
    identity: number;
    segmentationQuality: number;
    portionEvidence: number;
    preparationCertainty: number;
    sourceMatchQuality: number;
    recipeReviewStatus: number;
    completeness: number;
  };
  /** Below this weighted score the result is INSUFFICIENT. */
  insufficientThreshold: number;
};

export const DEFAULT_CONFIDENCE_POLICY: ConfidencePolicy = {
  version: 1,
  weights: {
    identity: 0.2,
    segmentationQuality: 0.1,
    portionEvidence: 0.2,
    preparationCertainty: 0.1,
    sourceMatchQuality: 0.2,
    recipeReviewStatus: 0.1,
    completeness: 0.1,
  },
  insufficientThreshold: 0.25,
};

export function weightedConfidence(
  components: ConfidenceComponents,
  policy: ConfidencePolicy = DEFAULT_CONFIDENCE_POLICY,
): number {
  const w = policy.weights;
  const total = w.identity + w.segmentationQuality + w.portionEvidence + w.preparationCertainty +
    w.sourceMatchQuality + w.recipeReviewStatus + w.completeness;
  if (total <= 0) return 0;
  return (
    components.identity * w.identity +
    components.segmentationQuality * w.segmentationQuality +
    components.portionEvidence * w.portionEvidence +
    components.preparationCertainty * w.preparationCertainty +
    components.sourceMatchQuality * w.sourceMatchQuality +
    components.recipeReviewStatus * w.recipeReviewStatus +
    components.completeness * w.completeness
  ) / total;
}

export function confidenceLevel(
  score: number,
  policy: ConfidencePolicy = DEFAULT_CONFIDENCE_POLICY,
): ConfidenceLevel {
  if (score < policy.insufficientThreshold) return "INSUFFICIENT";
  if (score >= 0.8) return "HIGH";
  if (score >= 0.55) return "MEDIUM";
  return "LOW";
}

export function confidenceFromComponents(
  components: ConfidenceComponents,
  policy: ConfidencePolicy = DEFAULT_CONFIDENCE_POLICY,
): { score: number; level: ConfidenceLevel } {
  const score = weightedConfidence(components, policy);
  return { score, level: confidenceLevel(score, policy) };
}
