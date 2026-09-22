import type { OwnerScopedRepository, ServerOwnedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import {
  CanonicalSyncJournal,
  CanonicalSyncSecurityGate,
  syncReceipt,
  validateSyncEnvelope,
} from "../sync/canonical-reconciliation.ts";
import { AppwriteCalendarStore } from "./appwrite-calendar-store.ts";
import type {
  CalendarEntry,
  CalendarEntryDraft,
  CalendarSnapshot,
  LockCalendarEntryCommand,
  MoveCalendarEntryCommand,
  PlaceRestDayPayload,
  PlaceTrainingSessionPayload,
  ResolveMissedPlacementPayload,
  SetUnavailablePayload,
  SyncEnvelope,
  SyncReceipt,
  TrainingAdaptationBoundaryPayload,
} from "./types.ts";

export type CalendarOperation =
  | "MOVE_CALENDAR_ENTRY"
  | "LOCK_CALENDAR_ENTRY"
  | "RESOLVE_MISSED_PLACEMENT"
  | "SET_UNAVAILABLE"
  | "PLACE_REST_DAY"
  | "PLACE_TRAINING_SESSION"
  | "REQUEST_TRAINING_ADAPTATION";

export type CalendarProjectionInvalidator = (input: {
  userId: string;
  calendarRevision: number;
  operationId: string;
}) => void | Promise<void>;

export type TrainingAdaptationRequester = (input: {
  userId: string;
  entry: CalendarEntry;
  request: "SHORTEN" | "ADAPT";
  reasonCode: string;
  operationId: string;
}) => void | Promise<void>;

export type CanonicalTrainingSessionLookup = (input: {
  userId: string;
  semanticSessionId: string;
}) => Promise<{ planId: string; planRevision: number; localDate: string; expectedDurationMinutes: number } | null>;

type WorkoutSessionDependency = {
  sessionId: string;
  userId: string;
  state: string;
  currentRevision: number;
};

type WorkoutPlanDependency = {
  planId: string;
  userId: string;
  currentRevision: number;
  status: string;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError("invalid_calendar_command", "Calendar command payload must be an object.");
  }
  return value as Record<string, unknown>;
};

const requireString = (value: unknown, code: string, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) {
    throw new ContractError(code, `${label} is required.`);
  }
  return value.trim();
};

const requireRevision = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ContractError("invalid_expected_revision", "Expected Calendar revision must be a non-negative integer.");
  }
  return value;
};

const requireBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== "boolean") throw new ContractError("invalid_calendar_command", `${label} must be boolean.`);
  return value;
};

const toDraft = (entry: CalendarEntry): CalendarEntryDraft => ({
  entryId: entry.entryId,
  semanticObjectType: entry.semanticObjectType,
  semanticObjectId: entry.semanticObjectId,
  startAt: entry.startAt,
  endAt: entry.endAt,
  timezone: entry.timezone,
  localDate: entry.localDate,
  status: entry.status,
  locked: entry.locked,
  reasonCodes: [...entry.reasonCodes],
});

const localDateFor = (instant: string, timezone: string): string => {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    throw new ContractError("invalid_calendar_timezone", "Calendar timezone must be a valid IANA timezone.");
  }
};

const intervalsOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
  Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);

export class CalendarService {
  private readonly journal: CanonicalSyncJournal;
  private readonly security: CanonicalSyncSecurityGate;
  private readonly store: AppwriteCalendarStore;
  private readonly ownerRepository: OwnerScopedRepository;
  private readonly options: {
    onProjectionInvalidated?: CalendarProjectionInvalidator;
    requestTrainingAdaptation?: TrainingAdaptationRequester;
    canonicalTrainingSession?: CanonicalTrainingSessionLookup;
    now?: () => Date;
  };

  constructor(
    store: AppwriteCalendarStore,
    ownerRepository: OwnerScopedRepository,
    serverRepository: ServerOwnedRepository,
    options: {
      onProjectionInvalidated?: CalendarProjectionInvalidator;
      requestTrainingAdaptation?: TrainingAdaptationRequester;
      now?: () => Date;
    } = {},
  ) {
    this.store = store;
    this.ownerRepository = ownerRepository;
    this.options = options;
    this.journal = new CanonicalSyncJournal(serverRepository, options.now ?? (() => new Date()));
    this.security = new CanonicalSyncSecurityGate(ownerRepository, () => (options.now ?? (() => new Date()))().getTime());
  }

  async current(userId: string): Promise<CalendarSnapshot> {
    return this.store.readCurrent(userId);
  }

  async reconcile(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    validateSyncEnvelope(envelope);
    if (envelope.entityType !== "calendar" || envelope.entityId !== "primary") {
      throw new ContractError("invalid_calendar_envelope", "Calendar commands require entity calendar/primary.");
    }
    await this.security.assertAuthorized(userId, envelope);
    const replay = await this.journal.replay(userId, envelope);
    if (replay) return replay;

    switch (envelope.operation as CalendarOperation) {
      case "MOVE_CALENDAR_ENTRY":
        return this.move(userId, envelope as SyncEnvelope<MoveCalendarEntryCommand>);
      case "LOCK_CALENDAR_ENTRY":
        return this.lock(userId, envelope as SyncEnvelope<LockCalendarEntryCommand>);
      case "RESOLVE_MISSED_PLACEMENT":
        return this.resolveMissed(userId, envelope as SyncEnvelope<ResolveMissedPlacementPayload>);
      case "SET_UNAVAILABLE":
        return this.setUnavailable(userId, envelope as SyncEnvelope<SetUnavailablePayload>);
      case "PLACE_REST_DAY":
        return this.placeRestDay(userId, envelope as SyncEnvelope<PlaceRestDayPayload>);
      case "PLACE_TRAINING_SESSION":
        return this.placeTrainingSession(userId, envelope as SyncEnvelope<PlaceTrainingSessionPayload>);
      case "REQUEST_TRAINING_ADAPTATION":
        return this.requestAdaptation(userId, envelope as SyncEnvelope<TrainingAdaptationBoundaryPayload>);
      default:
        return this.reject(userId, envelope, "REJECTED", "UNSUPPORTED_CALENDAR_OPERATION");
    }
  }

  private async move(userId: string, envelope: SyncEnvelope<MoveCalendarEntryCommand>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const command: MoveCalendarEntryCommand = {
      schemaVersion: requireRevision(payload.schemaVersion),
      entryId: requireString(payload.entryId, "invalid_calendar_entry", "entryId"),
      expectedCalendarRevision: requireRevision(payload.expectedCalendarRevision),
      newStartAt: requireString(payload.newStartAt, "invalid_calendar_time", "newStartAt"),
      newEndAt: requireString(payload.newEndAt, "invalid_calendar_time", "newEndAt"),
      timezone: requireString(payload.timezone, "invalid_calendar_timezone", "timezone"),
      reasonCode: requireString(payload.reasonCode, "invalid_reason_code", "reasonCode"),
      idempotencyKey: requireString(payload.idempotencyKey, "invalid_idempotency_key", "idempotencyKey"),
    };
    this.assertCommandEnvelope(envelope, command.expectedCalendarRevision, command.idempotencyKey, command.schemaVersion);
    if (!Number.isFinite(Date.parse(command.newStartAt)) || !Number.isFinite(Date.parse(command.newEndAt)) ||
        Date.parse(command.newEndAt) <= Date.parse(command.newStartAt)) {
      throw new ContractError("invalid_calendar_time", "Move interval is invalid.");
    }
    const current = await this.store.readCurrent(userId);
    const entry = current.entries.find((candidate) => candidate.entryId === command.entryId);
    if (!entry) return this.reject(userId, envelope, "CANONICAL_RECORD_MISSING", "CALENDAR_ENTRY_MISSING", current.revision?.revision ?? 0);
    if (entry.locked) return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "CALENDAR_ENTRY_LOCKED", current.revision?.revision ?? 0);
    if (["COMPLETED", "CANCELLED"].includes(entry.status)) {
      return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "CALENDAR_ENTRY_TERMINAL", current.revision?.revision ?? 0);
    }
    if (!await this.sourceDependencyValid(userId, entry)) {
      return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "SOURCE_WORKOUT_CHANGED", current.revision?.revision ?? 0);
    }
    const startAt = new Date(command.newStartAt).toISOString();
    const endAt = new Date(command.newEndAt).toISOString();
    if (!await this.trainingIntervalMatches(userId, entry, startAt, endAt, command.timezone)) {
      return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "CANONICAL_TRAINING_DURATION_MISMATCH", current.revision?.revision ?? 0);
    }
    const conflict = current.entries.find((candidate) =>
      candidate.entryId !== entry.entryId && !["CANCELLED", "COMPLETED"].includes(candidate.status) &&
      intervalsOverlap(startAt, endAt, candidate.startAt, candidate.endAt));
    if (conflict) {
      return this.reject(userId, envelope, "CONCURRENT_EDIT",
        conflict.locked ? "LOCKED_ENTRY_OVERLAP" : "CALENDAR_OVERLAP", current.revision?.revision ?? 0);
    }
    const next = current.entries.map((candidate) => candidate.entryId === entry.entryId
      ? {
          ...toDraft(candidate),
          startAt,
          endAt,
          timezone: command.timezone,
          localDate: localDateFor(startAt, command.timezone),
          status: "SCHEDULED" as const,
          reasonCodes: [...candidate.reasonCodes, command.reasonCode],
        }
      : toDraft(candidate));
    return this.publishAndInvalidate(userId, envelope, command.expectedCalendarRevision, next, [command.reasonCode]);
  }

  private async lock(userId: string, envelope: SyncEnvelope<LockCalendarEntryCommand>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const command: LockCalendarEntryCommand = {
      schemaVersion: requireRevision(payload.schemaVersion),
      entryId: requireString(payload.entryId, "invalid_calendar_entry", "entryId"),
      expectedCalendarRevision: requireRevision(payload.expectedCalendarRevision),
      locked: requireBoolean(payload.locked, "locked"),
      idempotencyKey: requireString(payload.idempotencyKey, "invalid_idempotency_key", "idempotencyKey"),
    };
    this.assertCommandEnvelope(envelope, command.expectedCalendarRevision, command.idempotencyKey, command.schemaVersion);
    const current = await this.store.readCurrent(userId);
    const entry = current.entries.find((candidate) => candidate.entryId === command.entryId);
    if (!entry) return this.reject(userId, envelope, "CANONICAL_RECORD_MISSING", "CALENDAR_ENTRY_MISSING", current.revision?.revision ?? 0);
    const next = current.entries.map((candidate) => candidate.entryId === entry.entryId
      ? {
          ...toDraft(candidate),
          locked: command.locked,
          status: command.locked ? "LOCKED" as const : (candidate.status === "LOCKED" ? "SCHEDULED" as const : candidate.status),
          reasonCodes: [...candidate.reasonCodes, command.locked ? "USER_LOCKED" : "USER_UNLOCKED"],
        }
      : toDraft(candidate));
    return this.publishAndInvalidate(userId, envelope, command.expectedCalendarRevision, next, [command.locked ? "USER_LOCKED" : "USER_UNLOCKED"]);
  }

  private async resolveMissed(userId: string, envelope: SyncEnvelope<ResolveMissedPlacementPayload>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const entryId = requireString(payload.entryId, "invalid_calendar_entry", "entryId");
    const resolution = payload.resolution;
    const reasonCode = requireString(payload.reasonCode, "invalid_reason_code", "reasonCode");
    const expected = this.expectedFromEnvelope(envelope);
    const current = await this.store.readCurrent(userId);
    const entry = current.entries.find((candidate) => candidate.entryId === entryId);
    if (!entry) return this.reject(userId, envelope, "CANONICAL_RECORD_MISSING", "CALENDAR_ENTRY_MISSING", current.revision?.revision ?? 0);
    if (entry.locked) return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "CALENDAR_ENTRY_LOCKED", current.revision?.revision ?? 0);
    if (entry.status !== "MISSED") return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "ENTRY_NOT_MISSED", current.revision?.revision ?? 0);
    if (resolution !== "RESCHEDULE" && resolution !== "MARK_CANCELLED") {
      throw new ContractError("invalid_missed_resolution", "Unsupported missed-placement resolution.");
    }
    let replacement: CalendarEntryDraft;
    if (resolution === "MARK_CANCELLED") {
      replacement = { ...toDraft(entry), status: "CANCELLED", reasonCodes: [...entry.reasonCodes, reasonCode] };
    } else {
      if (!await this.sourceDependencyValid(userId, entry)) {
        return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "SOURCE_WORKOUT_CHANGED", current.revision?.revision ?? 0);
      }
      const startAtRaw = requireString(payload.newStartAt, "invalid_calendar_time", "newStartAt");
      const endAtRaw = requireString(payload.newEndAt, "invalid_calendar_time", "newEndAt");
      const timezone = requireString(payload.timezone, "invalid_calendar_timezone", "timezone");
      if (!Number.isFinite(Date.parse(startAtRaw)) || !Number.isFinite(Date.parse(endAtRaw)) || Date.parse(endAtRaw) <= Date.parse(startAtRaw)) {
        throw new ContractError("invalid_calendar_time", "Rescheduled interval is invalid.");
      }
      const startAt = new Date(startAtRaw).toISOString();
      const endAt = new Date(endAtRaw).toISOString();
      if (!await this.trainingIntervalMatches(userId, entry, startAt, endAt, timezone)) {
        return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "CANONICAL_TRAINING_DURATION_MISMATCH", current.revision?.revision ?? 0);
      }
      const conflict = current.entries.find((candidate) =>
        candidate.entryId !== entry.entryId && !["CANCELLED", "COMPLETED"].includes(candidate.status) &&
        intervalsOverlap(startAt, endAt, candidate.startAt, candidate.endAt));
      if (conflict) {
        return this.reject(userId, envelope, "CONCURRENT_EDIT",
          conflict.locked ? "LOCKED_ENTRY_OVERLAP" : "CALENDAR_OVERLAP", current.revision?.revision ?? 0);
      }
      replacement = {
        ...toDraft(entry),
        startAt,
        endAt,
        timezone,
        localDate: localDateFor(startAt, timezone),
        status: "SCHEDULED",
        reasonCodes: [...entry.reasonCodes, reasonCode],
      };
    }
    const next = current.entries.map((candidate) => candidate.entryId === entryId ? replacement : toDraft(candidate));
    return this.publishAndInvalidate(userId, envelope, expected, next, [reasonCode]);
  }

  private async setUnavailable(userId: string, envelope: SyncEnvelope<SetUnavailablePayload>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const entryId = requireString(payload.entryId, "invalid_calendar_entry", "entryId");
    const unavailable = requireBoolean(payload.unavailable, "unavailable");
    const reasonCode = requireString(payload.reasonCode, "invalid_reason_code", "reasonCode");
    const expected = this.expectedFromEnvelope(envelope);
    const current = await this.store.readCurrent(userId);
    const existing = current.entries.find((candidate) => candidate.entryId === entryId);
    let next: CalendarEntryDraft[];
    if (!unavailable) {
      if (!existing || existing.semanticObjectType !== "UNAVAILABLE") {
        return this.reject(userId, envelope, "CANONICAL_RECORD_MISSING", "UNAVAILABLE_ENTRY_MISSING", current.revision?.revision ?? 0);
      }
      next = current.entries.map((candidate) => candidate.entryId === entryId
        ? { ...toDraft(candidate), status: "CANCELLED", locked: false, reasonCodes: [...candidate.reasonCodes, reasonCode] }
        : toDraft(candidate));
    } else {
      const startAtRaw = requireString(payload.startAt, "invalid_calendar_time", "startAt");
      const endAtRaw = requireString(payload.endAt, "invalid_calendar_time", "endAt");
      const timezone = requireString(payload.timezone, "invalid_calendar_timezone", "timezone");
      if (!Number.isFinite(Date.parse(startAtRaw)) || !Number.isFinite(Date.parse(endAtRaw)) || Date.parse(endAtRaw) <= Date.parse(startAtRaw)) {
        throw new ContractError("invalid_calendar_time", "Unavailable interval is invalid.");
      }
      const startAt = new Date(startAtRaw).toISOString();
      const block: CalendarEntryDraft = {
        entryId,
        semanticObjectType: "UNAVAILABLE",
        semanticObjectId: entryId,
        startAt,
        endAt: new Date(endAtRaw).toISOString(),
        timezone,
        localDate: localDateFor(startAt, timezone),
        status: "LOCKED",
        locked: true,
        reasonCodes: [reasonCode],
      };
      next = existing
        ? current.entries.map((candidate) => candidate.entryId === entryId ? block : toDraft(candidate))
        : [...current.entries.map(toDraft), block];
    }
    return this.publishAndInvalidate(userId, envelope, expected, next, [reasonCode]);
  }

  private async placeRestDay(userId: string, envelope: SyncEnvelope<PlaceRestDayPayload>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const entryId = requireString(payload.entryId, "invalid_calendar_entry", "entryId");
    const startAtRaw = requireString(payload.startAt, "invalid_calendar_time", "startAt");
    const endAtRaw = requireString(payload.endAt, "invalid_calendar_time", "endAt");
    const timezone = requireString(payload.timezone, "invalid_calendar_timezone", "timezone");
    const reasonCode = requireString(payload.reasonCode, "invalid_reason_code", "reasonCode");
    const expected = this.expectedFromEnvelope(envelope);
    if (!Number.isFinite(Date.parse(startAtRaw)) || !Number.isFinite(Date.parse(endAtRaw)) || Date.parse(endAtRaw) <= Date.parse(startAtRaw)) {
      throw new ContractError("invalid_calendar_time", "Rest-day interval is invalid.");
    }
    const current = await this.store.readCurrent(userId);
    if (current.entries.some((entry) => entry.entryId === entryId)) {
      return this.reject(userId, envelope, "CONCURRENT_EDIT", "CALENDAR_ENTRY_ALREADY_EXISTS", current.revision?.revision ?? 0);
    }
    const startAt = new Date(startAtRaw).toISOString();
    const rest: CalendarEntryDraft = {
      entryId,
      semanticObjectType: "REST_DAY",
      semanticObjectId: entryId,
      startAt,
      endAt: new Date(endAtRaw).toISOString(),
      timezone,
      localDate: localDateFor(startAt, timezone),
      status: "SCHEDULED",
      locked: false,
      reasonCodes: [reasonCode],
    };
    return this.publishAndInvalidate(userId, envelope, expected, [...current.entries.map(toDraft), rest], [reasonCode]);
  }

  private async placeTrainingSession(userId: string, envelope: SyncEnvelope<PlaceTrainingSessionPayload>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const semanticSessionId = requireString(payload.semanticSessionId, "invalid_training_session", "semanticSessionId");
    const startAtRaw = requireString(payload.startAt, "invalid_calendar_time", "startAt");
    const timezone = requireString(payload.timezone, "invalid_calendar_timezone", "timezone");
    const reasonCode = requireString(payload.reasonCode, "invalid_reason_code", "reasonCode");
    const expected = this.expectedFromEnvelope(envelope);
    if (!Number.isFinite(Date.parse(startAtRaw))) throw new ContractError("invalid_calendar_time", "Training placement startAt is invalid.");
    const session = await this.options.canonicalTrainingSession?.({ userId, semanticSessionId });
    if (!session) return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "CANONICAL_TRAINING_SESSION_MISSING");
    if (!Number.isInteger(session.expectedDurationMinutes) || session.expectedDurationMinutes <= 0) {
      return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "CANONICAL_TRAINING_DURATION_INVALID");
    }
    const startAt = new Date(startAtRaw).toISOString();
    if (localDateFor(startAt, timezone) !== session.localDate) {
      return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "TRAINING_LOCAL_DATE_MISMATCH");
    }
    const endAt = new Date(Date.parse(startAt) + session.expectedDurationMinutes * 60_000).toISOString();
    const current = await this.store.readCurrent(userId);
    if (current.entries.some((entry) => entry.semanticObjectType === "TRAINING_SESSION" && entry.semanticObjectId === semanticSessionId && !["CANCELLED", "COMPLETED"].includes(entry.status))) {
      return this.reject(userId, envelope, "CONCURRENT_EDIT", "TRAINING_SESSION_ALREADY_PLACED", current.revision?.revision ?? 0);
    }
    const conflict = current.entries.find((entry) => !["CANCELLED", "COMPLETED"].includes(entry.status) && intervalsOverlap(startAt, endAt, entry.startAt, entry.endAt));
    if (conflict) return this.reject(userId, envelope, "CONCURRENT_EDIT", conflict.locked ? "LOCKED_ENTRY_OVERLAP" : "CALENDAR_OVERLAP", current.revision?.revision ?? 0);
    const entry: CalendarEntryDraft = {
      entryId: `training-${session.planId}-${session.planRevision}-${semanticSessionId}`.slice(0, 128),
      semanticObjectType: "TRAINING_SESSION",
      semanticObjectId: semanticSessionId,
      startAt,
      endAt,
      timezone,
      localDate: session.localDate,
      status: "SCHEDULED",
      locked: false,
      reasonCodes: ["CANONICAL_TRAINING", `PLAN_REVISION_${session.planRevision}`, reasonCode],
    };
    return this.publishAndInvalidate(userId, envelope, expected, [...current.entries.map(toDraft), entry], [reasonCode]);
  }

  private async requestAdaptation(userId: string, envelope: SyncEnvelope<TrainingAdaptationBoundaryPayload>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const entryId = requireString(payload.entryId, "invalid_calendar_entry", "entryId");
    const request = payload.request;
    const reasonCode = requireString(payload.reasonCode, "invalid_reason_code", "reasonCode");
    if (request !== "SHORTEN" && request !== "ADAPT") throw new ContractError("invalid_training_adaptation_request", "Unsupported Training adaptation request.");
    const current = await this.store.readCurrent(userId);
    const entry = current.entries.find((candidate) => candidate.entryId === entryId);
    if (!entry) return this.reject(userId, envelope, "CANONICAL_RECORD_MISSING", "CALENDAR_ENTRY_MISSING", current.revision?.revision ?? 0);
    if (!entry.semanticObjectType.toUpperCase().includes("WORKOUT")) {
      return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "ENTRY_IS_NOT_WORKOUT", current.revision?.revision ?? 0);
    }
    if (!this.options.requestTrainingAdaptation) {
      return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "TRAINING_ADAPTATION_UNAVAILABLE", current.revision?.revision ?? 0);
    }
    await this.options.requestTrainingAdaptation({ userId, entry, request, reasonCode, operationId: envelope.operationId });
    const receipt = syncReceipt(envelope, "ACCEPTED", (this.options.now ?? (() => new Date()))().toISOString(), {
      canonicalRevision: current.revision?.revision ?? 0,
    });
    await this.journal.record(userId, envelope, receipt);
    return receipt;
  }

  private assertCommandEnvelope(envelope: SyncEnvelope<unknown>, expected: number, idempotencyKey: string, schemaVersion: number): void {
    if (schemaVersion !== 1) throw new ContractError("SCHEMA_MISMATCH", "Unsupported Calendar command schema version.");
    if (idempotencyKey !== envelope.idempotencyKey) throw new ContractError("idempotency_contract_mismatch", "Payload/envelope idempotency keys differ.");
    if (envelope.expectedEntityRevision !== expected) throw new ContractError("revision_contract_mismatch", "Payload/envelope expected revisions differ.");
  }

  private expectedFromEnvelope(envelope: SyncEnvelope<unknown>): number {
    if (envelope.expectedEntityRevision === null) throw new ContractError("expected_revision_required", "Calendar mutation requires expectedEntityRevision.");
    return requireRevision(envelope.expectedEntityRevision);
  }

  private async sourceDependencyValid(userId: string, entry: CalendarEntry): Promise<boolean> {
    if (!entry.semanticObjectType.toUpperCase().includes("WORKOUT")) return true;
    const session = await this.ownerRepository.getOwned<WorkoutSessionDependency>("workout_session", userId, entry.semanticObjectId);
    if (session) return !["COMPLETED", "DISCARDED", "FAILED"].includes(session.state);
    const plan = await this.ownerRepository.getOwned<WorkoutPlanDependency>("workout_plan", userId, entry.semanticObjectId);
    return Boolean(plan && plan.status !== "DELETED");
  }

  private async trainingIntervalMatches(userId: string, entry: CalendarEntry, startAt: string, endAt: string, timezone: string): Promise<boolean> {
    if (entry.semanticObjectType !== "TRAINING_SESSION") return true;
    const session = await this.options.canonicalTrainingSession?.({ userId, semanticSessionId: entry.semanticObjectId });
    if (!session || localDateFor(startAt, timezone) !== session.localDate) return false;
    return Date.parse(endAt) - Date.parse(startAt) === session.expectedDurationMinutes * 60_000;
  }

  private async publishAndInvalidate(
    userId: string,
    envelope: SyncEnvelope<unknown>,
    expectedCalendarRevision: number,
    entries: CalendarEntryDraft[],
    reasonCodes: string[],
  ): Promise<SyncReceipt> {
    const receipt = await this.store.publish(userId, { envelope, expectedCalendarRevision, entries, reasonCodes });
    if (receipt.outcome === "ACCEPTED" && receipt.canonicalRevision !== null) {
      await this.options.onProjectionInvalidated?.({
        userId,
        calendarRevision: receipt.canonicalRevision,
        operationId: envelope.operationId,
      });
    }
    return receipt;
  }

  private async reject(
    userId: string,
    envelope: SyncEnvelope<unknown>,
    outcome: "CONCURRENT_EDIT" | "DEPENDENCY_CHANGED" | "CANONICAL_RECORD_MISSING" | "REJECTED",
    errorCode: string,
    canonicalRevision: number | null = null,
  ): Promise<SyncReceipt> {
    const receipt = syncReceipt(envelope, outcome, (this.options.now ?? (() => new Date()))().toISOString(), {
      canonicalRevision,
      errorCode,
    });
    await this.journal.record(userId, envelope, receipt, outcome);
    return receipt;
  }
}
