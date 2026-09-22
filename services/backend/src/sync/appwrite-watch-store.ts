import { sha256 } from "../domain/sync-store.ts";
import type { RepositoryRow, ServerOwnedRepository } from "../foundation/repository.ts";
import { ContractError, parseDailyRingSummary, type DailyRingSummary } from "../shared/contracts.ts";
import type {
  LegacySummaryWatchDelivery,
  LegacySummaryWatchDeliveryAttempt,
  LegacySummaryWatchDeliveryRequest,
  LegacySummaryWatchDeliveryState,
  LegacySummaryWatchReceipt,
  LegacySummaryWatchReceiptOutcome,
  LegacySummaryWatchReceiptRequest,
  LegacySummaryWatchReceiptStatus,
} from "./types.ts";

type WatchDeliveryRow = {
  deliveryId: string;
  userId: string;
  summaryId: string;
  revision: number;
  phoneDeviceId: string;
  watchDeviceId: string;
  state: LegacySummaryWatchDeliveryState;
  attemptCount: number;
  lastAttemptAt?: string;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
};

type WatchReceiptRow = {
  receiptId: string;
  userId: string;
  deliveryId: string;
  summaryId: string;
  revision: number;
  result: LegacySummaryWatchReceiptStatus;
  outcome: LegacySummaryWatchReceiptOutcome;
  watchDeviceId: string;
  persistedAt?: string;
  receivedAt: string;
  createdAt: string;
};

const requireString = (value: unknown, code: string, message: string): string => {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) {
    throw new ContractError(code, message);
  }
  return value.trim();
};

const requireRevision = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ContractError("invalid_revision", "revision must be a non-negative integer.");
  }
  return value;
};

const requireTimestamp = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ContractError("invalid_timestamp", "timestamp must be a positive integer.");
  }
  return value;
};

const iso = (epochMillis: number): string => new Date(requireTimestamp(epochMillis)).toISOString();
const epoch = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const deliveryRowId = (userId: string, watchDeviceId: string, summaryId: string, revision: number) =>
  `watch-delivery-${sha256({ userId, watchDeviceId, summaryId, revision }).slice(0, 48)}`;

const receiptRowId = (userId: string, request: LegacySummaryWatchReceiptRequest) =>
  `watch-receipt-${sha256({
    userId,
    deliveryId: request.deliveryId,
    watchDeviceId: request.watchDeviceId,
    summaryId: request.summaryId,
    revision: request.revision,
    result: request.result,
  }).slice(0, 49)}`;

function parsePayload(row: RepositoryRow<WatchDeliveryRow>): DailyRingSummary {
  try {
    return parseDailyRingSummary(JSON.parse(row.payloadJson));
  } catch {
    throw new ContractError("watch_delivery_corrupt", "Stored watch delivery payload is invalid.");
  }
}

function deliveryFromRow(row: RepositoryRow<WatchDeliveryRow>): LegacySummaryWatchDelivery {
  const createdAtEpochMillis = epoch(row.createdAt);
  const updatedAtEpochMillis = epoch(row.updatedAt);
  if (!createdAtEpochMillis || !updatedAtEpochMillis) {
    throw new ContractError("watch_delivery_corrupt", "Stored watch delivery timestamps are invalid.");
  }
  return {
    deliveryId: row.deliveryId,
    summaryId: row.summaryId,
    revision: row.revision,
    phoneDeviceId: row.phoneDeviceId,
    watchDeviceId: row.watchDeviceId,
    state: row.state,
    attemptCount: row.attemptCount,
    ...(epoch(row.lastAttemptAt) ? { lastAttemptAtEpochMillis: epoch(row.lastAttemptAt) } : {}),
    createdAtEpochMillis,
    updatedAtEpochMillis,
    payload: parsePayload(row),
  };
}

function receiptFromRow(row: RepositoryRow<WatchReceiptRow>, outcomeOverride?: LegacySummaryWatchReceiptOutcome): LegacySummaryWatchReceipt {
  const receivedAtEpochMillis = epoch(row.receivedAt);
  if (!receivedAtEpochMillis) throw new ContractError("watch_receipt_corrupt", "Stored watch receipt timestamp is invalid.");
  return {
    receiptId: row.receiptId,
    deliveryId: row.deliveryId,
    summaryId: row.summaryId,
    revision: row.revision,
    watchDeviceId: row.watchDeviceId,
    result: row.result,
    receivedAtEpochMillis,
    outcome: outcomeOverride ?? row.outcome,
  };
}

/** Durable server-owned Appwrite persistence for the legacy summary watch relay. */
export class AppwriteWatchStore {
  private readonly repository: ServerOwnedRepository;
  private readonly now: () => number;

  constructor(
    repository: ServerOwnedRepository,
    now: () => number = () => Date.now(),
  ) {
    this.repository = repository;
    this.now = now;
  }

  async createWatchDelivery(userId: string, request: LegacySummaryWatchDeliveryRequest): Promise<{ delivery: LegacySummaryWatchDelivery; created: boolean }> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const phoneDeviceId = requireString(request.phoneDeviceId, "invalid_device_id", "phoneDeviceId is required.");
    const watchDeviceId = requireString(request.watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    const summary = parseDailyRingSummary(request.summary);
    const rowId = deliveryRowId(owner, watchDeviceId, summary.summaryId, summary.revision);
    const existing = await this.repository.getForUser<WatchDeliveryRow>("watch_delivery", owner, rowId);
    if (existing) return { delivery: deliveryFromRow(existing), created: false };

    const timestamp = iso(this.now());
    const row: WatchDeliveryRow = {
      deliveryId: rowId,
      userId: owner,
      summaryId: summary.summaryId,
      revision: summary.revision,
      phoneDeviceId,
      watchDeviceId,
      state: "PENDING",
      attemptCount: 0,
      payloadJson: JSON.stringify(summary),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    try {
      const created = await this.repository.createForUser("watch_delivery", owner, rowId, row);
      return { delivery: deliveryFromRow(created), created: true };
    } catch (error) {
      const raced = await this.repository.getForUser<WatchDeliveryRow>("watch_delivery", owner, rowId);
      if (raced) return { delivery: deliveryFromRow(raced), created: false };
      throw error;
    }
  }

  async listWatchDeliveries(userId: string, watchDeviceId: string): Promise<LegacySummaryWatchDelivery[]> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const watch = requireString(watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    const result = await this.repository.listForUser<WatchDeliveryRow>("watch_delivery", owner, {
      queries: [{ field: "watchDeviceId", operator: "equal", value: watch }],
      limit: 500,
    });
    return result.rows
      .map(deliveryFromRow)
      .sort((left, right) => left.createdAtEpochMillis - right.createdAtEpochMillis);
  }

  async markWatchAttempt(userId: string, deliveryId: string, attemptedAtEpochMillis = this.now()): Promise<LegacySummaryWatchDeliveryAttempt> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const id = requireString(deliveryId, "invalid_delivery_id", "deliveryId is required.");
    const row = await this.repository.getForUser<WatchDeliveryRow>("watch_delivery", owner, id);
    if (!row) throw new ContractError("watch_delivery_not_found", "Watch delivery was not found.");
    if (["ACKNOWLEDGED", "REJECTED", "EXPIRED"].includes(row.state)) {
      throw new ContractError("delivery_terminal", "A terminal watch delivery cannot be sent again.");
    }
    const attemptedAt = requireTimestamp(attemptedAtEpochMillis);
    const attemptCount = Math.max(0, Number(row.attemptCount) || 0) + 1;
    await this.repository.updateForUser<WatchDeliveryRow>("watch_delivery", owner, id, {
      state: "SENT",
      attemptCount,
      lastAttemptAt: iso(attemptedAt),
      updatedAt: iso(attemptedAt),
    });
    return { deliveryId: id, state: "SENT", attemptCount, attemptedAtEpochMillis: attemptedAt };
  }

  async recordWatchReceipt(userId: string, request: LegacySummaryWatchReceiptRequest): Promise<LegacySummaryWatchReceipt> {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const deliveryId = requireString(request.deliveryId, "invalid_delivery_id", "deliveryId is required.");
    const summaryId = requireString(request.summaryId, "invalid_summary_id", "summaryId is required.");
    const watchDeviceId = requireString(request.watchDeviceId, "invalid_device_id", "watchDeviceId is required.");
    const revision = requireRevision(request.revision);
    const receivedAtEpochMillis = requireTimestamp(request.receivedAtEpochMillis);
    if (request.result !== "PERSISTED" && request.result !== "REJECTED") {
      throw new ContractError("invalid_receipt_result", "result must be PERSISTED or REJECTED.");
    }

    const normalized: LegacySummaryWatchReceiptRequest = { ...request, deliveryId, summaryId, watchDeviceId, revision, receivedAtEpochMillis };
    const receiptId = receiptRowId(owner, normalized);
    const prior = await this.repository.getForUser<WatchReceiptRow>("watch_receipt", owner, receiptId);
    if (prior) return receiptFromRow(prior, "DUPLICATE");

    const deliveryRow = await this.repository.getForUser<WatchDeliveryRow>("watch_delivery", owner, deliveryId);
    if (!deliveryRow) throw new ContractError("watch_delivery_not_found", "Watch delivery was not found.");
    const delivery = deliveryFromRow(deliveryRow);
    if (delivery.watchDeviceId !== watchDeviceId) {
      throw new ContractError("device_not_authorized", "The watch is not authorized for this delivery.");
    }

    const stale = delivery.summaryId !== summaryId || delivery.revision !== revision;
    if (!stale && delivery.state === "ACKNOWLEDGED" && request.result !== "PERSISTED") {
      throw new ContractError("receipt_conflict", "A persisted delivery cannot be changed to rejected.");
    }
    if (!stale && delivery.state === "REJECTED" && request.result !== "REJECTED") {
      throw new ContractError("receipt_conflict", "A rejected delivery cannot be changed to persisted.");
    }

    const outcome: LegacySummaryWatchReceiptOutcome = stale ? "STALE" : "ACCEPTED";
    const receivedAt = iso(receivedAtEpochMillis);
    const receiptRow: WatchReceiptRow = {
      receiptId,
      userId: owner,
      deliveryId,
      summaryId,
      revision,
      result: request.result,
      outcome,
      watchDeviceId,
      ...(request.result === "PERSISTED" ? { persistedAt: receivedAt } : {}),
      receivedAt,
      createdAt: receivedAt,
    };

    try {
      await this.repository.createForUser("watch_receipt", owner, receiptId, receiptRow);
    } catch (error) {
      const raced = await this.repository.getForUser<WatchReceiptRow>("watch_receipt", owner, receiptId);
      if (raced) return receiptFromRow(raced, "DUPLICATE");
      throw error;
    }

    if (!stale) {
      await this.repository.updateForUser<WatchDeliveryRow>("watch_delivery", owner, deliveryId, {
        state: request.result === "PERSISTED" ? "ACKNOWLEDGED" : "REJECTED",
        updatedAt: receivedAt,
      });
    }
    return receiptFromRow({ ...receiptRow, $id: receiptId }, outcome);
  }
}
