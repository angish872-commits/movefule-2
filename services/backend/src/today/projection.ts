import type { JsonValue, TodayState, WatchTodayProjection } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { TodayProjectionInput, WatchProjectionInput } from "./contracts.ts";

export const TODAY_PROJECTION_VERSION = "movefuel-today-projection-2026-08-v1";
export const WATCH_TODAY_PROJECTION_VERSION = "movefuel-watch-today-projection-2026-08-v1";

function freezeJsonArray(values: readonly JsonValue[] | undefined): readonly JsonValue[] {
  return Object.freeze([...(values ?? [])]);
}

/** Projects an already-ranked decision. No ranking or domain invention occurs here. */
export function projectTodayState(input: TodayProjectionInput): TodayState {
  const decision = input.decision;
  return Object.freeze({
    schemaVersion: 1,
    todayProjectionVersion: TODAY_PROJECTION_VERSION,
    userId: decision.userId,
    localDate: decision.localDate,
    timezone: decision.timezone,
    primaryAction: decision.primaryAction,
    secondaryActions: Object.freeze([...decision.secondaryActions].slice(0, 3)),
    summaries: input.summaries ?? null,
    alerts: freezeJsonArray(input.alerts),
    missingInformation: freezeJsonArray(input.missingInformation),
    syncState: input.syncState,
    freshness: input.freshness,
    decisionId: decision.decisionId,
    inputRevisionHash: decision.inputRevisionHash,
    generatedAt: decision.generatedAt,
    expiresAt: decision.expiresAt,
    revision: input.revision,
  });
}

/** Wear receives a projection of canonical TodayState and never re-ranks actions locally. */
export function projectWatchToday(input: WatchProjectionInput): WatchTodayProjection {
  const today = input.today;
  return Object.freeze({
    schemaVersion: 1,
    watchProjectionVersion: WATCH_TODAY_PROJECTION_VERSION,
    sourceTodayRevision: today.revision,
    userId: today.userId,
    localDate: today.localDate,
    timezone: today.timezone,
    primaryAction: today.primaryAction,
    secondaryAction: today.secondaryActions[0] ?? null,
    activeWorkout: input.activeWorkout ?? null,
    upcomingWorkout: input.upcomingWorkout ?? null,
    syncState: today.syncState,
    freshness: today.freshness,
    generatedAt: input.generatedAt,
    expiresAt: today.expiresAt,
  });
}
