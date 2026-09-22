import { SyncStore } from "../domain/sync-store.ts";
import {
  API_SCHEMA_VERSION,
  ContractError,
  type LegacySummarySyncOperation,
  type LegacySummarySyncPullEnvelope,
  type LegacySummarySyncPullRequest,
  type LegacySummarySyncPushBatch,
  type LegacySummarySyncPushReceipt,
} from "../shared/contracts.ts";
import { OfflineRetryPolicy, OfflineSyncQueue } from "./retry-policy.ts";
import { SyncProductStore } from "./product-store.ts";
import type {
  LegacySummaryWatchDelivery,
  LegacySummaryWatchDeliveryAttempt,
  LegacySummaryWatchDeliveryRequest,
  LegacySummaryWatchReceipt,
  LegacySummaryWatchReceiptRequest,
  WorkoutCompleteRequest,
  WorkoutExerciseEventPage,
  WorkoutExerciseEventRequest,
  WorkoutExerciseEventResult,
  WorkoutMutationResult,
  WorkoutPage,
  WorkoutListRequest,
  WorkoutSession,
  WorkoutStartRequest,
  WorkoutTransitionRequest,
} from "./types.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const requireNonEmptyString = (value: unknown, code: string, message: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) throw new ContractError(code, message);
  return value.trim();
};

export type SyncProductAdapterOptions = {
  summaryStore?: SyncStore;
  productStore?: SyncProductStore;
  retryPolicy?: OfflineRetryPolicy;
};

/**
 * Compatibility adapter. Only the daily-summary push/pull surface is legacy;
 * workout mutation methods remain for local fixtures and are isolated from
 * production by the route gate in sync-routes.ts.
 */
export type SyncProductAdapterLike = {
  push(userId: string, batch: LegacySummarySyncPushBatch): LegacySummarySyncPushReceipt | Promise<LegacySummarySyncPushReceipt>;
  pull(userId: string, request: LegacySummarySyncPullRequest): LegacySummarySyncPullEnvelope | Promise<LegacySummarySyncPullEnvelope>;
  enqueueOffline(operation: LegacySummarySyncOperation, nowEpochMillis?: number): ReturnType<OfflineSyncQueue["enqueue"]>;
  createWatchDelivery(userId: string, request: LegacySummaryWatchDeliveryRequest): { delivery: LegacySummaryWatchDelivery; created: boolean } | Promise<{ delivery: LegacySummaryWatchDelivery; created: boolean }>;
  listWatchDeliveries(userId: string, watchDeviceId: string): LegacySummaryWatchDelivery[] | Promise<LegacySummaryWatchDelivery[]>;
  markWatchAttempt(userId: string, deliveryId: string, attemptedAtEpochMillis?: number): LegacySummaryWatchDeliveryAttempt | Promise<LegacySummaryWatchDeliveryAttempt>;
  recordWatchReceipt(userId: string, request: LegacySummaryWatchReceiptRequest): LegacySummaryWatchReceipt | Promise<LegacySummaryWatchReceipt>;
  startWorkout(userId: string, request: WorkoutStartRequest): WorkoutMutationResult | Promise<WorkoutMutationResult>;
  transitionWorkout(userId: string, request: WorkoutTransitionRequest): WorkoutMutationResult | Promise<WorkoutMutationResult>;
  completeWorkout(userId: string, request: WorkoutCompleteRequest): WorkoutMutationResult | Promise<WorkoutMutationResult>;
  recordWorkoutEvent(userId: string, request: WorkoutExerciseEventRequest): WorkoutExerciseEventResult | Promise<WorkoutExerciseEventResult>;
  listWorkoutEvents(userId: string, sessionId: string): WorkoutExerciseEventPage | Promise<WorkoutExerciseEventPage>;
  listWorkouts(userId: string, request?: WorkoutListRequest): WorkoutPage | Promise<WorkoutPage>;
};

export class SyncProductAdapter implements SyncProductAdapterLike {
  public readonly summaryStore: SyncStore;
  public readonly productStore: SyncProductStore;
  public readonly retryPolicy: OfflineRetryPolicy;
  public readonly offlineQueue: OfflineSyncQueue;

  constructor(options: SyncProductAdapterOptions = {}) {
    this.summaryStore = options.summaryStore ?? new SyncStore();
    this.productStore = options.productStore ?? new SyncProductStore();
    this.retryPolicy = options.retryPolicy ?? new OfflineRetryPolicy();
    this.offlineQueue = new OfflineSyncQueue(this.retryPolicy);
  }

  push(userId: string, batch: LegacySummarySyncPushBatch): LegacySummarySyncPushReceipt {
    const owner = requireNonEmptyString(userId, "invalid_user_id", "userId is required.");
    this.validatePushBatch(batch);
    return this.summaryStore.push(owner, batch.deviceId, batch.operations);
  }

  /** Validates a legacy daily-summary batch without mutating the local store. */
  validate(batch: LegacySummarySyncPushBatch): void {
    this.validatePushBatch(batch);
  }

  pull(userId: string, request: LegacySummarySyncPullRequest): LegacySummarySyncPullEnvelope {
    const owner = requireNonEmptyString(userId, "invalid_user_id", "userId is required.");
    if (!isRecord(request) || request.schemaVersion !== API_SCHEMA_VERSION) {
      throw new ContractError("unsupported_schema_version", "Legacy summary pull schema version is unsupported.");
    }
    const deviceId = requireNonEmptyString(request.deviceId, "invalid_device_id", "deviceId is required.");
    const cursor = request.cursor ?? 0;
    if (!isNonNegativeInteger(cursor)) throw new ContractError("invalid_cursor", "cursor must be a non-negative integer.");
    return this.summaryStore.pull(owner, deviceId, cursor);
  }

  enqueueOffline(operation: LegacySummarySyncOperation, nowEpochMillis = Date.now()): ReturnType<OfflineSyncQueue["enqueue"]> {
    return this.offlineQueue.enqueue(operation, nowEpochMillis);
  }

  createWatchDelivery(userId: string, request: LegacySummaryWatchDeliveryRequest): { delivery: LegacySummaryWatchDelivery; created: boolean } {
    return this.productStore.createWatchDelivery(userId, request);
  }

  listWatchDeliveries(userId: string, watchDeviceId: string): LegacySummaryWatchDelivery[] {
    return this.productStore.listWatchDeliveries(userId, watchDeviceId);
  }

  markWatchAttempt(userId: string, deliveryId: string, attemptedAtEpochMillis?: number): LegacySummaryWatchDeliveryAttempt {
    return this.productStore.markWatchAttempt(userId, deliveryId, attemptedAtEpochMillis);
  }

  recordWatchReceipt(userId: string, request: LegacySummaryWatchReceiptRequest): LegacySummaryWatchReceipt {
    return this.productStore.recordWatchReceipt(userId, request);
  }

  startWorkout(userId: string, request: WorkoutStartRequest): WorkoutMutationResult {
    return this.productStore.startWorkout(userId, request);
  }

  transitionWorkout(userId: string, request: WorkoutTransitionRequest): WorkoutMutationResult {
    return this.productStore.transitionWorkout(userId, request);
  }

  completeWorkout(userId: string, request: WorkoutCompleteRequest): WorkoutMutationResult {
    return this.productStore.completeWorkout(userId, request);
  }

  recordWorkoutEvent(userId: string, request: WorkoutExerciseEventRequest): WorkoutExerciseEventResult {
    return this.productStore.recordWorkoutEvent(userId, request);
  }

  listWorkoutEvents(userId: string, sessionId: string): WorkoutExerciseEventPage {
    return this.productStore.listWorkoutEvents(userId, sessionId);
  }

  listWorkouts(userId: string, request: WorkoutListRequest = {}): WorkoutPage {
    return this.productStore.listWorkouts(userId, request);
  }

  private validatePushBatch(batch: LegacySummarySyncPushBatch): void {
    if (!isRecord(batch) || batch.schemaVersion !== API_SCHEMA_VERSION) {
      throw new ContractError("unsupported_schema_version", "Legacy summary push schema version is unsupported.");
    }
    requireNonEmptyString(batch.deviceId, "invalid_device_id", "deviceId is required.");
    if (!Array.isArray(batch.operations) || batch.operations.length < 1 || batch.operations.length > 50) {
      throw new ContractError("invalid_operations", "operations must contain between 1 and 50 items.");
    }
    for (const operation of batch.operations) this.validateOperation(operation);
  }

  private validateOperation(operation: LegacySummarySyncOperation): void {
    if (!isRecord(operation)) throw new ContractError("invalid_operation", "Each legacy summary operation must be an object.");
    if (operation.entityType !== "daily_summary") throw new ContractError("invalid_entity_type", "Legacy summary sync only supports daily_summary operations.");
    requireNonEmptyString(operation.operationId, "invalid_operation_id", "operationId is required.");
    requireNonEmptyString(operation.entityId, "invalid_entity_id", "entityId is required.");
    requireNonEmptyString(operation.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    requireNonEmptyString(operation.payloadHash, "invalid_payload_hash", "payloadHash is required.");
    if (operation.operationType !== "create" && operation.operationType !== "append_revision") {
      throw new ContractError("invalid_operation_type", "operationType is unsupported.");
    }
    if (!isNonNegativeInteger(operation.entityRevision)) {
      throw new ContractError("invalid_revision", "entityRevision must be a non-negative integer.");
    }
    if (operation.expectedServerRevision !== undefined && !isNonNegativeInteger(operation.expectedServerRevision)) {
      throw new ContractError("invalid_expected_revision", "expectedServerRevision must be a non-negative integer.");
    }
    if (!isRecord(operation.payload)) throw new ContractError("invalid_payload", "operation payload must be an object.");
  }
}

export type {
  LegacySummaryWatchDelivery,
  LegacySummaryWatchDeliveryAttempt,
  LegacySummaryWatchDeliveryRequest,
  LegacySummaryWatchReceipt,
  LegacySummaryWatchReceiptRequest,
  WorkoutCompleteRequest,
  WorkoutExerciseEventPage,
  WorkoutExerciseEventRequest,
  WorkoutExerciseEventResult,
  WorkoutMutationResult,
  WorkoutPage,
  WorkoutListRequest,
  WorkoutSession,
  WorkoutStartRequest,
  WorkoutTransitionRequest,
};
