import type {
  FreshnessState,
  JsonValue,
  TodayState,
  TodaySyncState,
  WatchTodayProjection,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { TodayDomainCandidateSets } from "./runtime.ts";
import { emptyTodayDomainCandidateSets, orchestrateToday } from "./runtime.ts";
import { projectTodayState, projectWatchToday } from "./projection.ts";

export type TodaySourceSnapshot = {
  readonly domains: TodayDomainCandidateSets;
  readonly userIntentDomains?: readonly ("FOOD" | "NUTRITION" | "TRAINING" | "CALENDAR" | "HEALTH" | "DEVICE" | "PROGRESS" | "SYSTEM")[];
  readonly calendarConflictKeys?: readonly string[];
  readonly summaries?: JsonValue;
  readonly alerts?: readonly JsonValue[];
  readonly missingInformation?: readonly JsonValue[];
  readonly syncState: TodaySyncState;
  readonly freshness: FreshnessState;
  readonly revision: number;
  readonly activeWorkout?: JsonValue | null;
  readonly upcomingWorkout?: JsonValue | null;
};

export type TodaySourceRequest = {
  readonly userId: string;
  readonly localDate: string;
  readonly timezone: string;
  readonly networkAvailable: boolean;
  readonly now: string;
};

export type TodaySourceProvider = (request: TodaySourceRequest) => Promise<TodaySourceSnapshot>;

export type TodayBundle = {
  readonly decision: ReturnType<typeof orchestrateToday>;
  readonly today: TodayState;
  readonly watch: WatchTodayProjection;
};

export function emptyTodaySourceSnapshot(): TodaySourceSnapshot {
  return Object.freeze({
    domains: emptyTodayDomainCandidateSets(),
    syncState: "SYNCED",
    freshness: "UNKNOWN",
    revision: 1,
  });
}

/**
 * Canonical Today application service. All domain content must already be owned
 * and validated by its source domain; Today only rejects, orders, and projects.
 */
export function buildTodayBundle(input: TodaySourceRequest & { readonly source: TodaySourceSnapshot }): TodayBundle {
  const decision = orchestrateToday({
    userId: input.userId,
    localDate: input.localDate,
    timezone: input.timezone,
    domains: input.source.domains,
    networkAvailable: input.networkAvailable,
    now: input.now,
    ...(input.source.userIntentDomains ? { userIntentDomains: input.source.userIntentDomains } : {}),
    ...(input.source.calendarConflictKeys ? { calendarConflictKeys: input.source.calendarConflictKeys } : {}),
  });
  const today = projectTodayState({
    decision,
    revision: Math.max(1, Math.trunc(input.source.revision)),
    syncState: input.source.syncState,
    freshness: input.source.freshness,
    ...(input.source.summaries === undefined ? {} : { summaries: input.source.summaries }),
    ...(input.source.alerts === undefined ? {} : { alerts: input.source.alerts }),
    ...(input.source.missingInformation === undefined ? {} : { missingInformation: input.source.missingInformation }),
  });
  const watch = projectWatchToday({
    today,
    generatedAt: input.now,
    ...(input.source.activeWorkout === undefined ? {} : { activeWorkout: input.source.activeWorkout }),
    ...(input.source.upcomingWorkout === undefined ? {} : { upcomingWorkout: input.source.upcomingWorkout }),
  });
  return Object.freeze({ decision, today, watch });
}