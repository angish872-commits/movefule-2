import { randomUUID } from "node:crypto";
import {
  MealContractError,
  type ConfirmedMeal,
  type MealAnalysis,
  type MealAnalysisRequest,
  type MealAnalyzerProvider,
  type MealCreateDraftInput,
  type MealDraft,
  type MealDraftRevision,
  type MealErrorCode,
  type MealProviderName,
  type MealReviseDraftInput,
  type MealType,
  type NutritionItem,
} from "./contracts.ts";
import { clone, correctionItems, totalsForItems, validateItems, validateServerOwnedItems } from "./nutrition.ts";
import { deterministicLocalMealAnalyzer, defaultMealProviderResolver } from "./providers.ts";

export type {
  MealAnalysisRequestInput,
  MealAnalysisRetryInput,
  MealAnalysisCancelInput,
  ConfirmedMealRevisionInput,
  ConfirmedMealDeleteInput,
  ConfirmMealInput,
  ConfirmMealResult,
} from "./store-types.ts";

import type {
  MealAnalysisRequestInput,
  MealAnalysisRetryInput,
  MealAnalysisCancelInput,
  ConfirmedMealRevisionInput,
  ConfirmedMealDeleteInput,
  ConfirmMealInput,
  ConfirmMealResult,
  IdempotentRecord,
  MealStoreOptions,
} from "./store-types.ts";
import {
  hash,
  isMealType,
  isNonEmptyString,
  isSourceType,
  normalizeImageRef,
  requireIdempotencyKey,
  requireLocalDate,
  requireUserId,
  userScopedKey,
  zeroTotals,
} from "./store-support.ts";
import { ConfirmedMealProjection } from "./confirmed-meal-projection.ts";

export class MealStore {
  private readonly drafts = new Map<string, MealDraft>();
  private readonly draftRevisions = new Map<string, MealDraftRevision[]>();
  private readonly analyses = new Map<string, MealAnalysisRequest>();
  private readonly analysisIdempotency = new Map<string, IdempotentRecord<MealAnalysisRequest>>();
  private readonly analysisRetryIdempotency = new Map<string, IdempotentRecord<MealAnalysisRequest>>();
  private readonly confirmationIdempotency = new Map<string, IdempotentRecord<ConfirmMealResult>>();
  private readonly confirmedProjection: ConfirmedMealProjection;
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly defaultProvider: MealAnalyzerProvider;
  private readonly providerResolver: (provider: "local" | "gemini") => MealAnalyzerProvider;

  constructor(options: MealStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    // Appwrite row ids are intentionally kept free of UUID separators. The
    // logical ids remain opaque to clients, but can safely be used by the
    // persistence adapters as row ids when a domain entity is materialized.
    this.idFactory = options.idFactory ?? (() => randomUUID().replaceAll("-", ""));
    this.defaultProvider = options.defaultProvider ?? deterministicLocalMealAnalyzer;
    this.providerResolver = options.providerResolver ?? defaultMealProviderResolver;
    this.confirmedProjection = new ConfirmedMealProjection(this.now);
  }
  /** Returns the complete owner-scoped draft state needed for durable hydration. */
  snapshotDraft(userId: string, draftId: string): {
    draft: MealDraft;
    revisions: MealDraftRevision[];
    analyses: MealAnalysisRequest[];
  } {
    const draft = this.getDraft(userId, draftId);
    const key = userScopedKey(userId, draftId);
    return {
      draft,
      revisions: clone(this.draftRevisions.get(key) ?? []),
      analyses: clone([...this.analyses.values()].filter((analysis) => analysis.userId === userId && analysis.draftId === draftId)),
    };
  }
  /** Hydrates one draft from an owner-scoped durable representation. */
  hydrateDraft(snapshot: {
    draft: MealDraft;
    revisions: MealDraftRevision[];
    analyses?: MealAnalysisRequest[];
  }): void {
    const key = userScopedKey(snapshot.draft.userId, snapshot.draft.draftId);
    this.drafts.set(key, clone(snapshot.draft));
    this.draftRevisions.set(key, clone(snapshot.revisions));
    for (const [analysisKey, analysis] of this.analyses) {
      if (analysis.userId === snapshot.draft.userId && analysis.draftId === snapshot.draft.draftId) {
        this.analyses.delete(analysisKey);
      }
    }
    for (const analysis of snapshot.analyses ?? []) {
      this.analyses.set(userScopedKey(analysis.userId, analysis.requestId), clone(analysis));
    }
  }
  createDraft(userId: string, input: MealCreateDraftInput): MealDraft {
    requireUserId(userId);
    if (!input || typeof input !== "object") throw new MealContractError("invalid_source_type", "Draft input is required.");
    const localDate = requireLocalDate(input.localDate);
    if (!isMealType(input.mealType)) throw new MealContractError("invalid_meal_type", "mealType is invalid.");
    if (!isSourceType(input.sourceType)) throw new MealContractError("invalid_source_type", "sourceType is invalid.");
    if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 500)) {
      throw new MealContractError("invalid_note", "note must be at most 500 characters.");
    }

    const timestamp = this.now();
    const draft: MealDraft = {
      draftId: this.idFactory(),
      userId,
      localDate,
      mealType: input.mealType,
      sourceType: input.sourceType,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      state: "DRAFT",
      activeRevision: 1,
      ...(normalizeImageRef(input.imageRef) ? { imageRef: normalizeImageRef(input.imageRef) } : {}),
      createdAtEpochMillis: timestamp,
      updatedAtEpochMillis: timestamp,
    };
    this.drafts.set(userScopedKey(userId, draft.draftId), draft);
    this.draftRevisions.set(userScopedKey(userId, draft.draftId), [{
      draftRevisionId: this.idFactory(),
      draftId: draft.draftId,
      userId,
      revision: 1,
      items: [],
      totals: zeroTotals(),
      source: "capture",
      createdAtEpochMillis: timestamp,
    }]);
    return clone(draft);
  }
  getDraft(userId: string, draftId: string): MealDraft {
    const draft = this.drafts.get(userScopedKey(userId, draftId));
    if (!draft) throw new MealContractError("draft_not_found", "Meal draft was not found.");
    return clone(draft);
  }
  attachImage(userId: string, draftId: string, imageRef: MealCreateDraftInput["imageRef"]): MealDraft {
    const draft = this.requireDraft(userId, draftId);
    if (draft.state === "CONFIRMED") throw new MealContractError("draft_already_confirmed", "Confirmed meals cannot receive new media.");
    const normalized = normalizeImageRef(imageRef);
    if (!normalized) throw new MealContractError("invalid_image_ref", "imageRef is required.");
    draft.imageRef = normalized;
    draft.updatedAtEpochMillis = this.now();
    return clone(draft);
  }
  reviseDraft(userId: string, draftId: string, input: MealReviseDraftInput): MealDraft {
    const draft = this.requireDraft(userId, draftId);
    if (draft.state === "CONFIRMED") throw new MealContractError("draft_already_confirmed", "Confirmed meals cannot be revised as drafts.");
    if (input.expectedRevision !== undefined && input.expectedRevision !== draft.activeRevision) {
      throw new MealContractError("draft_revision_conflict", "Draft revision is stale.");
    }
    const items = correctionItems(input.items);
    const timestamp = this.now();
    const nextRevision = draft.activeRevision + 1;
    const revision: MealDraftRevision = {
      draftRevisionId: this.idFactory(),
      draftId,
      userId,
      revision: nextRevision,
      items,
      totals: totalsForItems(items),
      source: "user_correction",
      createdAtEpochMillis: timestamp,
    };
    const key = userScopedKey(userId, draftId);
    this.draftRevisions.set(key, [...(this.draftRevisions.get(key) ?? []), revision]);
    draft.activeRevision = nextRevision;
    draft.state = "NEEDS_REVIEW";
    if (input.note !== undefined) draft.note = input.note.trim();
    draft.updatedAtEpochMillis = timestamp;
    return clone(draft);
  }
  async requestAnalysis(userId: string, input: MealAnalysisRequestInput): Promise<MealAnalysisRequest> {
    requireUserId(userId);
    const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
    const draft = this.requireDraft(userId, input.draftId);
    if (draft.state === "CONFIRMED") throw new MealContractError("draft_already_confirmed", "Confirmed meals cannot be analyzed again.");
    if (input.expectedRevision !== undefined && input.expectedRevision !== draft.activeRevision) {
      throw new MealContractError("draft_revision_conflict", "Draft revision is stale.");
    }
    const providerName = input.provider ?? "local";
    const provider = providerName === "gemini" ? this.providerResolver("gemini") :
      providerName === "local" ? (input.provider === undefined ? this.defaultProvider : this.providerResolver("local")) :
        (() => { throw new MealContractError("provider_not_implemented", "Unknown meal provider."); })();
    const requestHash = hash({
      draftId: draft.draftId,
      provider: providerName,
      draftRevision: draft.activeRevision,
      idempotencyKey,
    });
    const idempotency = userScopedKey(userId, idempotencyKey);
    const prior = this.analysisIdempotency.get(idempotency);
    if (prior) {
      if (prior.requestHash !== requestHash) throw new MealContractError("idempotency_key_reused", "Analysis idempotency key was reused with different input.");
      return clone(prior.value);
    }
    const timestamp = this.now();
    const request: MealAnalysisRequest = {
      requestId: this.idFactory(),
      userId,
      draftId: draft.draftId,
      idempotencyKey,
      provider: provider.name,
      state: "PENDING",
      activeAttempt: 1,
      createdAtEpochMillis: timestamp,
    };
    draft.state = "ANALYZING";
    draft.analysisRequestId = request.requestId;
    draft.updatedAtEpochMillis = timestamp;
    this.analyses.set(userScopedKey(userId, request.requestId), request);

    const result = await provider.analyze({
      draft: clone(draft),
      draftRevision: clone(this.latestDraftRevision(userId, draft.draftId)),
    });
    if (request.state === "CANCELLED") return clone(request);
    const completedAt = this.now();
    const analysis: MealAnalysis = {
      analysisId: this.idFactory(),
      requestId: request.requestId,
      draftId: draft.draftId,
      userId,
      draftRevision: draft.activeRevision,
      state: result.state,
      provider: result.provider,
      providerVersion: result.providerVersion,
      items: result.state === "COMPLETED" ? validateItems(result.items) : [],
      totals: result.state === "COMPLETED" ? totalsForItems(validateItems(result.items)) : zeroTotals(),
      createdAtEpochMillis: timestamp,
      completedAtEpochMillis: completedAt,
      ...(result.errorCode ? { errorCode: result.errorCode } : {}),
    };
    request.state = result.state;
    request.completedAtEpochMillis = completedAt;
    request.result = analysis;
    if (result.errorCode) request.errorCode = result.errorCode;
    draft.state = result.state === "COMPLETED" ? "NEEDS_REVIEW" : "DRAFT";
    draft.updatedAtEpochMillis = completedAt;
    this.analysisIdempotency.set(idempotency, { requestHash, value: request });
    return clone(request);
  }

  /**
   * Records a server-owned candidate-only image estimate as the completed
   * analysis authority for a camera/photo draft. The HTTP client never supplies
   * these nutrients directly; meal-routes derives them from the owner-scoped production nutrition pipeline
   * result before calling this method.
   */
  recordCandidateOnlyAnalysis(userId: string, input: {
    draftId: string;
    resultId: string;
    providerVersion: string;
    items: NutritionItem[];
  }): MealAnalysisRequest {
    requireUserId(userId);
    const draft = this.requireDraft(userId, input.draftId);
    if (draft.state === "CONFIRMED") throw new MealContractError("draft_already_confirmed", "Confirmed meals cannot be analyzed again.");
    if (draft.sourceType !== "camera" && draft.sourceType !== "photo_picker") {
      throw new MealContractError("invalid_source_type", "Candidate-only image analysis requires a camera or photo-picker draft.");
    }
    const resultId = input.resultId.trim();
    const providerVersion = input.providerVersion.trim();
    if (!resultId || !providerVersion) throw new MealContractError("invalid_items", "Candidate-only analysis identity is incomplete.");
    const items = validateServerOwnedItems(input.items);
    if (items.length === 0) throw new MealContractError("invalid_items", "Candidate-only analysis requires at least one resolved item.");

    const timestamp = this.now();
    const requestId = `candidate-only:${resultId}`;
    const key = userScopedKey(userId, requestId);
    const prior = this.analyses.get(key);
    if (prior && prior.draftId !== draft.draftId) {
      throw new MealContractError("idempotency_key_reused", "Candidate-only result id belongs to a different draft.");
    }
    const analysis: MealAnalysis = {
      analysisId: prior?.result?.analysisId ?? this.idFactory(),
      requestId,
      draftId: draft.draftId,
      userId,
      draftRevision: draft.activeRevision,
      state: "COMPLETED",
      provider: "gemini",
      providerVersion,
      items: clone(items),
      totals: totalsForItems(items),
      createdAtEpochMillis: prior?.result?.createdAtEpochMillis ?? timestamp,
      completedAtEpochMillis: timestamp,
    };
    const request: MealAnalysisRequest = {
      requestId,
      userId,
      draftId: draft.draftId,
      idempotencyKey: `candidate-only:${resultId}`,
      provider: "gemini",
      state: "COMPLETED",
      activeAttempt: 1,
      createdAtEpochMillis: prior?.createdAtEpochMillis ?? timestamp,
      completedAtEpochMillis: timestamp,
      result: analysis,
    };
    this.analyses.set(key, request);
    draft.analysisRequestId = requestId;
    draft.state = "NEEDS_REVIEW";
    draft.updatedAtEpochMillis = timestamp;
    return clone(request);
  }

  getAnalysis(userId: string, requestId: string): MealAnalysisRequest {
    const request = this.analyses.get(userScopedKey(userId, requestId));
    if (!request) throw new MealContractError("analysis_not_found", "Meal analysis request was not found.");
    return clone(request);
  }

  async retryAnalysis(userId: string, input: MealAnalysisRetryInput): Promise<MealAnalysisRequest> {
    requireUserId(userId);
    const request = this.analyses.get(userScopedKey(userId, input.requestId));
    if (!request) throw new MealContractError("analysis_not_found", "Meal analysis request was not found.");
    const draft = this.requireDraft(userId, request.draftId);
    if (input.expectedRevision !== undefined && input.expectedRevision !== draft.activeRevision) {
      throw new MealContractError("draft_revision_conflict", "Draft revision is stale.");
    }
    const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
    const requestHash = hash({
      requestId: request.requestId,
      draftId: request.draftId,
      draftRevision: draft.activeRevision,
      idempotencyKey,
    });
    const idempotency = userScopedKey(userId, idempotencyKey);
    const prior = this.analysisRetryIdempotency.get(idempotency);
    if (prior) {
      if (prior.requestHash !== requestHash) throw new MealContractError("idempotency_key_reused", "Analysis retry idempotency key was reused with different input.");
      return clone(prior.value);
    }
    if (request.state === "COMPLETED") {
      throw new MealContractError("analysis_already_completed", "A completed analysis cannot be retried.");
    }
    if (request.state === "PENDING") {
      throw new MealContractError("analysis_not_retryable", "The analysis is already in progress.");
    }

    const provider = request.provider === "gemini" ? this.providerResolver("gemini") : this.defaultProvider;
    request.activeAttempt += 1;
    request.state = "PENDING";
    delete request.completedAtEpochMillis;
    delete request.errorCode;
    delete request.result;
    draft.state = "ANALYZING";
    draft.updatedAtEpochMillis = this.now();

    const result = await provider.analyze({
      draft: clone(draft),
      draftRevision: clone(this.latestDraftRevision(userId, draft.draftId)),
    });
    const currentRequest = this.analyses.get(userScopedKey(userId, request.requestId));
    if (currentRequest?.state === "CANCELLED") return clone(currentRequest);

    const completedAt = this.now();
    const analysis: MealAnalysis = {
      analysisId: this.idFactory(),
      requestId: request.requestId,
      draftId: draft.draftId,
      userId,
      draftRevision: draft.activeRevision,
      state: result.state,
      provider: result.provider,
      providerVersion: result.providerVersion,
      items: result.state === "COMPLETED" ? validateItems(result.items) : [],
      totals: result.state === "COMPLETED" ? totalsForItems(validateItems(result.items)) : zeroTotals(),
      createdAtEpochMillis: completedAt,
      completedAtEpochMillis: completedAt,
      ...(result.errorCode ? { errorCode: result.errorCode } : {}),
    };
    request.state = result.state;
    request.completedAtEpochMillis = completedAt;
    request.result = analysis;
    if (result.errorCode) request.errorCode = result.errorCode;
    draft.state = result.state === "COMPLETED" ? "NEEDS_REVIEW" : "DRAFT";
    draft.updatedAtEpochMillis = completedAt;
    this.analysisRetryIdempotency.set(idempotency, { requestHash, value: request });
    return clone(request);
  }

  cancelAnalysis(userId: string, input: MealAnalysisCancelInput): MealAnalysisRequest {
    requireUserId(userId);
    const request = this.analyses.get(userScopedKey(userId, input.requestId));
    if (!request) throw new MealContractError("analysis_not_found", "Meal analysis request was not found.");
    const draft = this.requireDraft(userId, request.draftId);
    if (input.expectedRevision !== undefined && input.expectedRevision !== draft.activeRevision) {
      throw new MealContractError("draft_revision_conflict", "Draft revision is stale.");
    }
    if (request.state === "COMPLETED") {
      throw new MealContractError("analysis_already_completed", "A completed analysis cannot be cancelled.");
    }
    if (request.state === "FAILED" || request.state === "CANCELLED") return clone(request);
    request.state = "CANCELLED";
    request.errorCode = "analysis_cancelled";
    request.completedAtEpochMillis = this.now();
    delete request.result;
    draft.state = "DRAFT";
    draft.updatedAtEpochMillis = request.completedAtEpochMillis;
    return clone(request);
  }

  confirmMeal(userId: string, input: ConfirmMealInput): ConfirmMealResult {
    requireUserId(userId);
    const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
    if (input.confirmed !== true) throw new MealContractError("confirmation_required", "confirmed must be true to make a meal permanent.");
    const draft = this.requireDraft(userId, input.draftId);
    const requestHash = hash({
      draftId: input.draftId,
      idempotencyKey,
      confirmed: input.confirmed,
      expectedRevision: input.expectedRevision,
      items: input.items ?? null,
    });
    const idempotency = userScopedKey(userId, idempotencyKey);
    const prior = this.confirmationIdempotency.get(idempotency);
    if (prior) {
      if (prior.requestHash !== requestHash) throw new MealContractError("idempotency_key_reused", "Confirmation idempotency key was reused with different input.");
      return { ...clone(prior.value), status: "DUPLICATE" };
    }
    if (draft.state === "CONFIRMED") throw new MealContractError("draft_already_confirmed", "Meal draft is already confirmed.");
    if (input.expectedRevision !== undefined && input.expectedRevision !== draft.activeRevision) {
      throw new MealContractError("draft_revision_conflict", "Draft revision is stale.");
    }

    const latestRevision = this.latestDraftRevision(userId, draft.draftId);
    const analysis = draft.analysisRequestId ? this.getAnalysis(userId, draft.analysisRequestId) : undefined;
    const reviewedManualDraft = draft.sourceType === "manual" &&
      latestRevision.source === "user_correction" && latestRevision.items.length > 0;
    if (!reviewedManualDraft) {
      if (!analysis?.result) throw new MealContractError("analysis_required", "A completed analysis is required before confirmation.");
      if (analysis.state !== "COMPLETED") {
        throw new MealContractError("analysis_failed", analysis.errorCode ?? "Meal analysis did not complete.");
      }
    }

    const items = input.items === undefined
      ? (latestRevision.items.length > 0 ? clone(latestRevision.items) : clone(analysis?.result?.items ?? []))
      : correctionItems(input.items);
    if (items.length === 0) throw new MealContractError("invalid_items", "At least one reviewed item is required.");

    const timestamp = this.now();
    if (input.items !== undefined) {
      this.appendDraftRevision(userId, draft, items, "user_correction", timestamp);
    }
    const totals = totalsForItems(items);
    const meal: ConfirmedMeal = {
      mealId: this.idFactory(),
      userId,
      localDate: draft.localDate,
      mealType: draft.mealType,
      status: "CONFIRMED",
      currentRevision: 1,
      sourceDraftId: draft.draftId,
      items,
      totals,
      confirmedAtEpochMillis: timestamp,
      createdAtEpochMillis: timestamp,
      updatedAtEpochMillis: timestamp,
    };
    const updatedTotals = this.confirmedProjection.add(meal);
    draft.state = "CONFIRMED";
    draft.updatedAtEpochMillis = timestamp;
    const value: ConfirmMealResult = { status: "CONFIRMED", meal, totals: updatedTotals };
    this.confirmationIdempotency.set(idempotency, { requestHash, value });
    return clone(value);
  }

  getDailyTotals(userId: string, localDate: string) {
    return this.confirmedProjection.getDailyTotals(userId, localDate);
  }

  hydrateConfirmedMeals(userId: string, meals: readonly ConfirmedMeal[]): void {
    this.confirmedProjection.hydrate(userId, meals);
  }

  getConfirmedMeal(userId: string, mealId: string): ConfirmedMeal {
    return this.confirmedProjection.get(userId, mealId);
  }

  listConfirmedMeals(userId: string, localDate?: string): ConfirmedMeal[] {
    return this.confirmedProjection.list(userId, localDate);
  }

  reviseConfirmedMeal(userId: string, input: ConfirmedMealRevisionInput): ConfirmedMeal {
    return this.confirmedProjection.revise(userId, input);
  }

  deleteConfirmedMeal(userId: string, input: ConfirmedMealDeleteInput): ConfirmedMeal {
    return this.confirmedProjection.delete(userId, input);
  }

  private requireDraft(userId: string, draftId: string): MealDraft {
    requireUserId(userId);
    if (!isNonEmptyString(draftId)) throw new MealContractError("draft_not_found", "Meal draft id is required.");
    const draft = this.drafts.get(userScopedKey(userId, draftId));
    if (!draft) throw new MealContractError("draft_not_found", "Meal draft was not found.");
    return draft;
  }

  private latestDraftRevision(userId: string, draftId: string): MealDraftRevision {
    const revisions = this.draftRevisions.get(userScopedKey(userId, draftId)) ?? [];
    const latest = revisions[revisions.length - 1];
    if (!latest) throw new MealContractError("draft_not_found", "Meal draft revision was not found.");
    return latest;
  }

  private appendDraftRevision(
    userId: string,
    draft: MealDraft,
    items: NutritionItem[],
    source: MealDraftRevision["source"],
    timestamp: number,
  ): MealDraftRevision {
    const revision: MealDraftRevision = {
      draftRevisionId: this.idFactory(),
      draftId: draft.draftId,
      userId,
      revision: draft.activeRevision + 1,
      items: clone(items),
      totals: totalsForItems(items),
      source,
      createdAtEpochMillis: timestamp,
    };
    const key = userScopedKey(userId, draft.draftId);
    this.draftRevisions.set(key, [...(this.draftRevisions.get(key) ?? []), revision]);
    draft.activeRevision = revision.revision;
    draft.updatedAtEpochMillis = timestamp;
    return revision;
  }
}

export type { MealErrorCode };
