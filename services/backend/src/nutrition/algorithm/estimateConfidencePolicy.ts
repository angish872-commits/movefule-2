import type { ConfidenceLevel, NutritionSource } from "./contracts.ts";
import { confidenceFromComponents, type ConfidenceComponents } from "../confidence/confidence.ts";
import type { QualityState } from "../vision/qualityAssessment.ts";
import type { RegionFoodCandidate } from "../vision/candidateProviderAdapter.ts";
import type { PortionEstimate } from "../portion/portionEstimator.ts";
import type { SegmentationRegion } from "../vision/segmentationAdapter.ts";
import { IMAGE_ESTIMATE_CONFIDENCE_POLICY_VERSION, type EstimateConfidenceReport, type Per100gNutrients } from "./imageEstimateContracts.ts";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function confidenceLevelFromScore(score: number): ConfidenceLevel {
  if (score >= 0.85) return "HIGH";
  if (score >= 0.7) return "MEDIUM";
  if (score >= 0.5) return "LOW";
  return "INSUFFICIENT";
}

export function computeConfidenceReport(input: {
  qualityState: QualityState;
  regionConfidences: readonly number[];
  topCandidate: RegionFoodCandidate | null;
  portion: PortionEstimate | null;
  source: NutritionSource | null;
  per100g: Per100gNutrients | undefined;
  sourceMatchQuality?: number;
  resolutionConfidence?: number;
  overlapState?: SegmentationRegion["overlapState"];
}): EstimateConfidenceReport {
  const identity = input.topCandidate?.providerConfidence ?? 0;
  const segmentationConfidence = input.regionConfidences.length > 0
    ? input.regionConfidences.reduce((sum, value) => sum + value, 0) / input.regionConfidences.length
    : 0;
  const preparationCertainty = input.topCandidate?.preparationCandidates[0]?.confidence ?? 0.5;

  const nutritionSourceMatch: EstimateConfidenceReport["nutritionSourceMatch"] =
    input.source === null ? "NEEDS_USER_REVIEW" : input.per100g !== undefined ? "RESOLVED" : "NOT_ATTEMPTED";
  const recipeReviewStatus: EstimateConfidenceReport["recipeReviewStatus"] =
    input.source === null
      ? "N/A"
      : input.source.dataType === "REVIEWED_RECIPE_ESTIMATE"
        ? "REVIEWED"
        : input.source.dataType === "UNREVIEWED_RECIPE_ESTIMATE"
          ? "UNREVIEWED"
          : "REVIEWED";

  const components: ConfidenceComponents = {
    identity,
    segmentationQuality: segmentationConfidence,
    portionEvidence: input.portion?.confidence === "HIGH" ? 0.9 : input.portion?.confidence === "MEDIUM" ? 0.6 : input.portion?.confidence === "LOW" ? 0.3 : 0,
    preparationCertainty,
    sourceMatchQuality: input.per100g !== undefined ? clamp01(input.sourceMatchQuality ?? 0.75) : 0,
    recipeReviewStatus: recipeReviewStatus === "REVIEWED" ? 1 : recipeReviewStatus === "UNREVIEWED" ? 0.3 : 0,
    completeness: input.per100g === undefined
      ? 0
      : ([input.per100g.energyKcal, input.per100g.proteinG, input.per100g.carbG, input.per100g.fatG, input.per100g.fiberG, input.per100g.sodiumMg]
          .filter((value) => value !== null).length / 6),
  };
  const { level } = confidenceFromComponents(components);
  let overall = level;
  const cappedBy: string[] = [];

  if (input.portion?.confidence === "INSUFFICIENT" || input.portion === null) {
    overall = "INSUFFICIENT";
    cappedBy.push("portion_insufficient");
  }
  if (input.source === null || input.per100g === undefined) {
    cappedBy.push("source_not_resolved");
    if (overall !== "INSUFFICIENT") overall = "LOW";
  }
  if (recipeReviewStatus === "UNREVIEWED") {
    cappedBy.push("unreviewed_recipe");
    if (overall === "HIGH") overall = "MEDIUM";
  }
  if (input.portion !== null && input.portion.confidence === "LOW" && overall === "HIGH") {
    overall = "MEDIUM";
    cappedBy.push("low_portion_confidence");
  }
  if (input.resolutionConfidence !== undefined && input.resolutionConfidence < 0.72 && overall === "HIGH") {
    overall = "MEDIUM";
    cappedBy.push("joint_identity_source_match_not_high");
  }
  if (input.overlapState === "HEAVY") {
    if (overall === "HIGH") overall = "MEDIUM";
    cappedBy.push("heavy_region_overlap");
  } else if (input.overlapState === "PARTIAL" && overall === "HIGH") {
    overall = "MEDIUM";
    cappedBy.push("partial_region_overlap");
  }

  return {
    imageQuality: input.qualityState,
    segmentation: confidenceLevelFromScore(segmentationConfidence),
    identity,
    portionEvidence: input.portion?.confidence ?? "INSUFFICIENT",
    preparationCertainty,
    nutritionSourceMatch,
    recipeReviewStatus,
    finalPolicyVersion: IMAGE_ESTIMATE_CONFIDENCE_POLICY_VERSION,
    overall,
    cappedBy,
  };
}
