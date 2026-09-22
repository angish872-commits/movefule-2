/**
 * MoveFuel canonical production algorithm composition root.
 *
 * Pipeline: candidate evidence graph -> joint identity/preparation resolution ->
 * physical evidence graph -> robust mass distribution -> source-backed nutrient
 * distribution -> empirical interval calibration -> value-aware clarification ->
 * confirmed, identity-bound serving prior.
 */

import type { RegionFoodCandidate } from "../vision/candidateProviderAdapter.ts";
import type { DensityLibrary, DensityRange } from "../portion/densityLibrary.ts";
import type { PortionCalibrationProfile } from "../confidence/intervalCalibration.ts";
import { ImageEstimatePipeline, type FoodSourceResolution, type ImageEstimateDependencies, type ImageEstimateRequest } from "./imageEstimatePipeline.ts";
import { PortionEstimator, PORTION_ESTIMATOR_VERSION } from "../portion/portionEstimator.ts";
import { ClarificationEngine } from "../confidence/clarification.ts";
import { ShapeAwareEvidenceCollector } from "../portion/shapeAwareEvidence.ts";
import type { DepthScaleAdapter } from "../portion/depthScaleAdapter.ts";
import { reliabilityTierOf, type PortionEvidenceRecord } from "../portion/portionEvidence.ts";
import type { PersonalServingPrior } from "../personalization/personalServingPrior.ts";

export const MOVEFUEL_ALGORITHM_VERSION = "4.3.0";

export type MoveFuelAlgorithmOptions = Omit<ImageEstimateDependencies, "portionEstimator" | "clarificationEngine" | "collectEvidence"> & {
  depthScaleAdapter?: DepthScaleAdapter | null;
  densityLibrary?: DensityLibrary | null;
  densityKeyForCandidate?: (candidate: RegionFoodCandidate) => { foodKey: string; preparation?: string; physicalForm?: string; regionCuisine?: string };
  resolveDensityForSource?: (resolved: FoodSourceResolution, candidates: readonly RegionFoodCandidate[]) => DensityRange | null;
  calibrationProfiles?: readonly PortionCalibrationProfile[];
  resolvePersonalServingPrior?: (input: {
    ownerUserId: string;
    candidate: RegionFoodCandidate;
    resolved: FoodSourceResolution;
  }) => PersonalServingPrior | null | Promise<PersonalServingPrior | null>;
};

function priorEvidence(prior: PersonalServingPrior): PortionEvidenceRecord {
  return {
    evidenceType: "PREVIOUS_CONFIRMED_PORTION",
    suppliedValue: prior.medianGrams,
    minimumValue: Math.max(0, prior.minimumGrams),
    maximumValue: Math.max(prior.medianGrams, prior.maximumGrams),
    unit: "g",
    source: `identity-bound-confirmed-history:n=${prior.sampleCount}`,
    reliabilityTier: reliabilityTierOf("PREVIOUS_CONFIRMED_PORTION"),
    collectedAt: prior.lastConfirmedAt,
    assumptions: ["history is bound to the resolved food/preparation identity and is never treated as a measurement"],
    validationState: "CONFIRMED",
  };
}

export function createMoveFuelAlgorithm(options: MoveFuelAlgorithmOptions): ImageEstimatePipeline {
  const evidenceCollector = new ShapeAwareEvidenceCollector(options.depthScaleAdapter ?? null);
  const calibrationProfiles = options.calibrationProfiles ?? [];
  return new ImageEstimatePipeline({
    qualityAssessor: options.qualityAssessor,
    ...(options.pixelQualityAssessor ? { pixelQualityAssessor: options.pixelQualityAssessor } : {}),
    segmentationAdapter: options.segmentationAdapter,
    candidateProvider: options.candidateProvider,
    resolveFood: options.resolveFood,
    portionEstimator: new PortionEstimator(),
    clarificationEngine: new ClarificationEngine(),
    collectEvidence: async (context, resolved) => {
      // Request-level portion values have no item identifier. Applying one
      // value to every detected region silently multiplies meal mass. Admit
      // them only for a single-food scene; multi-food scenes are corrected
      // safely through the existing item-scoped correction endpoint.
      const singleRegion = context.regionCount === 1;
      const base = await evidenceCollector.collect({
        imageReference: context.request.imageReference,
        mimeType: context.request.mimeType,
        widthPx: context.request.widthPx,
        heightPx: context.request.heightPx,
        checksum: context.request.checksum,
        correlationId: context.request.correlationId,
        region: context.region,
        itemType: context.itemType,
        pieceCount: singleRegion ? context.request.pieceCount : undefined,
        knownContainerVolumeMl: singleRegion ? context.request.knownContainerVolumeMl : undefined,
        containerFillFraction: singleRegion ? context.request.containerFillFraction : undefined,
        manualGrams: singleRegion ? context.request.manualGrams : undefined,
        packageGrams: singleRegion ? context.request.packageGrams : undefined,
        previousConfirmedGrams: singleRegion ? context.request.previousConfirmedGrams : undefined,
      });
      if (base.some((record) => record.evidenceType === "MANUAL_GRAMS" || record.evidenceType === "PACKAGE_LABEL")) return base;
      if (!options.resolvePersonalServingPrior || resolved.source === null) return base;
      if (base.some((record) => record.evidenceType === "PREVIOUS_CONFIRMED_PORTION")) return base;
      const prior = await options.resolvePersonalServingPrior({ ownerUserId: context.request.ownerUserId, candidate: context.selectedCandidate, resolved });
      return prior ? [...base, priorEvidence(prior)] : base;
    },
    resolveDensity: ({ candidates, selectedCandidate }, resolved) => {
      const sourceBound = options.resolveDensityForSource?.(resolved, candidates);
      if (sourceBound) return sourceBound;
      if (!options.densityLibrary) return null;
      const key = options.densityKeyForCandidate?.(selectedCandidate) ?? {
        foodKey: selectedCandidate.name,
        preparation: resolved.resolvedPreparation?.label ?? selectedCandidate.preparationCandidates[0]?.label,
      };
      return options.densityLibrary.resolve(key);
    },
    resolveCalibrationProfile: ({ itemType, selectedCandidate }) => {
      const scopes = [`${itemType}:${selectedCandidate.name.toLowerCase()}`, itemType, "global"];
      for (const scope of scopes) {
        const profile = calibrationProfiles.find((entry) => entry.scopeKey.toLowerCase() === scope.toLowerCase() && entry.portionEstimatorVersion === PORTION_ESTIMATOR_VERSION);
        if (profile) return profile;
      }
      return null;
    },
  });
}

export type MoveFuelAlgorithmRequest = ImageEstimateRequest;
export type MoveFuelAlgorithmDensity = DensityRange;
