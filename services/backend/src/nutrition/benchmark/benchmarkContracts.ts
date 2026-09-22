/**
 * Provider-comparison and weighed-food benchmark contracts (Phase 7).
 *
 * This phase prepares controlled evaluation and deliberately does NOT select
 * a provider. Metrics are reported per category; a single winner score is not
 * produced by averaging unrelated metrics. Nothing here calls a real provider,
 * downloads weights, or spends API credits.
 */

import type { NormalizedBBox } from "../vision/segmentationAdapter.ts";
import type { FoodTypeKind } from "../algorithm/contracts.ts";

export const BENCHMARK_SCHEMA_VERSION = 1 as const;
export const METRICS_VERSION = 1 as const;

/** How the provider is integrated. */
export type ProviderAdapterType = "SEGMENTATION" | "CANDIDATE" | "COMBINED";

export type ProviderDeploymentType = "LOCAL" | "SERVER" | "CLOUD_API" | "MOCK";

/** Licence/terms gate. UNKNOWN and REJECTED can never enable a provider. */
export type LicenceStatus = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED" | "UNKNOWN";

/** Privacy/commercial gates. UNKNOWN blocks enabling. */
export type UseStatus = "ALLOWED" | "REVIEW_REQUIRED" | "NOT_ALLOWED" | "UNKNOWN";

export type EvidenceStatus = "BENCHMARKED" | "PARTIAL" | "UNVERIFIED" | "UNKNOWN";

export type RegionAvailability = {
  regions: readonly string[];
  status: UseStatus;
};

export type ProviderCost = {
  currency: string;
  perImageUsd: number | null;
  perConfirmedMealUsd: number | null;
  evidence: string;
};

export type ProviderLatency = {
  p50Ms: number | null;
  p95Ms: number | null;
  evidence: string;
};

export type ProviderInputRequirements = {
  imageFormats: readonly string[];
  maxBytes: number | null;
  requiresSideView: boolean;
  requiresDepth: boolean;
  notes: readonly string[];
};

export type ProviderOutputCapabilities = {
  masks: boolean;
  boundingBoxes: boolean;
  foodIdentity: boolean;
  preparation: boolean;
  portionEstimate: boolean;
  nutrients: boolean;
  notes: readonly string[];
};

export type ProviderDescriptor = {
  providerId: string;
  providerName: string;
  adapterType: ProviderAdapterType;
  modelVersion: string;
  deploymentType: ProviderDeploymentType;
  licenceStatus: LicenceStatus;
  commercialUseStatus: UseStatus;
  dataRetentionStatus: UseStatus;
  modelTrainingUseStatus: UseStatus;
  regionAvailability: RegionAvailability;
  expectedInput: ProviderInputRequirements;
  expectedOutput: ProviderOutputCapabilities;
  cost: ProviderCost | null;
  latency: ProviderLatency | null;
  evidenceStatus: EvidenceStatus;
  enabled: boolean;
};

/** A provider may be enabled only when every licence/privacy gate is known. */
export function providerCanBeEnabled(descriptor: ProviderDescriptor): boolean {
  if (descriptor.licenceStatus === "UNKNOWN" || descriptor.licenceStatus === "REJECTED") return false;
  if (descriptor.commercialUseStatus === "UNKNOWN") return false;
  if (descriptor.dataRetentionStatus === "UNKNOWN") return false;
  if (descriptor.modelTrainingUseStatus === "UNKNOWN") return false;
  if (descriptor.regionAvailability.status === "UNKNOWN") return false;
  return true;
}

/** The only fields a provider is ever allowed to see about a sample. */
export type SampleInputView = {
  sampleId: string;
  imageReferences: readonly { front: string; side?: string; secondAngle?: string }[];
  imageDimensions?: { widthPx?: number; heightPx?: number } | null;
  correlationId: string;
};

export type ProviderPredictionRegion = { bbox: NormalizedBBox; confidence: number };
export type ProviderPredictionCandidate = { name: string; foodType?: FoodTypeKind; confidence: number };
export type ProviderPredictionPortion = {
  minimumGrams?: number;
  centralGrams?: number;
  maximumGrams?: number;
  pieces?: number;
};

/** Structured interpretation of a provider's raw output, produced by a documented normalizer. */
export type ProviderPrediction = {
  regions?: readonly ProviderPredictionRegion[];
  candidates?: readonly ProviderPredictionCandidate[];
  selectedSource?: { fdcId?: number; recipeId?: string } | null;
  portion?: ProviderPredictionPortion | null;
  unknownFood?: boolean;
  clarificationQuestionCount?: number;
};

export type ProviderRunStatus = "SUCCESS" | "FAILED" | "MALFORMED";

export type ProviderRunRecord = {
  providerId: string;
  sampleId: string;
  providerVersion: string;
  status: ProviderRunStatus;
  /** Raw provider output, preserved verbatim and never shared across providers. */
  rawOutput: unknown;
  /** Structured interpretation; null when the raw output did not normalize. */
  prediction: ProviderPrediction | null;
  latencyMs: number;
  attempts: number;
  costUsd: number | null;
  error?: string;
  capturedAt: string;
};

export type ComparisonOptions = {
  seed?: number;
  replayKey?: string;
  maxAttempts?: number;
};

export type ProviderRunner = {
  providerId: string;
  /** Runs the provider against the input view. Must never receive ground truth. */
  run(input: SampleInputView): Promise<unknown>;
  /** Optional: interprets raw output into a structured prediction. */
  normalize?(rawOutput: unknown, input: SampleInputView): ProviderPrediction | null;
  /** Optional: returns schema errors; non-empty marks the run MALFORMED. */
  validateOutput?(rawOutput: unknown): readonly string[];
  providerVersion: string;
  costPerImageUsd?: number | null;
};

export type ComparisonRun = {
  schemaVersion: number;
  runId: string;
  replayKey: string;
  generatedAt: string;
  sampleIds: readonly string[];
  providerIds: readonly string[];
  runs: readonly ProviderRunRecord[];
};

export class BenchmarkContractError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "BenchmarkContractError";
  }
}

export type BenchmarkReviewStatus = "AWAITING_COLLECTION" | "COLLECTED" | "REVIEWED" | "EXCLUDED";
export type PrivacyConsentStatus = "CONSENTED" | "DECLINED" | "PENDING";

export type BenchmarkIngredient = {
  name: string;
  fdcId?: number;
  rawWeightG?: number;
  cookedWeightG?: number;
};

export type BenchmarkGroundTruthRegion = {
  regionId: string;
  bbox: NormalizedBBox;
  foodNames: readonly string[];
};

export type BenchmarkGroundTruthSource = { fdcId?: number; recipeId?: string; description?: string };
export type BenchmarkGroundTruthNutrients = {
  energyKcal?: number;
  proteinG?: number;
  carbG?: number;
  fatG?: number;
  fiberG?: number;
  sodiumMg?: number;
};

export type BenchmarkSample = {
  sampleId: string;
  mealId: string;
  captureDate?: string;
  region?: string;
  category: string;
  foodNames: readonly string[];
  foodType?: FoodTypeKind;
  preparationMethod?: string;
  ingredients?: readonly BenchmarkIngredient[];
  finalCookedWeightG?: number;
  portionServedWeightG?: number;
  plateDiameterCm?: number;
  bowlCupVolumeMl?: number;
  pieceCount?: number;
  addedOilGheeButterSauceG?: number;
  images?: {
    front: string;
    side?: string;
    secondAngle?: string;
    widthPx?: number;
    heightPx?: number;
    referenceObject?: string;
  };
  groundTruthRegions?: readonly BenchmarkGroundTruthRegion[];
  reviewer?: string;
  reviewStatus: BenchmarkReviewStatus;
  corrections?: readonly string[];
  exclusions?: readonly string[];
  privacyConsent: PrivacyConsentStatus;
  groundTruthSource?: BenchmarkGroundTruthSource;
  groundTruthNutrients?: BenchmarkGroundTruthNutrients;
};

/** Pipeline-level predictions used for portion/nutrition/interaction metrics. Providers never carry nutrients. */
export type PipelinePrediction = {
  sampleId: string;
  nutrients?: BenchmarkGroundTruthNutrients;
  portionInterval?: { minimumGrams?: number; maximumGrams?: number };
  clarificationQuestionCount?: number;
  correctionApplied?: boolean;
  manualEntryFallback?: boolean;
};
