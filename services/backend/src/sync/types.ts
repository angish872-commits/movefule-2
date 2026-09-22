import type {
  DailyRingSummary,
  LegacySummarySyncOperation,
  WorkoutState,
} from "../shared/contracts.ts";

export type LegacySummarySyncOperationWithPayload = LegacySummarySyncOperation & {
  payload: DailyRingSummary;
};

export type LegacySummaryProductPushBatch = {
  schemaVersion: number;
  deviceId: string;
  operations: LegacySummarySyncOperationWithPayload[];
};

export type LegacySummaryProductPullItem = {
  cursor: number;
  operationId: string;
  summary: DailyRingSummary;
};

export type LegacySummaryProductPullPage = {
  schemaVersion: number;
  nextCursor: number;
  summaries: LegacySummaryProductPullItem[];
};

/** Canonical watch delivery contract used by server-owned reconciliation. */
export type WatchDeliveryState = "PENDING" | "IN_FLIGHT" | "ACKNOWLEDGED" | "FAILED";

export type WatchDeliveryRequest = {
  idempotencyKey: string;
  phoneDeviceId: string;
  watchDeviceId: string;
  payloadType: "DAILY_SUMMARY" | "WORKOUT_PLAN" | "COMMAND";
  payloadId: string;
  payloadRevision: number;
  payloadHash: string;
  payload: Record<string, unknown>;
  expiresAtEpochMillis: number;
};

export type WatchDelivery = Omit<WatchDeliveryRequest, "payload"> & {
  deliveryId: string;
  state: WatchDeliveryState;
  attemptCount: number;
  createdAtEpochMillis: number;
  updatedAtEpochMillis: number;
  lastAttemptAtEpochMillis?: number;
};

export type WatchReceiptResult = "PERSISTED" | "REJECTED";
export type WatchReceiptOutcome = "APPLIED" | "DUPLICATE";

export type WatchReceiptRequest = {
  deliveryId: string;
  watchDeviceId: string;
  payloadType: WatchDeliveryRequest["payloadType"];
  payloadId: string;
  payloadRevision: number;
  payloadHash: string;
  result: WatchReceiptResult;
  persistedAtEpochMillis?: number;
  receivedAtEpochMillis: number;
};

export type WatchReceipt = WatchReceiptRequest & {
  receiptId: string;
  outcome: WatchReceiptOutcome;
};


/**
 * Explicitly isolated compatibility contract for the pre-canonical daily-summary
 * Watch transport. It may reuse the existing watch_delivery/watch_receipt tables,
 * but canonical operation reconciliation must not depend on this shape.
 */
export type LegacySummaryWatchDeliveryState =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "ACKNOWLEDGED"
  | "REJECTED"
  | "EXPIRED";
export type LegacySummaryWatchReceiptStatus = "PERSISTED" | "REJECTED";
export type LegacySummaryWatchReceiptOutcome = "ACCEPTED" | "DUPLICATE" | "STALE" | "REJECTED";
export type LegacySummaryWatchDeliveryRequest = {
  summary: DailyRingSummary;
  phoneDeviceId: string;
  watchDeviceId: string;
};
export type LegacySummaryWatchDelivery = {
  deliveryId: string;
  summaryId: string;
  revision: number;
  phoneDeviceId: string;
  watchDeviceId: string;
  state: LegacySummaryWatchDeliveryState;
  attemptCount: number;
  lastAttemptAtEpochMillis?: number;
  createdAtEpochMillis: number;
  updatedAtEpochMillis: number;
  payload: DailyRingSummary;
};
export type LegacySummaryWatchDeliveryAttempt = {
  deliveryId: string;
  state: "SENT";
  attemptCount: number;
  attemptedAtEpochMillis: number;
};
export type LegacySummaryWatchReceiptRequest = {
  deliveryId: string;
  summaryId: string;
  revision: number;
  watchDeviceId: string;
  result: LegacySummaryWatchReceiptStatus;
  persistedAtEpochMillis?: number;
  receivedAtEpochMillis: number;
};
export type LegacySummaryWatchReceipt = LegacySummaryWatchReceiptRequest & {
  receiptId: string;
  outcome: LegacySummaryWatchReceiptOutcome;
};

export type WorkoutStartRequest = {
  /** Optional canonical identity supplied by offline reconciliation. */
  sessionId?: string;
  idempotencyKey: string;
  authorityDeviceId: string;
  workoutType: string;
  planRevisionId?: string;
  occurredAtEpochMillis?: number;
  /** Canonical offline START represents entering ACTIVE in one revision. */
  startActive?: boolean;
};

export type WorkoutTransitionAction = "start" | "pause" | "resume" | "end" | "fail";

export type WorkoutTransitionRequest = {
  sessionId: string;
  idempotencyKey: string;
  authorityDeviceId: string;
  action: WorkoutTransitionAction;
  expectedRevision: number;
  occurredAtEpochMillis?: number;
  reason?: string;
};

export type WorkoutCompleteRequest = {
  sessionId: string;
  idempotencyKey: string;
  authorityDeviceId: string;
  expectedRevision: number;
  occurredAtEpochMillis?: number;
  summary?: Record<string, unknown>;
  /** Canonical offline END may complete directly from ACTIVE/PAUSED. */
  completeDirectly?: boolean;
};

export type WorkoutSession = {
  sessionId: string;
  authorityDeviceId: string;
  workoutType: string;
  planRevisionId?: string;
  state: WorkoutState;
  currentRevision: number;
  startedAtEpochMillis?: number;
  endedAtEpochMillis?: number;
  createdAtEpochMillis: number;
  elapsedSeconds: number;
  summary?: Record<string, unknown>;
};

export type WorkoutListRequest = {
  fromEpochMillis?: number;
  toEpochMillis?: number;
  state?: WorkoutState;
  limit?: number;
};

export type WorkoutPage = {
  sessions: WorkoutSession[];
  nextCursor: string | null;
};

export type WorkoutMutationOutcome = "ACCEPTED" | "DUPLICATE";

export type WorkoutMutationResult = {
  outcome: WorkoutMutationOutcome;
  session: WorkoutSession;
};

export type WorkoutExerciseEventType = "SET_COMPLETED" | "REST_UPDATED" | "EXERCISE_SUBSTITUTED" | "EXERCISE_SKIPPED" | "NOTE";

export type WorkoutExerciseEventRequest = {
  sessionId: string;
  idempotencyKey: string;
  authorityDeviceId: string;
  expectedRevision: number;
  eventType: WorkoutExerciseEventType;
  exerciseId: string;
  exerciseName: string;
  setIndex?: number;
  reps?: number;
  loadKg?: number;
  durationSeconds?: number;
  distanceM?: number;
  restSeconds?: number;
  effortRpe?: number;
  note?: string;
  replacementExerciseId?: string;
  replacementExerciseName?: string;
  occurredAtEpochMillis?: number;
};

export type WorkoutExerciseEvent = Omit<WorkoutExerciseEventRequest, "idempotencyKey" | "expectedRevision"> & {
  eventId: string;
  eventSequence: number;
};

export type WorkoutExerciseEventResult = {
  outcome: WorkoutMutationOutcome;
  session: WorkoutSession;
  event: WorkoutExerciseEvent;
};

export type WorkoutExerciseEventPage = {
  events: WorkoutExerciseEvent[];
  nextCursor: string | null;
};

export type RetryPolicyOptions = {
  maxAttempts?: number;
  baseDelayMillis?: number;
  maxDelayMillis?: number;
};

export type RetryFailure = {
  code: string;
  retryable?: boolean;
};

export type RetrySchedule = {
  attempt: number;
  retry: boolean;
  delayMillis: number;
  nextAttemptAtEpochMillis?: number;
};

export type LegacySummaryQueuedOperation = {
  operation: LegacySummarySyncOperation;
  attemptCount: number;
  nextAttemptAtEpochMillis: number;
  state: "PENDING" | "COMPLETED" | "FAILED";
  lastErrorCode?: string;
};

export type LegacySummaryOperationExecution = {
  operationId: string;
  idempotencyKey: string;
  status: "accepted" | "duplicate" | "older" | "rejected";
  errorCode?: string;
};
