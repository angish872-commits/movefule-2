/**
 * Production image-estimate pipeline orchestration.
 *
 * Strict orchestration:
 *   validate request -> assess quality -> segment -> candidates per region ->
 *   classify -> collect portion evidence -> estimate portion range ->
 *   generate clarification questions -> resolve USDA/recipe source ->
 *   calculate nutrients only when resolution succeeds -> never auto-confirm.
 *
 * This pipeline NEVER creates a confirmed meal. Only the existing explicit
 * confirmation service may persist a confirmed meal and update daily totals.
 * Vision providers (segmentation, candidates, pixel quality) are never
 * re-invoked on user correction.
 */
import type {
  ConfidenceLevel,
  FoodTypeKind,
  NutrientRange,
  NutritionSource,
} from "./contracts.ts";
import { calculateNutrientRange } from "../nutrients/nutrientCalculator.ts";
import { confidenceFromComponents, type ConfidenceComponents } from "../confidence/confidence.ts";
import type {
  ImageQualityResult,
  ImageQualityAssessor,
  PixelQualityAssessor,
  QualityState,
} from "../vision/qualityAssessment.ts";
import {
  type SegmentationAdapter,
  type SegmentationAnalysis,
  validateSegmentationAnalysis,
} from "../vision/segmentationAdapter.ts";
import {
  type CandidateProvider,
  type RegionFoodCandidate,
  validateCandidateGenerationResult,
} from "../vision/candidateProviderAdapter.ts";
import { type PortionEvidenceRecord, validateEvidenceRecord } from "../portion/portionEvidence.ts";
import { type PortionEstimate, PortionEstimator } from "../portion/portionEstimator.ts";
import type { DensityRange } from "../portion/densityLibrary.ts";
import type { PortionCalibrationProfile } from "../confidence/intervalCalibration.ts";
import { MASS_DISTRIBUTION_VERSION } from "../portion/physicalEvidenceGraph.ts";
import type { SegmentationRegion } from "../vision/segmentationAdapter.ts";
import {
  type ClarificationContext,
  ClarificationEngine,
  type ImageClarificationQuestion,
  isPieceBasedName,
} from "../confidence/clarification.ts";
export * from "./imageEstimateContracts.ts";
export { computeNutrientsFromPortion, computeSourceBackedNutrientDistribution } from "./nutrientProjection.ts";
import {
  IMAGE_ESTIMATE_SCHEMA_VERSION,
  type EstimateCorrection,
  type EvidenceContext,
  type FoodSourceResolution,
  type ImageEstimateDependencies,
  type ImageEstimateItem,
  type ImageEstimateRequest,
  type ImageEstimateResult,
  type ImageEstimateResultState,
  type NutrientSet,
  type Per100gNutrients,
} from "./imageEstimateContracts.ts";
import { computeConfidenceReport } from "./estimateConfidencePolicy.ts";
import {
  computeNutrientsFromPortion,
  computeSourceBackedNutrientDistribution,
  emptyNutrients,
  requestHash,
} from "./nutrientProjection.ts";
type StoredResult = {
  result: ImageEstimateResult;
  per100gByItem: Map<string, Per100gNutrients>;
  requestHash: string;
};
export type ImageEstimatePersistenceSnapshot = {
  result: ImageEstimateResult;
  per100gByItem: Record<string, Per100gNutrients>;
  requestHash: string;
};
export class ImageEstimatePipelineError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ImageEstimatePipelineError";
  }
}
export class EstimateAccessError extends ImageEstimatePipelineError {
  constructor() {
    super("estimate_access_denied", "The requesting user does not own this estimate.");
    this.name = "EstimateAccessError";
  }
}
export class ImageEstimatePipeline {
  private readonly deps: ImageEstimateDependencies;
  private readonly results = new Map<string, StoredResult>();
  constructor(deps: ImageEstimateDependencies) {
    this.deps = deps;
  }
  /** Owner-scoped read. Throws EstimateAccessError for a non-owner. */
  getResult(resultId: string, requestingUserId: string): ImageEstimateResult {
    const stored = this.results.get(resultId);
    if (!stored) throw new ImageEstimatePipelineError("estimate_not_found", "No estimate with this id exists.");
    if (stored.result.ownerUserId !== requestingUserId) throw new EstimateAccessError();
    return stored.result;
  }
  /** Export only the owner-checked state needed to resume corrections later. */
  exportResult(resultId: string, requestingUserId: string): ImageEstimatePersistenceSnapshot {
    const stored = this.results.get(resultId);
    if (!stored) throw new ImageEstimatePipelineError("estimate_not_found", "No estimate with this id exists.");
    if (stored.result.ownerUserId !== requestingUserId) throw new EstimateAccessError();
    return {
      result: stored.result,
      per100gByItem: Object.fromEntries(stored.per100gByItem.entries()),
      requestHash: stored.requestHash,
    };
  }
  /** Restore an owner-scoped estimate without invoking a vision provider. */
  hydrateResult(snapshot: ImageEstimatePersistenceSnapshot): void {
    if (!snapshot?.result?.resultId || !snapshot.result.ownerUserId || !snapshot.requestHash) return;
    this.results.set(snapshot.result.resultId, {
      result: snapshot.result,
      per100gByItem: new Map(Object.entries(snapshot.per100gByItem ?? {})),
      requestHash: snapshot.requestHash,
    });
  }
  async run(request: ImageEstimateRequest): Promise<ImageEstimateResult> {
    const hash = requestHash(request);
    const existing = this.results.get(request.requestId);
    if (existing) {
      if (existing.requestHash === hash) return existing.result;
      throw new ImageEstimatePipelineError("idempotency_key_reused", "requestId was already used for a different request.");
    }
    const invalid = this.validateRequest(request);
    if (invalid.length > 0) {
      const result = this.buildResult(request, "INVALID_REQUEST", this.metadataQualityPlaceholder(), [], invalid);
      this.store(request, result, new Map());
      return result;
    }
    const metadataQuality = this.deps.qualityAssessor.validateMetadata(request);
    const quality = await this.combineQuality(metadataQuality, request);
    if (quality.state === "UNSUPPORTED" || quality.state === "INVALID_IMAGE" || quality.state === "RETAKE_REQUIRED") {
      const result = this.buildResult(request, "IMAGE_RETAKE_REQUIRED", quality, [], ["image quality gate failed"]);
      this.store(request, result, new Map());
      return result;
    }
    if (quality.issueCodes.includes("ANALYSIS_PROVIDER_UNAVAILABLE")) {
      const result = this.buildResult(request, "PROVIDER_UNAVAILABLE", quality, [], ["quality provider unavailable; manual entry remains available"]);
      this.store(request, result, new Map());
      return result;
    }
    let segmentation: SegmentationAnalysis;
    try {
      segmentation = await this.deps.segmentationAdapter.segment({
        imageReference: request.imageReference,
        mimeType: request.mimeType,
        widthPx: request.widthPx,
        heightPx: request.heightPx,
        checksum: request.checksum,
        correlationId: request.correlationId,
        ownerUserId: request.ownerUserId,
      });
    } catch (error) {
      return this.providerFailure(request, quality, sanitizeProviderError(error));
    }
    const segmentationErrors = validateSegmentationAnalysis(segmentation);
    if (segmentationErrors.length > 0 || segmentation.status === "FAILED" || segmentation.status === "UNAVAILABLE") {
      return this.providerFailure(request, quality, ["segmentation did not return usable regions", ...segmentation.warnings]);
    }
    const items: ImageEstimateItem[] = [];
    const questions: ImageClarificationQuestion[] = [];
    const seenQuestions = new Set<string>();
    let requiresReview = quality.state === "REVIEW_RECOMMENDED";
    let anySourceUnresolved = false;
    let anyPortionInsufficient = false;
    let anyClarification = false;
    const per100gByItem = new Map<string, Per100gNutrients>();
    for (const region of segmentation.regions) {
      const itemId = `item-${items.length + 1}`;
      let generation;
      try {
        generation = await this.deps.candidateProvider.generateCandidates({
          imageReference: request.imageReference,
          regionId: region.regionId,
          mimeType: request.mimeType,
          checksum: request.checksum,
          correlationId: request.correlationId,
          ownerUserId: request.ownerUserId,
        });
      } catch (error) {
        return this.providerFailure(request, quality, sanitizeProviderError(error));
      }
      const candidateErrors = validateCandidateGenerationResult(generation);
      if (candidateErrors.length > 0) {
        return this.providerFailure(request, quality, "candidate provider returned a malformed response");
      }
      if (generation.status === "UNAVAILABLE") {
        return this.providerFailure(request, quality, ["candidate provider unavailable; manual entry remains available", ...generation.warnings]);
      }
      const candidates = generation.candidates;
      if (candidates.length === 0) {
        requiresReview = true;
        anySourceUnresolved = true;
        const item: ImageEstimateItem = {
          itemId,
          regionId: region.regionId,
          segmentation: region,
          foodType: "UNCLEAR",
          candidates: [],
          selectedCandidateIndex: null,
          selectedPreparation: null,
          selectedSource: null,
          portion: null,
          nutrients: null,
          nutrientDistribution: null,
          clarificationQuestions: [],
          uncertainties: ["no candidates identified", ...generation.warnings],
          requiresUserConfirmation: true,
          confidence: computeConfidenceReport({
            qualityState: quality.state,
            regionConfidences: [region.segmentationConfidence],
            topCandidate: null,
            portion: null,
            source: null,
            per100g: undefined,
            overlapState: region.overlapState,
          }),
        };
        items.push(item);
        continue;
      }
      const initialTopCandidate = candidates[0]!;
      // Resolve identity before physical evidence/density. The resolver may
      // legitimately choose candidate #2/#3 when the joint vision + nutrition
      // catalogue match is stronger than candidate #1.
      const resolved = this.deps.resolveFood(candidates, initialTopCandidate.foodType);
      if (resolved.source === null || resolved.per100g === undefined) anySourceUnresolved = true;
      const selectedCandidateIndex = resolved.resolvedCandidateIndex ?? 0;
      const selectedCandidate = candidates[selectedCandidateIndex] ?? initialTopCandidate;
      const itemType = selectedCandidate.foodType;
      const evidenceContext: EvidenceContext = {
        request,
        regionCount: segmentation.regions.length,
        regionId: region.regionId,
        region,
        itemType,
        candidates,
        selectedCandidate,
      };
      const collectedEvidence = await Promise.resolve(this.deps.collectEvidence(evidenceContext, resolved));
      const evidence = collectedEvidence.filter((record) => validateEvidenceRecord(record).length === 0);
      const portion = this.deps.portionEstimator.estimate({
        itemType,
        evidence,
        pieceWeightGrams: request.pieceWeightGrams,
        servingSizeGrams: request.servingSizeGrams,
        volumeDensityRange: this.deps.resolveDensity?.(evidenceContext, resolved) ?? undefined,
        calibrationProfile: this.deps.resolveCalibrationProfile?.(evidenceContext) ?? undefined,
        pieceBased: isPieceBasedName(selectedCandidate.name),
      });
      if (portion.confidence === "INSUFFICIENT") anyPortionInsufficient = true;
      if (portion.requiresClarification) anyClarification = true;
      const itemQuestions: ImageClarificationQuestion[] = [];
      const preparationConfidence = resolved.resolvedPreparation?.confidence ?? selectedCandidate.preparationCandidates[0]?.confidence ?? null;
      const relativeMassIntervalWidth = portion.centralGrams > 0
        ? (portion.maximumGrams - portion.minimumGrams) / portion.centralGrams
        : null;
      const clarificationValuable = portion.requiresClarification ||
        resolved.source === null ||
        (resolved.resolutionConfidence !== undefined && resolved.resolutionConfidence < 0.72) ||
        (itemType === "MIXED_DISH") ||
        (itemType === "PREPARED" && preparationConfidence !== null && preparationConfidence < 0.72) ||
        (relativeMassIntervalWidth !== null && relativeMassIntervalWidth > 0.6);
      if (clarificationValuable) {
        const context: ClarificationContext = {
          itemId,
          itemType,
          candidates,
          portion,
          evidenceTypes: evidence.map((record) => record.evidenceType),
          pieceBased: isPieceBasedName(selectedCandidate.name),
          occlusionWarning: region.warnings.some((warning) => warning.toLowerCase().includes("occlus")),
          identityResolutionConfidence: resolved.resolutionConfidence ?? null,
          preparationConfidence,
          relativeMassIntervalWidth,
          sourceResolved: resolved.source !== null,
          answeredQuestionIds: request.answeredQuestionIds ?? [],
        };
        for (const question of this.deps.clarificationEngine.generate(context)) {
          if (!seenQuestions.has(`${itemId}:${question.questionId}`)) {
            seenQuestions.add(`${itemId}:${question.questionId}`);
            itemQuestions.push(question);
          }
        }
      }
      if (itemQuestions.length > 0) anyClarification = true;
      questions.push(...itemQuestions);
      const nutrients = resolved.source !== null && resolved.per100g !== undefined && portion.confidence !== "INSUFFICIENT"
        ? computeNutrientsFromPortion(resolved.per100g, portion)
        : null;
      const nutrientDistribution = resolved.source !== null && resolved.per100g !== undefined && portion.confidence !== "INSUFFICIENT"
        ? computeSourceBackedNutrientDistribution(resolved.per100g, portion)
      : null;
      if (resolved.source !== null && resolved.per100g !== undefined) {
        per100gByItem.set(itemId, resolved.per100g);
      }
      const confidence = computeConfidenceReport({
        qualityState: quality.state,
        regionConfidences: [region.segmentationConfidence],
        topCandidate: selectedCandidate,
        portion,
        source: resolved.source,
        per100g: resolved.per100g,
        sourceMatchQuality: resolved.matchQuality,
        resolutionConfidence: resolved.resolutionConfidence,
        overlapState: region.overlapState,
      });

      items.push({
        itemId,
        regionId: region.regionId,
        segmentation: region,
        foodType: itemType,
        candidates,
        selectedCandidateIndex,
        selectedPreparation: resolved.resolvedPreparation ?? null,
        selectedSource: resolved.source,
        portion,
        nutrients,
        nutrientDistribution,
        clarificationQuestions: itemQuestions,
        uncertainties: [
          ...generation.warnings,
          ...selectedCandidate.uncertaintyNotes,
          ...portion.uncertainties,
          ...(resolved.resolutionWarnings ?? []),
          ...(region.overlapState === "HEAVY" ? ["food regions overlap heavily; hidden boundaries may affect per-item portion estimates"] : []),
          ...(region.overlapState === "PARTIAL" ? ["food regions partially overlap; portion boundaries may be less certain"] : []),
          ...(resolved.source === null ? ["nutrition source not resolved"] : []),
        ],
        requiresUserConfirmation: true,
        confidence,
      });
    }

    if (items.length === 0) {
      const result = this.buildResult(request, "NEEDS_USER_REVIEW", quality, [], ["no food regions identified", ...segmentation.warnings]);
      this.store(request, result, new Map());
      return result;
    }

    let state: ImageEstimateResultState;
    if (anySourceUnresolved) state = "NUTRITION_SOURCE_NOT_RESOLVED";
    else if (anyPortionInsufficient) state = "PORTION_INSUFFICIENT";
    else if (anyClarification) state = "NEEDS_CLARIFICATION";
    else if (requiresReview) state = "NEEDS_USER_REVIEW";
    else state = "COMPLETED_NEEDS_CONFIRMATION";

    const result = this.buildResult(request, state, quality, items, segmentation.warnings);
    this.store(request, result, per100gByItem);
    return result;
  }

  /**
   * Apply a user correction deterministically WITHOUT calling any vision
   * provider again. Returns the updated estimate.
   */
  applyCorrection(
    resultId: string,
    requestingUserId: string,
    itemId: string,
    correction: EstimateCorrection,
  ): ImageEstimateResult {
    const stored = this.results.get(resultId);
    if (!stored) throw new ImageEstimatePipelineError("estimate_not_found", "No estimate with this id exists.");
    if (stored.result.ownerUserId !== requestingUserId) throw new EstimateAccessError();
    if (!stored.result.items.some((item) => item.itemId === itemId)) {
      throw new ImageEstimatePipelineError("estimate_item_not_found", "The corrected item does not exist in this estimate.");
    }

    const items = stored.result.items.map((item) => {
      if (item.itemId !== itemId) return item;
      return this.applyCorrectionToItem(item, stored, correction);
    });

    const requiresUserConfirmation = items.some((item) => item.requiresUserConfirmation);
    const state = stored.result.state === "INVALID_REQUEST" || stored.result.state === "IMAGE_RETAKE_REQUIRED" || stored.result.state === "PROVIDER_UNAVAILABLE"
      ? stored.result.state
      : this.stateAfterCorrection(items);

    const updated: ImageEstimateResult = {
      ...stored.result,
      state,
      items,
      requiresUserConfirmation,
    };
    stored.result = updated;
    return updated;
  }

  private applyCorrectionToItem(item: ImageEstimateItem, stored: StoredResult, correction: EstimateCorrection): ImageEstimateItem {
    if (correction.kind === "portion_grams") {
      if (!Number.isFinite(correction.minimumGrams) || !Number.isFinite(correction.centralGrams) || !Number.isFinite(correction.maximumGrams)) {
        throw new ImageEstimatePipelineError("invalid_correction", "Portion grams must be finite numbers.");
      }
      if (correction.minimumGrams <= 0 || correction.centralGrams <= 0 || correction.maximumGrams <= 0) {
        throw new ImageEstimatePipelineError("invalid_correction", "Portion grams must be positive.");
      }
      if (!(correction.minimumGrams <= correction.centralGrams && correction.centralGrams <= correction.maximumGrams)) {
        throw new ImageEstimatePipelineError("invalid_correction", "Minimum must be <= central <= maximum.");
      }
      const portion: PortionEstimate = {
        minimumGrams: correction.minimumGrams,
        centralGrams: correction.centralGrams,
        maximumGrams: correction.maximumGrams,
        // Explicit reviewed grams are direct mass evidence. They must replace an
        // earlier INSUFFICIENT visual-portion state rather than inherit it.
        confidence: "HIGH",
        evidenceUsed: ["USER_SELECTED_SERVING"],
        evidenceRejected: [],
        assumptions: ["user-corrected portion"],
        uncertainties: [],
        estimatorVersion: item.portion?.estimatorVersion ?? "1.0.0",
        requiresClarification: false,
        requiresUserConfirmation: true,
        rangeCalibrated: false,
        calibrationProfileId: null,
        massDistribution: {
          family: "DIRECT_INTERVAL",
          p10Grams: correction.minimumGrams,
          p50Grams: correction.centralGrams,
          p90Grams: correction.maximumGrams,
          standardDeviationGrams: null,
          effectiveEvidenceCount: 1,
          version: MASS_DISTRIBUTION_VERSION,
        },
        fusionMethod: "DIRECT_AUTHORITY",
      };
      const per100g = stored.per100gByItem.get(item.itemId);
      const nutrients = item.selectedSource !== null && per100g !== undefined
        ? computeNutrientsFromPortion(per100g, portion)
        : null;
      const nutrientDistribution = item.selectedSource !== null && per100g !== undefined
        ? computeSourceBackedNutrientDistribution(per100g, portion)
        : null;
      const remainingClarifications = item.clarificationQuestions.filter((question) => question.affectedUncertainty !== "PORTION_SIZE");
      const remainingCaps = item.confidence.cappedBy.filter((cap) => cap !== "portion_insufficient" && cap !== "low_portion_confidence");
      const correctedOverall = item.selectedSource !== null && nutrients !== null
        ? (item.confidence.identity >= 0.8 ? "HIGH" : item.confidence.identity >= 0.55 ? "MEDIUM" : "LOW")
        : item.confidence.overall;
      return {
        ...item,
        portion,
        nutrients,
        nutrientDistribution,
        clarificationQuestions: remainingClarifications,
        uncertainties: item.uncertainties.filter((uncertainty) => !/mass|portion/i.test(uncertainty)),
        confidence: {
          ...item.confidence,
          portionEvidence: "HIGH",
          overall: correctedOverall,
          cappedBy: remainingCaps,
        },
        requiresUserConfirmation: true,
      };
    }

    if (correction.kind === "select_candidate") {
      if (!Number.isInteger(correction.candidateIndex) || correction.candidateIndex < 0 || correction.candidateIndex >= item.candidates.length) {
        throw new ImageEstimatePipelineError("invalid_correction", "candidateIndex is out of range.");
      }
      const selected = item.candidates[correction.candidateIndex]!;
      // An explicit user choice constrains source resolution to that identity.
      // Re-ranking the full graph could silently choose a different food.
      const resolved = this.deps.resolveFood([selected], selected.foodType);
      const per100g = resolved.per100g;
      const nutrients = resolved.source !== null && per100g !== undefined && item.portion !== null && item.portion.confidence !== "INSUFFICIENT"
        ? computeNutrientsFromPortion(per100g, item.portion)
        : null;
      const nutrientDistribution = resolved.source !== null && per100g !== undefined && item.portion !== null && item.portion.confidence !== "INSUFFICIENT"
        ? computeSourceBackedNutrientDistribution(per100g, item.portion)
        : null;
      if (per100g !== undefined) stored.per100gByItem.set(item.itemId, per100g);
      else stored.per100gByItem.delete(item.itemId);
      const selectedPreparation = resolved.resolvedPreparation ?? selected.preparationCandidates[0] ?? null;
      const uncertainties = item.uncertainties.filter((uncertainty) =>
        uncertainty !== "nutrition source not resolved" &&
        !uncertainty.includes("food identity remains ambiguous") &&
        !uncertainty.includes("nutrition source preparation conflicts"),
      );
      const confidence = computeConfidenceReport({
        qualityState: item.confidence.imageQuality,
        regionConfidences: item.segmentation ? [item.segmentation.segmentationConfidence] : [],
        topCandidate: selected,
        portion: item.portion,
        source: resolved.source,
        per100g,
        sourceMatchQuality: resolved.matchQuality,
        resolutionConfidence: resolved.resolutionConfidence,
        overlapState: item.segmentation?.overlapState,
      });
      return {
        ...item,
        selectedCandidateIndex: correction.candidateIndex,
        selectedPreparation,
        foodType: selected.foodType,
        selectedSource: resolved.source,
        nutrients,
        nutrientDistribution,
        clarificationQuestions: item.clarificationQuestions.filter((question) => question.questionId !== "CANDIDATE_SELECTION"),
        uncertainties: [
          ...uncertainties,
          ...(resolved.resolutionWarnings ?? []),
          ...(resolved.source === null ? ["nutrition source not resolved"] : []),
        ],
        confidence,
        requiresUserConfirmation: true,
      };
    }

    if (correction.kind === "select_source") {
      if (correction.source === null) throw new ImageEstimatePipelineError("invalid_correction", "source cannot be null.");
      stored.per100gByItem.set(item.itemId, correction.per100g);
      const nutrients = item.portion !== null && item.portion.confidence !== "INSUFFICIENT"
        ? computeNutrientsFromPortion(correction.per100g, item.portion)
        : null;      const nutrientDistribution = item.portion !== null && item.portion.confidence !== "INSUFFICIENT"
        ? computeSourceBackedNutrientDistribution(correction.per100g, item.portion)
        : null;
      return {
        ...item,
        selectedSource: correction.source,
        nutrients,
        nutrientDistribution,
        clarificationQuestions: item.clarificationQuestions.filter((question) => question.questionId !== "CANDIDATE_SELECTION"),
        uncertainties: [],
        confidence: { ...item.confidence, nutritionSourceMatch: "RESOLVED" },
        requiresUserConfirmation: true,
      };
    }

    return item;
  }

  private stateAfterCorrection(items: readonly ImageEstimateItem[]): ImageEstimateResultState {
    if (items.some((item) => item.selectedSource === null)) return "NUTRITION_SOURCE_NOT_RESOLVED";
    if (items.some((item) => item.portion === null || item.portion.confidence === "INSUFFICIENT")) return "PORTION_INSUFFICIENT";
    if (items.some((item) => item.clarificationQuestions.length > 0)) return "NEEDS_CLARIFICATION";
    return "COMPLETED_NEEDS_CONFIRMATION";
  }

  private validateRequest(request: ImageEstimateRequest): string[] {
    const errors: string[] = [];
    if (!request.requestId || request.requestId.trim().length === 0) errors.push("blank_request_id");
    if (!request.ownerUserId || request.ownerUserId.trim().length === 0) errors.push("blank_owner_user_id");
    if (!request.imageReference || request.imageReference.trim().length === 0) errors.push("blank_image_reference");
    const positiveFields = [
      ["width_px", request.widthPx],
      ["height_px", request.heightPx],
      ["piece_weight_grams", request.pieceWeightGrams],
      ["serving_size_grams", request.servingSizeGrams],
      ["manual_grams", request.manualGrams],
      ["package_grams", request.packageGrams],
      ["piece_count", request.pieceCount],
      ["known_container_volume_ml", request.knownContainerVolumeMl],
      ["previous_confirmed_grams", request.previousConfirmedGrams],
    ] as const;
    for (const [name, value] of positiveFields) {
      if (value !== undefined && (!Number.isFinite(value) || value <= 0)) errors.push(`invalid_${name}`);
    }
    if (
      request.containerFillFraction !== undefined &&
      (!Number.isFinite(request.containerFillFraction) || request.containerFillFraction <= 0 || request.containerFillFraction > 1)
    ) errors.push("invalid_container_fill_fraction");
    return errors;
  }

  private metadataQualityPlaceholder(): ImageQualityResult {
    return {
      state: "INVALID_IMAGE",
      issueCodes: ["CORRUPT_IMAGE"],
      userMessage: "The request could not be validated.",
      retryRecommendation: "NO_RETRY",
      safeFallback: "MANUAL_ENTRY",
      evidenceSource: "request-validation",
      analyserVersion: "image-estimate-pipeline@" + IMAGE_ESTIMATE_SCHEMA_VERSION,
      validationMode: "METADATA_ONLY",
    };
  }

  private async combineQuality(metadata: ImageQualityResult, request: ImageEstimateRequest): Promise<ImageQualityResult> {
    if (metadata.state !== "ACCEPTABLE" && metadata.state !== "REVIEW_RECOMMENDED") return metadata;
    if (!this.deps.pixelQualityAssessor) return metadata;
    return await Promise.resolve(this.deps.pixelQualityAssessor.assessPixels({
      imageReference: request.imageReference,
      mimeType: request.mimeType,
      widthPx: request.widthPx,
      heightPx: request.heightPx,
      checksum: request.checksum,
      correlationId: request.correlationId,
    }));
  }

  private providerFailure(request: ImageEstimateRequest, quality: ImageQualityResult, reason: string | readonly string[]): ImageEstimateResult {
    const result = this.buildResult(request, "PROVIDER_UNAVAILABLE", quality, [], typeof reason === "string" ? [reason] : reason);
    this.store(request, result, new Map());
    return result;
  }

  private store(request: ImageEstimateRequest, result: ImageEstimateResult, per100gByItem: Map<string, Per100gNutrients>): void {
    this.results.set(request.requestId, {
      result,
      per100gByItem,
      requestHash: requestHash(request),
    });
  }

  private buildResult(
    request: ImageEstimateRequest,
    state: ImageEstimateResultState,
    quality: ImageQualityResult,
    items: readonly ImageEstimateItem[],
    errors: readonly string[],
  ): ImageEstimateResult {
    const requiresUserConfirmation = items.some((item) => item.requiresUserConfirmation) || state === "COMPLETED_NEEDS_CONFIRMATION";
    return {
      schemaVersion: IMAGE_ESTIMATE_SCHEMA_VERSION,
      resultId: request.requestId,
      requestId: request.requestId,
      correlationId: request.correlationId ?? null,
      ownerUserId: request.ownerUserId,
      state,
      imageQuality: quality,
      warnings: [...new Set(errors)],
      items,
      requiresUserConfirmation,
      confirmed: false,
      createdAt: new Date().toISOString(),
    };
  }
}

/** Never leak provider internals or keys into results or logs. */
function sanitizeProviderError(error: unknown): string {
  if (!(error instanceof Error)) return "provider_error:unknown";
  const safeCodes = [...error.message.matchAll(/\b(?:openrouter|gemini|food_vision)_[a-z0-9_]+\b|\binvalid_provider_response\b/g)].map((match) => match[0]);
  return `provider_error:${[...new Set(safeCodes)].join(",") || error.name || "unknown"}`;
}
