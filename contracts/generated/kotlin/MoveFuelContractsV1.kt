// Generated from contracts/canonical/v1/contracts.json. Do not edit.
// schemaVersion=1

package com.movefuel.contracts.v1

typealias JsonValue = Any?

enum class SetupStatus { NOT_STARTED, IN_PROGRESS, COMPLETE, BLOCKED }

enum class EligibilityDecision { ELIGIBLE, INELIGIBLE, REQUIRES_REVIEW, UNKNOWN }

enum class DataQuality { HIGH, MEDIUM, LOW, UNKNOWN }

enum class FreshnessState { FRESH, STALE, PARTIAL, UNKNOWN, OFFLINE_CACHED }

enum class SourcePlatform { ANDROID, WEAR_OS, IOS, WATCH_OS }

enum class RevisionStatus { ACTIVE, SUPERSEDED, DELETED }

enum class MealDraftStatus { DRAFT, ANALYZING, NEEDS_REVIEW, CONFIRMED, CANCELLED }

enum class MealStatus { CONFIRMED, DELETED }

enum class CorrectionKind { IDENTITY, PORTION, NUTRITION, PREPARATION, DELETE, RESTORE }

enum class RecommendationStatus { ELIGIBLE, BLOCKED, EXPIRED, ACCEPTED, DISMISSED }

enum class WorkoutSessionState { IDLE, PREPARING, ACTIVE, PAUSED, ENDING, COMPLETED, DISCARDED, FAILED }

enum class WorkoutEventType { SESSION_STARTED, SESSION_PAUSED, SESSION_RESUMED, SET_COMPLETED, SET_CORRECTED, REST_UPDATED, EXERCISE_SUBSTITUTED, EXERCISE_SKIPPED, SESSION_COMPLETED, SESSION_DISCARDED, NOTE }

enum class CalendarEntryStatus { SCHEDULED, LOCKED, CONFLICT, MISSED, COMPLETED, CANCELLED }

enum class CalendarConflictKind { OVERLAP, LOCKED_ENTRY, STALE_REVISION, TIMEZONE_CHANGE, UNAVAILABLE_WINDOW }

enum class DailyActionDomain { FOOD, NUTRITION, TRAINING, CALENDAR, HEALTH, DEVICE, PROGRESS, SYSTEM }

enum class BlockingState { BLOCKING, INTERRUPTIVE, NON_BLOCKING }

enum class TodaySyncState { SYNCED, PENDING, CONFLICT, OFFLINE, ERROR }

enum class SyncOutcome { ACCEPTED, DUPLICATE, STALE_REVISION, CONCURRENT_EDIT, DEPENDENCY_CHANGED, AUTHORITY_REVOKED, SCHEMA_MISMATCH, INVALID_EVENT_ORDER, CANONICAL_RECORD_MISSING, REJECTED }

enum class RetryClass { COMPLETE, RETRYABLE, REQUIRES_REFRESH, REQUIRES_USER, FAILED_FINAL }

data class RevisionRef(
  val entityId: String,
  val revision: Long,
  val schemaVersion: Long
)

data class ValidityWindow(
  val validFrom: String,
  val expiresAt: String?
)

data class SetupState(
  val schemaVersion: Long,
  val userId: String,
  val status: SetupStatus,
  val completedSections: List<String>,
  val missingFields: List<String>,
  val revision: Long,
  val updatedAt: String
)

data class CoreProfile(
  val schemaVersion: Long,
  val userId: String,
  val displayName: String,
  val dateOfBirth: String,
  val countryCode: String,
  val locale: String,
  val timezone: String,
  val unitSystem: String,
  val revision: Long,
  val status: RevisionStatus,
  val updatedAt: String
)

data class NutritionProfile(
  val schemaVersion: Long,
  val userId: String,
  val dietaryPatternCodes: List<String>,
  val allergenCodes: List<String>,
  val religiousRestrictionCodes: List<String>,
  val budgetBand: String?,
  val cookingCapabilityCodes: List<String>,
  val unknownFields: List<String>,
  val revision: Long,
  val updatedAt: String
)

data class TrainingProfile(
  val schemaVersion: Long,
  val userId: String,
  val goalCodes: List<String>,
  val experienceBand: String,
  val equipmentCodes: List<String>,
  val environmentCodes: List<String>,
  val availabilityMinutesByDay: JsonValue,
  val preferenceCodes: List<String>,
  val limitationCodes: List<String>,
  val unknownFields: List<String>,
  val revision: Long,
  val updatedAt: String
)

data class TargetState(
  val schemaVersion: Long,
  val targetStateId: String,
  val userId: String,
  val revision: Long,
  val effectiveDate: String,
  val source: String,
  val manualEntry: Boolean,
  val eligibilityDecision: EligibilityDecision,
  val eligibilityReasonCodes: List<String>,
  val policyVersion: String,
  val populationClass: String,
  val targetValues: JsonValue,
  val createdAt: String
)

data class PrivacyProfile(
  val schemaVersion: Long,
  val userId: String,
  val retainMealImages: Boolean,
  val imageRetentionDays: Long?,
  val analyticsAllowed: Boolean,
  val modelImprovementAllowed: Boolean,
  val revision: Long,
  val updatedAt: String
)

data class AccessibilityProfile(
  val schemaVersion: Long,
  val userId: String,
  val reducedMotion: Boolean,
  val largeText: Boolean,
  val highContrast: Boolean,
  val screenReaderOptimized: Boolean,
  val revision: Long,
  val updatedAt: String
)

data class DeviceProfile(
  val schemaVersion: Long,
  val deviceId: String,
  val userId: String,
  val platform: SourcePlatform,
  val deviceClass: String,
  val appVersion: String,
  val capabilityCodes: List<String>,
  val authorized: Boolean,
  val revision: Long,
  val lastSeenAt: String?
)

data class FoodIdentity(
  val schemaVersion: Long,
  val identityId: String,
  val canonicalName: String,
  val preparationCode: String?,
  val sourceType: String,
  val sourceReference: String?,
  val aliasCodes: List<String>,
  val confidence: DataQuality,
  val reasonCodes: List<String>
)

data class PortionEvidence(
  val schemaVersion: Long,
  val evidenceId: String,
  val method: String,
  val estimatedGrams: Double?,
  val minimumGrams: Double?,
  val maximumGrams: Double?,
  val physicalEvidence: Boolean,
  val sourceReference: String?,
  val confidence: DataQuality,
  val reasonCodes: List<String>
)

data class NutritionSnapshot(
  val schemaVersion: Long,
  val snapshotId: String,
  val sourceType: String,
  val sourceReference: String?,
  val sourceRevision: String?,
  val portionGrams: Double,
  val nutrients: JsonValue,
  val dataQuality: DataQuality,
  val limitations: List<String>,
  val createdAt: String
)

data class MealDraft(
  val schemaVersion: Long,
  val draftId: String,
  val userId: String,
  val localDate: String,
  val timezone: String,
  val sourceType: String,
  val status: MealDraftStatus,
  val activeRevision: Long,
  val foodIdentities: List<FoodIdentity>,
  val portionEvidence: List<PortionEvidence>,
  val nutritionSnapshots: List<NutritionSnapshot>,
  val createdAt: String,
  val updatedAt: String
)

data class ConfirmedMeal(
  val schemaVersion: Long,
  val mealId: String,
  val userId: String,
  val sourceDraftId: String?,
  val localDate: String,
  val timezone: String,
  val status: MealStatus,
  val currentRevision: Long,
  val items: List<JsonValue>,
  val totals: JsonValue,
  val confirmedAt: String,
  val updatedAt: String
)

data class CorrectionEvent(
  val schemaVersion: Long,
  val correctionId: String,
  val userId: String,
  val mealId: String,
  val baseRevision: Long,
  val acceptedRevision: Long,
  val kind: CorrectionKind,
  val reasonCodes: List<String>,
  val payloadHash: String,
  val idempotencyKey: String,
  val sourceDeviceId: String,
  val occurredAt: String,
  val acceptedAt: String
)

data class NutritionDataQuality(
  val schemaVersion: Long,
  val overall: DataQuality,
  val completeness: Double,
  val freshness: FreshnessState,
  val missingCodes: List<String>,
  val limitationCodes: List<String>,
  val sourceRevisionHash: String
)

data class NutritionState(
  val schemaVersion: Long,
  val stateId: String,
  val userId: String,
  val localDate: String,
  val targetRevision: Long,
  val profileRevision: Long,
  val confirmedMealRevisionHash: String,
  val dataQuality: NutritionDataQuality,
  val totals: JsonValue,
  val revision: Long,
  val generatedAt: String
)

data class RecommendationCandidate(
  val schemaVersion: Long,
  val candidateId: String,
  val userId: String,
  val recommendationType: String,
  val status: RecommendationStatus,
  val targetRevision: Long,
  val profileRevision: Long,
  val stateRevision: Long,
  val score: Double,
  val reasonCodes: List<String>,
  val evidenceRefs: List<RevisionRef>,
  val validity: ValidityWindow,
  val policyVersion: String,
  val algorithmVersion: String
)

data class NutritionRecommendation(
  val schemaVersion: Long,
  val recommendationId: String,
  val userId: String,
  val revision: Long,
  val selectedCandidateId: String,
  val candidateIds: List<String>,
  val status: RecommendationStatus,
  val inputRevisionHash: String,
  val reasonCodes: List<String>,
  val validity: ValidityWindow,
  val generatedAt: String
)

data class TrainingProgramState(
  val schemaVersion: Long,
  val programStateId: String,
  val userId: String,
  val revision: Long,
  val phase: String,
  val weekIndex: Long,
  val profileRevision: Long,
  val historySnapshotHash: String,
  val reasonCodes: List<String>,
  val updatedAt: String
)

data class SessionRequirement(
  val schemaVersion: Long,
  val requirementId: String,
  val semanticSessionId: String,
  val movementTargets: JsonValue,
  val volumeTargets: JsonValue,
  val durationMinutes: Long,
  val equipmentCodes: List<String>,
  val constraintCodes: List<String>,
  val reasonCodes: List<String>
)

data class TrainingPlanEnvelope(
  val schemaVersion: Long,
  val planId: String,
  val planRevision: Long,
  val programStateRef: String,
  val profileRevision: Long,
  val sessions: List<JsonValue>,
  val exerciseCatalogVersion: String,
  val trainingPolicyVersion: String,
  val programAlgorithmVersion: String,
  val exerciseScoringVersion: String,
  val progressionVersion: String,
  val algorithmBundleVersion: String,
  val generatedAt: String,
  val validity: ValidityWindow,
  val reasonCodes: List<String>,
  val limitations: List<String>,
  val seed: String?
)

data class WorkoutSessionRevision(
  val schemaVersion: Long,
  val sessionRevisionId: String,
  val sessionId: String,
  val revision: Long,
  val baseRevision: Long,
  val state: WorkoutSessionState,
  val authorityDeviceId: String,
  val sourceDeviceId: String,
  val sourceOperationId: String,
  val idempotencyKey: String,
  val payloadHash: String,
  val reasonCodes: List<String>,
  val occurredAt: String,
  val acceptedAt: String
)

data class WorkoutEvent(
  val schemaVersion: Long,
  val eventId: String,
  val sessionId: String,
  val eventSequence: Long,
  val clientSequence: Long?,
  val type: WorkoutEventType,
  val exerciseId: String?,
  val correctionOfEventId: String?,
  val payload: JsonValue,
  val payloadHash: String,
  val sourceDeviceId: String,
  val idempotencyKey: String,
  val occurredAt: String,
  val acceptedAt: String
)

data class CalendarEntry(
  val schemaVersion: Long,
  val entryId: String,
  val userId: String,
  val calendarRevisionId: String,
  val calendarRevision: Long,
  val semanticObjectType: String,
  val semanticObjectId: String,
  val startAt: String,
  val endAt: String,
  val timezone: String,
  val localDate: String,
  val status: CalendarEntryStatus,
  val locked: Boolean,
  val reasonCodes: List<String>
)

data class CalendarRevision(
  val schemaVersion: Long,
  val calendarRevisionId: String,
  val userId: String,
  val revision: Long,
  val baseRevision: Long,
  val entryHash: String,
  val operationId: String,
  val idempotencyKey: String,
  val reasonCodes: List<String>,
  val publishedAt: String
)

data class MoveCalendarEntryCommand(
  val schemaVersion: Long,
  val entryId: String,
  val expectedCalendarRevision: Long,
  val newStartAt: String,
  val newEndAt: String,
  val timezone: String,
  val reasonCode: String,
  val idempotencyKey: String
)

data class LockCalendarEntryCommand(
  val schemaVersion: Long,
  val entryId: String,
  val expectedCalendarRevision: Long,
  val locked: Boolean,
  val idempotencyKey: String
)

data class CalendarConflict(
  val schemaVersion: Long,
  val conflictId: String,
  val kind: CalendarConflictKind,
  val entryIds: List<String>,
  val calendarRevision: Long,
  val reasonCodes: List<String>,
  val requiresUser: Boolean
)

data class DailyActionCandidate(
  val schemaVersion: Long,
  val candidateId: String,
  val semanticActionKey: String,
  val userId: String,
  val domain: DailyActionDomain,
  val type: String,
  val blockingState: BlockingState,
  val reasonCodes: List<String>,
  val sourceObjectId: String,
  val sourceRevision: String,
  val validFrom: String,
  val expiresAt: String,
  val requiresNetwork: Boolean,
  val deepLink: JsonValue
)

data class DailyDecisionEnvelope(
  val schemaVersion: Long,
  val decisionId: String,
  val userId: String,
  val localDate: String,
  val timezone: String,
  val primaryAction: DailyActionCandidate?,
  val secondaryActions: List<DailyActionCandidate>,
  val rejections: List<JsonValue>,
  val inputRevisionHash: String,
  val orchestratorPolicyVersion: String,
  val rankingVersion: String,
  val generatedAt: String,
  val expiresAt: String
)

data class TodayState(
  val schemaVersion: Long,
  val todayProjectionVersion: String,
  val userId: String,
  val localDate: String,
  val timezone: String,
  val primaryAction: DailyActionCandidate?,
  val secondaryActions: List<DailyActionCandidate>,
  val summaries: JsonValue,
  val alerts: List<JsonValue>,
  val missingInformation: List<JsonValue>,
  val syncState: TodaySyncState,
  val freshness: FreshnessState,
  val decisionId: String,
  val inputRevisionHash: String,
  val generatedAt: String,
  val expiresAt: String,
  val revision: Long
)

data class WatchTodayProjection(
  val schemaVersion: Long,
  val watchProjectionVersion: String,
  val sourceTodayRevision: Long,
  val userId: String,
  val localDate: String,
  val timezone: String,
  val primaryAction: DailyActionCandidate?,
  val secondaryAction: DailyActionCandidate?,
  val activeWorkout: JsonValue?,
  val upcomingWorkout: JsonValue?,
  val syncState: TodaySyncState,
  val freshness: FreshnessState,
  val generatedAt: String,
  val expiresAt: String
)

data class SyncEnvelope<Payload>(
  val schemaVersion: Long,
  val operationId: String,
  val idempotencyKey: String,
  val payloadHash: String,
  val deviceId: String,
  val deviceSessionId: String,
  val sourcePlatform: SourcePlatform,
  val entityType: String,
  val entityId: String,
  val operation: String,
  val expectedEntityRevision: Long?,
  val clientSequence: Long?,
  val occurredAtUtc: String,
  val occurredLocalDate: String,
  val timezone: String,
  val payload: Payload
)

data class SyncReceipt(
  val schemaVersion: Long,
  val operationId: String,
  val idempotencyKey: String,
  val payloadHash: String,
  val outcome: SyncOutcome,
  val entityType: String,
  val entityId: String,
  val canonicalRevision: Long?,
  val canonicalEventId: String?,
  val canonicalCursor: String?,
  val receivedAtUtc: String,
  val retryClass: RetryClass,
  val errorCode: String?
)

