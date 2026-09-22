import type {
  ConfidenceLevel,
  FoodTypeKind,
  NutrientRange,
  NutritionSource,
} from "./contracts.ts";
import type { ImageQualityResult, ImageQualityAssessor, PixelQualityAssessor, QualityState } from "../vision/qualityAssessment.ts";
import type { SegmentationAdapter, SegmentationRegion } from "../vision/segmentationAdapter.ts";
import type { CandidateProvider, RegionFoodCandidate } from "../vision/candidateProviderAdapter.ts";
import type { PortionEvidenceRecord } from "../portion/portionEvidence.ts";
import type { PortionEstimate, PortionEstimator } from "../portion/portionEstimator.ts";
import type { DensityRange } from "../portion/densityLibrary.ts";
import type { PortionCalibrationProfile } from "../confidence/intervalCalibration.ts";
import type { ClarificationEngine, ImageClarificationQuestion } from "../confidence/clarification.ts";

export const IMAGE_ESTIMATE_SCHEMA_VERSION = 1 as const;
export const IMAGE_ESTIMATE_CONFIDENCE_POLICY_VERSION = 1 as const;

export type ImageEstimateResultState =
  | "COMPLETED_NEEDS_CONFIRMATION"
  | "NEEDS_CLARIFICATION"
  | "NEEDS_USER_REVIEW"
  | "NUTRITION_SOURCE_NOT_RESOLVED"
  | "PORTION_INSUFFICIENT"
  | "IMAGE_RETAKE_REQUIRED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_REQUEST";

export type Per100gNutrients = {
  /** Energy is required for a source to power the calorie estimator. */
  energyKcal: number;
  /** Protein is a MoveFuel core nutrient and is required for automatic resolution. */
  proteinG: number;
  /** Optional nutrients stay null when the selected source does not report them. Missing is never zero. */
  carbG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
};

export type NutrientSet = Record<"energyKcal" | "proteinG" | "carbG" | "fatG" | "fiberG" | "sodiumMg", NutrientRange>;

export type NutrientDistributionRange = { p10: number | null; p50: number | null; p90: number | null };
export type SourceBackedNutrientDistribution = {
  basis: "PER_100_G_SOURCE_X_MASS_DISTRIBUTION";
  massDistributionVersion: string | null;
  nutrients: Record<"energyKcal" | "proteinG" | "carbG" | "fatG" | "fiberG" | "sodiumMg", NutrientDistributionRange>;
};

export type ImageEstimateRequest = {
  requestId: string;
  ownerUserId: string;
  imageReference: string;
  mimeType?: string;
  widthPx?: number;
  heightPx?: number;
  checksum?: string;
  correlationId?: string;
  answeredQuestionIds?: readonly string[];
  /** Verified per-piece gram weight (from a reviewed source). */
  pieceWeightGrams?: number;
  /** Label/barcode per-serving grams. */
  servingSizeGrams?: number;
  /** Optional direct/declared portion inputs used by the canonical image-estimate pipeline. */
  manualGrams?: number;
  packageGrams?: number;
  pieceCount?: number;
  knownContainerVolumeMl?: number;
  containerFillFraction?: number;
  previousConfirmedGrams?: number;
};

export type FoodSourceResolution = {
  source: NutritionSource | null;
  per100g?: Per100gNutrients;
  /** 0..1 quality of the selected nutrition-source identity match. */
  matchQuality?: number;
  /** 0..1 joint vision + source resolution confidence. */
  resolutionConfidence?: number;
  /** Index of the visual candidate that won joint resolution. */
  resolvedCandidateIndex?: number;
  /** Query/alias that produced the selected authoritative source. */
  resolutionQuery?: string;
  resolutionWarnings?: readonly string[];
  /** Preparation that jointly matched the selected visual identity and source. */
  resolvedPreparation?: { label: string; confidence: number } | null;
};

export type EvidenceContext = {
  request: ImageEstimateRequest;
  /** Number of independently detected food regions in this scene. */
  regionCount: number;
  regionId: string;
  region: SegmentationRegion;
  itemType: FoodTypeKind;
  candidates: readonly RegionFoodCandidate[];
  /** Candidate selected by joint vision + nutrition-source resolution. */
  selectedCandidate: RegionFoodCandidate;
};

export type ImageEstimateDependencies = {
  qualityAssessor: ImageQualityAssessor;
  pixelQualityAssessor?: PixelQualityAssessor;
  segmentationAdapter: SegmentationAdapter;
  candidateProvider: CandidateProvider;
  portionEstimator: PortionEstimator;
  clarificationEngine: ClarificationEngine;
  resolveFood: (candidates: readonly RegionFoodCandidate[], itemType: FoodTypeKind) => FoodSourceResolution;
  collectEvidence: (context: EvidenceContext, resolved: FoodSourceResolution) => readonly PortionEvidenceRecord[] | Promise<readonly PortionEvidenceRecord[]>;
  /** Resolve a versioned density for the selected visible food/preparation. */
  /** Resolve density only after nutrition-source identity has been resolved, so mass and nutrient identity cannot silently diverge. */
  resolveDensity?: (context: EvidenceContext, resolved: FoodSourceResolution) => DensityRange | null;
  /** Select a held-out calibration profile for this evidence/food class. */
  resolveCalibrationProfile?: (context: EvidenceContext) => PortionCalibrationProfile | null;
};

export type EstimateConfidenceReport = {
  imageQuality: QualityState;
  segmentation: ConfidenceLevel;
  identity: number;
  portionEvidence: ConfidenceLevel;
  preparationCertainty: number;
  nutritionSourceMatch: "RESOLVED" | "NEEDS_USER_REVIEW" | "NOT_ATTEMPTED";
  recipeReviewStatus: "REVIEWED" | "UNREVIEWED" | "N/A";
  finalPolicyVersion: number;
  overall: ConfidenceLevel;
  cappedBy: readonly string[];
};

export type ImageEstimateItem = {
  itemId: string;
  regionId: string;
  /** Review-safe geometry from segmentation; normalized and free of image bytes. */
  segmentation?: SegmentationRegion;
  foodType: FoodTypeKind;
  candidates: readonly RegionFoodCandidate[];
  selectedCandidateIndex?: number | null;
  selectedPreparation?: { label: string; confidence: number } | null;
  selectedSource: NutritionSource | null;
  portion: PortionEstimate | null;
  nutrients: NutrientSet | null;
  nutrientDistribution?: SourceBackedNutrientDistribution | null;
  clarificationQuestions: readonly ImageClarificationQuestion[];
  uncertainties: readonly string[];
  requiresUserConfirmation: boolean;
  confidence: EstimateConfidenceReport;
};

export type ImageEstimateResult = {
  schemaVersion: typeof IMAGE_ESTIMATE_SCHEMA_VERSION;
  resultId: string;
  requestId: string;
  correlationId: string | null;
  ownerUserId: string;
  state: ImageEstimateResultState;
  imageQuality: ImageQualityResult;
  /** Sanitized scene/pipeline warnings. Never contains provider response bodies or secrets. */
  warnings?: readonly string[];
  items: readonly ImageEstimateItem[];
  requiresUserConfirmation: boolean;
  /** This pipeline never auto-confirms; always false here. */
  confirmed: false;
  createdAt: string;
};

export type EstimateCorrection =
  | { kind: "portion_grams"; minimumGrams: number; centralGrams: number; maximumGrams: number }
  | { kind: "select_candidate"; candidateIndex: number }
  | { kind: "select_source"; source: NutritionSource; per100g: Per100gNutrients };
