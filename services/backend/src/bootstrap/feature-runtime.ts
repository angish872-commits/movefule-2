import { AppwriteCalendarStore } from "../calendar/appwrite-calendar-store.ts";
import { AppwriteServerTablesHttpClient } from "../foundation/appwrite-server-tables-client.ts";
import { AppwriteRuntime } from "../foundation/appwrite-runtime.ts";
import { ProfileService } from "../foundation/profile.ts";
import { AppwriteOwnerScopedRepository, AppwriteServerOwnedRepository, type OwnerScopedRepository } from "../foundation/repository.ts";
import { createPrivacyRouteHandler } from "../http/privacy-routes.ts";
import { createTrainingRouteHandler } from "../http/training-routes.ts";
import { isConfiguredSecret, type RequestContext } from "../http/requestSupport.ts";
import { AppwriteMealImageStore } from "../meal/appwrite-image-store.ts";
import { LocalMealImageStore, type MealImageStore } from "../meal/local-image-store.ts";
import { MealStore } from "../meal/store.ts";
import { MealMediaLifecycleService } from "../privacy/meal-media-lifecycle.ts";
import { PrivacyPreferenceService } from "../privacy/preferences.ts";
import { createCanonicalTrainingAdaptationRequester } from "../training/calendar-adaptation-requester.ts";
import { AppwriteCanonicalTrainingHistoryStore } from "../training/canonical-history-store.ts";
import { AppwriteExerciseCatalogStore } from "../training/catalog-store.ts";
import { TrainingGenerationCoordinator } from "../training/generation-coordinator.ts";
import { AppwriteTrainingPlanStore } from "../training/plan-store.ts";
import { TrainingRuntimeInputBuilder } from "../training/runtime-input.ts";
import { TrainingSetupService } from "../training/setup-service.ts";
import { TrainingBackendService } from "../training/training-service.ts";
import type { BackendRuntimeOptions } from "./backend-runtime.ts";

export function createFeatureRuntime(options: BackendRuntimeOptions = {}) {
  const appwriteEndpoint = options.appwriteEndpoint ?? process.env.APPWRITE_ENDPOINT ?? "";
  const appwriteProjectId = options.appwriteProjectId ?? process.env.APPWRITE_PROJECT_ID ?? "";
  const appwriteDatabaseId = options.appwriteDatabaseId ?? process.env.APPWRITE_DATABASE_ID ?? "movefuel_mvp";
  const appwriteServerApiKey = options.appwriteServerApiKey ?? process.env.APPWRITE_API_KEY ?? "";
  const mealMediaBucketId = options.mealMediaBucketId ?? process.env.BUCKET_MEAL_MEDIA_ID ?? "";
  const appwriteRuntime = new AppwriteRuntime({
    endpoint: appwriteEndpoint,
    projectId: appwriteProjectId,
    databaseId: appwriteDatabaseId,
    ...(options.appwriteTablesFetcher ? { fetcher: options.appwriteTablesFetcher } : {}),
  });
  const serverTablesClient = isConfiguredSecret(appwriteServerApiKey) && appwriteEndpoint && appwriteProjectId
    ? new AppwriteServerTablesHttpClient({
        endpoint: appwriteEndpoint,
        projectId: appwriteProjectId,
        apiKey: appwriteServerApiKey,
        ...(options.appwriteTablesFetcher ? { fetcher: options.appwriteTablesFetcher } : {}),
      })
    : undefined;
  const serverOwnedRepository = options.serverOwnedRepository ?? (
    serverTablesClient ? new AppwriteServerOwnedRepository(serverTablesClient, appwriteDatabaseId) : undefined
  );
  const ownerRepositoryForContext = (context: { userId: string; accessToken?: string }): OwnerScopedRepository | undefined =>
    options.ownerRepositoryForContext?.(context) ?? appwriteRuntime.repositoryFor(context.accessToken);
  const repositoryFor = (context: RequestContext): OwnerScopedRepository | undefined =>
    context.provider === "appwrite"
      ? ownerRepositoryForContext({ userId: context.userId, ...(context.accessToken ? { accessToken: context.accessToken } : {}) })
      : undefined;

  const profileService = options.profileService ?? new ProfileService(serverOwnedRepository);
  const mealStore = options.mealStore ?? new MealStore();
  const mealImageStore: MealImageStore = options.mealImageStore ?? (
    serverTablesClient && isConfiguredSecret(mealMediaBucketId)
      ? new AppwriteMealImageStore({
          endpoint: appwriteEndpoint,
          projectId: appwriteProjectId,
          apiKey: appwriteServerApiKey,
          bucketId: mealMediaBucketId,
          databaseId: appwriteDatabaseId,
          ...(options.appwriteTablesFetcher ? { fetcher: options.appwriteTablesFetcher } : {}),
        })
      : new LocalMealImageStore()
  );
  const privacyPreferences = new PrivacyPreferenceService();
  const mediaLifecycle = new MealMediaLifecycleService(mealImageStore, privacyPreferences);
  const trainingSetup = new TrainingSetupService();
  const calendarStore = serverOwnedRepository ? new AppwriteCalendarStore(serverOwnedRepository) : null;

  const createTrainingRuntime = (ownerRepository: OwnerScopedRepository) => {
    if (!serverOwnedRepository || !serverTablesClient || !calendarStore) return null;
    const planStore = new AppwriteTrainingPlanStore(ownerRepository, serverTablesClient, appwriteDatabaseId);
    const canonicalHistory = new AppwriteCanonicalTrainingHistoryStore(ownerRepository);
    const runtimeInputs = new TrainingRuntimeInputBuilder({
      profileFor: (userId) => profileService.get(userId, ownerRepository),
      setupFor: (userId) => trainingSetup.get(userId, ownerRepository),
      canonicalHistoryFor: (userId) => canonicalHistory.loadCanonicalHistory(userId),
      calendarFor: (userId) => calendarStore.readCurrent(userId),
      wellnessFor: async (userId, localDate) => (await ownerRepository.listOwned("wellness_checkin", userId, {
        queries: [{ field: "localDate", operator: "equal", value: localDate }],
        limit: 10,
      })).rows,
    });
    const training = new TrainingBackendService(
      new AppwriteExerciseCatalogStore(serverTablesClient, appwriteDatabaseId),
      planStore,
    );
    return {
      planStore,
      coordinator: new TrainingGenerationCoordinator({
        runtimeInputs,
        training,
        plans: planStore,
        idempotency: serverOwnedRepository,
      }),
    } as const;
  };

  const privacyHandler = createPrivacyRouteHandler({
    privacyPreferences,
    mediaLifecycle,
    profileService,
    repositoryFor,
  });

  const trainingHandler = createTrainingRouteHandler({
    setupService: trainingSetup,
    repositoryFor,
    runtimeFor: (context) => {
      const ownerRepository = repositoryFor(context);
      if (!ownerRepository) return null;
      const runtime = createTrainingRuntime(ownerRepository);
      return runtime ? { coordinator: runtime.coordinator } : null;
    },
  });

  const serverOwnerRepository = serverTablesClient
    ? new AppwriteOwnerScopedRepository(serverTablesClient, appwriteDatabaseId)
    : null;
  const calendarTrainingRuntime = serverOwnerRepository ? createTrainingRuntime(serverOwnerRepository) : null;
  const trainingAdaptationRequester = options.trainingAdaptationRequester ?? (
    calendarTrainingRuntime
      ? createCanonicalTrainingAdaptationRequester({
          coordinator: calendarTrainingRuntime.coordinator,
          plans: calendarTrainingRuntime.planStore,
        })
      : undefined
  );

  const reconcileMealMedia = async (context: RequestContext): Promise<void> => {
    const repository = repositoryFor(context);
    if (!repository) {
      await mediaLifecycle.purgeDue(context.userId).catch(() => undefined);
      return;
    }
    const [meals, media] = await Promise.all([
      repository.listOwned("meal", context.userId, { limit: 500 }),
      repository.listOwned("meal_media", context.userId, { limit: 500 }),
    ]);
    const confirmedByDraft = new Map<string, string>();
    for (const meal of meals.rows) {
      const draftId = typeof meal.sourceDraftId === "string" ? meal.sourceDraftId : "";
      const mealId = typeof meal.mealId === "string" ? meal.mealId : meal.$id;
      if (draftId) confirmedByDraft.set(draftId, mealId);
    }
    for (const row of media.rows) {
      if (String(row.state ?? "").toLowerCase() !== "temporary") continue;
      const draftId = typeof row.draftId === "string" ? row.draftId : "";
      const mealId = confirmedByDraft.get(draftId);
      const bucketId = typeof row.bucketId === "string" ? row.bucketId : "";
      const objectId = typeof row.objectId === "string" ? row.objectId : "";
      if (!mealId || !bucketId || !objectId) continue;
      await mediaLifecycle.applyConfirmedPolicy(
        context.userId,
        `appwrite-meal-image:${bucketId}:${objectId}`,
        mealId,
        repository,
      );
    }
    await mediaLifecycle.purgeDue(context.userId, repository);
  };

  const backendOptions: BackendRuntimeOptions = {
    ...options,
    profileService,
    privacyPreferenceService: privacyPreferences,
    mealStore,
    mealImageStore,
    ownerRepositoryForContext,
    ...(serverOwnedRepository ? { serverOwnedRepository } : {}),
    ...(trainingAdaptationRequester ? { trainingAdaptationRequester } : {}),
  };

  return {
    backendOptions,
    privacyHandler,
    trainingHandler,
    reconcileMealMedia,
    privacyPreferences,
    mediaLifecycle,
    trainingSetup,
  } as const;
}
