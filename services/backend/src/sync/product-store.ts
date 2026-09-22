import { randomUUID } from "node:crypto";
import { sha256 } from "../domain/sync-store.ts";
import {
  ContractError,
  parseDailyRingSummary,
  type DailyRingSummary,
  type WorkoutState,
} from "../shared/contracts.ts";
import type {
  LegacySummaryWatchDelivery as WatchDelivery,
  LegacySummaryWatchDeliveryAttempt as WatchDeliveryAttempt,
  LegacySummaryWatchDeliveryRequest as WatchDeliveryRequest,
  LegacySummaryWatchReceipt as WatchReceipt,
  LegacySummaryWatchReceiptRequest as WatchReceiptRequest,
  WorkoutCompleteRequest,
  WorkoutExerciseEvent,
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

type DeliveryRecord = {
  userId: string;
  delivery: WatchDelivery;
};

type WorkoutRecord = {
  userId: string;
  session: WorkoutSession;
  activeSinceEpochMillis?: number;
  activeDurationMillis: number;
  exerciseEvents: WorkoutExerciseEvent[];
};

type StoredWorkoutMutation = {
  requestHash: string;
  result: WorkoutMutationResult;
};

const TERMINAL_WORKOUT_STATES = new Set<WorkoutState>(["COMPLETED", "FAILED"]);

const deliveryKey = (userId: string, watchDeviceId: string, summaryId: string, revision: number) =>
  `${userId}:${watchDeviceId}:${summaryId}:${revision}`;

const receiptKey = (userId: string, request: WatchReceiptRequest) =>
  `${userId}:${request.deliveryId}:${request.watchDeviceId}:${request.summaryId}:${request.revision}:${request.result}`;

const workoutOperationKey = (userId: string, idempotencyKey: string) => `${userId}:${idempotencyKey}`;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const requireString = (value: unknown, code: string, message: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) throw new ContractError(code, message);
  return value.trim();
};

const cloneSession = (session: WorkoutSession): WorkoutSession => ({
  ...session,
  summary: session.summary ? { ...session.summary } : undefined,
});

export class SyncProductStore {
  private readonly deliveries = new Map<string, DeliveryRecord>();
  private readonly deliveriesById = new Map<string, string>();
  private readonly receipts = new Map<string, WatchReceipt>();
  private readonly workouts = new Map<string, WorkoutRecord>();
  private readonly workoutOperations = new Map<string, StoredWorkoutMutation>();
  private readonly workoutEventOperations = new Map<string, { requestHash: string; result: WorkoutExerciseEventResult }>();
  private readonly activeWorkoutByUser = new Map<string, string>();
  private readonly now: () => number;
  private readonly idGenerator: () => string;

  constructor(options: { now?: () => number; idGenerator?: () => string } = {}) {
    this.now = options.now ?? (() => Date.now());
    this.idGenerator = options.idGenerator ?? randomUUID;
  }

  createWatchDelivery(userId: string, request: WatchDeliveryRequest): { delivery: WatchDelivery; created: boolean } {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const phoneDeviceId = requireString(request.phoneDeviceId, "invalid_device_id", "phoneDeviceId is required.");
    const watchDeviceId = requireString(request.watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    const summary = parseDailyRingSummary(request.summary);
    const key = deliveryKey(owner, watchDeviceId, summary.summaryId, summary.revision);
    const existing = this.deliveries.get(key);
    if (existing) return { delivery: { ...existing.delivery, payload: { ...existing.delivery.payload } }, created: false };

    const createdAtEpochMillis = this.timestamp(this.now());
    const delivery: WatchDelivery = {
      deliveryId: this.idGenerator(),
      summaryId: summary.summaryId,
      revision: summary.revision,
      phoneDeviceId,
      watchDeviceId,
      state: "PENDING",
      attemptCount: 0,
      createdAtEpochMillis,
      updatedAtEpochMillis: createdAtEpochMillis,
      payload: { ...summary },
    };
    this.deliveries.set(key, { userId: owner, delivery });
    this.deliveriesById.set(delivery.deliveryId, key);
    return { delivery: { ...delivery, payload: { ...delivery.payload } }, created: true };
  }

  listWatchDeliveries(userId: string, watchDeviceId: string): WatchDelivery[] {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const watch = requireString(watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    return [...this.deliveries.values()]
      .filter((record) => record.userId === owner && record.delivery.watchDeviceId === watch)
      .sort((left, right) => left.delivery.createdAtEpochMillis - right.delivery.createdAtEpochMillis)
      .map((record) => ({ ...record.delivery, payload: { ...record.delivery.payload } }));
  }

  markWatchAttempt(userId: string, deliveryId: string, attemptedAtEpochMillis = this.now()): WatchDeliveryAttempt {
    const record = this.requireDelivery(userId, deliveryId);
    if (["ACKNOWLEDGED", "REJECTED", "EXPIRED"].includes(record.delivery.state)) {
      throw new ContractError("delivery_terminal", "A terminal watch delivery cannot be sent again.");
    }
    const attemptedAt = this.timestamp(attemptedAtEpochMillis);
    record.delivery.attemptCount += 1;
    record.delivery.lastAttemptAtEpochMillis = attemptedAt;
    record.delivery.updatedAtEpochMillis = attemptedAt;
    record.delivery.state = "SENT";
    return {
      deliveryId,
      state: "SENT",
      attemptCount: record.delivery.attemptCount,
      attemptedAtEpochMillis: attemptedAt,
    };
  }

  recordWatchReceipt(userId: string, request: WatchReceiptRequest): WatchReceipt {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const deliveryId = requireString(request.deliveryId, "invalid_delivery_id", "deliveryId is required.");
    const summaryId = requireString(request.summaryId, "invalid_summary_id", "summaryId is required.");
    const watchDeviceId = requireString(request.watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    if (!isNonNegativeInteger(request.revision)) throw new ContractError("invalid_revision", "revision must be a non-negative integer.");
    if (!isPositiveInteger(request.receivedAtEpochMillis)) throw new ContractError("invalid_timestamp", "receivedAtEpochMillis must be positive.");
    if (request.result !== "PERSISTED" && request.result !== "REJECTED") {
      throw new ContractError("invalid_receipt_result", "result must be PERSISTED or REJECTED.");
    }

    const record = this.requireDelivery(owner, deliveryId);
    if (record.delivery.watchDeviceId !== watchDeviceId) {
      throw new ContractError("device_not_authorized", "The watch is not authorized for this delivery.");
    }

    const key = receiptKey(owner, { ...request, deliveryId, summaryId, watchDeviceId });
    const prior = this.receipts.get(key);
    if (prior) return { ...prior, outcome: "DUPLICATE" };

    const receiptId = this.idGenerator();
    if (record.delivery.summaryId !== summaryId || record.delivery.revision !== request.revision) {
      const stale: WatchReceipt = {
        ...request,
        deliveryId,
        summaryId,
        watchDeviceId,
        receiptId,
        outcome: "STALE",
      };
      // A stale receipt is processed and therefore must be replay-safe. Keep
      // it in the same in-memory ledger without changing delivery state.
      this.receipts.set(key, stale);
      return { ...stale };
    }

    if (record.delivery.state === "ACKNOWLEDGED" && request.result !== "PERSISTED") {
      throw new ContractError("receipt_conflict", "A persisted delivery cannot be changed to rejected.");
    }
    if (record.delivery.state === "REJECTED" && request.result !== "REJECTED") {
      throw new ContractError("receipt_conflict", "A rejected delivery cannot be changed to persisted.");
    }

    const receivedAt = this.timestamp(request.receivedAtEpochMillis);
    record.delivery.state = request.result === "PERSISTED" ? "ACKNOWLEDGED" : "REJECTED";
    record.delivery.updatedAtEpochMillis = receivedAt;
    const receipt: WatchReceipt = {
      ...request,
      deliveryId,
      summaryId,
      watchDeviceId,
      receiptId,
      outcome: "ACCEPTED",
    };
    this.receipts.set(key, receipt);
    return { ...receipt };
  }

  startWorkout(userId: string, request: WorkoutStartRequest): WorkoutMutationResult {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const authorityDeviceId = requireString(request.authorityDeviceId, "invalid_device_id", "authorityDeviceId is required.");
    const workoutType = requireString(request.workoutType, "invalid_workout_type", "workoutType is required.");
    const idempotencyKey = requireString(request.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const requestHash = sha256({ kind: "workout_start", owner, request });
    const key = workoutOperationKey(owner, idempotencyKey);
    const prior = this.workoutOperations.get(key);
    if (prior) return this.replayWorkoutOperation(prior, requestHash);

    const activeSessionId = this.activeWorkoutByUser.get(owner);
    if (activeSessionId) throw new ContractError("workout_already_active", "The user already has a non-terminal workout session.");

    const createdAt = this.timestamp(request.occurredAtEpochMillis ?? this.now());
    const session: WorkoutSession = {
      sessionId: this.idGenerator(),
      authorityDeviceId,
      workoutType,
      planRevisionId: request.planRevisionId,
      state: "PREPARING",
      currentRevision: 1,
      createdAtEpochMillis: createdAt,
      elapsedSeconds: 0,
    };
    this.workouts.set(session.sessionId, {
      userId: owner,
      session,
      activeDurationMillis: 0,
      exerciseEvents: [],
    });
    this.activeWorkoutByUser.set(owner, session.sessionId);
    const result: WorkoutMutationResult = { outcome: "ACCEPTED", session: cloneSession(session) };
    this.workoutOperations.set(key, { requestHash, result });
    return { outcome: result.outcome, session: cloneSession(result.session) };
  }

  transitionWorkout(userId: string, request: WorkoutTransitionRequest): WorkoutMutationResult {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const idempotencyKey = requireString(request.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const requestHash = sha256({ kind: "workout_transition", owner, request });
    const key = workoutOperationKey(owner, idempotencyKey);
    const prior = this.workoutOperations.get(key);
    if (prior) return this.replayWorkoutOperation(prior, requestHash);

    const record = this.requireWorkout(owner, request.sessionId);
    this.requireAuthority(record, request.authorityDeviceId);
    this.requireExpectedRevision(record, request.expectedRevision);
    const nextState = this.nextWorkoutState(record.session.state, request.action);
    const occurredAt = this.timestamp(request.occurredAtEpochMillis ?? this.now());
    this.updateElapsed(record, occurredAt, nextState);
    record.session.state = nextState;
    record.session.currentRevision += 1;
    if (nextState === "ACTIVE" && record.session.startedAtEpochMillis === undefined) {
      record.session.startedAtEpochMillis = occurredAt;
    }
    if (nextState === "FAILED") {
      record.session.endedAtEpochMillis = occurredAt;
      this.clearActiveWorkout(owner, record.session.sessionId);
    }
    record.session.elapsedSeconds = this.elapsedSeconds(record, occurredAt);
    const result: WorkoutMutationResult = { outcome: "ACCEPTED", session: cloneSession(record.session) };
    this.workoutOperations.set(key, { requestHash, result });
    return { outcome: result.outcome, session: cloneSession(result.session) };
  }

  completeWorkout(userId: string, request: WorkoutCompleteRequest): WorkoutMutationResult {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const idempotencyKey = requireString(request.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const requestHash = sha256({ kind: "workout_complete", owner, request });
    const key = workoutOperationKey(owner, idempotencyKey);
    const prior = this.workoutOperations.get(key);
    if (prior) return this.replayWorkoutOperation(prior, requestHash);

    const record = this.requireWorkout(owner, request.sessionId);
    this.requireAuthority(record, request.authorityDeviceId);
    this.requireExpectedRevision(record, request.expectedRevision);
    if (record.session.state !== "ENDING") {
      throw new ContractError("invalid_transition", "A workout can be completed only from ENDING.");
    }
    const endedAt = this.timestamp(request.occurredAtEpochMillis ?? this.now());
    this.updateElapsed(record, endedAt, "COMPLETED");
    record.session.state = "COMPLETED";
    record.session.currentRevision += 1;
    record.session.endedAtEpochMillis = endedAt;
    const setEvents = record.exerciseEvents.filter((event) => event.eventType === "SET_COMPLETED");
    const totalReps = setEvents.reduce((sum, event) => sum + (event.reps ?? 0), 0);
    const totalVolumeKg = Math.round(setEvents.reduce((sum, event) => sum + (event.loadKg ?? 0) * (event.reps ?? 0), 0) * 100) / 100;
    const exerciseCount = new Set(setEvents.map((event) => event.exerciseId)).size;
    record.session.summary = {
      ...(request.summary ? { ...request.summary } : {}),
      completedSets: setEvents.length,
      totalReps,
      totalVolumeKg,
      exerciseCount,
    };
    record.session.elapsedSeconds = this.elapsedSeconds(record, endedAt);
    this.clearActiveWorkout(owner, record.session.sessionId);
    const result: WorkoutMutationResult = { outcome: "ACCEPTED", session: cloneSession(record.session) };
    this.workoutOperations.set(key, { requestHash, result });
    return { outcome: result.outcome, session: cloneSession(result.session) };
  }

  recordWorkoutEvent(userId: string, request: WorkoutExerciseEventRequest): WorkoutExerciseEventResult {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const idempotencyKey = requireString(request.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const key = workoutOperationKey(owner, idempotencyKey);
    const requestHash = sha256({ kind: "workout_exercise_event", owner, request });
    const prior = this.workoutEventOperations.get(key);
    if (prior) {
      if (prior.requestHash !== requestHash) throw new ContractError("idempotency_key_reused", "The idempotency key is already bound to another workout event.");
      return { outcome: "DUPLICATE", session: cloneSession(prior.result.session), event: { ...prior.result.event } };
    }
    const record = this.requireWorkout(owner, request.sessionId);
    this.requireAuthority(record, request.authorityDeviceId);
    this.requireExpectedRevision(record, request.expectedRevision);
    if (record.session.state !== "ACTIVE" && record.session.state !== "PAUSED") throw new ContractError("invalid_workout_state", "Exercise events require an active or paused workout.");
    const event = this.validateExerciseEvent(request, record.session.currentRevision + 1);
    record.session.currentRevision += 1;
    record.session.elapsedSeconds = this.elapsedSeconds(record, event.occurredAtEpochMillis ?? this.now());
    record.exerciseEvents.push(event);
    const result: WorkoutExerciseEventResult = { outcome: "ACCEPTED", session: cloneSession(record.session), event: { ...event } };
    this.workoutEventOperations.set(key, { requestHash, result });
    return { outcome: result.outcome, session: cloneSession(result.session), event: { ...event } };
  }

  listWorkoutEvents(userId: string, sessionId: string): WorkoutExerciseEventPage {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const record = this.requireWorkout(owner, sessionId);
    return { events: record.exerciseEvents.map((event) => ({ ...event })).sort((a, b) => a.eventSequence - b.eventSequence), nextCursor: null };
  }

  private validateExerciseEvent(request: WorkoutExerciseEventRequest, eventSequence: number): WorkoutExerciseEvent {
    const exerciseId = requireString(request.exerciseId, "invalid_exercise_id", "exerciseId is required.");
    const exerciseName = requireString(request.exerciseName, "invalid_exercise_name", "exerciseName is required.");
    if (!["SET_COMPLETED", "REST_UPDATED", "EXERCISE_SKIPPED", "NOTE"].includes(request.eventType)) throw new ContractError("invalid_workout_event", "Unsupported workout event type.");
    const integer = (value: number | undefined, name: string, min = 0, max = 100000): number | undefined => {
      if (value === undefined) return undefined;
      if (!Number.isInteger(value) || value < min || value > max) throw new ContractError("invalid_workout_event", `${name} is out of range.`);
      return value;
    };
    const decimal = (value: number | undefined, name: string, min = 0, max = 100000): number | undefined => {
      if (value === undefined) return undefined;
      if (!Number.isFinite(value) || value < min || value > max) throw new ContractError("invalid_workout_event", `${name} is out of range.`);
      return Math.round(value * 100) / 100;
    };
    const occurredAt = this.timestamp(request.occurredAtEpochMillis ?? this.now());
    return {
      sessionId: request.sessionId, authorityDeviceId: request.authorityDeviceId, eventType: request.eventType, exerciseId, exerciseName,
      eventId: this.idGenerator(), eventSequence, occurredAtEpochMillis: occurredAt,
      ...(integer(request.setIndex, "setIndex", 1, 1000) === undefined ? {} : { setIndex: integer(request.setIndex, "setIndex", 1, 1000) }),
      ...(integer(request.reps, "reps", 0, 10000) === undefined ? {} : { reps: integer(request.reps, "reps", 0, 10000) }),
      ...(decimal(request.loadKg, "loadKg", 0, 2000) === undefined ? {} : { loadKg: decimal(request.loadKg, "loadKg", 0, 2000) }),
      ...(integer(request.durationSeconds, "durationSeconds", 0, 86400) === undefined ? {} : { durationSeconds: integer(request.durationSeconds, "durationSeconds", 0, 86400) }),
      ...(decimal(request.distanceM, "distanceM", 0, 1000000) === undefined ? {} : { distanceM: decimal(request.distanceM, "distanceM", 0, 1000000) }),
      ...(integer(request.restSeconds, "restSeconds", 0, 3600) === undefined ? {} : { restSeconds: integer(request.restSeconds, "restSeconds", 0, 3600) }),
      ...(decimal(request.effortRpe, "effortRpe", 0, 10) === undefined ? {} : { effortRpe: decimal(request.effortRpe, "effortRpe", 0, 10) }),
      ...(request.note?.trim() ? { note: request.note.trim().slice(0, 500) } : {}),
    };
  }

  listWorkouts(userId: string, request: WorkoutListRequest = {}): WorkoutPage {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const from = request.fromEpochMillis;
    const to = request.toEpochMillis;
    const limit = request.limit ?? 100;
    if (from !== undefined && !isPositiveInteger(from)) throw new ContractError("invalid_from", "fromEpochMillis must be a positive integer.");
    if (to !== undefined && !isPositiveInteger(to)) throw new ContractError("invalid_to", "toEpochMillis must be a positive integer.");
    if (from !== undefined && to !== undefined && from > to) throw new ContractError("invalid_range", "fromEpochMillis must not be after toEpochMillis.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new ContractError("invalid_limit", "limit must be between 1 and 200.");
    const sessions = [...this.workouts.values()]
      .filter((record) => record.userId === owner)
      .map((record) => {
        const session = cloneSession(record.session);
        session.elapsedSeconds = this.elapsedSeconds(record, this.now());
        return session;
      })
      .filter((session) => from === undefined || session.createdAtEpochMillis >= from)
      .filter((session) => to === undefined || session.createdAtEpochMillis <= to)
      .filter((session) => request.state === undefined || session.state === request.state)
      .sort((left, right) => right.createdAtEpochMillis - left.createdAtEpochMillis)
      .slice(0, limit);
    return { sessions, nextCursor: null };
  }

  private nextWorkoutState(state: WorkoutState, action: WorkoutTransitionRequest["action"]): WorkoutState {
    const transitions: Partial<Record<WorkoutState, Partial<Record<WorkoutTransitionRequest["action"], WorkoutState>>>> = {
      PREPARING: { start: "ACTIVE", fail: "FAILED" },
      ACTIVE: { pause: "PAUSED", end: "ENDING", fail: "FAILED" },
      PAUSED: { resume: "ACTIVE", end: "ENDING", fail: "FAILED" },
      ENDING: { fail: "FAILED" },
    };
    const next = transitions[state]?.[action];
    if (!next) throw new ContractError("invalid_transition", `Action ${action} is not legal from ${state}.`);
    return next;
  }

  private updateElapsed(record: WorkoutRecord, occurredAt: number, nextState: WorkoutState): void {
    if (record.session.state === "ACTIVE" && record.activeSinceEpochMillis !== undefined) {
      if (occurredAt < record.activeSinceEpochMillis) {
        throw new ContractError("invalid_timestamp_order", "Workout event time cannot move backwards.");
      }
      record.activeDurationMillis += occurredAt - record.activeSinceEpochMillis;
      record.activeSinceEpochMillis = undefined;
    }
    if (nextState === "ACTIVE") record.activeSinceEpochMillis = occurredAt;
  }

  private elapsedSeconds(record: WorkoutRecord, nowEpochMillis: number): number {
    let elapsed = record.activeDurationMillis;
    if (record.session.state === "ACTIVE" && record.activeSinceEpochMillis !== undefined) {
      elapsed += Math.max(0, nowEpochMillis - record.activeSinceEpochMillis);
    }
    return Math.floor(elapsed / 1_000);
  }

  private requireDelivery(userId: string, deliveryId: string): DeliveryRecord {
    const key = this.deliveriesById.get(deliveryId);
    const record = key ? this.deliveries.get(key) : undefined;
    if (!record || record.userId !== userId) throw new ContractError("not_found", "Watch delivery was not found.");
    return record;
  }

  private requireWorkout(userId: string, sessionId: string): WorkoutRecord {
    const record = this.workouts.get(sessionId);
    if (!record || record.userId !== userId) throw new ContractError("not_found", "Workout session was not found.");
    return record;
  }

  private requireAuthority(record: WorkoutRecord, authorityDeviceId: string): void {
    if (record.session.authorityDeviceId !== authorityDeviceId) {
      throw new ContractError("authority_mismatch", "Only the session authority device may mutate this workout.");
    }
  }

  private requireExpectedRevision(record: WorkoutRecord, expectedRevision: number): void {
    if (!isNonNegativeInteger(expectedRevision)) throw new ContractError("invalid_revision", "expectedRevision must be a non-negative integer.");
    if (record.session.currentRevision !== expectedRevision) {
      throw new ContractError("stale_revision", "The workout revision is stale; refresh before retrying.");
    }
  }

  private replayWorkoutOperation(prior: StoredWorkoutMutation, requestHash: string): WorkoutMutationResult {
    if (prior.requestHash !== requestHash) {
      throw new ContractError("idempotency_key_reused", "The idempotency key is already bound to another workout mutation.");
    }
    return { outcome: "DUPLICATE", session: cloneSession(prior.result.session) };
  }

  private clearActiveWorkout(userId: string, sessionId: string): void {
    if (this.activeWorkoutByUser.get(userId) === sessionId) this.activeWorkoutByUser.delete(userId);
  }

  private timestamp(value: number): number {
    if (!isPositiveInteger(value)) throw new ContractError("invalid_timestamp", "Timestamp must be a positive integer.");
    return value;
  }
}
