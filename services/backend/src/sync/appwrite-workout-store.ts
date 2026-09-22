import { randomUUID } from "node:crypto";
import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";
import { ContractError, type WorkoutState } from "../shared/contracts.ts";
import type {
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

type WorkoutSessionRow = {
  sessionId: string;
  userId: string;
  planRevisionId?: string;
  authorityDeviceId: string;
  workoutType: string;
  state: WorkoutState;
  currentRevision: number;
  startedAt?: string;
  endedAt?: string;
  discardedAt?: string;
  createdAt: string;
};

type WorkoutEventRow = {
  eventId: string;
  sessionId: string;
  userId: string;
  eventType: string;
  eventSequence: number;
  payloadJson: string;
  sourceDevice: string;
  occurredAt: string;
  idempotencyKey: string;
};

type WorkoutSummaryRow = {
  summaryId: string;
  sessionId: string;
  userId: string;
  durationSeconds: number;
  activeEnergyKcal?: number;
  distanceM?: number;
  steps?: number;
  averageHeartRate?: number;
  sourcePlatform: string;
  healthWriteState: string;
  revision: number;
  createdAt: string;
};

type RuntimeState = {
  activeSinceEpochMillis?: number;
  activeDurationMillis: number;
};

type EventPayload = RuntimeState & {
  requestHash: string;
  session: WorkoutSession;
  exerciseEvent?: WorkoutExerciseEvent;
};

const TERMINAL_STATES = new Set<WorkoutState>(["COMPLETED", "FAILED"]);

const requireString = (value: unknown, code: string, message: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) throw new ContractError(code, message);
  return value.trim();
};

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const cloneSession = (session: WorkoutSession): WorkoutSession => ({
  ...session,
  ...(session.summary ? { summary: { ...session.summary } } : {}),
});

/** Appwrite persistence for the reviewed workout session/event/summary tables. */
export class AppwriteWorkoutStore {
  private readonly repository: OwnerScopedRepository;
  private readonly now: () => number;
  private readonly idGenerator: () => string;

  constructor(
    repository: OwnerScopedRepository,
    options: { now?: () => number; idGenerator?: () => string } = {},
  ) {
    this.repository = repository;
    this.now = options.now ?? (() => Date.now());
    this.idGenerator = options.idGenerator ?? randomUUID;
  }

  async startWorkout(userId: string, request: WorkoutStartRequest): Promise<WorkoutMutationResult> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const authorityDeviceId = requireString(request.authorityDeviceId, "invalid_device_id", "authorityDeviceId is required.");
    const workoutType = requireString(request.workoutType, "invalid_workout_type", "workoutType is required.");
    const idempotencyKey = requireString(request.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const requestHash = sha256({ kind: "workout_start", owner, request });
    const prior = await this.findEventByIdempotency(owner, idempotencyKey);
    if (prior) return this.replay(prior, requestHash);

    const active = await this.listSessions(owner);
    if (active.some((record) => !TERMINAL_STATES.has(record.session.state))) {
      throw new ContractError("workout_already_active", "The user already has a non-terminal workout session.");
    }
    const createdAt = this.timestamp(request.occurredAtEpochMillis ?? this.now());
    const sessionId = request.sessionId?.trim() || this.idGenerator();
    const existingSession = await this.repository.getOwned<WorkoutSessionRow>("workout_session", owner, sessionId);
    if (existingSession) throw new ContractError("idempotency_key_reused", "Workout session id is already bound to another start.");
    const session: WorkoutSession = {
      sessionId,
      authorityDeviceId,
      workoutType,
      ...(request.planRevisionId ? { planRevisionId: request.planRevisionId } : {}),
      state: request.startActive ? "ACTIVE" : "PREPARING",
      currentRevision: 1,
      ...(request.startActive ? { startedAtEpochMillis: createdAt } : {}),
      createdAtEpochMillis: createdAt,
      elapsedSeconds: 0,
    };
    await this.repository.createOwned<WorkoutSessionRow>("workout_session", owner, session.sessionId, this.sessionRow(owner, session));
    await this.saveEvent(owner, session, { activeDurationMillis: 0 }, idempotencyKey, requestHash, createdAt, "STARTED");
    return { outcome: "ACCEPTED", session: cloneSession(session) };
  }

  async transitionWorkout(userId: string, request: WorkoutTransitionRequest): Promise<WorkoutMutationResult> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const idempotencyKey = requireString(request.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const requestHash = sha256({ kind: "workout_transition", owner, request });
    const prior = await this.findEventByIdempotency(owner, idempotencyKey);
    if (prior) return this.replay(prior, requestHash);
    const record = await this.requireSession(owner, request.sessionId);
    this.requireAuthority(record.session, request.authorityDeviceId);
    this.requireRevision(record.session, request.expectedRevision);
    const nextState = this.nextState(record.session.state, request.action);
    const occurredAt = this.timestamp(request.occurredAtEpochMillis ?? this.now());
    this.updateElapsed(record, occurredAt, nextState);
    record.session.state = nextState;
    record.session.currentRevision += 1;
    if (nextState === "ACTIVE" && record.session.startedAtEpochMillis === undefined) record.session.startedAtEpochMillis = occurredAt;
    if (nextState === "FAILED") record.session.endedAtEpochMillis = occurredAt;
    record.session.elapsedSeconds = this.elapsedSeconds(record, occurredAt);
    await this.repository.updateOwned<WorkoutSessionRow>("workout_session", owner, record.session.sessionId, this.sessionRow(owner, record.session));
    await this.saveEvent(owner, record.session, record.runtime, idempotencyKey, requestHash, occurredAt, `TRANSITION_${request.action.toUpperCase()}`);
    return { outcome: "ACCEPTED", session: cloneSession(record.session) };
  }

  async completeWorkout(userId: string, request: WorkoutCompleteRequest): Promise<WorkoutMutationResult> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const idempotencyKey = requireString(request.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const requestHash = sha256({ kind: "workout_complete", owner, request });
    const prior = await this.findEventByIdempotency(owner, idempotencyKey);
    if (prior) return this.replay(prior, requestHash);
    const record = await this.requireSession(owner, request.sessionId);
    this.requireAuthority(record.session, request.authorityDeviceId);
    this.requireRevision(record.session, request.expectedRevision);
    if (record.session.state !== "ENDING" &&
        !(request.completeDirectly && (record.session.state === "ACTIVE" || record.session.state === "PAUSED"))) {
      throw new ContractError("invalid_transition", "A workout can be completed only from ENDING.");
    }
    const endedAt = this.timestamp(request.occurredAtEpochMillis ?? this.now());
    this.updateElapsed(record, endedAt, "COMPLETED");
    record.session.state = "COMPLETED";
    record.session.currentRevision += 1;
    record.session.endedAtEpochMillis = endedAt;
    const exerciseEvents = (await this.listWorkoutEvents(owner, record.session.sessionId)).events.filter((event) => event.eventType === "SET_COMPLETED");
    const totalReps = exerciseEvents.reduce((sum, event) => sum + (event.reps ?? 0), 0);
    const totalVolumeKg = Math.round(exerciseEvents.reduce((sum, event) => sum + (event.loadKg ?? 0) * (event.reps ?? 0), 0) * 100) / 100;
    record.session.summary = {
      ...(request.summary ? { ...request.summary } : {}),
      completedSets: exerciseEvents.length,
      totalReps,
      totalVolumeKg,
      exerciseCount: new Set(exerciseEvents.map((event) => event.exerciseId)).size,
    };
    record.session.elapsedSeconds = this.elapsedSeconds(record, endedAt);
    await this.repository.updateOwned<WorkoutSessionRow>("workout_session", owner, record.session.sessionId, this.sessionRow(owner, record.session));
    await this.saveEvent(owner, record.session, record.runtime, idempotencyKey, requestHash, endedAt, "COMPLETED");
    await this.saveSummary(owner, record.session);
    return { outcome: "ACCEPTED", session: cloneSession(record.session) };
  }

  async recordWorkoutEvent(userId: string, request: WorkoutExerciseEventRequest): Promise<WorkoutExerciseEventResult> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const idempotencyKey = requireString(request.idempotencyKey, "invalid_idempotency_key", "idempotencyKey is required.");
    const requestHash = sha256({ kind: "workout_exercise_event", owner, request });
    const prior = await this.findEventByIdempotency(owner, idempotencyKey);
    if (prior) {
      if (prior.payload.requestHash !== requestHash) throw new ContractError("idempotency_key_reused", "The idempotency key is already bound to another workout event.");
      if (!prior.payload.exerciseEvent) throw new ContractError("idempotency_key_reused", "The idempotency key belongs to another workout mutation.");
      return { outcome: "DUPLICATE", session: cloneSession(prior.payload.session), event: { ...prior.payload.exerciseEvent } };
    }
    const record = await this.requireSession(owner, request.sessionId);
    this.requireAuthority(record.session, request.authorityDeviceId);
    this.requireRevision(record.session, request.expectedRevision);
    if (record.session.state !== "ACTIVE" && record.session.state !== "PAUSED") throw new ContractError("invalid_workout_state", "Exercise events require an active or paused workout.");
    const occurredAt = this.timestamp(request.occurredAtEpochMillis ?? this.now());
    const event = this.validateExerciseEvent(request, record.session.currentRevision + 1, occurredAt);
    record.session.currentRevision += 1;
    record.session.elapsedSeconds = this.elapsedSeconds(record, occurredAt);
    await this.repository.updateOwned<WorkoutSessionRow>("workout_session", owner, record.session.sessionId, this.sessionRow(owner, record.session));
    await this.saveEvent(owner, record.session, record.runtime, idempotencyKey, requestHash, occurredAt, `EXERCISE_${request.eventType}`, event);
    return { outcome: "ACCEPTED", session: cloneSession(record.session), event: { ...event } };
  }

  async listWorkoutEvents(userId: string, sessionId: string): Promise<WorkoutExerciseEventPage> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    await this.requireSession(owner, sessionId);
    const rows = await this.repository.listOwned<WorkoutEventRow>("workout_event", owner, {
      queries: [{ field: "sessionId", operator: "equal", value: sessionId }], limit: 200,
    });
    const events = rows.rows.map((row) => this.eventPayload(row)?.exerciseEvent).filter((event): event is WorkoutExerciseEvent => Boolean(event)).sort((a,b) => a.eventSequence - b.eventSequence);
    return { events: events.map((event) => ({ ...event })), nextCursor: null };
  }

  private validateExerciseEvent(request: WorkoutExerciseEventRequest, eventSequence: number, occurredAt: number): WorkoutExerciseEvent {
    const exerciseId = requireString(request.exerciseId, "invalid_exercise_id", "exerciseId is required.");
    const exerciseName = requireString(request.exerciseName, "invalid_exercise_name", "exerciseName is required.");
    if (!["SET_COMPLETED", "REST_UPDATED", "EXERCISE_SUBSTITUTED", "EXERCISE_SKIPPED", "NOTE"].includes(request.eventType)) throw new ContractError("invalid_workout_event", "Unsupported workout event type.");
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
    const setIndex = integer(request.setIndex, "setIndex", 1, 1000);
    const reps = integer(request.reps, "reps", 0, 10000);
    const loadKg = decimal(request.loadKg, "loadKg", 0, 2000);
    const durationSeconds = integer(request.durationSeconds, "durationSeconds", 0, 86400);
    const distanceM = decimal(request.distanceM, "distanceM", 0, 1000000);
    const restSeconds = integer(request.restSeconds, "restSeconds", 0, 3600);
    const effortRpe = decimal(request.effortRpe, "effortRpe", 0, 10);
    return {
      sessionId: request.sessionId, authorityDeviceId: request.authorityDeviceId, eventType: request.eventType, exerciseId, exerciseName,
      eventId: this.idGenerator(), eventSequence, occurredAtEpochMillis: occurredAt,
      ...(setIndex === undefined ? {} : { setIndex }), ...(reps === undefined ? {} : { reps }), ...(loadKg === undefined ? {} : { loadKg }),
      ...(durationSeconds === undefined ? {} : { durationSeconds }), ...(distanceM === undefined ? {} : { distanceM }), ...(restSeconds === undefined ? {} : { restSeconds }),
      ...(effortRpe === undefined ? {} : { effortRpe }), ...(request.note?.trim() ? { note: request.note.trim().slice(0, 500) } : {}),
    };
  }

  async listWorkouts(userId: string, request: WorkoutListRequest = {}): Promise<WorkoutPage> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const limit = request.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new ContractError("invalid_limit", "limit must be between 1 and 200.");
    if (request.fromEpochMillis !== undefined && !isPositiveInteger(request.fromEpochMillis)) throw new ContractError("invalid_from", "fromEpochMillis must be positive.");
    if (request.toEpochMillis !== undefined && !isPositiveInteger(request.toEpochMillis)) throw new ContractError("invalid_to", "toEpochMillis must be positive.");
    if (request.fromEpochMillis !== undefined && request.toEpochMillis !== undefined && request.fromEpochMillis > request.toEpochMillis) {
      throw new ContractError("invalid_range", "fromEpochMillis must not be after toEpochMillis.");
    }
    const records = await this.listSessions(owner);
    const sessions = records
      .map((record) => record.session)
      .filter((session) => request.fromEpochMillis === undefined || session.createdAtEpochMillis >= request.fromEpochMillis)
      .filter((session) => request.toEpochMillis === undefined || session.createdAtEpochMillis <= request.toEpochMillis)
      .filter((session) => request.state === undefined || session.state === request.state)
      .sort((left, right) => right.createdAtEpochMillis - left.createdAtEpochMillis)
      .slice(0, limit);
    return { sessions, nextCursor: null };
  }

  private async listSessions(userId: string): Promise<Array<{ session: WorkoutSession; runtime: RuntimeState }>> {
    const rows = await this.repository.listOwned<WorkoutSessionRow>("workout_session", userId, { limit: 100 });
    return Promise.all(rows.rows.map((row) => this.hydrate(userId, row)));
  }

  private async requireSession(userId: string, sessionId: string): Promise<{ session: WorkoutSession; runtime: RuntimeState }> {
    const id = requireString(sessionId, "invalid_session_id", "sessionId is required.");
    const row = await this.repository.getOwned<WorkoutSessionRow>("workout_session", userId, id);
    if (!row) throw new ContractError("not_found", "Workout session was not found.");
    return this.hydrate(userId, row);
  }

  private async hydrate(userId: string, row: RepositoryRow<WorkoutSessionRow>): Promise<{ session: WorkoutSession; runtime: RuntimeState }> {
    const events = await this.repository.listOwned<WorkoutEventRow>("workout_event", userId, {
      queries: [{ field: "sessionId", operator: "equal", value: row.sessionId }],
      limit: 100,
    });
    const latest = [...events.rows]
      .sort((left, right) => right.eventSequence - left.eventSequence)
      .map((event) => this.eventPayload(event))
      .find((payload): payload is EventPayload => payload !== null);
    const session: WorkoutSession = {
      sessionId: row.sessionId,
      authorityDeviceId: row.authorityDeviceId,
      workoutType: row.workoutType,
      ...(row.planRevisionId ? { planRevisionId: row.planRevisionId } : {}),
      state: row.state,
      currentRevision: row.currentRevision,
      ...(row.startedAt ? { startedAtEpochMillis: Date.parse(row.startedAt) } : {}),
      ...(row.endedAt ? { endedAtEpochMillis: Date.parse(row.endedAt) } : {}),
      createdAtEpochMillis: Date.parse(row.createdAt),
      elapsedSeconds: latest?.session.elapsedSeconds ?? 0,
      ...(latest?.session.summary ? { summary: { ...latest.session.summary } } : {}),
    };
    return {
      session,
      runtime: latest ? { activeSinceEpochMillis: latest.activeSinceEpochMillis, activeDurationMillis: latest.activeDurationMillis } : { activeDurationMillis: 0 },
    };
  }

  private async findEventByIdempotency(userId: string, idempotencyKey: string): Promise<{ event: WorkoutEventRow; payload: EventPayload } | null> {
    const result = await this.repository.listOwned<WorkoutEventRow>("workout_event", userId, {
      queries: [{ field: "idempotencyKey", operator: "equal", value: idempotencyKey }],
      limit: 1,
    });
    const event = result.rows[0];
    if (!event) return null;
    const payload = this.eventPayload(event);
    return payload ? { event, payload } : null;
  }

  private replay(prior: { event: WorkoutEventRow; payload: EventPayload }, requestHash: string): WorkoutMutationResult {
    if (prior.payload.requestHash !== requestHash) throw new ContractError("idempotency_key_reused", "The idempotency key is already bound to another workout mutation.");
    return { outcome: "DUPLICATE", session: cloneSession(prior.payload.session) };
  }

  private async saveEvent(
    userId: string,
    session: WorkoutSession,
    runtime: RuntimeState,
    idempotencyKey: string,
    requestHash: string,
    occurredAt: number,
    eventType: string,
    exerciseEvent?: WorkoutExerciseEvent,
  ): Promise<void> {
    const payload: EventPayload = { ...runtime, requestHash, session: cloneSession(session), ...(exerciseEvent ? { exerciseEvent: { ...exerciseEvent } } : {}) };
    await this.repository.createOwned<WorkoutEventRow>("workout_event", userId, `workout-event-${sha256({ userId, sessionId: session.sessionId, revision: session.currentRevision }).slice(0, 48)}`, {
      eventId: this.idGenerator(),
      sessionId: session.sessionId,
      userId,
      eventType,
      eventSequence: session.currentRevision,
      payloadJson: JSON.stringify(payload),
      sourceDevice: session.authorityDeviceId,
      occurredAt: new Date(occurredAt).toISOString(),
      idempotencyKey,
    });
  }

  private async saveSummary(userId: string, session: WorkoutSession): Promise<void> {
    const source = session.summary ?? {};
    const value = (key: string): unknown => source[key];
    const number = (keys: string[]): number | undefined => {
      const candidate = keys.map(value).find((entry) => typeof entry === "number" && Number.isFinite(entry));
      return candidate as number | undefined;
    };
    const row: WorkoutSummaryRow = {
      summaryId: `workout-summary-${session.sessionId}`,
      sessionId: session.sessionId,
      userId,
      durationSeconds: session.elapsedSeconds,
      ...(number(["activeEnergyKcal", "energyKcal"]) === undefined ? {} : { activeEnergyKcal: number(["activeEnergyKcal", "energyKcal"]) }),
      ...(number(["distanceM", "distanceMeters"]) === undefined ? {} : { distanceM: number(["distanceM", "distanceMeters"]) }),
      ...(number(["steps"]) === undefined ? {} : { steps: number(["steps"]) }),
      ...(number(["averageHeartRate"]) === undefined ? {} : { averageHeartRate: number(["averageHeartRate"]) }),
      sourcePlatform: typeof value("sourcePlatform") === "string" ? value("sourcePlatform") as string : "android",
      healthWriteState: typeof value("healthWriteState") === "string" ? value("healthWriteState") as string : "NOT_REQUESTED",
      revision: session.currentRevision,
      createdAt: new Date(session.endedAtEpochMillis ?? this.now()).toISOString(),
    };
    const existing = await this.repository.getOwned<WorkoutSummaryRow>("workout_summary", userId, row.summaryId);
    if (!existing) await this.repository.createOwned("workout_summary", userId, row.summaryId, row);
  }

  private sessionRow(userId: string, session: WorkoutSession): WorkoutSessionRow {
    return {
      sessionId: session.sessionId,
      userId,
      ...(session.planRevisionId ? { planRevisionId: session.planRevisionId } : {}),
      authorityDeviceId: session.authorityDeviceId,
      workoutType: session.workoutType,
      state: session.state,
      currentRevision: session.currentRevision,
      ...(session.startedAtEpochMillis === undefined ? {} : { startedAt: new Date(session.startedAtEpochMillis).toISOString() }),
      ...(session.endedAtEpochMillis === undefined ? {} : { endedAt: new Date(session.endedAtEpochMillis).toISOString() }),
      createdAt: new Date(session.createdAtEpochMillis).toISOString(),
    };
  }

  private eventPayload(row: WorkoutEventRow): EventPayload | null {
    try {
      const payload = JSON.parse(row.payloadJson) as EventPayload;
      if (!payload || typeof payload !== "object" || !payload.session || typeof payload.requestHash !== "string") return null;
      return payload;
    } catch {
      return null;
    }
  }

  private requireAuthority(session: WorkoutSession, authorityDeviceId: string): void {
    if (session.authorityDeviceId !== authorityDeviceId) throw new ContractError("authority_mismatch", "Only the session authority device may mutate this workout.");
  }

  private requireRevision(session: WorkoutSession, revision: number): void {
    if (!isNonNegativeInteger(revision)) throw new ContractError("invalid_revision", "expectedRevision must be a non-negative integer.");
    if (session.currentRevision !== revision) throw new ContractError("stale_revision", "The workout revision is stale; refresh before retrying.");
  }

  private nextState(state: WorkoutState, action: WorkoutTransitionRequest["action"]): WorkoutState {
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

  private updateElapsed(record: { session: WorkoutSession; runtime: RuntimeState }, occurredAt: number, nextState: WorkoutState): void {
    if (record.session.state === "ACTIVE" && record.runtime.activeSinceEpochMillis !== undefined) {
      if (occurredAt < record.runtime.activeSinceEpochMillis) throw new ContractError("invalid_timestamp_order", "Workout event time cannot move backwards.");
      record.runtime.activeDurationMillis += occurredAt - record.runtime.activeSinceEpochMillis;
      record.runtime.activeSinceEpochMillis = undefined;
    }
    if (nextState === "ACTIVE") record.runtime.activeSinceEpochMillis = occurredAt;
  }

  private elapsedSeconds(record: { session: WorkoutSession; runtime: RuntimeState }, nowEpochMillis: number): number {
    let elapsed = record.runtime.activeDurationMillis;
    if (record.session.state === "ACTIVE" && record.runtime.activeSinceEpochMillis !== undefined) {
      elapsed += Math.max(0, nowEpochMillis - record.runtime.activeSinceEpochMillis);
    }
    return Math.floor(elapsed / 1_000);
  }

  private timestamp(value: number): number {
    if (!isPositiveInteger(value)) throw new ContractError("invalid_timestamp", "Timestamp must be a positive integer.");
    return value;
  }
}
