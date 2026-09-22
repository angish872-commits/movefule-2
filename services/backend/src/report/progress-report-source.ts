import { buildProgressEnvelope, type ProgressEnvelope } from "../progress/progress.ts";
import { AppwriteConfirmedMealStore, LocalConfirmedMealStore } from "../meal/confirmed-meals.ts";
import { AppwriteHealthProjectionStore, type HealthStore } from "../health/health-store.ts";
import type { MealStore } from "../meal/store.ts";
import type { OwnerScopedRepository, ServerOwnedRepository } from "../foundation/repository.ts";
import type { SyncProductAdapter } from "../sync/adapter.ts";
import type { AppwriteSyncProductAdapter } from "../sync/appwrite-adapter.ts";

export async function buildCanonicalProgressForReport(input: {
  context: { userId: string; accessToken?: string; deviceId?: string };
  periodStart: string;
  periodEnd: string;
  repository?: OwnerScopedRepository;
  serverOwnedRepository?: ServerOwnedRepository;
  mealStore: MealStore;
  healthStore: HealthStore;
  syncAdapter: SyncProductAdapter | AppwriteSyncProductAdapter;
}): Promise<ProgressEnvelope> {
  const meals = input.repository && input.serverOwnedRepository
    ? new AppwriteConfirmedMealStore(input.repository, input.serverOwnedRepository)
    : new LocalConfirmedMealStore(input.mealStore);
  const health = input.repository ? new AppwriteHealthProjectionStore(input.repository) : input.healthStore;
  const [mealRows, workoutPage, healthRows] = await Promise.all([
    meals.list(input.context.userId),
    input.syncAdapter.listWorkouts(input.context.userId, {
      fromEpochMillis: Date.parse(`${input.periodStart}T00:00:00.000Z`),
      toEpochMillis: Date.parse(`${input.periodEnd}T23:59:59.999Z`),
      state: "COMPLETED",
      limit: 500,
    }),
    health.listSummaries(input.context.userId),
  ]);
  return buildProgressEnvelope({ periodStart: input.periodStart, periodEnd: input.periodEnd, meals: mealRows, workouts: workoutPage.sessions, health: healthRows });
}
