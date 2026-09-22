// Generated from contracts/canonical/v1/contracts.json. Do not edit.
// schemaVersion=1

import Foundation

public indirect enum JSONValue: Codable, Sendable { case null, bool(Bool), number(Double), string(String), array([JSONValue]), object([String: JSONValue]) }

public enum SetupStatus: String, Codable, Sendable {
  case not_started = "NOT_STARTED"
  case in_progress = "IN_PROGRESS"
  case complete = "COMPLETE"
  case blocked = "BLOCKED"
}

public enum EligibilityDecision: String, Codable, Sendable {
  case eligible = "ELIGIBLE"
  case ineligible = "INELIGIBLE"
  case requires_review = "REQUIRES_REVIEW"
  case unknown = "UNKNOWN"
}

public enum DataQuality: String, Codable, Sendable {
  case high = "HIGH"
  case medium = "MEDIUM"
  case low = "LOW"
  case unknown = "UNKNOWN"
}

public enum FreshnessState: String, Codable, Sendable {
  case fresh = "FRESH"
  case stale = "STALE"
  case partial = "PARTIAL"
  case unknown = "UNKNOWN"
  case offline_cached = "OFFLINE_CACHED"
}

public enum SourcePlatform: String, Codable, Sendable {
  case android = "ANDROID"
  case wear_os = "WEAR_OS"
  case ios = "IOS"
  case watch_os = "WATCH_OS"
}

public enum RevisionStatus: String, Codable, Sendable {
  case active = "ACTIVE"
  case superseded = "SUPERSEDED"
  case deleted = "DELETED"
}

public enum MealDraftStatus: String, Codable, Sendable {
  case draft = "DRAFT"
  case analyzing = "ANALYZING"
  case needs_review = "NEEDS_REVIEW"
  case confirmed = "CONFIRMED"
  case cancelled = "CANCELLED"
}

public enum MealStatus: String, Codable, Sendable {
  case confirmed = "CONFIRMED"
  case deleted = "DELETED"
}

public enum CorrectionKind: String, Codable, Sendable {
  case identity = "IDENTITY"
  case portion = "PORTION"
  case nutrition = "NUTRITION"
  case preparation = "PREPARATION"
  case delete = "DELETE"
  case restore = "RESTORE"
}

public enum RecommendationStatus: String, Codable, Sendable {
  case eligible = "ELIGIBLE"
  case blocked = "BLOCKED"
  case expired = "EXPIRED"
  case accepted = "ACCEPTED"
  case dismissed = "DISMISSED"
}

public enum WorkoutSessionState: String, Codable, Sendable {
  case idle = "IDLE"
  case preparing = "PREPARING"
  case active = "ACTIVE"
  case paused = "PAUSED"
  case ending = "ENDING"
  case completed = "COMPLETED"
  case discarded = "DISCARDED"
  case failed = "FAILED"
}

public enum WorkoutEventType: String, Codable, Sendable {
  case session_started = "SESSION_STARTED"
  case session_paused = "SESSION_PAUSED"
  case session_resumed = "SESSION_RESUMED"
  case set_completed = "SET_COMPLETED"
  case set_corrected = "SET_CORRECTED"
  case rest_updated = "REST_UPDATED"
  case exercise_substituted = "EXERCISE_SUBSTITUTED"
  case exercise_skipped = "EXERCISE_SKIPPED"
  case session_completed = "SESSION_COMPLETED"
  case session_discarded = "SESSION_DISCARDED"
  case note = "NOTE"
}

public enum CalendarEntryStatus: String, Codable, Sendable {
  case scheduled = "SCHEDULED"
  case locked = "LOCKED"
  case conflict = "CONFLICT"
  case missed = "MISSED"
  case completed = "COMPLETED"
  case cancelled = "CANCELLED"
}

public enum CalendarConflictKind: String, Codable, Sendable {
  case overlap = "OVERLAP"
  case locked_entry = "LOCKED_ENTRY"
  case stale_revision = "STALE_REVISION"
  case timezone_change = "TIMEZONE_CHANGE"
  case unavailable_window = "UNAVAILABLE_WINDOW"
}

public enum DailyActionDomain: String, Codable, Sendable {
  case food = "FOOD"
  case nutrition = "NUTRITION"
  case training = "TRAINING"
  case calendar = "CALENDAR"
  case health = "HEALTH"
  case device = "DEVICE"
  case progress = "PROGRESS"
  case system = "SYSTEM"
}

public enum BlockingState: String, Codable, Sendable {
  case blocking = "BLOCKING"
  case interruptive = "INTERRUPTIVE"
  case non_blocking = "NON_BLOCKING"
}

public enum TodaySyncState: String, Codable, Sendable {
  case synced = "SYNCED"
  case pending = "PENDING"
  case conflict = "CONFLICT"
  case offline = "OFFLINE"
  case error = "ERROR"
}

public enum SyncOutcome: String, Codable, Sendable {
  case accepted = "ACCEPTED"
  case duplicate = "DUPLICATE"
  case stale_revision = "STALE_REVISION"
  case concurrent_edit = "CONCURRENT_EDIT"
  case dependency_changed = "DEPENDENCY_CHANGED"
  case authority_revoked = "AUTHORITY_REVOKED"
  case schema_mismatch = "SCHEMA_MISMATCH"
  case invalid_event_order = "INVALID_EVENT_ORDER"
  case canonical_record_missing = "CANONICAL_RECORD_MISSING"
  case rejected = "REJECTED"
}

public enum RetryClass: String, Codable, Sendable {
  case complete = "COMPLETE"
  case retryable = "RETRYABLE"
  case requires_refresh = "REQUIRES_REFRESH"
  case requires_user = "REQUIRES_USER"
  case failed_final = "FAILED_FINAL"
}

public struct RevisionRef: Codable, Sendable {
  public let entityId: String
  public let revision: Int
  public let schemaVersion: Int
}

public struct ValidityWindow: Codable, Sendable {
  public let validFrom: String
  public let expiresAt: String?
}

public struct SetupState: Codable, Sendable {
  public let schemaVersion: Int
  public let userId: String
  public let status: SetupStatus
  public let completedSections: [String]
  public let missingFields: [String]
  public let revision: Int
  public let updatedAt: String
}

public struct CoreProfile: Codable, Sendable {
  public let schemaVersion: Int
  public let userId: String
  public let displayName: String
  public let dateOfBirth: String
  public let countryCode: String
  public let locale: String
  public let timezone: String
  public let unitSystem: String
  public let revision: Int
  public let status: RevisionStatus
  public let updatedAt: String
}

public struct NutritionProfile: Codable, Sendable {
  public let schemaVersion: Int
  public let userId: String
  public let dietaryPatternCodes: [String]
  public let allergenCodes: [String]
  public let religiousRestrictionCodes: [String]
  public let budgetBand: String?
  public let cookingCapabilityCodes: [String]
  public let unknownFields: [String]
  public let revision: Int
  public let updatedAt: String
}

public struct TrainingProfile: Codable, Sendable {
  public let schemaVersion: Int
  public let userId: String
  public let goalCodes: [String]
  public let experienceBand: String
  public let equipmentCodes: [String]
  public let environmentCodes: [String]
  public let availabilityMinutesByDay: JSONValue
  public let preferenceCodes: [String]
  public let limitationCodes: [String]
  public let unknownFields: [String]
  public let revision: Int
  public let updatedAt: String
}

public struct TargetState: Codable, Sendable {
  public let schemaVersion: Int
  public let targetStateId: String
  public let userId: String
  public let revision: Int
  public let effectiveDate: String
  public let source: String
  public let manualEntry: Bool
  public let eligibilityDecision: EligibilityDecision
  public let eligibilityReasonCodes: [String]
  public let policyVersion: String
  public let populationClass: String
  public let targetValues: JSONValue
  public let createdAt: String
}

public struct PrivacyProfile: Codable, Sendable {
  public let schemaVersion: Int
  public let userId: String
  public let retainMealImages: Bool
  public let imageRetentionDays: Int?
  public let analyticsAllowed: Bool
  public let modelImprovementAllowed: Bool
  public let revision: Int
  public let updatedAt: String
}

public struct AccessibilityProfile: Codable, Sendable {
  public let schemaVersion: Int
  public let userId: String
  public let reducedMotion: Bool
  public let largeText: Bool
  public let highContrast: Bool
  public let screenReaderOptimized: Bool
  public let revision: Int
  public let updatedAt: String
}

public struct DeviceProfile: Codable, Sendable {
  public let schemaVersion: Int
  public let deviceId: String
  public let userId: String
  public let platform: SourcePlatform
  public let deviceClass: String
  public let appVersion: String
  public let capabilityCodes: [String]
  public let authorized: Bool
  public let revision: Int
  public let lastSeenAt: String?
}

public struct FoodIdentity: Codable, Sendable {
  public let schemaVersion: Int
  public let identityId: String
  public let canonicalName: String
  public let preparationCode: String?
  public let sourceType: String
  public let sourceReference: String?
  public let aliasCodes: [String]
  public let confidence: DataQuality
  public let reasonCodes: [String]
}

public struct PortionEvidence: Codable, Sendable {
  public let schemaVersion: Int
  public let evidenceId: String
  public let method: String
  public let estimatedGrams: Double?
  public let minimumGrams: Double?
  public let maximumGrams: Double?
  public let physicalEvidence: Bool
  public let sourceReference: String?
  public let confidence: DataQuality
  public let reasonCodes: [String]
}

public struct NutritionSnapshot: Codable, Sendable {
  public let schemaVersion: Int
  public let snapshotId: String
  public let sourceType: String
  public let sourceReference: String?
  public let sourceRevision: String?
  public let portionGrams: Double
  public let nutrients: JSONValue
  public let dataQuality: DataQuality
  public let limitations: [String]
  public let createdAt: String
}

public struct MealDraft: Codable, Sendable {
  public let schemaVersion: Int
  public let draftId: String
  public let userId: String
  public let localDate: String
  public let timezone: String
  public let sourceType: String
  public let status: MealDraftStatus
  public let activeRevision: Int
  public let foodIdentities: [FoodIdentity]
  public let portionEvidence: [PortionEvidence]
  public let nutritionSnapshots: [NutritionSnapshot]
  public let createdAt: String
  public let updatedAt: String
}

public struct ConfirmedMeal: Codable, Sendable {
  public let schemaVersion: Int
  public let mealId: String
  public let userId: String
  public let sourceDraftId: String?
  public let localDate: String
  public let timezone: String
  public let status: MealStatus
  public let currentRevision: Int
  public let items: [JSONValue]
  public let totals: JSONValue
  public let confirmedAt: String
  public let updatedAt: String
}

public struct CorrectionEvent: Codable, Sendable {
  public let schemaVersion: Int
  public let correctionId: String
  public let userId: String
  public let mealId: String
  public let baseRevision: Int
  public let acceptedRevision: Int
  public let kind: CorrectionKind
  public let reasonCodes: [String]
  public let payloadHash: String
  public let idempotencyKey: String
  public let sourceDeviceId: String
  public let occurredAt: String
  public let acceptedAt: String
}

public struct NutritionDataQuality: Codable, Sendable {
  public let schemaVersion: Int
  public let overall: DataQuality
  public let completeness: Double
  public let freshness: FreshnessState
  public let missingCodes: [String]
  public let limitationCodes: [String]
  public let sourceRevisionHash: String
}

public struct NutritionState: Codable, Sendable {
  public let schemaVersion: Int
  public let stateId: String
  public let userId: String
  public let localDate: String
  public let targetRevision: Int
  public let profileRevision: Int
  public let confirmedMealRevisionHash: String
  public let dataQuality: NutritionDataQuality
  public let totals: JSONValue
  public let revision: Int
  public let generatedAt: String
}

public struct RecommendationCandidate: Codable, Sendable {
  public let schemaVersion: Int
  public let candidateId: String
  public let userId: String
  public let recommendationType: String
  public let status: RecommendationStatus
  public let targetRevision: Int
  public let profileRevision: Int
  public let stateRevision: Int
  public let score: Double
  public let reasonCodes: [String]
  public let evidenceRefs: [RevisionRef]
  public let validity: ValidityWindow
  public let policyVersion: String
  public let algorithmVersion: String
}

public struct NutritionRecommendation: Codable, Sendable {
  public let schemaVersion: Int
  public let recommendationId: String
  public let userId: String
  public let revision: Int
  public let selectedCandidateId: String
  public let candidateIds: [String]
  public let status: RecommendationStatus
  public let inputRevisionHash: String
  public let reasonCodes: [String]
  public let validity: ValidityWindow
  public let generatedAt: String
}

public struct TrainingProgramState: Codable, Sendable {
  public let schemaVersion: Int
  public let programStateId: String
  public let userId: String
  public let revision: Int
  public let phase: String
  public let weekIndex: Int
  public let profileRevision: Int
  public let historySnapshotHash: String
  public let reasonCodes: [String]
  public let updatedAt: String
}

public struct SessionRequirement: Codable, Sendable {
  public let schemaVersion: Int
  public let requirementId: String
  public let semanticSessionId: String
  public let movementTargets: JSONValue
  public let volumeTargets: JSONValue
  public let durationMinutes: Int
  public let equipmentCodes: [String]
  public let constraintCodes: [String]
  public let reasonCodes: [String]
}

public struct TrainingPlanEnvelope: Codable, Sendable {
  public let schemaVersion: Int
  public let planId: String
  public let planRevision: Int
  public let programStateRef: String
  public let profileRevision: Int
  public let sessions: [JSONValue]
  public let exerciseCatalogVersion: String
  public let trainingPolicyVersion: String
  public let programAlgorithmVersion: String
  public let exerciseScoringVersion: String
  public let progressionVersion: String
  public let algorithmBundleVersion: String
  public let generatedAt: String
  public let validity: ValidityWindow
  public let reasonCodes: [String]
  public let limitations: [String]
  public let seed: String?
}

public struct WorkoutSessionRevision: Codable, Sendable {
  public let schemaVersion: Int
  public let sessionRevisionId: String
  public let sessionId: String
  public let revision: Int
  public let baseRevision: Int
  public let state: WorkoutSessionState
  public let authorityDeviceId: String
  public let sourceDeviceId: String
  public let sourceOperationId: String
  public let idempotencyKey: String
  public let payloadHash: String
  public let reasonCodes: [String]
  public let occurredAt: String
  public let acceptedAt: String
}

public struct WorkoutEvent: Codable, Sendable {
  public let schemaVersion: Int
  public let eventId: String
  public let sessionId: String
  public let eventSequence: Int
  public let clientSequence: Int?
  public let type: WorkoutEventType
  public let exerciseId: String?
  public let correctionOfEventId: String?
  public let payload: JSONValue
  public let payloadHash: String
  public let sourceDeviceId: String
  public let idempotencyKey: String
  public let occurredAt: String
  public let acceptedAt: String
}

public struct CalendarEntry: Codable, Sendable {
  public let schemaVersion: Int
  public let entryId: String
  public let userId: String
  public let calendarRevisionId: String
  public let calendarRevision: Int
  public let semanticObjectType: String
  public let semanticObjectId: String
  public let startAt: String
  public let endAt: String
  public let timezone: String
  public let localDate: String
  public let status: CalendarEntryStatus
  public let locked: Bool
  public let reasonCodes: [String]
}

public struct CalendarRevision: Codable, Sendable {
  public let schemaVersion: Int
  public let calendarRevisionId: String
  public let userId: String
  public let revision: Int
  public let baseRevision: Int
  public let entryHash: String
  public let operationId: String
  public let idempotencyKey: String
  public let reasonCodes: [String]
  public let publishedAt: String
}

public struct MoveCalendarEntryCommand: Codable, Sendable {
  public let schemaVersion: Int
  public let entryId: String
  public let expectedCalendarRevision: Int
  public let newStartAt: String
  public let newEndAt: String
  public let timezone: String
  public let reasonCode: String
  public let idempotencyKey: String
}

public struct LockCalendarEntryCommand: Codable, Sendable {
  public let schemaVersion: Int
  public let entryId: String
  public let expectedCalendarRevision: Int
  public let locked: Bool
  public let idempotencyKey: String
}

public struct CalendarConflict: Codable, Sendable {
  public let schemaVersion: Int
  public let conflictId: String
  public let kind: CalendarConflictKind
  public let entryIds: [String]
  public let calendarRevision: Int
  public let reasonCodes: [String]
  public let requiresUser: Bool
}

public struct DailyActionCandidate: Codable, Sendable {
  public let schemaVersion: Int
  public let candidateId: String
  public let semanticActionKey: String
  public let userId: String
  public let domain: DailyActionDomain
  public let type: String
  public let blockingState: BlockingState
  public let reasonCodes: [String]
  public let sourceObjectId: String
  public let sourceRevision: String
  public let validFrom: String
  public let expiresAt: String
  public let requiresNetwork: Bool
  public let deepLink: JSONValue
}

public struct DailyDecisionEnvelope: Codable, Sendable {
  public let schemaVersion: Int
  public let decisionId: String
  public let userId: String
  public let localDate: String
  public let timezone: String
  public let primaryAction: DailyActionCandidate?
  public let secondaryActions: [DailyActionCandidate]
  public let rejections: [JSONValue]
  public let inputRevisionHash: String
  public let orchestratorPolicyVersion: String
  public let rankingVersion: String
  public let generatedAt: String
  public let expiresAt: String
}

public struct TodayState: Codable, Sendable {
  public let schemaVersion: Int
  public let todayProjectionVersion: String
  public let userId: String
  public let localDate: String
  public let timezone: String
  public let primaryAction: DailyActionCandidate?
  public let secondaryActions: [DailyActionCandidate]
  public let summaries: JSONValue
  public let alerts: [JSONValue]
  public let missingInformation: [JSONValue]
  public let syncState: TodaySyncState
  public let freshness: FreshnessState
  public let decisionId: String
  public let inputRevisionHash: String
  public let generatedAt: String
  public let expiresAt: String
  public let revision: Int
}

public struct WatchTodayProjection: Codable, Sendable {
  public let schemaVersion: Int
  public let watchProjectionVersion: String
  public let sourceTodayRevision: Int
  public let userId: String
  public let localDate: String
  public let timezone: String
  public let primaryAction: DailyActionCandidate?
  public let secondaryAction: DailyActionCandidate?
  public let activeWorkout: JSONValue?
  public let upcomingWorkout: JSONValue?
  public let syncState: TodaySyncState
  public let freshness: FreshnessState
  public let generatedAt: String
  public let expiresAt: String
}

public struct SyncEnvelope<Payload: Codable & Sendable>: Codable, Sendable {
  public let schemaVersion: Int
  public let operationId: String
  public let idempotencyKey: String
  public let payloadHash: String
  public let deviceId: String
  public let deviceSessionId: String
  public let sourcePlatform: SourcePlatform
  public let entityType: String
  public let entityId: String
  public let operation: String
  public let expectedEntityRevision: Int?
  public let clientSequence: Int?
  public let occurredAtUtc: String
  public let occurredLocalDate: String
  public let timezone: String
  public let payload: Payload
}

public struct SyncReceipt: Codable, Sendable {
  public let schemaVersion: Int
  public let operationId: String
  public let idempotencyKey: String
  public let payloadHash: String
  public let outcome: SyncOutcome
  public let entityType: String
  public let entityId: String
  public let canonicalRevision: Int?
  public let canonicalEventId: String?
  public let canonicalCursor: String?
  public let receivedAtUtc: String
  public let retryClass: RetryClass
  public let errorCode: String?
}

