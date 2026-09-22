import { randomUUID } from "node:crypto";
import { isConfiguredSecret, type RequestContext } from "../http/requestSupport.ts"; import { sha256, SyncStore } from "../domain/sync-store.ts";
import { CanonicalInvalidationBoundary } from "../domain/invalidation-boundary.ts";
import { MealStore } from "../meal/store.ts";
import { GeminiReportNarrator } from "../report/report-narrative.ts"; import { LocalNotificationStore } from "../notification/notification-store.ts"; import { SupportTicketStore } from "../support/support-store.ts";
import { ReportStore } from "../report/report-store.ts";
import { AppwriteServerTablesHttpClient } from "../foundation/appwrite-server-tables-client.ts";
import { AppwriteServerOwnedRepository, type OwnerScopedRepository, type ServerOwnedRepository } from "../foundation/repository.ts";
import { LocalMealImageStore, type MealImageStore } from "../meal/local-image-store.ts"; import { AppwriteMealImageStore } from "../meal/appwrite-image-store.ts"; import { AppwriteSavedMealStore, SavedMealStore } from "../meal/saved-meals.ts";
import { createConfirmedMealStoreResolver } from "../meal/confirmed-meals.ts"; import { AppwriteMealDraftPersistence } from "../meal/appwrite-draft-persistence.ts";
import { AppwritePersonalFoodStore, PersonalFoodStore } from "../meal/personal-food.ts";
import { LiveImageEstimateService, loadCalibrationProfilesFromFile, loadKnowledgeSnapshotFromFile, loadReviewedRecipeSnapshotFromFile, type LiveImageEstimateServiceLike } from "../nutrition/service/liveImageEstimateService.ts";
import { PrivacyGuardedImageEstimateService } from "../privacy/image-estimate-privacy-guard.ts";
import { PrivacyPreferenceService } from "../privacy/preferences.ts";
import { createMealRouteHandler } from "../http/meal-routes.ts";
import { createHealthRouteHandler } from "../http/health-routes.ts";
import { AppwriteHealthProjectionStore, HealthStore } from "../health/health-store.ts";
import { createDeviceRouteHandler } from "../http/device-routes.ts";
import { DeviceTrustStore } from "../device/device-trust.ts";
import { AppwriteDeviceTrustStore } from "../device/appwrite-device-trust.ts";
import { DeviceCommandStore } from "../device/device-commands.ts";
import { AppwriteDeviceCommandStore } from "../device/appwrite-device-commands.ts";
import { createDeviceCommandRouteHandler } from "../http/device-command-routes.ts";
import { createProfileAccountRouteHandler } from "../http/profile-account-routes.ts";
import { createExperienceRouteHandler } from "../http/experience-routes.ts";
import { createReportRouteHandler } from "../http/report-routes.ts"; import { createInsightRouteHandler } from "../http/insight-routes.ts";
import { buildCanonicalProgressForReport } from "../report/progress-report-source.ts"; import { createTrainingRouteHandler } from "../http/training-routes.ts";
import { createProductRouteHandlers } from "./product-route-handlers.ts";
import { SyncProductAdapter } from "../sync/adapter.ts";
import { AppwriteSyncProductAdapter } from "../sync/appwrite-adapter.ts";
import { PhoneSyncSessionService } from "../sync/phone-sync-session.ts";
import { CurrentTrainingPlanStore } from "../training/current-plan-store.ts";
import type { TrainingAdaptationRequester } from "../calendar/calendar-service.ts";
import { createProductionTodaySourceForContext } from "../today/production-source.ts";
import { AppwriteSessionProvider, LocalTestSessionProvider, type SessionProvider } from "../foundation/session.ts";
import { AppwriteSessionHttpClient, type AppwriteSessionTransport } from "../foundation/appwrite-session-client.ts";
import { AppwriteBootstrapService } from "../foundation/bootstrap.ts";
import { OnboardingConsentService } from "../foundation/consents.ts";
import { ProfileService } from "../foundation/profile.ts";
import { AccountLifecycleService } from "../foundation/account-lifecycle.ts";
import { AppwriteAccountDeletionAdmin } from "../foundation/appwrite-account-admin.ts";
import type { AppwriteTablesTransport } from "../foundation/appwrite-tables-client.ts";
import { AppwriteRuntime } from "../foundation/appwrite-runtime.ts";
import { AppwriteModelConfigurationStore, FallbackModelConfigurationStore, MemoryModelConfigurationStore, FOOD_VISION_TASK_TYPE, type ModelRoute } from "../nutrition/vision/config/modelConfiguration.ts";
import { OPENROUTER_DEFAULT_FOOD_VISION_MODEL } from "../nutrition/vision/providers/openRouterFoodSceneAdapter.ts";
import { AppwriteProviderCallRecorder } from "../nutrition/vision/telemetry/providerCallRecorder.ts";
import { FdcApiClient, fetchFdcTransport } from "../nutrition/nutrients/usdaClient.ts";
import { FdcNutritionCatalogStore, type NutritionCatalogStoreLike } from "../meal/nutrition-catalog.ts";
import { AppwriteServingPriorStore, MemoryServingPriorStore } from "../nutrition/personalization/servingPriorStore.ts";
import { LocalDevelopmentEntitlementProvider, type EntitlementProvider } from "../billing/entitlements.ts";
import { API_SCHEMA_VERSION } from "../shared/contracts.ts";
import { createSyncCalendarRuntime } from "./sync-calendar-runtime.ts";
export type BackendRuntimeOptions = {
  environment?: string;
  store?: SyncStore;
  mealStore?: MealStore;
  syncAdapter?: SyncProductAdapter;
  sessionProvider?: SessionProvider;
  appwriteSessionFetcher?: AppwriteSessionTransport;
  bootstrapService?: AppwriteBootstrapService;
  appwriteEndpoint?: string;
  appwriteProjectId?: string;
  appwriteDatabaseId?: string;
  appwriteServerApiKey?: string;
  mealMediaBucketId?: string;
  appwriteTablesFetcher?: AppwriteTablesTransport;
  entitlementProvider?: EntitlementProvider;
  healthStore?: HealthStore;
  deviceTrustStore?: DeviceTrustStore;
  profileService?: ProfileService;
  accountLifecycleService?: AccountLifecycleService;
  privacyPreferenceService?: PrivacyPreferenceService;
  mealImageStore?: MealImageStore;
  imageEstimateService?: LiveImageEstimateServiceLike;
  cameraAnalysisEnabled?: boolean;
  serverOwnedRepository?: ServerOwnedRepository;
  ownerRepositoryForContext?: (context: { userId: string; accessToken?: string }) => OwnerScopedRepository | undefined;
  invalidationBoundary?: CanonicalInvalidationBoundary;
  trainingAdaptationRequester?: TrainingAdaptationRequester;
  nutritionCatalogStore?: NutritionCatalogStoreLike;
};

export function createBackendRuntime(options: BackendRuntimeOptions = {}) {
  const environment = options.environment ?? process.env.MOVEFUEL_ENV ?? "local";
  const production = environment === "production";
  const appwriteEndpoint = options.appwriteEndpoint ?? process.env.APPWRITE_ENDPOINT ?? "";
  const appwriteProjectId = options.appwriteProjectId ?? process.env.APPWRITE_PROJECT_ID ?? "";
  const appwriteDatabaseId = options.appwriteDatabaseId ?? process.env.APPWRITE_DATABASE_ID ?? "movefuel_mvp";
  const appwriteRuntime = new AppwriteRuntime({
    endpoint: appwriteEndpoint,
    projectId: appwriteProjectId,
    databaseId: appwriteDatabaseId,
    ...(options.appwriteTablesFetcher ? { fetcher: options.appwriteTablesFetcher } : {}),
  });
  const sessionProvider = options.sessionProvider ?? (production && appwriteEndpoint.trim() && appwriteProjectId.trim()
    ? new AppwriteSessionProvider(new AppwriteSessionHttpClient({ endpoint: appwriteEndpoint, projectId: appwriteProjectId,
      ...(options.appwriteSessionFetcher ? { fetcher: options.appwriteSessionFetcher } : {}) }))
    : production ? null : new LocalTestSessionProvider());
  const entitlementProvider = options.entitlementProvider ?? (
    environment === "local" ? new LocalDevelopmentEntitlementProvider() : undefined
  );
  const store = options.store ?? new SyncStore();
  const appwriteServerApiKey = options.appwriteServerApiKey ?? process.env.APPWRITE_API_KEY ?? "";
  const mealMediaBucketId = options.mealMediaBucketId ?? process.env.BUCKET_MEAL_MEDIA_ID ?? "";
  const earlyServerTablesClient = isConfiguredSecret(appwriteServerApiKey) && appwriteEndpoint && appwriteProjectId
    ? new AppwriteServerTablesHttpClient({
      endpoint: appwriteEndpoint, projectId: appwriteProjectId, apiKey: appwriteServerApiKey,
      ...(options.appwriteTablesFetcher ? { fetcher: options.appwriteTablesFetcher } : {}),
    })
    : undefined;
  const serverOwnedRepository = options.serverOwnedRepository ?? (
    earlyServerTablesClient ? new AppwriteServerOwnedRepository(earlyServerTablesClient, appwriteDatabaseId) : undefined
  );
  const invalidationBoundary = options.invalidationBoundary ?? new CanonicalInvalidationBoundary();
  if (production && (!appwriteEndpoint.trim() || !appwriteProjectId.trim() || !isConfiguredSecret(appwriteServerApiKey) ||
      !isConfiguredSecret(mealMediaBucketId) || !serverOwnedRepository)) {
    throw new Error("production_appwrite_persistence_config_incomplete");
  }
  const mealImageStore: MealImageStore = options.mealImageStore ?? (isConfiguredSecret(appwriteServerApiKey) && appwriteEndpoint &&
    appwriteProjectId && isConfiguredSecret(mealMediaBucketId) ? new AppwriteMealImageStore({ endpoint: appwriteEndpoint,
      projectId: appwriteProjectId, apiKey: appwriteServerApiKey, bucketId: mealMediaBucketId, databaseId: appwriteDatabaseId,
      ...(options.appwriteTablesFetcher ? { fetcher: options.appwriteTablesFetcher } : {}) }) : new LocalMealImageStore());
  const geminiApiKey = process.env.GEMINI_API_KEY ?? "";
  const geminiConfigured = isConfiguredSecret(geminiApiKey);
  const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? "";
  const openRouterConfigured = isConfiguredSecret(openRouterApiKey);
  const openRouterModel = process.env.OPENROUTER_FOOD_VISION_MODEL?.trim() || OPENROUTER_DEFAULT_FOOD_VISION_MODEL;
  const configuredOpenRouterTimeoutMs = Number(process.env.OPENROUTER_FOOD_VISION_TIMEOUT_MS);
  const openRouterTimeoutMs = Number.isFinite(configuredOpenRouterTimeoutMs)
    ? Math.max(5_000, Math.min(60_000, Math.round(configuredOpenRouterTimeoutMs)))
    : 30_000;
  const fallbackVisionRoutes: ModelRoute[] = [
    ...(openRouterConfigured ? [{ modelConfigId: "env-openrouter-food-vision", taskType: FOOD_VISION_TASK_TYPE, provider: "openrouter" as const, modelName: openRouterModel, temperature: 0.1, maxOutputTokens: 4096, timeoutMs: openRouterTimeoutMs, maxAttempts: 3, retryBaseDelayMs: 750, priority: 10 }] : []),
    ...(geminiConfigured ? [{ modelConfigId: "env-gemini-food-vision", taskType: FOOD_VISION_TASK_TYPE, provider: "gemini" as const, modelName: geminiModel, temperature: 0.1, maxOutputTokens: 4096, timeoutMs: 12_000, maxAttempts: 3, retryBaseDelayMs: 750, priority: 20 }] : []), ];
  const modelConfigurationStore = new FallbackModelConfigurationStore([
    ...(earlyServerTablesClient ? [new AppwriteModelConfigurationStore(earlyServerTablesClient, appwriteDatabaseId)] : []),
    new MemoryModelConfigurationStore(fallbackVisionRoutes),
  ]);
  const providerCallRecorder = earlyServerTablesClient ? new AppwriteProviderCallRecorder(earlyServerTablesClient, appwriteDatabaseId) : null;
  const servingPriorStore = earlyServerTablesClient
    ? new AppwriteServingPriorStore(earlyServerTablesClient, appwriteDatabaseId)
    : new MemoryServingPriorStore();
  const usdaFdcApiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY ?? "";
  const nutritionCatalogStore = options.nutritionCatalogStore ?? (isConfiguredSecret(usdaFdcApiKey)
    ? new FdcNutritionCatalogStore((query, pageSize, limit) => new FdcApiClient(fetchFdcTransport,
      { apiKey: usdaFdcApiKey, timeoutMs: 10_000, maxRetries: 2 }).searchNutritionRecords(query, pageSize, limit)) : undefined);
  const configuredImageEstimateService = options.imageEstimateService ?? new LiveImageEstimateService({
    imageStore: mealImageStore,
    ...(geminiConfigured ? { geminiApiKey } : {}),
    ...(openRouterConfigured ? { openRouterApiKey } : {}),
    modelConfigurationStore,
    openRouterAppUrl: process.env.OPENROUTER_APP_URL,
    openRouterAppName: process.env.OPENROUTER_APP_NAME ?? "MoveFuel",
    ...(providerCallRecorder ? { onOpenRouterUsage: (usage) => providerCallRecorder.record({ ...usage, provider: "openrouter" }) } : {}),
    ...(isConfiguredSecret(usdaFdcApiKey) ? { usdaApiKey: usdaFdcApiKey } : {}),
    // Appwrite Functions run Node only; local OpenCV remains development-only.
    pixelQualityAssessor: production ? null : undefined,
    knowledgeSnapshot: loadKnowledgeSnapshotFromFile(process.env.MOVEFUEL_KNOWLEDGE_SNAPSHOT),
    reviewedRecipeSnapshot: loadReviewedRecipeSnapshotFromFile(process.env.MOVEFUEL_REVIEWED_RECIPE_SNAPSHOT),
    calibrationProfiles: loadCalibrationProfilesFromFile(process.env.MOVEFUEL_PORTION_CALIBRATION_PROFILES),
    servingPriorStore,
  });
  const cameraAnalysisEnabled = options.cameraAnalysisEnabled ?? (environment !== "production" || process.env.MOVEFUEL_CAMERA_PUBLIC_ENABLED?.trim().toLowerCase() === "true");
  const reportNarrator = new GeminiReportNarrator(geminiConfigured ? geminiApiKey : "", geminiModel);
  const mealStore = options.mealStore ?? new MealStore();
  const healthStore = options.healthStore ?? new HealthStore();
  const deviceTrustStore = options.deviceTrustStore ?? new DeviceTrustStore();
  const deviceCommandStore = new DeviceCommandStore({ trust: deviceTrustStore });
  const localSavedMealStore = new SavedMealStore();
  const localPersonalFoodStore = new PersonalFoodStore();
  const localNotificationStore = new LocalNotificationStore();
  const supportTicketStore = new SupportTicketStore();
  const serverTablesClient = earlyServerTablesClient;
  const reportStore = new ReportStore({ databaseId: appwriteDatabaseId, ...(serverTablesClient ? { serverClient: serverTablesClient } : {}) });
  const syncAdapter = options.syncAdapter ?? new SyncProductAdapter({ summaryStore: store });
  const ownerRepositoryForContext = (context: { userId: string; accessToken?: string }): OwnerScopedRepository | undefined =>
    options.ownerRepositoryForContext?.(context) ?? appwriteRuntime.repositoryFor(context.accessToken);
  const syncAdapterForContext = (context: { userId?: string; accessToken?: string }) => {
    const repository = context.userId
      ? ownerRepositoryForContext({ userId: context.userId, ...(context.accessToken ? { accessToken: context.accessToken } : {}) })
      : appwriteRuntime.repositoryFor(context.accessToken);
    return repository && serverOwnedRepository
      ? new AppwriteSyncProductAdapter(repository, { serverRepository: serverOwnedRepository, productStore: syncAdapter.productStore })
      : syncAdapter;
  };
  const repositoryFor = (context: RequestContext): OwnerScopedRepository | undefined =>
    context.provider === "appwrite"
      ? ownerRepositoryForContext({ userId: context.userId, ...(context.accessToken ? { accessToken: context.accessToken } : {}) })
      : undefined;
  const phoneSyncSessionFor = (context: { userId: string; accessToken?: string }): PhoneSyncSessionService | null => {
    const repository = ownerRepositoryForContext(context);
    return repository ? new PhoneSyncSessionService(repository) : null;
  };
  const trainingHandler = createTrainingRouteHandler(async (context) => {
    const repository = ownerRepositoryForContext({
      userId: context.userId,
      ...(context.accessToken ? { accessToken: context.accessToken } : {}),
    });
    return repository && serverTablesClient
      ? new CurrentTrainingPlanStore(repository, serverTablesClient, appwriteDatabaseId)
      : null;
  });
  const mealSummaryRevisions = new Map<string, number>();
  const onboardingConsentService = new OnboardingConsentService();
  const profileService = options.profileService ?? new ProfileService(serverOwnedRepository);
  const privacyPreferenceService = options.privacyPreferenceService ?? new PrivacyPreferenceService();
  const imageEstimateService = cameraAnalysisEnabled
    ? new PrivacyGuardedImageEstimateService(configuredImageEstimateService, {
      mealImageAnalysisAllowed: async ({ userId, accessToken }) => {
        const profile = await profileService.get(userId, ownerRepositoryForContext({ userId, ...(accessToken ? { accessToken } : {}) }));
        if (!profile) return false;
        try {
          const values = JSON.parse(String(profile.preferences.valueJson ?? "{}")) as Record<string, unknown>;
          return values.cameraConsent === true;
        } catch {
          return false;
        }
      },
      modelImprovementAllowed: async ({ userId, accessToken }) =>
        (await privacyPreferenceService.get(userId, ownerRepositoryForContext({ userId, ...(accessToken ? { accessToken } : {}) }))).modelImprovementAllowed,
    })
    : undefined;
  const accountDeletionAdmin = isConfiguredSecret(appwriteServerApiKey) && appwriteEndpoint && appwriteProjectId
    ? new AppwriteAccountDeletionAdmin({
      endpoint: appwriteEndpoint, projectId: appwriteProjectId, apiKey: appwriteServerApiKey, databaseId: appwriteDatabaseId,
      ...(options.appwriteTablesFetcher ? { fetcher: options.appwriteTablesFetcher } : {}),
    })
    : undefined;
  const accountLifecycleService = options.accountLifecycleService ?? new AccountLifecycleService({
    ...(accountDeletionAdmin ? { deletionAdmin: accountDeletionAdmin } : {}),
  });
  const confirmedTargetsForContext = async (context: { userId: string; accessToken?: string }) => {
    const repository = ownerRepositoryForContext(context);
    const profile = await profileService.get(context.userId, repository);
    const target = profile?.target ?? null;
    const energyGoalKcal = Number(target?.energyKcal ?? 0);
    const proteinGoalGrams = Number(target?.proteinG ?? 0);
    const movementGoalMinutes = Number(target?.movementTarget);
    const userConfirmed = target?.userConfirmed === true;
    return userConfirmed && Number.isInteger(energyGoalKcal) && energyGoalKcal > 0 && Number.isInteger(proteinGoalGrams) && proteinGoalGrams > 0 &&
      Number.isInteger(movementGoalMinutes) && movementGoalMinutes > 0
      ? { energyGoalKcal, proteinGoalGrams, movementGoalMinutes: Math.round(movementGoalMinutes) }
      : null;
  };
  const confirmedMealStoreFor = createConfirmedMealStoreResolver({ mealStore, repositoryFor: ownerRepositoryForContext, ...(serverOwnedRepository ? { serverRepository: serverOwnedRepository } : {}) });
  const mealDraftPersistenceFor = (context: { userId: string; accessToken?: string }) => {
    const repository = ownerRepositoryForContext(context);
    return repository ? new AppwriteMealDraftPersistence(repository) : undefined;
  };
  const { dietHandler } = createProductRouteHandlers({ profileService, repositoryFor, ownerRepositoryForContext, confirmedMealsFor: confirmedMealStoreFor, serverOwnedRepository });
  const mealHandler = createMealRouteHandler({
    store: mealStore,
    imageStorage: mealImageStore,
    imageEstimateService,
    draftPersistence: mealDraftPersistenceFor,
    allowDevelopmentFixtures: environment === "local",
    savedMealStore: (context) => {
      const repository = ownerRepositoryForContext(context);
      return repository ? new AppwriteSavedMealStore(repository) : localSavedMealStore;
    },
    confirmedMealStore: confirmedMealStoreFor,
    personalFoodStore: (context) => {
      const repository = ownerRepositoryForContext(context);
      return repository ? new AppwritePersonalFoodStore(repository) : localPersonalFoodStore;
    },
    ...(nutritionCatalogStore ? { nutritionCatalogStore } : {}),
    onConfirmed: async (context, result) => {
      const targets = await confirmedTargetsForContext({ userId: result.meal.userId, ...(context.accessToken ? { accessToken: context.accessToken } : {}) });
      if (!targets) return;
      const summaryKey = `${result.meal.userId}:${result.meal.localDate}`;
      mealSummaryRevisions.set(summaryKey, Math.max(mealSummaryRevisions.get(summaryKey) ?? 0, result.totals.confirmedMealCount));
      const summary = {
        schemaVersion: API_SCHEMA_VERSION,
        source: "MOVEFUEL" as const,
        summaryId: `daily-${result.meal.userId}-${result.meal.localDate}`,
        revision: result.totals.confirmedMealCount,
        updatedAtEpochMillis: result.meal.updatedAtEpochMillis,
        energyKcal: result.totals.energyKcal,
        energyGoalKcal: targets.energyGoalKcal,
        proteinGrams: result.totals.proteinGrams,
        proteinGoalGrams: targets.proteinGoalGrams,
        movementMinutes: 0,
        movementGoalMinutes: targets.movementGoalMinutes,
        workoutState: "IDLE" as const,
      };
      await syncAdapterForContext({ userId: result.meal.userId, ...(context.accessToken ? { accessToken: context.accessToken } : {}) }).push(result.meal.userId, {
        schemaVersion: API_SCHEMA_VERSION,
        deviceId: context.deviceId ?? "phone-local",
        operations: [{
          operationId: `meal-confirm-${result.meal.mealId}`,
          entityType: "daily_summary",
          entityId: summary.summaryId,
          entityRevision: summary.revision,
          operationType: summary.revision === 1 ? "create" : "append_revision",
          idempotencyKey: `meal-confirm:${result.meal.mealId}`,
          payload: summary,
          payloadHash: sha256(summary),
        }],
      });
    },
    onChanged: async (context, meal, currentMeals) => {
      const targets = await confirmedTargetsForContext({ userId: meal.userId, ...(context.accessToken ? { accessToken: context.accessToken } : {}) });
      if (!targets) return;
      const summaryKey = `${meal.userId}:${meal.localDate}`;
      const current = currentMeals.filter((candidate) => candidate.localDate === meal.localDate && candidate.status === "CONFIRMED");
      const totals = current.reduce((acc, candidate) => ({
        energyKcal: acc.energyKcal + candidate.totals.energyKcal,
        proteinGrams: acc.proteinGrams + candidate.totals.proteinGrams,
        carbGrams: acc.carbGrams + candidate.totals.carbGrams,
        fatGrams: acc.fatGrams + candidate.totals.fatGrams,
        fiberGrams: acc.fiberGrams + candidate.totals.fiberGrams,
      }), { energyKcal: 0, proteinGrams: 0, carbGrams: 0, fatGrams: 0, fiberGrams: 0 });
      const targetSyncAdapter = syncAdapterForContext({ userId: meal.userId, ...(context.accessToken ? { accessToken: context.accessToken } : {}) });
      const existing = (await targetSyncAdapter.pull(context.userId, {
        schemaVersion: API_SCHEMA_VERSION,
        deviceId: context.deviceId ?? "phone-local",
        cursor: 0,
      })).summaries.find((entry) => entry.summary.summaryId === `daily-${meal.userId}-${meal.localDate}`)?.summary.revision ?? 0;
      const revision = Math.max(mealSummaryRevisions.get(summaryKey) ?? 0, existing) + 1;
      mealSummaryRevisions.set(summaryKey, revision);
      const summary = {
        schemaVersion: API_SCHEMA_VERSION,
        source: "MOVEFUEL" as const,
        summaryId: `daily-${meal.userId}-${meal.localDate}`,
        revision,
        updatedAtEpochMillis: meal.updatedAtEpochMillis,
        energyKcal: totals.energyKcal,
        energyGoalKcal: targets.energyGoalKcal,
        proteinGrams: totals.proteinGrams,
        proteinGoalGrams: targets.proteinGoalGrams,
        movementMinutes: 0,
        movementGoalMinutes: targets.movementGoalMinutes,
        workoutState: "IDLE" as const,
      };
      await targetSyncAdapter.push(meal.userId, {
        schemaVersion: API_SCHEMA_VERSION,
        deviceId: context.deviceId ?? "phone-local",
        operations: [{
          operationId: randomUUID(),
          entityType: "daily_summary",
          entityId: summary.summaryId,
          entityRevision: revision,
          operationType: "append_revision",
          idempotencyKey: `meal-mutation:${meal.mealId}:${meal.currentRevision}`,
          payload: summary,
          payloadHash: sha256(summary),
        }],
      });
    },
  });
  const { syncHandler, calendarHandler, canonicalSyncHandler } = createSyncCalendarRuntime({
    environment,
    production,
    sessionProvider,
    syncAdapterForContext,
    ownerRepositoryForContext,
    ...(serverOwnedRepository ? { serverOwnedRepository } : {}),
    deviceTrustStore,
    invalidationBoundary,
    ...(serverTablesClient ? { serverTablesClient } : {}),
    appwriteDatabaseId,
    ...(options.trainingAdaptationRequester ? { trainingAdaptationRequester: options.trainingAdaptationRequester } : {}),
  });
  const healthHandler = createHealthRouteHandler({
    store: (context) => {
      const repository = ownerRepositoryForContext(context);
      return repository ? new AppwriteHealthProjectionStore(repository) : healthStore;
    },
  });
  const deviceHandler = createDeviceRouteHandler({
    store: (context) => {
      const repository = ownerRepositoryForContext(context);
      return repository ? new AppwriteDeviceTrustStore(repository) : deviceTrustStore;
    },
  });
  const deviceCommandHandler = createDeviceCommandRouteHandler({
    store: (context) => {
      const repository = ownerRepositoryForContext(context);
      return repository && serverOwnedRepository
        ? new AppwriteDeviceCommandStore(serverOwnedRepository, new AppwriteDeviceTrustStore(repository))
        : deviceCommandStore;
    },
  });
  const insightHandler = createInsightRouteHandler({
    repositoryFor, profileService, mealStore, healthStore, syncAdapterForContext, serverOwnedRepository,
    todaySourceFor: createProductionTodaySourceForContext({
      profileService,
      ownerRepositoryForContext,
      serverOwnedRepository,
      confirmedMealsFor: confirmedMealStoreFor,
      serverTablesClient,
      appwriteDatabaseId,
    }),
  });
  const reportHandler = createReportRouteHandler({ reportStore, reportNarrator, repositoryFor,
    progressFor: (context, periodStart, periodEnd) => buildCanonicalProgressForReport({ context, periodStart, periodEnd, repository: repositoryFor(context), ...(serverOwnedRepository ? { serverOwnedRepository } : {}), mealStore, healthStore, syncAdapter: syncAdapterForContext(context) }) });
  const experienceHandler = createExperienceRouteHandler({
    localNotificationStore,
    supportTicketStore,
    ...(entitlementProvider ? { entitlementProvider } : {}),
    repositoryFor,
  });
  const profileAccountHandler = createProfileAccountRouteHandler({
    onboardingConsentService,
    profileService,
    accountLifecycleService,
    repositoryFor,
  });
  const bootstrapFor = (auth: { provider: string; accessToken?: string; userId?: string }) => options.bootstrapService ?? (
    auth.provider === "appwrite" && auth.userId
      ? (() => {
          const repository = ownerRepositoryForContext({ userId: auth.userId!, ...(auth.accessToken ? { accessToken: auth.accessToken } : {}) });
          return repository ? new AppwriteBootstrapService(repository) : null;
        })()
      : null
  );
  return {
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
    invalidationBoundary,
  } as const;
}
