import type { IncomingMessage, ServerResponse } from "node:http";
import { buildProgressEnvelope } from "../progress/progress.ts";
import { buildDashboardEnvelope } from "../dashboard/dashboard.ts";
import { AppwriteConfirmedMealStore, LocalConfirmedMealStore } from "../meal/confirmed-meals.ts";
import { AppwriteHealthProjectionStore, HealthStore } from "../health/health-store.ts";
import type { MealStore } from "../meal/store.ts";
import type { ProfileResult, ProfileService } from "../foundation/profile.ts";
import type { OwnerScopedRepository, ServerOwnedRepository } from "../foundation/repository.ts";
import type { SyncProductAdapter } from "../sync/adapter.ts";
import type { AppwriteSyncProductAdapter } from "../sync/appwrite-adapter.ts";
import { activeWorkoutContinuity } from "../today/context-adapters.ts";
import { buildTodayBundle, emptyTodaySourceSnapshot, type TodaySourceProvider, type TodaySourceSnapshot } from "../today/service.ts";
import { response, sendJson, type RequestContext } from "./requestSupport.ts";

function profileTimezone(profile: ProfileResult | null): string {
  const row = profile?.profile as Record<string, unknown> | undefined;
  return typeof row?.timeZone === "string" && row.timeZone.trim() ? row.timeZone.trim() : "UNKNOWN";
}

function withActiveWorkoutContinuity(
  source: TodaySourceSnapshot,
  userId: string,
  workouts: Parameters<typeof activeWorkoutContinuity>[1],
  now: string,
): TodaySourceSnapshot {
  const continuity = activeWorkoutContinuity(userId, workouts, now);
  if (!continuity) return source;
  const alreadyPresent = source.domains.training.some((entry) =>
    entry.candidate.type === "CONTINUE_ACTIVE_WORKOUT" &&
    entry.candidate.sourceObjectId === continuity.input.candidate.sourceObjectId,
  );
  return Object.freeze({
    ...source,
    domains: Object.freeze({
      ...source.domains,
      training: alreadyPresent
        ? source.domains.training
        : Object.freeze([continuity.input, ...source.domains.training]),
    }),
    activeWorkout: source.activeWorkout ?? continuity.projection,
  });
}

export function createInsightRouteHandler(options: {
  repositoryFor: (context: RequestContext) => OwnerScopedRepository | undefined;
  serverOwnedRepository?: ServerOwnedRepository;
  profileService: ProfileService;
  mealStore: MealStore;
  healthStore: HealthStore;
  syncAdapterForContext: (context: RequestContext) => SyncProductAdapter | AppwriteSyncProductAdapter;
  todaySourceFor?: (context: RequestContext) => TodaySourceProvider | null;
  now?: () => Date;
}) {
  const {
    repositoryFor,
    profileService,
    mealStore,
    healthStore,
    syncAdapterForContext,
    serverOwnedRepository,
    todaySourceFor,
  } = options;
  const now = options.now ?? (() => new Date());

  return async (req: IncomingMessage, res: ServerResponse, context: { auth: RequestContext; url: URL; correlationId: string }): Promise<boolean> => {
    const { auth, url, correlationId } = context;
    const dashboardMatch = url.pathname.match(/^\/v1\/dashboard\/(\d{4}-\d{2}-\d{2})$/);
    const todayMatch = url.pathname.match(/^\/v1\/today\/(\d{4}-\d{2}-\d{2})(\/watch)?$/);
    if (req.method === "GET" && (dashboardMatch || todayMatch)) {
      const localDate = (dashboardMatch?.[1] ?? todayMatch?.[1])!;
      const repository = repositoryFor(auth);
      const confirmedMealStore = repository && serverOwnedRepository ? new AppwriteConfirmedMealStore(repository, serverOwnedRepository) : new LocalConfirmedMealStore(mealStore);
      const dashboardHealthStore = repository ? new AppwriteHealthProjectionStore(repository) : healthStore;
      const start = Date.parse(`${localDate}T00:00:00.000Z`);
      const [profile, meals, health, workoutPage] = await Promise.all([
        profileService.get(auth.userId, repository),
        confirmedMealStore.list(auth.userId, localDate),
        dashboardHealthStore.listSummaries(auth.userId, localDate),
        syncAdapterForContext(auth).listWorkouts(auth.userId, {
          fromEpochMillis: start,
          toEpochMillis: start + 86_400_000 - 1,
          limit: 100,
        }),
      ]);

      const timezone = profileTimezone(profile);
      const generatedAt = now().toISOString();
      const sourceRequest = {
        userId: auth.userId,
        localDate,
        timezone,
        networkAvailable: true,
        now: generatedAt,
      } as const;
      const sourceProvider = todaySourceFor ? todaySourceFor(auth) : null;
      const sourceBase = sourceProvider ? await sourceProvider(sourceRequest) : emptyTodaySourceSnapshot();
      const source = withActiveWorkoutContinuity(sourceBase, auth.userId, workoutPage.sessions, generatedAt);
      const todayBundle = buildTodayBundle({ ...sourceRequest, source });

      if (todayMatch) {
        sendJson(res, 200, response(todayMatch[2] ? todayBundle.watch : todayBundle.today, null, correlationId));
        return true;
      }

      const dashboard = buildDashboardEnvelope({
        localDate,
        profile,
        meals,
        health,
        workouts: workoutPage.sessions,
        decision: todayBundle.decision,
      });
      sendJson(res, 200, response(dashboard, null, correlationId));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/v1/progress") {
      const from = url.searchParams.get("from") ?? new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
      const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
      const repository = repositoryFor(auth);
      const confirmedMealStore = repository && serverOwnedRepository ? new AppwriteConfirmedMealStore(repository, serverOwnedRepository) : new LocalConfirmedMealStore(mealStore);
      const progressHealthStore = repository ? new AppwriteHealthProjectionStore(repository) : healthStore;
      const [meals, workouts, health] = await Promise.all([
        confirmedMealStore.list(auth.userId),
        Promise.resolve(syncAdapterForContext(auth).listWorkouts(auth.userId, {
          fromEpochMillis: Date.parse(`${from}T00:00:00.000Z`),
          toEpochMillis: Date.parse(`${to}T23:59:59.999Z`),
          state: "COMPLETED",
          limit: 200,
        })).then((page) => page.sessions),
        progressHealthStore.listSummaries(auth.userId),
      ]);
      const progress = buildProgressEnvelope({ periodStart: from, periodEnd: to, meals, workouts, health });
      sendJson(res, 200, response(progress, null, correlationId));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/v1/calendar") {
      const from = url.searchParams.get("from") ?? new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
      const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
      const repository = repositoryFor(auth);
      const confirmedMealStore = repository && serverOwnedRepository ? new AppwriteConfirmedMealStore(repository, serverOwnedRepository) : new LocalConfirmedMealStore(mealStore);
      const calendarHealthStore = repository ? new AppwriteHealthProjectionStore(repository) : healthStore;
      const [meals, workouts, health] = await Promise.all([
        confirmedMealStore.list(auth.userId),
        Promise.resolve(syncAdapterForContext(auth).listWorkouts(auth.userId, {
          fromEpochMillis: Date.parse(`${from}T00:00:00.000Z`),
          toEpochMillis: Date.parse(`${to}T23:59:59.999Z`),
          state: "COMPLETED",
          limit: 200,
        })).then((page) => page.sessions),
        calendarHealthStore.listSummaries(auth.userId),
      ]);
      const progress = buildProgressEnvelope({ periodStart: from, periodEnd: to, meals, workouts, health });
      const days = progress.days.map((day) => ({
        localDate: day.localDate,
        mealCount: day.confirmedMealCount,
        completedWorkouts: day.completedWorkouts,
        ...(day.confirmedMealCount > 0 ? { energyKcal: day.energyKcal, proteinGrams: day.proteinGrams } : {}),
        ...(day.steps === null ? {} : { steps: day.steps }),
        ...(day.activeEnergyKcal === null ? {} : { activeEnergyKcal: day.activeEnergyKcal }),
        evidence: {
          mealsObserved: day.confirmedMealCount > 0,
          activityObserved: day.steps !== null || day.activeEnergyKcal !== null,
          workoutObserved: day.completedWorkouts > 0,
        },
      }));
      sendJson(res, 200, response({ from, to, days }, null, correlationId));
      return true;
    }

    return false;
  };
}
