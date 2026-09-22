import type {
  DailyActionCandidate,
  DailyDecisionEnvelope,
  FreshnessState,
  JsonValue,
  TodayState,
  TodaySyncState,
  WatchTodayProjection,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

export type TodayDomainValidity = "VALID" | "BLOCKED" | "UNKNOWN";
export type TodayDependencyState = "SATISFIED" | "UNSATISFIED" | "UNKNOWN";
export type TodayContinuity = "NONE" | "ACTIVE_WORKOUT";

export type TodayCandidateInput = {
  readonly candidate: DailyActionCandidate;
  readonly domainValidity: TodayDomainValidity;
  readonly dependencyState: TodayDependencyState;
  readonly freshness: FreshnessState;
  /** Candidates with the same non-null conflictKey compete for one slot. */
  readonly conflictKey?: string | null;
  /** Calendar conflicts only invalidate candidates that explicitly depend on the same key. */
  readonly calendarDependencyKeys?: readonly string[];
  /** Active workout continuity is a ranking priority, never a prescription mutation. */
  readonly continuity?: TodayContinuity;
};

export type TodayDecisionInput = {
  readonly userId: string;
  readonly localDate: string;
  readonly timezone: string;
  readonly candidates: readonly TodayCandidateInput[];
  readonly userIntentDomains?: readonly DailyActionCandidate["domain"][];
  readonly calendarConflictKeys?: readonly string[];
  readonly networkAvailable: boolean;
  readonly now: string;
};

export type TodayRejection = {
  readonly candidateId: string;
  readonly reasonCode:
    | "CROSS_USER_CANDIDATE"
    | "DOMAIN_BLOCKED"
    | "DOMAIN_VALIDITY_UNKNOWN"
    | "DEPENDENCY_UNSATISFIED"
    | "DEPENDENCY_UNKNOWN"
    | "STALE_CANDIDATE"
    | "PARTIAL_CANDIDATE"
    | "FRESHNESS_UNKNOWN"
    | "OFFLINE_CACHED_CANDIDATE"
    | "CALENDAR_CONFLICT"
    | "INVALID_CONTINUITY_DOMAIN"
    | "NOT_YET_VALID"
    | "EXPIRED"
    | "NETWORK_REQUIRED"
    | "INVALID_VALIDITY_WINDOW"
    | "MISSING_PROVENANCE"
    | "SOURCE_REVISION_CONFLICT"
    | "SEMANTIC_DUPLICATE"
    | "CONFLICT_LOST";
};

export type TodayProjectionInput = {
  readonly decision: DailyDecisionEnvelope;
  readonly revision: number;
  readonly summaries?: JsonValue;
  readonly alerts?: readonly JsonValue[];
  readonly missingInformation?: readonly JsonValue[];
  readonly syncState: TodaySyncState;
  readonly freshness: FreshnessState;
};

export type WatchProjectionInput = {
  readonly today: TodayState;
  readonly activeWorkout?: JsonValue | null;
  readonly upcomingWorkout?: JsonValue | null;
  readonly generatedAt: string;
};

export type {
  DailyActionCandidate,
  DailyDecisionEnvelope,
  TodayState,
  WatchTodayProjection,
};
