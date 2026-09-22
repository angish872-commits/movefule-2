import { IncomingMessage, ServerResponse } from "node:http";
import {
  MealContractError,
  type ConfirmedMeal,
  type MealCreateDraftInput,
  type MealReviseDraftInput,
} from "../meal/contracts.ts";
import { candidateEstimateItemsForConfirmation as canonicalCandidateEstimateItemsForConfirmation } from "../meal/image-estimate-adapter.ts";
import { MealStore, type ConfirmMealInput, type MealAnalysisRequestInput } from "../meal/store.ts";
import { LocalConfirmedMealStore, type ConfirmedMealStoreLike } from "../meal/confirmed-meals.ts";
import { SavedMealStore, type SavedMealStoreLike } from "../meal/saved-meals.ts";
import { PersonalFoodStore, type PersonalFoodStoreLike } from "../meal/personal-food.ts";
import { LocalNutritionCatalogStore, type NutritionCatalogStoreLike } from "../meal/nutrition-catalog.ts";
import { LocalMealImageStore, type MealImageStore } from "../meal/local-image-store.ts";
import { MealAnalysisRateLimiter } from "../meal/analysis-rate-limit.ts";
import { type EstimateCorrection, type ImageEstimatePersistenceSnapshot, type ImageEstimateResult } from "../nutrition/algorithm/imageEstimatePipeline.ts";
import type { LiveImageEstimateServiceLike } from "../nutrition/service/liveImageEstimateService.ts";
import {
  RouteInputError,
  asObject,
  correlationIdFor,
  envelope,
  errorResponse,
  methodNotAllowed,
  readBinary,
  readJson,
  sendJson,
  type MealRouteContext,
} from "./meal-route-support.ts";
import { handleMealLibraryRoute } from "./meal-library-routes.ts";
export type { MealRouteContext } from "./meal-route-support.ts";

export type MealRouteOptions = {
  store?: MealStore;
  draftPersistence?: MealDraftPersistence | ((context: MealRouteContext) => MealDraftPersistence | undefined);
  savedMealStore?: SavedMealStoreLike | ((context: MealRouteContext) => SavedMealStoreLike);
  confirmedMealStore?: ConfirmedMealStoreLike | ((context: MealRouteContext) => ConfirmedMealStoreLike);
  personalFoodStore?: PersonalFoodStoreLike | ((context: MealRouteContext) => PersonalFoodStoreLike);
  nutritionCatalogStore?: NutritionCatalogStoreLike | ((context: MealRouteContext) => NutritionCatalogStoreLike);
  imageStorage?: MealImageStore;
  analysisRateLimiter?: MealAnalysisRateLimiter;
  imageEstimateService?: LiveImageEstimateServiceLike;
  /** Enables deterministic sample drafts/local fixture catalogue only in explicit development/test composition. */
  allowDevelopmentFixtures?: boolean;
  onConfirmed?: (context: MealRouteContext, result: Awaited<ReturnType<MealStore["confirmMeal"]>>) => void | Promise<void>;
  onChanged?: (context: MealRouteContext, meal: ConfirmedMeal, currentMeals: ConfirmedMeal[]) => void | Promise<void>;
};

export type MealDraftPersistence = {
  hydrate(userId: string, store: MealStore, imageEstimateService?: LiveImageEstimateServiceLike): Promise<void>;
  persist(userId: string, store: MealStore, draftId: string, imageEstimate?: ImageEstimatePersistenceSnapshot): Promise<void>;
  findDraftForEstimate?(userId: string, resultId: string): Promise<string | null>;
};

function pathname(req: IncomingMessage): string {
  return new URL(req.url ?? "/", "http://localhost").pathname;
}

function isMealPath(path: string): boolean {
  return path === "/v1/meals" ||
    path === "/v1/reports/nutrition" ||
    path === "/v1/nutrition/search" ||
    path === "/v1/meals/drafts" ||
    path === "/v1/meals/analysis" ||
    path === "/v1/meals/estimates" ||
    path === "/v1/meals/confirm" ||
    path === "/v1/meals/media/content" ||
    path === "/v1/saved-meals" ||
    path === "/v1/personal-food" ||
    /^\/v1\/meals\/analysis\/[^/]+$/.test(path) ||
    /^\/v1\/meals\/estimates\/[^/]+$/.test(path) ||
    /^\/v1\/meals\/estimates\/[^/]+\/corrections$/.test(path) ||
    /^\/v1\/meals\/analysis\/[^/]+\/(retry|cancel)$/.test(path) ||
    /^\/v1\/meals\/[^/]+$/.test(path) ||
    /^\/v1\/meals\/drafts\/[^/]+\/(revisions|image)$/.test(path) ||
    /^\/v1\/personal-food\/[^/]+$/.test(path) ||
    /^\/v1\/nutrition\/foods\/[^/]+$/.test(path);
}

function candidateEstimateItemsForConfirmation(result: ImageEstimateResult) {
  return canonicalCandidateEstimateItemsForConfirmation(result);
}

function registerCandidateEstimateForConfirmation(store: MealStore, userId: string, draftId: string, algorithmVersion: string, result: ImageEstimateResult): void {
  const items = candidateEstimateItemsForConfirmation(result);
  if (!items) return;
  store.recordCandidateOnlyAnalysis(userId, { draftId, resultId: result.resultId, providerVersion: algorithmVersion, items });
}

/**
 * Creates the meal route boundary for later composition into the shared
 * backend server. The shared server remains responsible for authentication;
 * it passes the authenticated user id in the context argument.
 */
export function createMealRouteHandler(options: MealRouteOptions = {}) {
  const store = options.store ?? new MealStore();
  const defaultSavedMealStore = new SavedMealStore();
  const defaultConfirmedMealStore = new LocalConfirmedMealStore(store);
  const defaultPersonalFoodStore = new PersonalFoodStore();
  const defaultNutritionCatalogStore = new LocalNutritionCatalogStore();
  const imageStorage = options.imageStorage ?? new LocalMealImageStore();
  const analysisRateLimiter = options.analysisRateLimiter ?? new MealAnalysisRateLimiter();
  const candidateResultDrafts = new Map<string, { userId: string; draftId: string }>();
  const latestCandidateResultByDraft = new Map<string, string>();
  const candidateDraftKey = (userId: string, draftId: string): string => `${userId}::${draftId}`;

  return async function handleMealRoute(
    req: IncomingMessage,
    res: ServerResponse,
    context?: MealRouteContext,
  ): Promise<boolean> {
    const path = pathname(req);
    if (!isMealPath(path)) return false;

    const correlationId = correlationIdFor(req, context);
    if (!context?.userId?.trim()) {
      sendJson(res, 401, envelope(null, {
        code: "unauthenticated",
        message: "An authenticated user context is required.",
        retryable: false,
      }, correlationId));
      return true;
    }

    try {
      const confirmedMealStore = typeof options.confirmedMealStore === "function"
        ? options.confirmedMealStore(context)
        : options.confirmedMealStore ?? defaultConfirmedMealStore;

      const nutritionCatalogStore = typeof options.nutritionCatalogStore === "function"
        ? options.nutritionCatalogStore(context)
        : options.nutritionCatalogStore ?? defaultNutritionCatalogStore;
      const savedMealStore = typeof options.savedMealStore === "function"
        ? options.savedMealStore(context)
        : options.savedMealStore ?? defaultSavedMealStore;
      const personalFoodStore = typeof options.personalFoodStore === "function"
        ? options.personalFoodStore(context)
        : options.personalFoodStore ?? defaultPersonalFoodStore;
      const draftPersistence = typeof options.draftPersistence === "function"
        ? options.draftPersistence(context)
        : options.draftPersistence;
      await draftPersistence?.hydrate(context.userId, store, options.imageEstimateService);

      if (await handleMealLibraryRoute(req, res, context, path, correlationId, {
        confirmedMealStore,
        savedMealStore,
        personalFoodStore,
        nutritionCatalogStore,
        nutritionCatalogAvailable: options.nutritionCatalogStore !== undefined || options.allowDevelopmentFixtures === true,
      })) return true;

      const draftImageMatch = path.match(/^\/v1\/meals\/drafts\/([^/]+)\/image$/);
      if (draftImageMatch) {
        if (req.method !== "PUT") return methodNotAllowed(res, correlationId, "PUT");
        const mediaType = String(req.headers["content-type"] ?? "").split(";")[0]?.trim();
        if (mediaType !== "image/jpeg" && mediaType !== "image/png" && mediaType !== "image/webp") {
          throw new RouteInputError("invalid_media_type", "Content-Type must be image/jpeg, image/png, or image/webp.");
        }
        const draftId = decodeURIComponent(draftImageMatch[1] ?? "");
        store.getDraft(context.userId, draftId);
        const bytes = await readBinary(req, 20 * 1024 * 1024);
        const stored = await imageStorage.save(context.userId, draftId, mediaType, bytes);
        const draft = store.attachImage(context.userId, draftId, {
          objectId: stored.objectId,
          mediaType: stored.mediaType,
        });
        await draftPersistence?.persist(context.userId, store, draftId);
        sendJson(res, 200, envelope({ draft, image: stored }, null, correlationId));
        return true;
      }

      if (path === "/v1/meals/media/content") {
        if (req.method !== "GET") return methodNotAllowed(res, correlationId, "GET");
        const url = new URL(req.url ?? "/", "http://localhost");
        const objectId = url.searchParams.get("objectId")?.trim() ?? "";
        if (!objectId || objectId.length > 160) throw new RouteInputError("invalid_media_object_id", "A valid meal-media objectId is required.");
        try {
          const image = await imageStorage.readForUser(context.userId, context.accessToken, objectId);
          res.statusCode = 200;
          res.setHeader("content-type", image.mediaType);
          res.setHeader("content-length", image.bytes.byteLength);
          res.setHeader("cache-control", "private, max-age=300");
          res.setHeader("x-content-type-options", "nosniff");
          res.end(image.bytes);
        } catch (error) {
          const code = error instanceof Error ? error.message : "meal_image_read_failed";
          if (code === "meal_image_not_owned" || code === "meal_image_owner_session_required") {
            sendJson(res, 404, envelope(null, { code: "meal_image_not_found", message: "Meal image was not found for this account.", retryable: false }, correlationId));
          } else {
            throw error;
          }
        }
        return true;
      }

      if (path === "/v1/meals") {
        if (req.method !== "GET") return methodNotAllowed(res, correlationId, "GET");
        const url = new URL(req.url ?? "/", "http://localhost");
        const localDate = url.searchParams.get("localDate") ?? undefined;
        const meals = await confirmedMealStore.list(context.userId, localDate);
        sendJson(res, 200, envelope({ meals, count: meals.length }, null, correlationId));
        return true;
      }

      if (path === "/v1/meals/drafts") {
        if (req.method !== "POST") return methodNotAllowed(res, correlationId, "POST");
        const body = asObject(await readJson(req));
        if (body.sourceType === "sample" && options.allowDevelopmentFixtures !== true) {
          throw new RouteInputError("development_fixture_disabled", "Sample meal fixtures are disabled outside explicit development/test composition.");
        }
        const draft = store.createDraft(context.userId, {
          localDate: body.localDate as string,
          mealType: body.mealType as MealCreateDraftInput["mealType"],
          sourceType: body.sourceType as MealCreateDraftInput["sourceType"],
          ...(body.note !== undefined ? { note: body.note as string } : {}),
          ...(body.imageRef !== undefined ? { imageRef: body.imageRef as MealCreateDraftInput["imageRef"] } : {}),
        });
        await draftPersistence?.persist(context.userId, store, draft.draftId);
        sendJson(res, 201, envelope({ draft }, null, correlationId));
        return true;
      }

      if (path === "/v1/meals/estimates") {
        if (req.method !== "POST") return methodNotAllowed(res, correlationId, "POST");
        const service = options.imageEstimateService;
        if (!service?.configured) throw new RouteInputError("image_estimate_not_configured", "Candidate-only image estimation is not configured on this backend.", true);
        const body = asObject(await readJson(req));
        const draftId = typeof body.draftId === "string" ? body.draftId : "";
        const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
        if (!draftId.trim() || !idempotencyKey.trim()) throw new RouteInputError("invalid_image_estimate_request", "draftId and idempotencyKey are required.");
        const answeredQuestionIds = Array.isArray(body.answeredQuestionIds)
          ? body.answeredQuestionIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 64).slice(0, 32)
          : undefined;
        const draft = store.getDraft(context.userId, draftId);
        if (!draft.imageRef?.objectId) throw new RouteInputError("meal_image_required", "The draft must have a private uploaded image before estimation.");
        const finitePositive = (value: unknown): number | undefined =>
          typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
        const finiteFraction = (value: unknown): number | undefined =>
          typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
        const result = await service.estimate({
          ownerUserId: context.userId,
          ...(context.accessToken ? { accessToken: context.accessToken } : {}),
          draftId: draft.draftId,
          idempotencyKey,
          imageReference: draft.imageRef.objectId,
          ...(draft.imageRef.mediaType ? { mimeType: draft.imageRef.mediaType } : {}),
          ...(draft.imageRef.checksum ? { checksum: draft.imageRef.checksum } : {}),
          correlationId,
          ...(answeredQuestionIds ? { answeredQuestionIds } : {}),
          ...(finitePositive(body.widthPx) !== undefined ? { widthPx: finitePositive(body.widthPx)! } : {}),
          ...(finitePositive(body.heightPx) !== undefined ? { heightPx: finitePositive(body.heightPx)! } : {}),
          ...(finitePositive(body.pieceWeightGrams) !== undefined ? { pieceWeightGrams: finitePositive(body.pieceWeightGrams)! } : {}),
          ...(finitePositive(body.servingSizeGrams) !== undefined ? { servingSizeGrams: finitePositive(body.servingSizeGrams)! } : {}),
          ...(finitePositive(body.manualGrams) !== undefined ? { manualGrams: finitePositive(body.manualGrams)! } : {}),
          ...(finitePositive(body.packageGrams) !== undefined ? { packageGrams: finitePositive(body.packageGrams)! } : {}),
          ...(finitePositive(body.pieceCount) !== undefined ? { pieceCount: finitePositive(body.pieceCount)! } : {}),
          ...(finitePositive(body.knownContainerVolumeMl) !== undefined ? { knownContainerVolumeMl: finitePositive(body.knownContainerVolumeMl)! } : {}),
          ...(finiteFraction(body.containerFillFraction) !== undefined ? { containerFillFraction: finiteFraction(body.containerFillFraction)! } : {}),
          ...(finitePositive(body.previousConfirmedGrams) !== undefined ? { previousConfirmedGrams: finitePositive(body.previousConfirmedGrams)! } : {}),
        });
        candidateResultDrafts.set(result.resultId, { userId: context.userId, draftId });
        latestCandidateResultByDraft.set(candidateDraftKey(context.userId, draftId), result.resultId);
        registerCandidateEstimateForConfirmation(store, context.userId, draftId, service.algorithmVersion, result);
        const persistedEstimate = service.exportResult?.(result.resultId, context.userId);
        await draftPersistence?.persist(context.userId, store, draftId, persistedEstimate);
        sendJson(res, 200, envelope({ estimate: result, algorithmVersion: service.algorithmVersion }, null, correlationId));
        return true;
      }

      const estimateCorrectionMatch = path.match(/^\/v1\/meals\/estimates\/([^/]+)\/corrections$/);
      if (estimateCorrectionMatch) {
        if (req.method !== "POST") return methodNotAllowed(res, correlationId, "POST");
        const service = options.imageEstimateService;
        if (!service?.configured) throw new RouteInputError("image_estimate_not_configured", "Candidate-only image estimation is not configured on this backend.", true);
        const body = asObject(await readJson(req));
        const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
        const kind = typeof body.kind === "string" ? body.kind : "";
        if (!itemId) throw new RouteInputError("invalid_estimate_correction", "itemId is required.");
        let correction: EstimateCorrection;
        if (kind === "portion_grams") {
          correction = {
            kind,
            minimumGrams: Number(body.minimumGrams),
            centralGrams: Number(body.centralGrams),
            maximumGrams: Number(body.maximumGrams),
          };
        } else if (kind === "select_candidate") {
          correction = { kind, candidateIndex: Number(body.candidateIndex) };
        } else {
          throw new RouteInputError("invalid_estimate_correction", "Only portion_grams and select_candidate corrections are accepted by this route.");
        }
        const resultId = decodeURIComponent(estimateCorrectionMatch[1] ?? "");
        const result = service.correct(resultId, context.userId, itemId, correction);
        const linkedDraft = candidateResultDrafts.get(resultId);
        const persistedDraftId = linkedDraft?.draftId ?? await draftPersistence?.findDraftForEstimate?.(context.userId, resultId);
        const resolvedDraft = linkedDraft ?? (persistedDraftId ? { userId: context.userId, draftId: persistedDraftId } : undefined);
        if (!resolvedDraft || resolvedDraft.userId !== context.userId) {
          throw new RouteInputError("estimate_draft_link_missing", "The estimate is no longer linked to an active meal draft; re-run image analysis.", true);
        }
        latestCandidateResultByDraft.set(candidateDraftKey(context.userId, resolvedDraft.draftId), result.resultId);
        registerCandidateEstimateForConfirmation(store, context.userId, resolvedDraft.draftId, service.algorithmVersion, result);
        const persistedEstimate = service.exportResult?.(result.resultId, context.userId);
        await draftPersistence?.persist(context.userId, store, resolvedDraft.draftId, persistedEstimate);
        sendJson(res, 200, envelope({ estimate: result, algorithmVersion: service.algorithmVersion }, null, correlationId));
        return true;
      }

      const estimateMatch = path.match(/^\/v1\/meals\/estimates\/([^/]+)$/);
      if (estimateMatch) {
        if (req.method !== "GET") return methodNotAllowed(res, correlationId, "GET");
        const service = options.imageEstimateService;
        if (!service?.configured) throw new RouteInputError("image_estimate_not_configured", "Candidate-only image estimation is not configured on this backend.", true);
        const result = service.get(decodeURIComponent(estimateMatch[1] ?? ""), context.userId);
        sendJson(res, 200, envelope({ estimate: result, algorithmVersion: service.algorithmVersion }, null, correlationId));
        return true;
      }

      if (path === "/v1/meals/analysis") {
        if (req.method !== "POST") return methodNotAllowed(res, correlationId, "POST");
        const body = asObject(await readJson(req));
        const provider = body.provider as MealAnalysisRequestInput["provider"] | undefined;
        const release = provider === "gemini" ? analysisRateLimiter.enter(context.userId) : undefined;
        let request;
        try {
          request = await store.requestAnalysis(context.userId, {
            draftId: body.draftId as string,
            idempotencyKey: body.idempotencyKey as string,
            ...(provider !== undefined ? { provider } : {}),
            ...(body.expectedRevision !== undefined ? { expectedRevision: body.expectedRevision as number } : {}),
          });
        } finally {
          release?.();
        }
        await draftPersistence?.persist(context.userId, store, request.draftId);
        sendJson(res, request.state === "FAILED" ? 503 : 200, envelope({ analysisRequest: request }, null, correlationId));
        return true;
      }

      const analysisActionMatch = path.match(/^\/v1\/meals\/analysis\/([^/]+)\/(retry|cancel)$/);
      if (analysisActionMatch) {
        if (req.method !== "POST") return methodNotAllowed(res, correlationId, "POST");
        const body = asObject(await readJson(req));
        const requestId = decodeURIComponent(analysisActionMatch[1] ?? "");
        const action = analysisActionMatch[2];
        let request;
        if (action === "retry") {
          const existing = store.getAnalysis(context.userId, requestId);
          const release = existing.provider === "gemini" ? analysisRateLimiter.enter(context.userId) : undefined;
          try {
            request = await store.retryAnalysis(context.userId, {
              requestId,
              idempotencyKey: body.idempotencyKey as string,
              ...(body.expectedRevision !== undefined ? { expectedRevision: body.expectedRevision as number } : {}),
            });
          } finally {
            release?.();
          }
        } else {
          request = store.cancelAnalysis(context.userId, {
            requestId,
            ...(body.expectedRevision !== undefined ? { expectedRevision: body.expectedRevision as number } : {}),
          });
        }
        await draftPersistence?.persist(context.userId, store, request.draftId);
        sendJson(res, request.state === "FAILED" ? 503 : 200, envelope({ analysisRequest: request }, null, correlationId));
        return true;
      }

      if (path === "/v1/meals/confirm") {
        if (req.method !== "POST") return methodNotAllowed(res, correlationId, "POST");
        const body = asObject(await readJson(req));
        const result = store.confirmMeal(context.userId, {
          draftId: body.draftId as string,
          idempotencyKey: body.idempotencyKey as string,
          confirmed: body.confirmed as boolean,
          ...(body.expectedRevision !== undefined ? { expectedRevision: body.expectedRevision as number } : {}),
          ...(body.items !== undefined ? { items: body.items } : {}),
        } satisfies ConfirmMealInput);
        await confirmedMealStore.persist(context.userId, result.meal);
        await draftPersistence?.persist(context.userId, store, result.meal.sourceDraftId);
        if (result.status === "CONFIRMED" && body.items === undefined) {
          const resultId = latestCandidateResultByDraft.get(candidateDraftKey(context.userId, result.meal.sourceDraftId));
          if (resultId) await options.imageEstimateService?.learnConfirmed?.(resultId, context.userId, context.accessToken);
        }
        await options.onConfirmed?.(context, result);
        sendJson(res, result.status === "DUPLICATE" ? 200 : 201, envelope(result, null, correlationId));
        return true;
      }

      const analysisMatch = path.match(/^\/v1\/meals\/analysis\/([^/]+)$/);
      if (analysisMatch) {
        if (req.method !== "GET") return methodNotAllowed(res, correlationId, "GET");
        const requestId = decodeURIComponent(analysisMatch[1] ?? "");
        const analysis = store.getAnalysis(context.userId, requestId);
        sendJson(res, 200, envelope({ analysisRequest: analysis }, null, correlationId));
        return true;
      }

      const mealMatch = path.match(/^\/v1\/meals\/([^/]+)$/);
      if (mealMatch) {
        const mealId = decodeURIComponent(mealMatch[1] ?? "");
        if (req.method === "PATCH") {
          const body = asObject(await readJson(req));
          const persistedCurrent = await confirmedMealStore.get(context.userId, mealId);
          if (!persistedCurrent) throw new MealContractError("meal_not_found", "Confirmed meal was not found.");
          if (persistedCurrent.status === "DELETED") throw new MealContractError("meal_already_deleted", "Deleted meals cannot be revised.");
          store.hydrateConfirmedMeals(context.userId, [
            ...await confirmedMealStore.list(context.userId),
            persistedCurrent,
          ]);
          const meal = store.reviseConfirmedMeal(context.userId, {
            mealId,
            idempotencyKey: body.idempotencyKey as string,
            expectedRevision: body.expectedRevision as number,
            items: body.items,
          });
          await confirmedMealStore.persist(context.userId, meal);
          await options.onChanged?.(context, meal, await confirmedMealStore.list(context.userId));
          sendJson(res, 200, envelope({ meal }, null, correlationId));
          return true;
        }
        if (req.method === "DELETE") {
          const body = asObject(await readJson(req));
          const persistedCurrent = await confirmedMealStore.get(context.userId, mealId);
          if (!persistedCurrent) throw new MealContractError("meal_not_found", "Confirmed meal was not found.");
          if (persistedCurrent.status === "DELETED") {
            if (body.expectedRevision === persistedCurrent.currentRevision - 1) {
              sendJson(res, 200, envelope({ meal: persistedCurrent, status: "DELETED" }, null, correlationId));
              return true;
            }
            throw new MealContractError("meal_already_deleted", "Meal is already deleted.");
          }
          store.hydrateConfirmedMeals(context.userId, [
            ...await confirmedMealStore.list(context.userId),
            persistedCurrent,
          ]);
          const meal = store.deleteConfirmedMeal(context.userId, {
            mealId,
            idempotencyKey: body.idempotencyKey as string,
            expectedRevision: body.expectedRevision as number,
          });
          await confirmedMealStore.persist(context.userId, meal);
          await options.onChanged?.(context, meal, await confirmedMealStore.list(context.userId));
          sendJson(res, 200, envelope({ meal, status: "DELETED" }, null, correlationId));
          return true;
        }
        if (req.method !== "GET") return methodNotAllowed(res, correlationId, "GET, PATCH, DELETE");
        const meal = await confirmedMealStore.get(context.userId, mealId);
        if (!meal) throw new MealContractError("meal_not_found", "Confirmed meal was not found.");
        sendJson(res, 200, envelope({ meal }, null, correlationId));
        return true;
      }

      const revisionMatch = path.match(/^\/v1\/meals\/drafts\/([^/]+)\/revisions$/);
      if (revisionMatch) {
        if (req.method !== "POST") return methodNotAllowed(res, correlationId, "POST");
        const body = asObject(await readJson(req));
        const draft = store.reviseDraft(context.userId, decodeURIComponent(revisionMatch[1] ?? ""), {
          expectedRevision: body.expectedRevision as number | undefined,
          items: body.items as MealReviseDraftInput["items"],
          note: body.note as string | undefined,
        });
        await draftPersistence?.persist(context.userId, store, draft.draftId);
        sendJson(res, 200, envelope({ draft }, null, correlationId));
        return true;
      }
    } catch (error) {
      const failure = errorResponse(error, correlationId);
      sendJson(res, failure.status, failure.body);
      return true;
    }
    return false;
  };
}
