import { sha256 } from "../domain/sync-store.ts";
import type { CanonicalInvalidationBoundary } from "../domain/invalidation-boundary.ts";
import type { OwnerScopedRepository, ServerOwnedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import type {
  SyncEnvelope,
  SyncOutcome,
  SyncReceipt,
  WorkoutSessionRevision,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import { AppwriteWorkoutStore } from "./appwrite-workout-store.ts";
import {
  CanonicalSyncCursorStore,
  CanonicalSyncJournal,
  CanonicalSyncSecurityGate,
  syncReceipt,
  validateSyncEnvelope,
} from "./canonical-reconciliation.ts";
import type {
  WorkoutCompleteRequest,
  WorkoutExerciseEventRequest,
  WorkoutMutationResult,
  WorkoutSession,
  WorkoutStartRequest,
  WorkoutTransitionRequest,
} from "./types.ts";

export type CanonicalWorkoutOperation =
  | "WORKOUT_START"
  | "WORKOUT_AUTHORITY_TRANSFER"
  | "WORKOUT_TRANSITION"
  | "WORKOUT_EVENT"
  | "WORKOUT_COMPLETE";

type PersistedWorkoutSessionRevision = WorkoutSessionRevision & Record<string, unknown> & {
  userId: string;
};

type WorkoutSessionRow = {
  sessionId: string;
  userId: string;
  authorityDeviceId: string;
  state: string;
  currentRevision: number;
};

type WorkoutEventRow = {
  eventId: string;
  sessionId: string;
  userId: string;
  eventSequence: number;
  idempotencyKey: string;
  payloadJson: string;
};

type DeviceRow = {
  deviceId: string;
  userId: string;
  revokedAt?: string;
};

type DeviceSessionRow = {
  deviceSessionId: string;
  userId: string;
  phoneDeviceId: string;
  watchDeviceId: string;
  state: string;
  expiresAt?: string;
  revokedAt?: string;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError("invalid_workout_payload", "Workout sync payload must be an object.");
  }
  return value as Record<string, unknown>;
};

const requireString = (value: unknown, code: string, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) {
    throw new ContractError(code, `${label} is required.`);
  }
  return value.trim();
};

const requireRevision = (value: unknown, label = "expectedRevision"): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ContractError("invalid_revision", `${label} must be a non-negative integer.`);
  }
  return value;
};

const sessionRevisionRowId = (userId: string, sessionId: string, revision: number): string =>
  `workout-session-revision-${sha256({ userId, sessionId, revision }).slice(0, 48)}`;

export class CanonicalWorkoutReconciler {
  private readonly journal: CanonicalSyncJournal;
  private readonly cursor: CanonicalSyncCursorStore;
  private readonly security: CanonicalSyncSecurityGate;
  private readonly now: () => Date;
  private readonly store: AppwriteWorkoutStore;
  private readonly ownerRepository: OwnerScopedRepository;
  private readonly serverRepository: ServerOwnedRepository;
  private readonly invalidation?: CanonicalInvalidationBoundary;

  constructor(
    store: AppwriteWorkoutStore,
    ownerRepository: OwnerScopedRepository,
    serverRepository: ServerOwnedRepository,
    invalidation?: CanonicalInvalidationBoundary,
    now: () => Date = () => new Date(),
  ) {
    this.store = store;
    this.ownerRepository = ownerRepository;
    this.serverRepository = serverRepository;
    this.invalidation = invalidation;
    this.now = now;
    this.journal = new CanonicalSyncJournal(serverRepository, now);
    this.cursor = new CanonicalSyncCursorStore(serverRepository, () => now().getTime());
    this.security = new CanonicalSyncSecurityGate(ownerRepository, () => now().getTime());
  }

  async reconcile(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    validateSyncEnvelope(envelope);
    if (envelope.entityType !== "workout_session") {
      throw new ContractError("invalid_workout_envelope", "Workout reconciliation requires entityType=workout_session.");
    }
    await this.security.assertAuthorized(userId, envelope);
    const replay = await this.journal.replay(userId, envelope);
    if (replay) return replay;

    try {
      switch (envelope.operation as CanonicalWorkoutOperation) {
        case "WORKOUT_START":
          return await this.start(userId, envelope);
        case "WORKOUT_AUTHORITY_TRANSFER":
          return await this.transferAuthority(userId, envelope);
        case "WORKOUT_TRANSITION":
          return await this.transition(userId, envelope);
        case "WORKOUT_EVENT":
          return await this.event(userId, envelope);
        case "WORKOUT_COMPLETE":
          return await this.complete(userId, envelope);
        default:
          return await this.reject(userId, envelope, "REJECTED", "UNSUPPORTED_WORKOUT_OPERATION");
      }
    } catch (error) {
      if (!(error instanceof ContractError)) throw error;
      const mapped = this.mapContractError(error.code);
      return await this.reject(userId, envelope, mapped.outcome, mapped.errorCode);
    }
  }

  private async start(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    if (envelope.expectedEntityRevision !== null && envelope.expectedEntityRevision !== 0) {
      return this.reject(userId, envelope, "STALE_REVISION", "WORKOUT_START_REQUIRES_EMPTY_REVISION");
    }
    const payload = asRecord(envelope.payload);
    const request: WorkoutStartRequest = {
      ...(envelope.entityId === "new" ? {} : { sessionId: envelope.entityId }),
      idempotencyKey: requireString(payload.idempotencyKey, "invalid_idempotency_key", "idempotencyKey"),
      authorityDeviceId: requireString(payload.authorityDeviceId, "invalid_device_id", "authorityDeviceId"),
      workoutType: requireString(payload.workoutType, "invalid_workout_type", "workoutType"),
      ...(typeof payload.planRevisionId === "string" && payload.planRevisionId.trim() ? { planRevisionId: payload.planRevisionId.trim() } : {}),
      occurredAtEpochMillis: Date.parse(envelope.occurredAtUtc),
      startActive: true,
    };
    this.assertEnvelopeBinding(envelope, request.idempotencyKey, request.authorityDeviceId);
    const result = await this.store.startWorkout(userId, request);
    return this.acceptResult(userId, envelope, result, null);
  }

  private async transferAuthority(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const sessionId = requireString(payload.sessionId, "invalid_session_id", "sessionId");
    const idempotencyKey = requireString(payload.idempotencyKey, "invalid_idempotency_key", "idempotencyKey");
    const authorityDeviceId = requireString(payload.authorityDeviceId, "invalid_device_id", "authorityDeviceId");
    const targetAuthorityDeviceId = requireString(payload.targetAuthorityDeviceId, "invalid_device_id", "targetAuthorityDeviceId");
    const expectedRevision = requireRevision(payload.expectedRevision);
    this.assertSessionEnvelope(envelope, sessionId, expectedRevision, idempotencyKey, authorityDeviceId);

    const session = await this.assertOwnedSession(userId, sessionId);
    if (session.authorityDeviceId !== authorityDeviceId) {
      throw new ContractError("authority_mismatch", "Only the current canonical workout authority may transfer execution.");
    }
    if (session.currentRevision !== expectedRevision) {
      throw new ContractError("stale_revision", "The workout revision changed before authority transfer.");
    }
    if (session.state === "COMPLETED" || session.state === "FAILED") {
      throw new ContractError("invalid_workout_state", "A terminal workout cannot transfer execution authority.");
    }
    if (targetAuthorityDeviceId === authorityDeviceId) {
      throw new ContractError("authority_mismatch", "Workout authority transfer must target a different approved device.");
    }
    await this.assertApprovedWatchTarget(userId, envelope.deviceSessionId, targetAuthorityDeviceId);

    await this.ownerRepository.updateOwned<WorkoutSessionRow>("workout_session", userId, sessionId, {
      authorityDeviceId: targetAuthorityDeviceId,
      currentRevision: session.currentRevision + 1,
    });
    const page = await this.store.listWorkouts(userId, { limit: 200 });
    const updated = page.sessions.find((candidate) => candidate.sessionId === sessionId);
    if (!updated) throw new ContractError("not_found", "Workout session disappeared after authority transfer.");
    return this.acceptResult(userId, envelope, { outcome: "ACCEPTED", session: updated }, null);
  }

  private async assertApprovedWatchTarget(userId: string, deviceSessionId: string, targetDeviceId: string): Promise<void> {
    const deviceSession = await this.ownerRepository.getOwned<DeviceSessionRow>("device_session", userId, deviceSessionId);
    if (!deviceSession || deviceSession.state !== "ACTIVE" || deviceSession.revokedAt ||
        (deviceSession.expiresAt && Date.parse(deviceSession.expiresAt) <= this.now().getTime())) {
      throw new ContractError("AUTHORITY_REVOKED", "Device session cannot authorize a Watch execution transfer.");
    }
    if (deviceSession.watchDeviceId !== targetDeviceId || deviceSession.phoneDeviceId === targetDeviceId) {
      throw new ContractError("authority_mismatch", "Authority may transfer only to the Watch paired in the active device session.");
    }
    const devices = await this.ownerRepository.listOwned<DeviceRow>("device", userId, {
      queries: [{ field: "deviceId", operator: "equal", value: targetDeviceId }],
      limit: 2,
    });
    const target = devices.rows[0];
    if (!target || target.revokedAt) {
      throw new ContractError("AUTHORITY_REVOKED", "Target Watch is revoked or not registered for this user.");
    }
  }

  private async transition(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const expectedRevision = requireRevision(payload.expectedRevision);
    const request: WorkoutTransitionRequest = {
      sessionId: requireString(payload.sessionId, "invalid_session_id", "sessionId"),
      idempotencyKey: requireString(payload.idempotencyKey, "invalid_idempotency_key", "idempotencyKey"),
      authorityDeviceId: requireString(payload.authorityDeviceId, "invalid_device_id", "authorityDeviceId"),
      action: requireString(payload.action, "invalid_transition", "action") as WorkoutTransitionRequest["action"],
      expectedRevision,
      occurredAtEpochMillis: Date.parse(envelope.occurredAtUtc),
      ...(typeof payload.reason === "string" && payload.reason.trim() ? { reason: payload.reason.trim().slice(0, 256) } : {}),
    };
    this.assertSessionEnvelope(envelope, request.sessionId, expectedRevision, request.idempotencyKey, request.authorityDeviceId);
    await this.assertOwnedSession(userId, request.sessionId);
    const result = await this.store.transitionWorkout(userId, request);
    return this.acceptResult(userId, envelope, result, null);
  }

  private async event(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    if (envelope.clientSequence === null) {
      return this.reject(userId, envelope, "INVALID_EVENT_ORDER", "WORKOUT_CLIENT_SEQUENCE_REQUIRED");
    }
    const payload = asRecord(envelope.payload);
    const expectedRevision = requireRevision(payload.expectedRevision);
    const request: WorkoutExerciseEventRequest = {
      sessionId: requireString(payload.sessionId, "invalid_session_id", "sessionId"),
      idempotencyKey: requireString(payload.idempotencyKey, "invalid_idempotency_key", "idempotencyKey"),
      authorityDeviceId: requireString(payload.authorityDeviceId, "invalid_device_id", "authorityDeviceId"),
      expectedRevision,
      eventType: requireString(payload.eventType, "invalid_workout_event", "eventType") as WorkoutExerciseEventRequest["eventType"],
      exerciseId: requireString(payload.exerciseId, "invalid_exercise_id", "exerciseId"),
      exerciseName: requireString(payload.exerciseName, "invalid_exercise_name", "exerciseName"),
      ...(typeof payload.setIndex === "number" ? { setIndex: payload.setIndex } : {}),
      ...(typeof payload.reps === "number" ? { reps: payload.reps } : {}),
      ...(typeof payload.loadKg === "number" ? { loadKg: payload.loadKg } : {}),
      ...(typeof payload.durationSeconds === "number" ? { durationSeconds: payload.durationSeconds } : {}),
      ...(typeof payload.distanceM === "number" ? { distanceM: payload.distanceM } : {}),
      ...(typeof payload.restSeconds === "number" ? { restSeconds: payload.restSeconds } : {}),
      ...(typeof payload.effortRpe === "number" ? { effortRpe: payload.effortRpe } : {}),
      ...(typeof payload.note === "string" ? { note: payload.note } : {}),
      occurredAtEpochMillis: Date.parse(envelope.occurredAtUtc),
    };
    this.assertSessionEnvelope(envelope, request.sessionId, expectedRevision, request.idempotencyKey, request.authorityDeviceId);
    const session = await this.assertOwnedSession(userId, request.sessionId);
    const expectedSequence = session.currentRevision + 1;
    if (envelope.clientSequence !== expectedSequence) {
      const existing = await this.eventAtSequence(userId, request.sessionId, envelope.clientSequence);
      if (existing && existing.idempotencyKey !== envelope.idempotencyKey) {
        return this.reject(userId, envelope, "CONCURRENT_EDIT", "WORKOUT_EVENT_SEQUENCE_CONFLICT", session.currentRevision);
      }
      return this.reject(userId, envelope, "INVALID_EVENT_ORDER", "WORKOUT_EVENT_OUT_OF_ORDER", session.currentRevision);
    }
    const existing = await this.eventAtSequence(userId, request.sessionId, envelope.clientSequence);
    if (existing && existing.idempotencyKey !== envelope.idempotencyKey) {
      return this.reject(userId, envelope, "CONCURRENT_EDIT", "WORKOUT_EVENT_SEQUENCE_CONFLICT", session.currentRevision);
    }
    const result = await this.store.recordWorkoutEvent(userId, request);
    return this.acceptResult(userId, envelope, result, result.event.eventId);
  }

  private async complete(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const expectedRevision = requireRevision(payload.expectedRevision);
    const request: WorkoutCompleteRequest = {
      sessionId: requireString(payload.sessionId, "invalid_session_id", "sessionId"),
      idempotencyKey: requireString(payload.idempotencyKey, "invalid_idempotency_key", "idempotencyKey"),
      authorityDeviceId: requireString(payload.authorityDeviceId, "invalid_device_id", "authorityDeviceId"),
      expectedRevision,
      occurredAtEpochMillis: Date.parse(envelope.occurredAtUtc),
      completeDirectly: true,
      ...(payload.summary && typeof payload.summary === "object" && !Array.isArray(payload.summary)
        ? { summary: payload.summary as Record<string, unknown> }
        : {}),
    };
    this.assertSessionEnvelope(envelope, request.sessionId, expectedRevision, request.idempotencyKey, request.authorityDeviceId);
    await this.assertOwnedSession(userId, request.sessionId);
    const result = await this.store.completeWorkout(userId, request);
    return this.acceptResult(userId, envelope, result, null);
  }

  private async acceptResult(
    userId: string,
    envelope: SyncEnvelope<unknown>,
    result: WorkoutMutationResult | { outcome: "ACCEPTED" | "DUPLICATE"; session: WorkoutSession },
    canonicalEventId: string | null,
  ): Promise<SyncReceipt> {
    await this.persistSessionRevision(userId, envelope, result.session, result.outcome);
    const cursor = await this.cursor.advance(
      userId,
      envelope,
      `workout:${sha256(result.session.sessionId).slice(0, 24)}`,
    );
    const outcome: "ACCEPTED" | "DUPLICATE" = result.outcome;
    const receipt = syncReceipt(envelope, outcome, this.now().toISOString(), {
      canonicalRevision: result.session.currentRevision,
      canonicalEventId,
      canonicalCursor: cursor,
    });
    await this.journal.record(userId, envelope, receipt);
    if (outcome === "ACCEPTED") await this.invalidate(userId, envelope, result.session);
    return receipt;
  }

  private async persistSessionRevision(
    userId: string,
    envelope: SyncEnvelope<unknown>,
    session: WorkoutSession,
    outcome: "ACCEPTED" | "DUPLICATE",
  ): Promise<void> {
    const rowId = sessionRevisionRowId(userId, session.sessionId, session.currentRevision);
    const existing = await this.serverRepository.getForUser<PersistedWorkoutSessionRevision>("workout_session_revision", userId, rowId);
    if (existing) {
      if (existing.payloadHash !== envelope.payloadHash || existing.sessionId !== session.sessionId) {
        throw new ContractError("workout_revision_conflict", "Canonical workout session revision already contains different data.");
      }
      return;
    }
    const payload = asRecord(envelope.payload);
    const row: PersistedWorkoutSessionRevision = {
      schemaVersion: 1,
      sessionRevisionId: rowId,
      sessionId: session.sessionId,
      userId,
      revision: session.currentRevision,
      baseRevision: Math.max(0, session.currentRevision - 1),
      state: session.state as WorkoutSessionRevision["state"],
      authorityDeviceId: session.authorityDeviceId,
      payloadHash: envelope.payloadHash,
      sourceDeviceId: envelope.deviceId,
      sourceOperationId: envelope.operationId,
      idempotencyKey: envelope.idempotencyKey,
      reasonCodes: [
        outcome === "DUPLICATE" ? "DUPLICATE_REPLAY" : "CANONICAL_RECONCILIATION",
        ...(typeof payload.reason === "string" && payload.reason.trim() ? [payload.reason.trim().slice(0, 128)] : []),
      ],
      occurredAt: envelope.occurredAtUtc,
      acceptedAt: this.now().toISOString(),
    };
    await this.serverRepository.createForUser("workout_session_revision", userId, rowId, row);
  }

  private async assertOwnedSession(userId: string, sessionId: string): Promise<WorkoutSessionRow> {
    const session = await this.ownerRepository.getOwned<WorkoutSessionRow>("workout_session", userId, sessionId);
    if (!session) throw new ContractError("not_found", "Workout session was not found for the authenticated user.");
    return session as WorkoutSessionRow;
  }

  private async eventAtSequence(userId: string, sessionId: string, sequence: number): Promise<WorkoutEventRow | null> {
    const rows = await this.ownerRepository.listOwned<WorkoutEventRow>("workout_event", userId, {
      queries: [
        { field: "sessionId", operator: "equal", value: sessionId },
        { field: "eventSequence", operator: "equal", value: sequence },
      ],
      limit: 2,
    });
    return rows.rows[0] ? rows.rows[0] as WorkoutEventRow : null;
  }

  private assertSessionEnvelope(
    envelope: SyncEnvelope<unknown>,
    sessionId: string,
    expectedRevision: number,
    idempotencyKey: string,
    authorityDeviceId: string,
  ): void {
    if (envelope.entityId !== sessionId) throw new ContractError("entity_contract_mismatch", "Workout entityId/sessionId differ.");
    if (envelope.expectedEntityRevision !== expectedRevision) throw new ContractError("revision_contract_mismatch", "Workout expected revisions differ.");
    this.assertEnvelopeBinding(envelope, idempotencyKey, authorityDeviceId);
  }

  private assertEnvelopeBinding(envelope: SyncEnvelope<unknown>, idempotencyKey: string, authorityDeviceId: string): void {
    if (envelope.idempotencyKey !== idempotencyKey) throw new ContractError("idempotency_contract_mismatch", "Workout idempotency keys differ.");
    if (envelope.deviceId !== authorityDeviceId) throw new ContractError("authority_mismatch", "Workout authority device must match the submitting device.");
  }

  private mapContractError(code: string): { outcome: SyncOutcome; errorCode: string } {
    switch (code) {
      case "stale_revision":
      case "revision_contract_mismatch":
        return { outcome: "STALE_REVISION", errorCode: "WORKOUT_REVISION_STALE" };
      case "invalid_event_sequence":
      case "invalid_timestamp_order":
        return { outcome: "INVALID_EVENT_ORDER", errorCode: "WORKOUT_EVENT_OUT_OF_ORDER" };
      case "authority_mismatch":
        return { outcome: "REJECTED", errorCode: "AUTHORITY_DEVICE_MISMATCH" };
      case "AUTHORITY_REVOKED":
        return { outcome: "AUTHORITY_REVOKED", errorCode: "AUTHORITY_REVOKED" };
      case "not_found":
        return { outcome: "CANONICAL_RECORD_MISSING", errorCode: "WORKOUT_SESSION_MISSING" };
      case "idempotency_key_reused":
        return { outcome: "REJECTED", errorCode: "IDEMPOTENCY_KEY_REUSED" };
      case "workout_revision_conflict":
        return { outcome: "CONCURRENT_EDIT", errorCode: "WORKOUT_REVISION_CONFLICT" };
      case "invalid_transition":
      case "invalid_workout_state":
        return { outcome: "DEPENDENCY_CHANGED", errorCode: "WORKOUT_STATE_CHANGED" };
      default:
        return { outcome: "REJECTED", errorCode: code.toUpperCase() };
    }
  }

  private async reject(
    userId: string,
    envelope: SyncEnvelope<unknown>,
    outcome: SyncOutcome,
    errorCode: string,
    canonicalRevision: number | null = null,
  ): Promise<SyncReceipt> {
    const receipt = syncReceipt(envelope, outcome, this.now().toISOString(), {
      canonicalRevision,
      errorCode,
    });
    await this.journal.record(userId, envelope, receipt, errorCode);
    return receipt;
  }

  private async invalidate(userId: string, envelope: SyncEnvelope<unknown>, session: WorkoutSession): Promise<void> {
    if (!this.invalidation) return;
    const domains = session.state === "COMPLETED"
      ? ["WORKOUT_SUMMARY", "TRAINING_PROGRESSION", "TODAY"] as const
      : ["WORKOUT_SUMMARY", "TODAY"] as const;
    for (const domain of domains) {
      await this.invalidation.markDirty({
        userId,
        domain,
        sourceType: "WORKOUT",
        sourceId: session.sessionId,
        sourceRevision: session.currentRevision,
        operationId: envelope.operationId,
        reasonCode: `WORKOUT_${session.state}`,
      });
    }
  }
}
