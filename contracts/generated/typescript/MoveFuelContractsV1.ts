// Generated from contracts/canonical/v1/contracts.json. Do not edit.
// schemaVersion=1

export type JsonValue = null | boolean | number | string | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue };

export type SetupStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "BLOCKED";

export type EligibilityDecision = "ELIGIBLE" | "INELIGIBLE" | "REQUIRES_REVIEW" | "UNKNOWN";

export type DataQuality = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type FreshnessState = "FRESH" | "STALE" | "PARTIAL" | "UNKNOWN" | "OFFLINE_CACHED";

export type SourcePlatform = "ANDROID" | "WEAR_OS" | "IOS" | "WATCH_OS";

export type RevisionStatus = "ACTIVE" | "SUPERSEDED" | "DELETED";

export type MealDraftStatus = "DRAFT" | "ANALYZING" | "NEEDS_REVIEW" | "CONFIRMED" | "CANCELLED";

export type MealStatus = "CONFIRMED" | "DELETED";

export type CorrectionKind = "IDENTITY" | "PORTION" | "NUTRITION" | "PREPARATION" | "DELETE" | "RESTORE";

export type RecommendationStatus = "ELIGIBLE" | "BLOCKED" | "EXPIRED" | "ACCEPTED" | "DISMISSED";

export type WorkoutSessionState = "IDLE" | "PREPARING" | "ACTIVE" | "PAUSED" | "ENDING" | "COMPLETED" | "DISCARDED" | "FAILED";

export type WorkoutEventType = "SESSION_STARTED" | "SESSION_PAUSED" | "SESSION_RESUMED" | "SET_COMPLETED" | "SET_CORRECTED" | "REST_UPDATED" | "EXERCISE_SUBSTITUTED" | "EXERCISE_SKIPPED" | "SESSION_COMPLETED" | "SESSION_DISCARDED" | "NOTE";

export type CalendarEntryStatus = "SCHEDULED" | "LOCKED" | "CONFLICT" | "MISSED" | "COMPLETED" | "CANCELLED";

export type CalendarConflictKind = "OVERLAP" | "LOCKED_ENTRY" | "STALE_REVISION" | "TIMEZONE_CHANGE" | "UNAVAILABLE_WINDOW";

export type DailyActionDomain = "FOOD" | "NUTRITION" | "TRAINING" | "CALENDAR" | "HEALTH" | "DEVICE" | "PROGRESS" | "SYSTEM";

export type BlockingState = "BLOCKING" | "INTERRUPTIVE" | "NON_BLOCKING";

export type TodaySyncState = "SYNCED" | "PENDING" | "CONFLICT" | "OFFLINE" | "ERROR";

export type SyncOutcome = "ACCEPTED" | "DUPLICATE" | "STALE_REVISION" | "CONCURRENT_EDIT" | "DEPENDENCY_CHANGED" | "AUTHORITY_REVOKED" | "SCHEMA_MISMATCH" | "INVALID_EVENT_ORDER" | "CANONICAL_RECORD_MISSING" | "REJECTED";

export type RetryClass = "COMPLETE" | "RETRYABLE" | "REQUIRES_REFRESH" | "REQUIRES_USER" | "FAILED_FINAL";

export interface RevisionRef {
  readonly entityId: string;
  readonly revision: number;
  readonly schemaVersion: number;
}

export interface ValidityWindow {
  readonly validFrom: string;
  readonly expiresAt: string | null;
}

export interface SetupState {
  readonly schemaVersion: number;
  readonly userId: string;
  readonly status: SetupStatus;
  readonly completedSections: ReadonlyArray<string>;
  readonly missingFields: ReadonlyArray<string>;
  readonly revision: number;
  readonly updatedAt: string;
}

export interface CoreProfile {
  readonly schemaVersion: number;
  readonly userId: string;
  readonly displayName: string;
  readonly dateOfBirth: string;
  readonly countryCode: string;
  readonly locale: string;
  readonly timezone: string;
  readonly unitSystem: string;
  readonly revision: number;
  readonly status: RevisionStatus;
  readonly updatedAt: string;
}

export interface NutritionProfile {
  readonly schemaVersion: number;
  readonly userId: string;
  readonly dietaryPatternCodes: ReadonlyArray<string>;
  readonly allergenCodes: ReadonlyArray<string>;
  readonly religiousRestrictionCodes: ReadonlyArray<string>;
  readonly budgetBand: string | null;
  readonly cookingCapabilityCodes: ReadonlyArray<string>;
  readonly unknownFields: ReadonlyArray<string>;
  readonly revision: number;
  readonly updatedAt: string;
}

export interface TrainingProfile {
  readonly schemaVersion: number;
  readonly userId: string;
  readonly goalCodes: ReadonlyArray<string>;
  readonly experienceBand: string;
  readonly equipmentCodes: ReadonlyArray<string>;
  readonly environmentCodes: ReadonlyArray<string>;
  readonly availabilityMinutesByDay: JsonValue;
  readonly preferenceCodes: ReadonlyArray<string>;
  readonly limitationCodes: ReadonlyArray<string>;
  readonly unknownFields: ReadonlyArray<string>;
  readonly revision: number;
  readonly updatedAt: string;
}

export interface TargetState {
  readonly schemaVersion: number;
  readonly targetStateId: string;
  readonly userId: string;
  readonly revision: number;
  readonly effectiveDate: string;
  readonly source: string;
  readonly manualEntry: boolean;
  readonly eligibilityDecision: EligibilityDecision;
  readonly eligibilityReasonCodes: ReadonlyArray<string>;
  readonly policyVersion: string;
  readonly populationClass: string;
  readonly targetValues: JsonValue;
  readonly createdAt: string;
}

export interface PrivacyProfile {
  readonly schemaVersion: number;
  readonly userId: string;
  readonly retainMealImages: boolean;
  readonly imageRetentionDays: number | null;
  readonly analyticsAllowed: boolean;
  readonly modelImprovementAllowed: boolean;
  readonly revision: number;
  readonly updatedAt: string;
}

export interface AccessibilityProfile {
  readonly schemaVersion: number;
  readonly userId: string;
  readonly reducedMotion: boolean;
  readonly largeText: boolean;
  readonly highContrast: boolean;
  readonly screenReaderOptimized: boolean;
  readonly revision: number;
  readonly updatedAt: string;
}

export interface DeviceProfile {
  readonly schemaVersion: number;
  readonly deviceId: string;
  readonly userId: string;
  readonly platform: SourcePlatform;
  readonly deviceClass: string;
  readonly appVersion: string;
  readonly capabilityCodes: ReadonlyArray<string>;
  readonly authorized: boolean;
  readonly revision: number;
  readonly lastSeenAt: string | null;
}

export interface FoodIdentity {
  readonly schemaVersion: number;
  readonly identityId: string;
  readonly canonicalName: string;
  readonly preparationCode: string | null;
  readonly sourceType: string;
  readonly sourceReference: string | null;
  readonly aliasCodes: ReadonlyArray<string>;
  readonly confidence: DataQuality;
  readonly reasonCodes: ReadonlyArray<string>;
}

export interface PortionEvidence {
  readonly schemaVersion: number;
  readonly evidenceId: string;
  readonly method: string;
  readonly estimatedGrams: number | null;
  readonly minimumGrams: number | null;
  readonly maximumGrams: number | null;
  readonly physicalEvidence: boolean;
  readonly sourceReference: string | null;
  readonly confidence: DataQuality;
  readonly reasonCodes: ReadonlyArray<string>;
}

export interface NutritionSnapshot {
  readonly schemaVersion: number;
  readonly snapshotId: string;
  readonly sourceType: string;
  readonly sourceReference: string | null;
  readonly sourceRevision: string | null;
  readonly portionGrams: number;
  readonly nutrients: JsonValue;
  readonly dataQuality: DataQuality;
  readonly limitations: ReadonlyArray<string>;
  readonly createdAt: string;
}

export interface MealDraft {
  readonly schemaVersion: number;
  readonly draftId: string;
  readonly userId: string;
  readonly localDate: string;
  readonly timezone: string;
  readonly sourceType: string;
  readonly status: MealDraftStatus;
  readonly activeRevision: number;
  readonly foodIdentities: ReadonlyArray<FoodIdentity>;
  readonly portionEvidence: ReadonlyArray<PortionEvidence>;
  readonly nutritionSnapshots: ReadonlyArray<NutritionSnapshot>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ConfirmedMeal {
  readonly schemaVersion: number;
  readonly mealId: string;
  readonly userId: string;
  readonly sourceDraftId: string | null;
  readonly localDate: string;
  readonly timezone: string;
  readonly status: MealStatus;
  readonly currentRevision: number;
  readonly items: ReadonlyArray<JsonValue>;
  readonly totals: JsonValue;
  readonly confirmedAt: string;
  readonly updatedAt: string;
}

export interface CorrectionEvent {
  readonly schemaVersion: number;
  readonly correctionId: string;
  readonly userId: string;
  readonly mealId: string;
  readonly baseRevision: number;
  readonly acceptedRevision: number;
  readonly kind: CorrectionKind;
  readonly reasonCodes: ReadonlyArray<string>;
  readonly payloadHash: string;
  readonly idempotencyKey: string;
  readonly sourceDeviceId: string;
  readonly occurredAt: string;
  readonly acceptedAt: string;
}

export interface NutritionDataQuality {
  readonly schemaVersion: number;
  readonly overall: DataQuality;
  readonly completeness: number;
  readonly freshness: FreshnessState;
  readonly missingCodes: ReadonlyArray<string>;
  readonly limitationCodes: ReadonlyArray<string>;
  readonly sourceRevisionHash: string;
}

export interface NutritionState {
  readonly schemaVersion: number;
  readonly stateId: string;
  readonly userId: string;
  readonly localDate: string;
  readonly targetRevision: number;
  readonly profileRevision: number;
  readonly confirmedMealRevisionHash: string;
  readonly dataQuality: NutritionDataQuality;
  readonly totals: JsonValue;
  readonly revision: number;
  readonly generatedAt: string;
}

export interface RecommendationCandidate {
  readonly schemaVersion: number;
  readonly candidateId: string;
  readonly userId: string;
  readonly recommendationType: string;
  readonly status: RecommendationStatus;
  readonly targetRevision: number;
  readonly profileRevision: number;
  readonly stateRevision: number;
  readonly score: number;
  readonly reasonCodes: ReadonlyArray<string>;
  readonly evidenceRefs: ReadonlyArray<RevisionRef>;
  readonly validity: ValidityWindow;
  readonly policyVersion: string;
  readonly algorithmVersion: string;
}

export interface NutritionRecommendation {
  readonly schemaVersion: number;
  readonly recommendationId: string;
  readonly userId: string;
  readonly revision: number;
  readonly selectedCandidateId: string;
  readonly candidateIds: ReadonlyArray<string>;
  readonly status: RecommendationStatus;
  readonly inputRevisionHash: string;
  readonly reasonCodes: ReadonlyArray<string>;
  readonly validity: ValidityWindow;
  readonly generatedAt: string;
}

export interface TrainingProgramState {
  readonly schemaVersion: number;
  readonly programStateId: string;
  readonly userId: string;
  readonly revision: number;
  readonly phase: string;
  readonly weekIndex: number;
  readonly profileRevision: number;
  readonly historySnapshotHash: string;
  readonly reasonCodes: ReadonlyArray<string>;
  readonly updatedAt: string;
}

export interface SessionRequirement {
  readonly schemaVersion: number;
  readonly requirementId: string;
  readonly semanticSessionId: string;
  readonly movementTargets: JsonValue;
  readonly volumeTargets: JsonValue;
  readonly durationMinutes: number;
  readonly equipmentCodes: ReadonlyArray<string>;
  readonly constraintCodes: ReadonlyArray<string>;
  readonly reasonCodes: ReadonlyArray<string>;
}

export interface TrainingPlanEnvelope {
  readonly schemaVersion: number;
  readonly planId: string;
  readonly planRevision: number;
  readonly programStateRef: string;
  readonly profileRevision: number;
  readonly sessions: ReadonlyArray<JsonValue>;
  readonly exerciseCatalogVersion: string;
  readonly trainingPolicyVersion: string;
  readonly programAlgorithmVersion: string;
  readonly exerciseScoringVersion: string;
  readonly progressionVersion: string;
  readonly algorithmBundleVersion: string;
  readonly generatedAt: string;
  readonly validity: ValidityWindow;
  readonly reasonCodes: ReadonlyArray<string>;
  readonly limitations: ReadonlyArray<string>;
  readonly seed: string | null;
}

export interface WorkoutSessionRevision {
  readonly schemaVersion: number;
  readonly sessionRevisionId: string;
  readonly sessionId: string;
  readonly revision: number;
  readonly baseRevision: number;
  readonly state: WorkoutSessionState;
  readonly authorityDeviceId: string;
  readonly sourceDeviceId: string;
  readonly sourceOperationId: string;
  readonly idempotencyKey: string;
  readonly payloadHash: string;
  readonly reasonCodes: ReadonlyArray<string>;
  readonly occurredAt: string;
  readonly acceptedAt: string;
}

export interface WorkoutEvent {
  readonly schemaVersion: number;
  readonly eventId: string;
  readonly sessionId: string;
  readonly eventSequence: number;
  readonly clientSequence: number | null;
  readonly type: WorkoutEventType;
  readonly exerciseId: string | null;
  readonly correctionOfEventId: string | null;
  readonly payload: JsonValue;
  readonly payloadHash: string;
  readonly sourceDeviceId: string;
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly acceptedAt: string;
}

export interface CalendarEntry {
  readonly schemaVersion: number;
  readonly entryId: string;
  readonly userId: string;
  readonly calendarRevisionId: string;
  readonly calendarRevision: number;
  readonly semanticObjectType: string;
  readonly semanticObjectId: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone: string;
  readonly localDate: string;
  readonly status: CalendarEntryStatus;
  readonly locked: boolean;
  readonly reasonCodes: ReadonlyArray<string>;
}

export interface CalendarRevision {
  readonly schemaVersion: number;
  readonly calendarRevisionId: string;
  readonly userId: string;
  readonly revision: number;
  readonly baseRevision: number;
  readonly entryHash: string;
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly reasonCodes: ReadonlyArray<string>;
  readonly publishedAt: string;
}

export interface MoveCalendarEntryCommand {
  readonly schemaVersion: number;
  readonly entryId: string;
  readonly expectedCalendarRevision: number;
  readonly newStartAt: string;
  readonly newEndAt: string;
  readonly timezone: string;
  readonly reasonCode: string;
  readonly idempotencyKey: string;
}

export interface LockCalendarEntryCommand {
  readonly schemaVersion: number;
  readonly entryId: string;
  readonly expectedCalendarRevision: number;
  readonly locked: boolean;
  readonly idempotencyKey: string;
}

export interface CalendarConflict {
  readonly schemaVersion: number;
  readonly conflictId: string;
  readonly kind: CalendarConflictKind;
  readonly entryIds: ReadonlyArray<string>;
  readonly calendarRevision: number;
  readonly reasonCodes: ReadonlyArray<string>;
  readonly requiresUser: boolean;
}

export interface DailyActionCandidate {
  readonly schemaVersion: number;
  readonly candidateId: string;
  readonly semanticActionKey: string;
  readonly userId: string;
  readonly domain: DailyActionDomain;
  readonly type: string;
  readonly blockingState: BlockingState;
  readonly reasonCodes: ReadonlyArray<string>;
  readonly sourceObjectId: string;
  readonly sourceRevision: string;
  readonly validFrom: string;
  readonly expiresAt: string;
  readonly requiresNetwork: boolean;
  readonly deepLink: JsonValue;
}

export interface DailyDecisionEnvelope {
  readonly schemaVersion: number;
  readonly decisionId: string;
  readonly userId: string;
  readonly localDate: string;
  readonly timezone: string;
  readonly primaryAction: DailyActionCandidate | null;
  readonly secondaryActions: ReadonlyArray<DailyActionCandidate>;
  readonly rejections: ReadonlyArray<JsonValue>;
  readonly inputRevisionHash: string;
  readonly orchestratorPolicyVersion: string;
  readonly rankingVersion: string;
  readonly generatedAt: string;
  readonly expiresAt: string;
}

export interface TodayState {
  readonly schemaVersion: number;
  readonly todayProjectionVersion: string;
  readonly userId: string;
  readonly localDate: string;
  readonly timezone: string;
  readonly primaryAction: DailyActionCandidate | null;
  readonly secondaryActions: ReadonlyArray<DailyActionCandidate>;
  readonly summaries: JsonValue;
  readonly alerts: ReadonlyArray<JsonValue>;
  readonly missingInformation: ReadonlyArray<JsonValue>;
  readonly syncState: TodaySyncState;
  readonly freshness: FreshnessState;
  readonly decisionId: string;
  readonly inputRevisionHash: string;
  readonly generatedAt: string;
  readonly expiresAt: string;
  readonly revision: number;
}

export interface WatchTodayProjection {
  readonly schemaVersion: number;
  readonly watchProjectionVersion: string;
  readonly sourceTodayRevision: number;
  readonly userId: string;
  readonly localDate: string;
  readonly timezone: string;
  readonly primaryAction: DailyActionCandidate | null;
  readonly secondaryAction: DailyActionCandidate | null;
  readonly activeWorkout: JsonValue | null;
  readonly upcomingWorkout: JsonValue | null;
  readonly syncState: TodaySyncState;
  readonly freshness: FreshnessState;
  readonly generatedAt: string;
  readonly expiresAt: string;
}

export interface SyncEnvelope<Payload> {
  readonly schemaVersion: number;
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly payloadHash: string;
  readonly deviceId: string;
  readonly deviceSessionId: string;
  readonly sourcePlatform: SourcePlatform;
  readonly entityType: string;
  readonly entityId: string;
  readonly operation: string;
  readonly expectedEntityRevision: number | null;
  readonly clientSequence: number | null;
  readonly occurredAtUtc: string;
  readonly occurredLocalDate: string;
  readonly timezone: string;
  readonly payload: Payload;
}

export interface SyncReceipt {
  readonly schemaVersion: number;
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly payloadHash: string;
  readonly outcome: SyncOutcome;
  readonly entityType: string;
  readonly entityId: string;
  readonly canonicalRevision: number | null;
  readonly canonicalEventId: string | null;
  readonly canonicalCursor: string | null;
  readonly receivedAtUtc: string;
  readonly retryClass: RetryClass;
  readonly errorCode: string | null;
}

