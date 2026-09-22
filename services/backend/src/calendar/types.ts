import type {
  CalendarEntry,
  CalendarEntryStatus,
  CalendarRevision,
  LockCalendarEntryCommand,
  MoveCalendarEntryCommand,
  RetryClass,
  SourcePlatform,
  SyncEnvelope,
  SyncOutcome,
  SyncReceipt,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

export type {
  CalendarEntry,
  CalendarEntryStatus,
  CalendarRevision,
  LockCalendarEntryCommand,
  MoveCalendarEntryCommand,
  RetryClass,
  SourcePlatform,
  SyncEnvelope,
  SyncOutcome,
  SyncReceipt,
};

/** Read projection over the latest published immutable Calendar revision. */
export type CalendarSnapshot = {
  revision: CalendarRevision | null;
  entries: CalendarEntry[];
};

/**
 * Internal publication draft. This is not a transport contract; canonical
 * transport uses SyncEnvelope and canonical persisted rows use CalendarEntry /
 * CalendarRevision from contracts/generated.
 */
export type CalendarEntryDraft = {
  entryId: string;
  semanticObjectType: string;
  semanticObjectId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  localDate: string;
  status: CalendarEntryStatus;
  locked: boolean;
  reasonCodes: string[];
};

export type CalendarPublicationRequest = {
  envelope: SyncEnvelope<unknown>;
  expectedCalendarRevision: number;
  entries: CalendarEntryDraft[];
  reasonCodes: string[];
};

/** Internal service payloads; these do not redefine canonical persisted/wire types. */
export type ResolveMissedPlacementPayload = {
  entryId: string;
  resolution: "RESCHEDULE" | "MARK_CANCELLED";
  newStartAt?: string;
  newEndAt?: string;
  timezone?: string;
  reasonCode: string;
};

export type SetUnavailablePayload = {
  entryId: string;
  unavailable: boolean;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  reasonCode: string;
};

export type PlaceRestDayPayload = {
  entryId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  localDate: string;
  reasonCode: string;
};

/** A Calendar command may place an already-canonical Training session in time.
 * It deliberately contains no prescription fields: Calendar owns WHEN only. */
export type PlaceTrainingSessionPayload = {
  semanticSessionId: string;
  startAt: string;
  timezone: string;
  reasonCode: string;
};

export type TrainingAdaptationBoundaryPayload = {
  entryId: string;
  request: "SHORTEN" | "ADAPT";
  reasonCode: string;
};
