import type { OwnerScopedRepository, ServerOwnedRepository } from "../foundation/repository.ts";
import { OfflineSyncQueue } from "./retry-policy.ts";
import { SyncProductAdapter, type SyncProductAdapterLike } from "./adapter.ts";
import { AppwriteSyncSummaryStore } from "./appwrite-summary-store.ts";
import { AppwriteWorkoutStore } from "./appwrite-workout-store.ts";
import { AppwriteWatchStore } from "./appwrite-watch-store.ts";
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
import type {
  LegacySummarySyncOperation,
  LegacySummarySyncPullEnvelope,
  LegacySummarySyncPullRequest,
  LegacySummarySyncPushBatch,
  LegacySummarySyncPushReceipt,
} from "../shared/contracts.ts";
import { SyncProductStore } from "./product-store.ts";

/**
 * Appwrite-backed compatibility adapter. Daily-summary push/pull is explicitly
 * legacy; canonical mutations use /v1/sync/reconcile. Durable watch rows remain
 * server-owned and workout mutation routes are isolated outside local fixtures.
 */
export class AppwriteSyncProductAdapter implements SyncProductAdapterLike {
  public readonly productStore: SyncProductStore;
  public readonly offlineQueue: OfflineSyncQueue;
  private readonly summaryStore: AppwriteSyncSummaryStore;
  private readonly workoutStore: AppwriteWorkoutStore;
  private readonly watchStore: AppwriteWatchStore;
  private readonly validator = new SyncProductAdapter();

  constructor(
    repository: OwnerScopedRepository,
    options: { serverRepository: ServerOwnedRepository; productStore?: SyncProductStore },
  ) {
    this.summaryStore = new AppwriteSyncSummaryStore(repository, options.serverRepository);
    this.workoutStore = new AppwriteWorkoutStore(repository);
    this.watchStore = new AppwriteWatchStore(options.serverRepository);
    this.productStore = options.productStore ?? new SyncProductStore();
    this.offlineQueue = new OfflineSyncQueue();
  }

  async push(userId: string, batch: LegacySummarySyncPushBatch): Promise<LegacySummarySyncPushReceipt> {
    this.validator.validate(batch);
    return this.summaryStore.push(userId, batch.deviceId, batch.operations);
  }

  async pull(userId: string, request: LegacySummarySyncPullRequest): Promise<LegacySummarySyncPullEnvelope> {
    if (request.schemaVersion !== 1) throw new Error("unsupported_schema_version");
    return this.summaryStore.pull(userId, request);
  }

  enqueueOffline(operation: LegacySummarySyncOperation, nowEpochMillis?: number): ReturnType<OfflineSyncQueue["enqueue"]> {
    return this.offlineQueue.enqueue(operation, nowEpochMillis);
  }

  createWatchDelivery(userId: string, request: LegacySummaryWatchDeliveryRequest): Promise<{ delivery: LegacySummaryWatchDelivery; created: boolean }> {
    return this.watchStore.createWatchDelivery(userId, request);
  }

  listWatchDeliveries(userId: string, watchDeviceId: string): Promise<LegacySummaryWatchDelivery[]> {
    return this.watchStore.listWatchDeliveries(userId, watchDeviceId);
  }

  markWatchAttempt(userId: string, deliveryId: string, attemptedAtEpochMillis?: number): Promise<LegacySummaryWatchDeliveryAttempt> {
    return this.watchStore.markWatchAttempt(userId, deliveryId, attemptedAtEpochMillis);
  }

  recordWatchReceipt(userId: string, request: LegacySummaryWatchReceiptRequest): Promise<LegacySummaryWatchReceipt> {
    return this.watchStore.recordWatchReceipt(userId, request);
  }

  startWorkout(userId: string, request: WorkoutStartRequest): Promise<WorkoutMutationResult> {
    return this.workoutStore.startWorkout(userId, request);
  }

  transitionWorkout(userId: string, request: WorkoutTransitionRequest): Promise<WorkoutMutationResult> {
    return this.workoutStore.transitionWorkout(userId, request);
  }

  completeWorkout(userId: string, request: WorkoutCompleteRequest): Promise<WorkoutMutationResult> {
    return this.workoutStore.completeWorkout(userId, request);
  }

  recordWorkoutEvent(userId: string, request: WorkoutExerciseEventRequest): Promise<WorkoutExerciseEventResult> {
    return this.workoutStore.recordWorkoutEvent(userId, request);
  }

  listWorkoutEvents(userId: string, sessionId: string): Promise<WorkoutExerciseEventPage> {
    return this.workoutStore.listWorkoutEvents(userId, sessionId);
  }

  listWorkouts(userId: string, request: WorkoutListRequest = {}): Promise<WorkoutPage> {
    return this.workoutStore.listWorkouts(userId, request);
  }
}

export type { WorkoutSession };
