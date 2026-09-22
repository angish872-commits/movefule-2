import { type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import {
  isConfiguredSecret,
  contractErrorStatus,
  readJson,
  requireDeviceId,
  requireSession,
  response,
  sendJson,
} from "./requestSupport.ts";
import { ConsentContractError } from "../foundation/consents.ts";
import { ProfileContractError } from "../foundation/profile.ts";
import { AccountLifecycleError } from "../foundation/account-lifecycle.ts";
import { ContractError, API_SCHEMA_VERSION } from "../shared/contracts.ts";
import { createBackendRuntime, type BackendRuntimeOptions } from "../bootstrap/backend-runtime.ts";
import { createFeatureRuntime } from "../bootstrap/feature-runtime.ts";
import { OpenFoodFactsClient } from "../nutrition/packaged/openFoodFactsClient.ts";
import { PackagedFoodService } from "../nutrition/packaged/service.ts";
import { createPackagedFoodRouteHandler } from "./packaged-food-routes.ts";

export function createMoveFuelRequestHandler(options: BackendRuntimeOptions = {}) {
  const features = createFeatureRuntime(options);
  const {
    environment,
    production,
    sessionProvider,
    entitlementProvider,
    imageEstimateService,
    usdaFdcApiKey,
    mealHandler,
    syncHandler,
    canonicalSyncHandler,
    calendarHandler,
    trainingHandler,
    phoneSyncSessionFor,
    healthHandler,
    deviceHandler,
    deviceCommandHandler,
    insightHandler,
    reportHandler,
    experienceHandler,
    profileAccountHandler,
    dietHandler,
    bootstrapFor,
  } = createBackendRuntime(features.backendOptions);
  const openFoodFactsUserAgent = process.env.OPEN_FOOD_FACTS_USER_AGENT?.trim() ?? "";
  const packagedFoodHandler = createPackagedFoodRouteHandler(
    openFoodFactsUserAgent
      ? new PackagedFoodService(new OpenFoodFactsClient({ userAgent: openFoodFactsUserAgent }))
      : undefined,
  );
  return async (req: IncomingMessage, res: ServerResponse) => {
    const correlationId = randomUUID();
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, response({ status: "ok", environment, backendBoundary: "authenticated-profile-meal-sync-calendar-training-privacy" }, null, correlationId));
        return;
      }

      if (req.method === "GET" && url.pathname === "/v1/config") {
        const auth = await requireSession(req, sessionProvider, production);
        sendJson(res, 200, response({
          environment,
          userId: auth.userId,
          features: {
            summarySync: true,
            legacySummarySync: true,
            canonicalSync: true,
            calendar: true,
            trainingEngine5: true,
            privacyMediaLifecycle: true,
            mealAnalysis: true,
            candidateOnlyImageEstimate: Boolean(imageEstimateService?.configured),
            packagedFoodLookup: packagedFoodHandler.configured,
            legacyGeminiNutritionAuthority: false,
            deterministicFixtureProvider: environment !== "production",
            geminiFoodScene: Boolean(imageEstimateService?.configured),
            trustedFdcNutrition: isConfiguredSecret(usdaFdcApiKey),
            billing: Boolean(entitlementProvider),
            billingMode: entitlementProvider?.mode ?? "unconfigured",
            healthIntegrations: true,
            healthImportProjection: true,
            appwriteRuntime: auth.provider === "appwrite",
          },
        }, null, correlationId));
        return;
      }

      if (req.method === "POST" && (url.pathname === "/webhooks/google-play" || url.pathname === "/webhooks/app-store")) {
        throw new ContractError(
          "billing_not_configured",
          "Store webhook verification is unavailable until a production billing verifier is configured.",
          true,
        );
      }

      const auth = await requireSession(req, sessionProvider, production);
      const authenticatedRouteContext = {
        userId: auth.userId,
        sessionId: auth.sessionId,
        correlationId,
        url,
        provider: auth.provider,
        ...(auth.accessToken ? { accessToken: auth.accessToken } : {}),
      } as const;

      if (req.method === "POST" && url.pathname === "/v1/sync/phone-session") {
        const body = await readJson(req);
        const requestedDeviceId = requireDeviceId(
          body && typeof body === "object" && !Array.isArray(body)
            ? (body as Record<string, unknown>).deviceId
            : undefined,
        );
        const service = phoneSyncSessionFor({
          userId: auth.userId,
          ...(auth.accessToken ? { accessToken: auth.accessToken } : {}),
        });
        if (!service) {
          throw new ContractError("phone_sync_session_unavailable", "Phone-only sync session persistence is not configured.", true);
        }
        const phoneSession = await service.acquire(auth.userId, auth.sessionId, requestedDeviceId);
        sendJson(res, 200, response(phoneSession, null, correlationId));
        return;
      }

      if (await trainingHandler(req, res, authenticatedRouteContext)) return;
      if (await calendarHandler(req, res, authenticatedRouteContext)) return;
      if (await canonicalSyncHandler(req, res, authenticatedRouteContext)) return;
      if (await insightHandler(req, res, { auth, url, correlationId })) return;

      if (await reportHandler(req, res, { auth, url, correlationId })) return;
      if (await experienceHandler(req, res, { auth, url, correlationId })) return;

      if (await profileAccountHandler(req, res, { auth, url, correlationId })) return;

      if (await dietHandler(req, res, { auth, url, correlationId })) return;

      if (await features.privacyHandler(req, res, { auth: authenticatedRouteContext, url, correlationId })) return;

      if (await features.trainingHandler(req, res, { auth: authenticatedRouteContext, url, correlationId })) return;

      if (await packagedFoodHandler(req, res, { userId: auth.userId, correlationId, url })) return;

      const deviceHeader = req.headers["x-device-id"];
      const deviceId = Array.isArray(deviceHeader) ? deviceHeader[0] : deviceHeader;
      if (await deviceHandler(req, res, { userId: auth.userId, correlationId, ...(auth.accessToken ? { accessToken: auth.accessToken } : {}) })) return;
      if (await deviceCommandHandler(req, res, { userId: auth.userId, correlationId, ...(auth.accessToken ? { accessToken: auth.accessToken } : {}) })) return;
      if (await healthHandler(req, res, { userId: auth.userId, correlationId, ...(auth.accessToken ? { accessToken: auth.accessToken } : {}) })) return;
      const mealHandled = await mealHandler(req, res, {
        userId: auth.userId,
        ...(deviceId?.trim() ? { deviceId: deviceId.trim() } : {}),
        correlationId,
        ...(auth.accessToken ? { accessToken: auth.accessToken } : {}),
      });
      if (mealHandled) {
        // The canonical meal mutation has already committed by this point. The
        // privacy reconciler is retry-safe; upload metadata retains a bounded
        // deleteAfter even if this opportunistic reconciliation cannot run.
        await features.reconcileMealMedia(authenticatedRouteContext).catch(() => undefined);
        return;
      }

      const productPath = url.pathname;
      if (productPath === "/v1/sync/push" || productPath === "/v1/sync/pull" ||
          productPath === "/v1/legacy/summary-sync/push" || productPath === "/v1/legacy/summary-sync/pull" ||
          productPath.startsWith("/v1/watch/") || productPath === "/v1/workouts" || productPath.startsWith("/v1/workouts/")) {
        await syncHandler(req, res);
        return;
      }

      if (req.method === "GET" && url.pathname === "/v1/bootstrap") {
        const bootstrapService = bootstrapFor(auth);
        const bootstrap = bootstrapService
          ? await bootstrapService.ensure(auth.userId, requireDeviceId(req.headers["x-device-id"]))
          : null;
        sendJson(res, 200, response({
          userId: auth.userId,
          schemaVersion: API_SCHEMA_VERSION,
          session: { source: auth.provider, productionRequires: "appwrite_session" },
          persistence: bootstrap ? "appwrite" : "local_fixture",
          ...(bootstrap ? { bootstrap } : {}),
          features: {
            mealAnalysis: true,
            candidateOnlyImageEstimate: Boolean(imageEstimateService?.configured),
            packagedFoodLookup: packagedFoodHandler.configured,
            legacyGeminiNutritionAuthority: false,
            trustedFdcNutrition: isConfiguredSecret(usdaFdcApiKey),
            legacySummarySync: true,
            canonicalSync: true,
            calendar: true,
            workouts: true,
            trainingEngine5: true,
            privacyMediaLifecycle: true,
          },
        }, null, correlationId));
        return;
      }

      sendJson(res, 404, response(null, { code: "not_found", message: "Route not found.", retryable: false }, correlationId));
    } catch (error) {
      if (error instanceof ConsentContractError || error instanceof ProfileContractError || error instanceof AccountLifecycleError) {
        sendJson(res, 400, response(null, {
          code: error.code,
          message: error.message,
          retryable: false,
        }, correlationId));
        return;
      }
      const contractError = error instanceof ContractError ? error : new ContractError("internal_error", "Unexpected local backend error.", true);
      sendJson(res, contractErrorStatus(contractError), response(null, {
        code: contractError.code,
        message: contractError.message,
        retryable: contractError.retryable,
      }, correlationId));
    }
  };
}
