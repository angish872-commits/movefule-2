/**
 * Production composition for MoveFuel's candidate-only image nutrition pipeline.
 *
 * AI is identity/segmentation only. Physical evidence determines portion and a
 * trusted nutrition source determines nutrients. The service is intentionally
 * allowed to abstain: an ordinary monocular photo with no metric evidence may
 * resolve food identity while returning PORTION_INSUFFICIENT. A later reviewed
 * gram correction recalculates nutrition deterministically without another AI
 * call.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { MealImageStore } from "../../meal/local-image-store.ts";
import type {
  CandidateGenerationResult,
  CandidateProvider,
  CandidateRequest,
  RegionFoodCandidate,
} from "../vision/candidateProviderAdapter.ts";
import type { DepthScaleAdapter } from "../portion/depthScaleAdapter.ts";
import type { PortionEvidenceType } from "../portion/portionEvidence.ts";
import { normalizePortionCalibrationProfile, type PortionCalibrationProfile } from "../confidence/intervalCalibration.ts";
import { VisionEnsembleCandidateProvider, type VisionEnsembleMember } from "../vision/visionEnsemble.ts";
import { MemoryServingPriorStore, type ServingPriorStore } from "../personalization/servingPriorStore.ts";
import { createConfiguredGeminiFoodSceneAdapter } from "../vision/configuredVision.ts";
import type { ModelConfigurationStore } from "../vision/config/modelConfiguration.ts";
import { ConfiguredVisionRouter } from "../vision/configuredVisionRouter.ts";
import { createMoveFuelAlgorithm, MOVEFUEL_ALGORITHM_VERSION } from "../algorithm/moveFuelAlgorithm.ts";
import {
  ImageEstimatePipeline,
  type EstimateCorrection,
  type ImageEstimateRequest,
  type ImageEstimatePersistenceSnapshot,
  type ImageEstimateResult,
} from "../algorithm/imageEstimatePipeline.ts";
import { MetadataOnlyQualityAssessor, type PixelQualityAssessor } from "../vision/qualityAssessment.ts";
import { OpenCvPixelQualityAssessor } from "../vision/openCvPixelQualityAssessor.ts";
import type { SegmentationAdapter } from "../vision/segmentationAdapter.ts";
import { KnowledgeNutritionResolver, type NutritionRecord } from "../identity/knowledgeNutritionResolver.ts";
import {
  candidateNutritionQueries,
  sourceBoundDensityResolver,
} from "../benchmark/blindRuntimeSupport.ts";
import { productionDensityRecordsFromSnapshot, type KnowledgeSnapshot } from "../identity/knowledgeSnapshot.ts";
import { createReviewedRecipeSnapshotResolver, productionReviewedRecipes, type ReviewedRecipeSnapshot } from "../identity/reviewedRecipeSnapshot.ts";
import { FdcApiClient, FdcApiError, fetchFdcTransport } from "../nutrients/usdaClient.ts";

export const LIVE_IMAGE_ESTIMATE_SERVICE_VERSION = "2.0.1";

export type NutritionSearch = (query: string, limit?: number) => Promise<readonly NutritionRecord[]>;

export type LiveImageEstimateServiceOptions = {
  imageStore: Pick<MealImageStore, "read">;
  sceneAdapter?: SegmentationAdapter & CandidateProvider;
  /** Optional independent candidate-only providers. Segmentation remains owned by sceneAdapter. */
  candidateProviders?: readonly VisionEnsembleMember[];
  geminiApiKey?: string;
  geminiModel?: string;
  openRouterApiKey?: string;
  modelConfigurationStore?: ModelConfigurationStore;
  openRouterAppUrl?: string;
  openRouterAppName?: string;
  onOpenRouterUsage?: import("../vision/providers/openRouterFoodSceneAdapter.ts").OpenRouterFoodSceneAdapterOptions["onUsage"];
  nutritionSearch?: NutritionSearch;
  usdaApiKey?: string;
  pixelQualityAssessor?: PixelQualityAssessor | null;
  depthScaleAdapter?: DepthScaleAdapter | null;
  knowledgeSnapshot?: KnowledgeSnapshot | null;
  reviewedRecipeSnapshot?: ReviewedRecipeSnapshot | null;
  calibrationProfiles?: readonly PortionCalibrationProfile[];
  servingPriorStore?: ServingPriorStore;
  /** Optional environment-independent clock/id hook for deterministic tests. */
  requestIdFactory?: (ownerUserId: string, draftId: string, idempotencyKey: string) => string;
};

export type DraftEstimateInput = {
  ownerUserId: string;
  /** Request-scoped Appwrite JWT used only for owner/consent persistence. */
  accessToken?: string;
  draftId: string;
  idempotencyKey: string;
  imageReference: string;
  mimeType?: string;
  checksum?: string;
  correlationId?: string;
  widthPx?: number;
  heightPx?: number;
  answeredQuestionIds?: readonly string[];
  pieceWeightGrams?: number;
  servingSizeGrams?: number;
  manualGrams?: number;
  packageGrams?: number;
  pieceCount?: number;
  knownContainerVolumeMl?: number;
  containerFillFraction?: number;
  previousConfirmedGrams?: number;
};

export type LiveImageEstimateServiceLike = {
  readonly configured: boolean;
  readonly algorithmVersion: string;
  estimate(input: DraftEstimateInput): Promise<ImageEstimateResult>;
  get(resultId: string, ownerUserId: string): ImageEstimateResult;
  correct(resultId: string, ownerUserId: string, itemId: string, correction: EstimateCorrection): ImageEstimateResult;
  exportResult?(resultId: string, ownerUserId: string): ImageEstimatePersistenceSnapshot;
  hydrateResult?(snapshot: ImageEstimatePersistenceSnapshot): void;
  /** Admit a result to the weak serving prior only after explicit meal confirmation. */
  learnConfirmed?(resultId: string, ownerUserId: string, accessToken?: string): Promise<void>;
};

function configuredSecret(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  const upper = normalized.toUpperCase();
  if (upper.startsWith("REPLACE_") || upper === "REPLACE_ME" || upper.includes("PLACEHOLDER")) return null;
  return normalized;
}

function stableRequestId(ownerUserId: string, draftId: string, idempotencyKey: string): string {
  return `estimate_${createHash("sha256").update(`${ownerUserId}:${draftId}:${idempotencyKey}`).digest("hex").slice(0, 40)}`;
}

function createLiveNutritionSearch(apiKey: string | null): NutritionSearch | null {
  if (!apiKey) return null;
  const client = new FdcApiClient(fetchFdcTransport, { apiKey, timeoutMs: 10_000, maxRetries: 2 });
  return (query, limit = 40) => client.searchNutritionRecords(query, Math.min(Math.max(limit, 1), 40), Math.min(Math.max(limit, 1), 40));
}

const DIRECT_SERVING_PRIOR_EVIDENCE: ReadonlySet<PortionEvidenceType> = new Set<PortionEvidenceType>([
  "MANUAL_GRAMS",
  "PACKAGE_LABEL",
  "BARCODE_SERVING",
  "PIECE_COUNT",
  "CALIBRATED_VOLUME",
  "CALIBRATED_DEPTH_VOLUME",
  "CONTAINER_FILL_VOLUME",
]);

/** Visual/behavioral priors can inform review but can never train themselves. */
export function isServingPriorLearnablePortion(portion: ImageEstimateResult["items"][number]["portion"]): boolean {
  if (!portion || portion.confidence === "INSUFFICIENT") return false;
  if (portion.evidenceUsed.some((evidence) => DIRECT_SERVING_PRIOR_EVIDENCE.has(evidence))) return true;
  // Older corrected estimates used USER_SELECTED_SERVING for an explicit gram
  // correction. Only its direct-authority fusion form is grandfathered; an
  // ordinary serving/visual prior remains ineligible.
  return portion.fusionMethod === "DIRECT_AUTHORITY" && portion.evidenceUsed.includes("USER_SELECTED_SERVING");
}

/**
 * The core pipeline's resolver is synchronous so its decision cannot change
 * halfway through one item. This adapter performs trusted catalogue I/O while
 * candidates are being generated, then exposes only the completed local cache
 * to KnowledgeNutritionResolver.
 */
class PrefetchingCandidateProvider implements CandidateProvider {
  readonly name = "prefetching-candidate-provider";
  private readonly delegate: CandidateProvider;
  private readonly searchRemote: NutritionSearch | null;
  private readonly cache = new Map<string, readonly NutritionRecord[]>();
  private readonly inFlight = new Map<string, Promise<readonly NutritionRecord[]>>();
  private readonly failures = new Map<string, string>();

  constructor(delegate: CandidateProvider, searchRemote: NutritionSearch | null) {
    this.delegate = delegate;
    this.searchRemote = searchRemote;
  }

  async generateCandidates(input: CandidateRequest): Promise<CandidateGenerationResult> {
    const result = await this.delegate.generateCandidates(input);
    if (result.status !== "UNAVAILABLE" && result.candidates.length > 0 && this.searchRemote) {
      const queries = candidateNutritionQueries(result.candidates);
      // FDC/demo keys are easy to burst when one scene emits several aliases.
      // Use small bounded batches instead of firing every query concurrently.
      for (let offset = 0; offset < queries.length; offset += 3) {
        await Promise.all(queries.slice(offset, offset + 3).map((query) => this.prefetch(query)));
      }
    }
    return result;
  }

  searchCached(query: string, limit = 40): readonly NutritionRecord[] {
    return [...(this.cache.get(query.trim().toLowerCase()) ?? [])].slice(0, limit);
  }

  nutritionWarnings(candidates: readonly RegionFoodCandidate[]): readonly string[] {
    if (!this.searchRemote) return ["USDA_PROVIDER_NOT_CONFIGURED"];
    return [...new Set(candidateNutritionQueries(candidates).flatMap((query) => {
      const warning = this.failures.get(query.trim().toLowerCase());
      return warning ? [warning] : [];
    }))];
  }

  private async prefetch(query: string): Promise<readonly NutritionRecord[]> {
    const key = query.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached) return cached;
    const running = this.inFlight.get(key);
    if (running) return running;
    const task = this.searchRemote!(query, 40)
      .then((rows) => {
        const bounded = [...rows].slice(0, 40);
        this.cache.set(key, bounded);
        this.failures.delete(key);
        if (this.cache.size > 400) this.cache.delete(this.cache.keys().next().value as string);
        return bounded;
      })
      .catch((error: unknown) => {
        // A timeout/rate-limit is not authoritative evidence that no food
        // exists. Leave failures uncached so a new estimate can retry USDA.
        this.failures.set(key, nutritionProviderWarning(error));
        return [] as readonly NutritionRecord[];
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, task);
    return task;
  }
}

function nutritionProviderWarning(error: unknown): string {
  if (error instanceof FdcApiError) {
    if (error.code === "rate_limited" || error.status === 429) return "USDA_PROVIDER_RATE_LIMITED";
    if (error.code === "timeout" || error.status === 408) return "USDA_PROVIDER_TIMEOUT";
    if (error.code === "malformed_response") return "USDA_PROVIDER_MALFORMED";
  }
  return "USDA_PROVIDER_UNAVAILABLE";
}

export class LiveImageEstimateService implements LiveImageEstimateServiceLike {
  readonly configured: boolean;
  readonly algorithmVersion = MOVEFUEL_ALGORITHM_VERSION;
  private readonly pipeline: ImageEstimatePipeline | null;
  private readonly servingPriorStore: ServingPriorStore;
  private readonly requestIdFactory: NonNullable<LiveImageEstimateServiceOptions["requestIdFactory"]>;

  constructor(options: LiveImageEstimateServiceOptions) {
    this.requestIdFactory = options.requestIdFactory ?? stableRequestId;
    this.servingPriorStore = options.servingPriorStore ?? new MemoryServingPriorStore();
    const geminiKey = configuredSecret(options.geminiApiKey) ?? configuredSecret(process.env.GEMINI_API_KEY);
    const openRouterKey = configuredSecret(options.openRouterApiKey) ?? configuredSecret(process.env.OPENROUTER_API_KEY);
    const scene = options.sceneAdapter ?? (options.modelConfigurationStore && (openRouterKey || geminiKey)
      ? new ConfiguredVisionRouter({
        imageStore: options.imageStore,
        configStore: options.modelConfigurationStore,
        secrets: {
          ...(openRouterKey ? { openrouterApiKey: openRouterKey } : {}),
          ...(geminiKey ? { geminiApiKey: geminiKey } : {}),
        },
        appUrl: options.openRouterAppUrl ?? process.env.OPENROUTER_APP_URL,
        appName: options.openRouterAppName ?? process.env.OPENROUTER_APP_NAME ?? "MoveFuel",
        ...(options.onOpenRouterUsage ? { onOpenRouterUsage: options.onOpenRouterUsage } : {}),
      })
      : geminiKey
        ? createConfiguredGeminiFoodSceneAdapter(options.imageStore, {
          apiKey: geminiKey,
          ...(options.geminiModel ? { model: options.geminiModel } : {}),
        })
        : null);
    if (!scene) {
      this.configured = false;
      this.pipeline = null;
      return;
    }

    const usdaKey = configuredSecret(options.usdaApiKey) ?? configuredSecret(process.env.USDA_FDC_API_KEY) ?? configuredSecret(process.env.FDC_API_KEY);
    const nutritionSearch = options.nutritionSearch ?? createLiveNutritionSearch(usdaKey);
    const identityProvider = new VisionEnsembleCandidateProvider([
      { provider: scene, weight: 1 },
      ...(options.candidateProviders ?? []),
    ]);
    const candidates = new PrefetchingCandidateProvider(identityProvider, nutritionSearch);
    const reviewedRecipeResolve = options.reviewedRecipeSnapshot
      ? createReviewedRecipeSnapshotResolver(options.reviewedRecipeSnapshot)
      : undefined;
    const resolver = new KnowledgeNutritionResolver({
      search: (query, limit) => candidates.searchCached(query, limit),
      ...(reviewedRecipeResolve ? { reviewedRecipeResolve } : {}),
    });
    const density = sourceBoundDensityResolver(options.knowledgeSnapshot ?? null);
    const pixelQuality = options.pixelQualityAssessor === undefined
      ? new OpenCvPixelQualityAssessor({
        imageStore: options.imageStore,
        pythonPath: path.resolve(import.meta.dirname, "../../../../../research/nutrition-research/python"),
        pythonBin: process.env.MOVEFUEL_PYTHON_BIN?.trim() || "python3",
      })
      : options.pixelQualityAssessor;

    this.pipeline = createMoveFuelAlgorithm({
      qualityAssessor: new MetadataOnlyQualityAssessor(),
      ...(pixelQuality ? { pixelQualityAssessor: pixelQuality } : {}),
      segmentationAdapter: scene,
      candidateProvider: candidates,
      resolveFood: (visibleCandidates, itemType) => {
        const resolved = resolver.resolve(visibleCandidates, itemType);
        const nutritionWarnings = candidates.nutritionWarnings(visibleCandidates);
        return nutritionWarnings.length > 0
          ? { ...resolved, resolutionWarnings: [...(resolved.resolutionWarnings ?? []), ...nutritionWarnings] }
          : resolved;
      },
      resolveDensityForSource: (resolved) => density(resolved),
      depthScaleAdapter: options.depthScaleAdapter ?? null,
      calibrationProfiles: options.calibrationProfiles ?? [],
      resolvePersonalServingPrior: ({ ownerUserId, candidate, resolved }) => {
        if (!resolved.source) return null;
        return this.servingPriorStore.resolve({
          ownerUserId,
          source: resolved.source,
          candidate,
          preparationLabel: resolved.resolvedPreparation?.label ?? null,
        });
      },
    });
    this.configured = true;
  }

  async estimate(input: DraftEstimateInput): Promise<ImageEstimateResult> {
    if (!this.pipeline) throw new Error("live_image_estimate_not_configured");
    if (!input.ownerUserId.trim() || !input.draftId.trim() || !input.idempotencyKey.trim() || !input.imageReference.trim()) {
      throw new Error("invalid_live_image_estimate_request");
    }
    const request: ImageEstimateRequest = {
      requestId: this.requestIdFactory(input.ownerUserId, input.draftId, input.idempotencyKey),
      ownerUserId: input.ownerUserId,
      imageReference: input.imageReference,
      ...(input.mimeType ? { mimeType: input.mimeType } : {}),
      ...(input.widthPx !== undefined ? { widthPx: input.widthPx } : {}),
      ...(input.heightPx !== undefined ? { heightPx: input.heightPx } : {}),
      ...(input.checksum ? { checksum: input.checksum } : {}),
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...(input.answeredQuestionIds ? { answeredQuestionIds: input.answeredQuestionIds } : {}),
      ...(input.pieceWeightGrams !== undefined ? { pieceWeightGrams: input.pieceWeightGrams } : {}),
      ...(input.servingSizeGrams !== undefined ? { servingSizeGrams: input.servingSizeGrams } : {}),
      ...(input.manualGrams !== undefined ? { manualGrams: input.manualGrams } : {}),
      ...(input.packageGrams !== undefined ? { packageGrams: input.packageGrams } : {}),
      ...(input.pieceCount !== undefined ? { pieceCount: input.pieceCount } : {}),
      ...(input.knownContainerVolumeMl !== undefined ? { knownContainerVolumeMl: input.knownContainerVolumeMl } : {}),
      ...(input.containerFillFraction !== undefined ? { containerFillFraction: input.containerFillFraction } : {}),
      ...(input.previousConfirmedGrams !== undefined ? { previousConfirmedGrams: input.previousConfirmedGrams } : {}),
    };
    return this.pipeline.run(request);
  }

  get(resultId: string, ownerUserId: string): ImageEstimateResult {
    if (!this.pipeline) throw new Error("live_image_estimate_not_configured");
    return this.pipeline.getResult(resultId, ownerUserId);
  }

  correct(resultId: string, ownerUserId: string, itemId: string, correction: EstimateCorrection): ImageEstimateResult {
    if (!this.pipeline) throw new Error("live_image_estimate_not_configured");
    return this.pipeline.applyCorrection(resultId, ownerUserId, itemId, correction);
  }

  exportResult(resultId: string, ownerUserId: string): ImageEstimatePersistenceSnapshot {
    if (!this.pipeline) throw new Error("live_image_estimate_not_configured");
    return this.pipeline.exportResult(resultId, ownerUserId);
  }

  hydrateResult(snapshot: ImageEstimatePersistenceSnapshot): void {
    this.pipeline?.hydrateResult(snapshot);
  }

  async learnConfirmed(resultId: string, ownerUserId: string): Promise<void> {
    if (!this.pipeline) throw new Error("live_image_estimate_not_configured");
    const result = this.pipeline.getResult(resultId, ownerUserId);
    for (const item of result.items) {
      if (!item.selectedSource || !isServingPriorLearnablePortion(item.portion)) continue;
      const grams = item.portion!.centralGrams;
      if (!Number.isFinite(grams) || grams <= 0 || item.candidates.length === 0) continue;
      const candidateIndex = item.selectedCandidateIndex ?? 0;
      const candidate = item.candidates[candidateIndex] ?? item.candidates[0]!;
      await this.servingPriorStore.recordConfirmed({
        ownerUserId,
        source: item.selectedSource,
        candidate,
        preparationLabel: item.selectedPreparation?.label ?? null,
      }, grams, result.createdAt);
    }
  }
}

export function loadKnowledgeSnapshotFromFile(file: string | undefined): KnowledgeSnapshot | null {
  const candidate = file?.trim() ?? "";
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(readFileSync(path.resolve(candidate), "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const snapshot = parsed as KnowledgeSnapshot;
    return productionDensityRecordsFromSnapshot(snapshot).length > 0 ? snapshot : null;
  } catch {
    return null;
  }
}

export function loadReviewedRecipeSnapshotFromFile(file: string | undefined): ReviewedRecipeSnapshot | null {
  const candidate = file?.trim() ?? "";
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(readFileSync(path.resolve(candidate), "utf8")) as unknown;
    return productionReviewedRecipes(parsed).length > 0 ? parsed as ReviewedRecipeSnapshot : null;
  } catch {
    return null;
  }
}

export function loadCalibrationProfilesFromFile(file: string | undefined): readonly PortionCalibrationProfile[] {
  const candidate = file?.trim() ?? "";
  if (!candidate) return [];
  try {
    const parsed = JSON.parse(readFileSync(path.resolve(candidate), "utf8")) as unknown;
    const rows = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" && Array.isArray((parsed as { profiles?: unknown }).profiles) ? (parsed as { profiles: unknown[] }).profiles : []);
    return rows
      .flatMap((row) => {
        const profile = normalizePortionCalibrationProfile(row);
        return profile ? [profile] : [];
      });
  } catch {
    return [];
  }
}
