import { AppwriteCalendarStore } from "../calendar/appwrite-calendar-store.ts";
import { CalendarService, type TrainingAdaptationRequester } from "../calendar/calendar-service.ts";
import { AppwriteDeviceTrustStore, type DeviceTrustStoreLike } from "../device/appwrite-device-trust.ts";
import type { CanonicalInvalidationBoundary } from "../domain/invalidation-boundary.ts";
import type { OwnerScopedRepository, ServerOwnedRepository } from "../foundation/repository.ts";
import type { SessionProvider } from "../foundation/session.ts";
import { createCalendarRouteHandler } from "../http/calendar-routes.ts";
import { createCanonicalSyncRouteHandler } from "../http/canonical-sync-routes.ts";
import { requireSession } from "../http/requestSupport.ts";
import { createSyncProductHandler } from "../http/sync-routes.ts";
import { AppwriteConfirmedMealStore } from "../meal/confirmed-meals.ts";
import { CanonicalMealReconciler } from "../sync/canonical-meal-reconciler.ts";
import { CanonicalWorkoutReconciler } from "../sync/canonical-workout-reconciler.ts";
import type { SyncProductAdapterLike } from "../sync/adapter.ts";
import { AppwriteWorkoutStore } from "../sync/appwrite-workout-store.ts";
import { CurrentTrainingPlanStore } from "../training/current-plan-store.ts";
import type { AppwriteTablesClient } from "../foundation/repository.ts";

const trainingSession = (value: unknown): { semanticSessionId: string; localDate: string; expectedDurationMinutes: number } | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return typeof row.semanticSessionId === "string" && typeof row.localDate === "string" &&
    typeof row.expectedDurationMinutes === "number"
    ? { semanticSessionId: row.semanticSessionId, localDate: row.localDate, expectedDurationMinutes: row.expectedDurationMinutes }
    : null;
};

export type SyncCalendarRuntimeOptions = {
  environment: string;
  production: boolean;
  sessionProvider: SessionProvider | null;
  syncAdapterForContext: (context: { userId?: string; accessToken?: string }) => SyncProductAdapterLike;
  ownerRepositoryForContext: (context: { userId: string; accessToken?: string }) => OwnerScopedRepository | undefined;
  serverOwnedRepository?: ServerOwnedRepository;
  deviceTrustStore: DeviceTrustStoreLike;
  invalidationBoundary: CanonicalInvalidationBoundary;
  trainingAdaptationRequester?: TrainingAdaptationRequester;
  serverTablesClient?: AppwriteTablesClient;
  appwriteDatabaseId: string;
};

/**
 * Focused construction helper for the canonical Sync + Calendar route graph.
 * backend-runtime.ts remains the composition root: it selects runtime mode,
 * owns shared repositories/adapters, and injects every dependency here.
 */
export function createSyncCalendarRuntime(options: SyncCalendarRuntimeOptions) {
  const syncHandler = createSyncProductHandler({
    adapter: (context) => options.syncAdapterForContext(context),
    environment: options.environment,
    authenticate: async (request) => {
      const principal = await requireSession(request, options.sessionProvider, options.production);
      return {
        userId: principal.userId,
        ...(principal.accessToken ? { accessToken: principal.accessToken } : {}),
      };
    },
    deviceTrust: (context) => {
      const repository = options.ownerRepositoryForContext(context);
      return repository ? new AppwriteDeviceTrustStore(repository) : options.deviceTrustStore;
    },
  });

  const calendarStore = options.serverOwnedRepository
    ? new AppwriteCalendarStore(options.serverOwnedRepository)
    : null;
  const calendarHandler = createCalendarRouteHandler(async (context) => {
    if (!calendarStore || !options.serverOwnedRepository) return null;
    const repository = options.ownerRepositoryForContext({
      userId: context.userId,
      ...(context.accessToken ? { accessToken: context.accessToken } : {}),
    });
    if (!repository) return null;
    const canonicalTrainingSession = options.serverTablesClient
      ? async ({ userId, semanticSessionId }: { userId: string; semanticSessionId: string }) => {
          const current = await new CurrentTrainingPlanStore(repository, options.serverTablesClient!, options.appwriteDatabaseId).readCurrent(userId);
          if (current.state !== "CURRENT" || !current.plan) return null;
          const session = current.plan.sessions.map(trainingSession).find((candidate) => candidate?.semanticSessionId === semanticSessionId) ?? null;
          if (!session || !Number.isInteger(session.expectedDurationMinutes) || session.expectedDurationMinutes <= 0) return null;
          return {
            planId: current.plan.planId,
            planRevision: current.plan.planRevision,
            localDate: session.localDate,
            expectedDurationMinutes: session.expectedDurationMinutes,
          };
        }
      : undefined;
    return new CalendarService(calendarStore, repository, options.serverOwnedRepository, {
      onProjectionInvalidated: async ({ userId, calendarRevision, operationId }) => {
        for (const domain of ["CALENDAR", "TODAY"] as const) {
          await options.invalidationBoundary.markDirty({
            userId,
            domain,
            sourceType: "CALENDAR",
            sourceId: "primary",
            sourceRevision: calendarRevision,
            operationId,
            reasonCode: "CALENDAR_REVISION_ACCEPTED",
          });
        }
      },
      ...(options.trainingAdaptationRequester
        ? { requestTrainingAdaptation: options.trainingAdaptationRequester }
        : {}),
      ...(canonicalTrainingSession ? { canonicalTrainingSession } : {}),
    });
  });

  const canonicalSyncHandler = createCanonicalSyncRouteHandler(async (context, entityType) => {
    if (!options.serverOwnedRepository) return null;
    const repository = options.ownerRepositoryForContext({
      userId: context.userId,
      ...(context.accessToken ? { accessToken: context.accessToken } : {}),
    });
    if (!repository) return null;
    if (entityType === "workout_session") {
      return new CanonicalWorkoutReconciler(
        new AppwriteWorkoutStore(repository),
        repository,
        options.serverOwnedRepository,
        options.invalidationBoundary,
      );
    }
    if (entityType === "meal") {
      return new CanonicalMealReconciler(
        new AppwriteConfirmedMealStore(repository, options.serverOwnedRepository),
        repository,
        options.serverOwnedRepository,
        options.invalidationBoundary,
      );
    }
    return null;
  });

  return { syncHandler, calendarHandler, canonicalSyncHandler } as const;
}
