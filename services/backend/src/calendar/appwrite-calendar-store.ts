import { sha256 } from "../domain/sync-store.ts";
import type { ServerOwnedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import {
  CanonicalSyncCursorStore,
  CanonicalSyncJournal,
  syncReceipt,
  validateSyncEnvelope,
} from "../sync/canonical-reconciliation.ts";
import type {
  CalendarEntry,
  CalendarEntryDraft,
  CalendarPublicationRequest,
  CalendarRevision,
  CalendarSnapshot,
  SyncReceipt,
} from "./types.ts";

type CalendarRevisionRow = Omit<CalendarRevision, "reasonCodes"> & {
  reasonCodesJson: string;
};

type CalendarEntryRow = Omit<CalendarEntry, "reasonCodes"> & {
  entryRowId: string;
  reasonCodesJson: string;
};

const requireId = (value: unknown, code: string, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) {
    throw new ContractError(code, `${label} is required.`);
  }
  return value.trim();
};

const requireReasonCodes = (values: readonly string[]): string[] => {
  if (!Array.isArray(values) || values.length > 32) throw new ContractError("invalid_reason_codes", "Too many Calendar reason codes.");
  return values.map((value) => requireId(value, "invalid_reason_code", "reasonCode"));
};

const revisionRowId = (userId: string, revision: number): string =>
  `calendar-revision-${sha256({ userId, revision }).slice(0, 48)}`;

const entryRowId = (userId: string, revision: number, entryId: string): string =>
  `calendar-entry-${sha256({ userId, revision, entryId }).slice(0, 48)}`;

const localDateFor = (instant: string, timezone: string): string => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const normalizeDraft = (input: CalendarEntryDraft): CalendarEntryDraft => {
  const entryId = requireId(input.entryId, "invalid_calendar_entry", "entryId");
  const semanticObjectType = requireId(input.semanticObjectType, "invalid_calendar_entry", "semanticObjectType");
  const semanticObjectId = requireId(input.semanticObjectId, "invalid_calendar_entry", "semanticObjectId");
  if (!Number.isFinite(Date.parse(input.startAt)) || !Number.isFinite(Date.parse(input.endAt))) {
    throw new ContractError("invalid_calendar_time", "Calendar start/end must be valid timestamps.");
  }
  const startAt = new Date(input.startAt).toISOString();
  const endAt = new Date(input.endAt).toISOString();
  if (Date.parse(endAt) <= Date.parse(startAt)) throw new ContractError("invalid_calendar_time", "Calendar end must be after start.");
  const timezone = requireId(input.timezone, "invalid_calendar_timezone", "timezone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
  } catch {
    throw new ContractError("invalid_calendar_timezone", "Calendar timezone must be a valid IANA timezone.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.localDate) || localDateFor(startAt, timezone) !== input.localDate) {
    throw new ContractError("invalid_calendar_local_date", "localDate must match startAt in the supplied timezone.");
  }
  if (!["SCHEDULED", "LOCKED", "CONFLICT", "MISSED", "COMPLETED", "CANCELLED"].includes(input.status)) {
    throw new ContractError("invalid_calendar_status", "Unsupported Calendar entry status.");
  }
  return {
    entryId,
    semanticObjectType,
    semanticObjectId,
    startAt,
    endAt,
    timezone,
    localDate: input.localDate,
    status: input.status,
    locked: input.locked === true,
    reasonCodes: requireReasonCodes(input.reasonCodes),
  };
};

const comparableDraft = (draft: CalendarEntryDraft): Record<string, unknown> => ({
  entryId: draft.entryId,
  semanticObjectType: draft.semanticObjectType,
  semanticObjectId: draft.semanticObjectId,
  startAt: draft.startAt,
  endAt: draft.endAt,
  timezone: draft.timezone,
  localDate: draft.localDate,
  status: draft.status,
  locked: draft.locked,
  reasonCodes: draft.reasonCodes,
});

const entryHash = (entries: readonly CalendarEntryDraft[]): string =>
  sha256(entries.map(comparableDraft));

const fromRevisionRow = (row: CalendarRevisionRow): CalendarRevision => ({
  schemaVersion: row.schemaVersion,
  calendarRevisionId: row.calendarRevisionId,
  userId: row.userId,
  revision: row.revision,
  baseRevision: row.baseRevision,
  entryHash: row.entryHash,
  operationId: row.operationId,
  idempotencyKey: row.idempotencyKey,
  reasonCodes: JSON.parse(row.reasonCodesJson) as string[],
  publishedAt: row.publishedAt,
});

const fromEntryRow = (row: CalendarEntryRow): CalendarEntry => ({
  schemaVersion: row.schemaVersion,
  entryId: row.entryId,
  userId: row.userId,
  calendarRevisionId: row.calendarRevisionId,
  calendarRevision: row.calendarRevision,
  semanticObjectType: row.semanticObjectType,
  semanticObjectId: row.semanticObjectId,
  startAt: row.startAt,
  endAt: row.endAt,
  timezone: row.timezone,
  localDate: row.localDate,
  status: row.status,
  locked: row.locked,
  reasonCodes: JSON.parse(row.reasonCodesJson) as string[],
});

/**
 * Immutable Calendar publication store.
 *
 * Entry rows for N+1 are prepared first. They are invisible because readers
 * only resolve entries through an existing calendar_revision publication row.
 * The deterministic revision-row create is therefore the publication gate.
 */
export class AppwriteCalendarStore {
  private readonly journal: CanonicalSyncJournal;
  private readonly cursors: CanonicalSyncCursorStore;
  private readonly repository: ServerOwnedRepository;

  constructor(
    repository: ServerOwnedRepository,
    options: { now?: () => Date; nowMillis?: () => number } = {},
  ) {
    this.repository = repository;
    this.now = options.now ?? (() => new Date());
    this.journal = new CanonicalSyncJournal(repository, this.now);
    this.cursors = new CanonicalSyncCursorStore(repository, options.nowMillis ?? (() => this.now().getTime()));
  }

  private readonly now: () => Date;

  async readCurrent(userId: string): Promise<CalendarSnapshot> {
    const owner = requireId(userId, "invalid_user_id", "userId");
    const revisions = await this.repository.listForUser<CalendarRevisionRow>("calendar_revision", owner, { limit: 500 });
    const latest = [...revisions.rows].sort((left, right) => right.revision - left.revision)[0];
    if (!latest) return { revision: null, entries: [] };
    const revision = fromRevisionRow(latest);
    const entries = await this.entriesForRevision(owner, revision.calendarRevisionId);
    return { revision, entries };
  }

  async readRevision(userId: string, revision: number): Promise<CalendarSnapshot | null> {
    const owner = requireId(userId, "invalid_user_id", "userId");
    if (!Number.isInteger(revision) || revision < 1) throw new ContractError("invalid_calendar_revision", "revision must be positive.");
    const row = await this.repository.getForUser<CalendarRevisionRow>("calendar_revision", owner, revisionRowId(owner, revision));
    if (!row) return null;
    return { revision: fromRevisionRow(row), entries: await this.entriesForRevision(owner, row.calendarRevisionId) };
  }

  async publish(userId: string, request: CalendarPublicationRequest): Promise<SyncReceipt> {
    const owner = requireId(userId, "invalid_user_id", "userId");
    validateSyncEnvelope(request.envelope);
    if (request.envelope.entityType !== "calendar" || request.envelope.entityId !== "primary") {
      throw new ContractError("invalid_calendar_envelope", "Calendar publication requires entity calendar/primary.");
    }
    if (request.envelope.expectedEntityRevision !== request.expectedCalendarRevision) {
      throw new ContractError("revision_contract_mismatch", "Envelope and Calendar expected revisions differ.");
    }
    if (!Array.isArray(request.entries) || request.entries.length > 500) {
      throw new ContractError("invalid_calendar_entries", "Calendar revision must contain at most 500 entries.");
    }

    const replay = await this.journal.replay(owner, request.envelope);
    if (replay) return replay;

    const entries = request.entries.map(normalizeDraft).sort((left, right) => left.entryId.localeCompare(right.entryId));
    if (new Set(entries.map((entry) => entry.entryId)).size !== entries.length) {
      throw new ContractError("duplicate_calendar_entry", "Calendar entries must have unique entryId values.");
    }
    const reasons = requireReasonCodes(request.reasonCodes);
    const current = await this.readCurrent(owner);
    const currentRevision = current.revision?.revision ?? 0;
    if (request.expectedCalendarRevision !== currentRevision) {
      return this.finish(owner, request.envelope,
        syncReceipt(request.envelope, "STALE_REVISION", this.now().toISOString(), {
          canonicalRevision: currentRevision,
          errorCode: "CALENDAR_REVISION_MISMATCH",
        }),
        "STALE_REVISION");
    }

    const nextRevision = currentRevision + 1;
    const nextRevisionId = revisionRowId(owner, nextRevision);
    const hash = entryHash(entries);

    // If an accepted publication exists but the sync-operation response was
    // lost, recover the canonical result before preparing anything again.
    const priorPublication = await this.repository.listForUser<CalendarRevisionRow>("calendar_revision", owner, {
      queries: [{ field: "operationId", operator: "equal", value: request.envelope.operationId }],
      limit: 2,
    });
    const prior = priorPublication.rows[0];
    if (prior) {
      const same = prior.idempotencyKey === request.envelope.idempotencyKey && prior.entryHash === hash;
      const recovered = syncReceipt(request.envelope, same ? "DUPLICATE" : "REJECTED", this.now().toISOString(), {
        canonicalRevision: prior.revision,
        errorCode: same ? null : "IDEMPOTENCY_KEY_REUSED",
      });
      if (same) await this.journal.record(owner, request.envelope, recovered);
      return recovered;
    }

    for (const draft of entries) {
      const data: CalendarEntryRow = {
        entryRowId: entryRowId(owner, nextRevision, draft.entryId),
        schemaVersion: 1,
        entryId: draft.entryId,
        userId: owner,
        calendarRevisionId: nextRevisionId,
        calendarRevision: nextRevision,
        semanticObjectType: draft.semanticObjectType,
        semanticObjectId: draft.semanticObjectId,
        startAt: draft.startAt,
        endAt: draft.endAt,
        timezone: draft.timezone,
        localDate: draft.localDate,
        status: draft.status,
        locked: draft.locked,
        reasonCodesJson: JSON.stringify(draft.reasonCodes),
      };
      const existing = await this.repository.getForUser<CalendarEntryRow>("calendar_entry", owner, data.entryRowId);
      if (existing) {
        const existingDraft: CalendarEntryDraft = {
          entryId: existing.entryId,
          semanticObjectType: existing.semanticObjectType,
          semanticObjectId: existing.semanticObjectId,
          startAt: existing.startAt,
          endAt: existing.endAt,
          timezone: existing.timezone,
          localDate: existing.localDate,
          status: existing.status,
          locked: existing.locked,
          reasonCodes: JSON.parse(existing.reasonCodesJson) as string[],
        };
        if (sha256(comparableDraft(existingDraft)) !== sha256(comparableDraft(draft))) {
          return this.finish(owner, request.envelope,
            syncReceipt(request.envelope, "CONCURRENT_EDIT", this.now().toISOString(), {
              canonicalRevision: currentRevision,
              errorCode: "CALENDAR_PREPARE_CONFLICT",
            }),
            "CONCURRENT_EDIT");
        }
        continue;
      }
      await this.repository.createForUser("calendar_entry", owner, data.entryRowId, data);
    }

    const prepared = await this.entriesForRevision(owner, nextRevisionId);
    const preparedDrafts = prepared.map((entry): CalendarEntryDraft => ({
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
    })).sort((left, right) => left.entryId.localeCompare(right.entryId));
    if (preparedDrafts.length !== entries.length || entryHash(preparedDrafts) !== hash) {
      return this.finish(owner, request.envelope,
        syncReceipt(request.envelope, "CONCURRENT_EDIT", this.now().toISOString(), {
          canonicalRevision: currentRevision,
          errorCode: "CALENDAR_PREPARED_SET_MISMATCH",
        }),
        "CONCURRENT_EDIT");
    }

    const revisionRow: CalendarRevisionRow = {
      schemaVersion: 1,
      calendarRevisionId: nextRevisionId,
      userId: owner,
      revision: nextRevision,
      baseRevision: currentRevision,
      entryHash: hash,
      operationId: request.envelope.operationId,
      idempotencyKey: request.envelope.idempotencyKey,
      reasonCodesJson: JSON.stringify(reasons),
      publishedAt: this.now().toISOString(),
    };

    try {
      await this.repository.createForUser("calendar_revision", owner, nextRevisionId, revisionRow);
    } catch {
      const winner = await this.repository.getForUser<CalendarRevisionRow>("calendar_revision", owner, nextRevisionId);
      if (!winner || winner.operationId !== request.envelope.operationId || winner.entryHash !== hash) {
        const latest = await this.readCurrent(owner);
        return this.finish(owner, request.envelope,
          syncReceipt(request.envelope, "CONCURRENT_EDIT", this.now().toISOString(), {
            canonicalRevision: latest.revision?.revision ?? currentRevision,
            errorCode: "CALENDAR_PUBLICATION_CONFLICT",
          }),
          "CONCURRENT_EDIT");
      }
    }

    const cursor = await this.cursors.advance(owner, request.envelope, "calendar");
    return this.finish(owner, request.envelope,
      syncReceipt(request.envelope, "ACCEPTED", this.now().toISOString(), {
        canonicalRevision: nextRevision,
        canonicalCursor: cursor,
      }));
  }

  private async entriesForRevision(userId: string, calendarRevisionId: string): Promise<CalendarEntry[]> {
    const rows = await this.repository.listForUser<CalendarEntryRow>("calendar_entry", userId, {
      queries: [{ field: "calendarRevisionId", operator: "equal", value: calendarRevisionId }],
      limit: 500,
    });
    return rows.rows.map(fromEntryRow).sort((left, right) => left.entryId.localeCompare(right.entryId));
  }

  private async finish(
    userId: string,
    envelope: CalendarPublicationRequest["envelope"],
    receipt: SyncReceipt,
    conflictCode?: string,
  ): Promise<SyncReceipt> {
    await this.journal.record(userId, envelope, receipt, conflictCode);
    return receipt;
  }
}
