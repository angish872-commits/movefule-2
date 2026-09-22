import { createHash } from "node:crypto";
import {
  API_SCHEMA_VERSION,
  ContractError,
  type DailyRingSummary,
  type SummaryReceipt,
  type LegacySummarySyncOperation,
  type LegacySummarySyncOperationResult,
  type LegacySummarySyncPullEnvelope,
  type LegacySummarySyncPushReceipt,
  parseDailyRingSummary,
  parseSummaryReceipt,
} from "../shared/contracts.ts";

type StoredOperation = {
  requestHash: string;
  result: LegacySummarySyncOperationResult;
};

type StoredSummary = {
  summary: DailyRingSummary;
  cursor: number;
};

type UserState = {
  nextCursor: number;
  summaries: Map<string, StoredSummary>;
  operations: Map<string, StoredOperation>;
  receipts: Map<string, SummaryReceipt>;
};

const userKey = (userId: string, deviceId: string) => `${userId}:${deviceId}`;
const receiptKey = (deviceId: string, summaryId: string, revision: number) =>
  `${deviceId}:${summaryId}:${revision}`;

export function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * Legacy daily-summary compatibility store. It is not canonical sync state and
 * never writes sync_cursor. Canonical domain mutations use SyncEnvelope,
 * sync_operation and server-controlled sync_cursor.
 */
export class SyncStore {
  private readonly users = new Map<string, UserState>();

  private stateFor(userId: string, deviceId: string): UserState {
    const key = userKey(userId, deviceId);
    const existing = this.users.get(key);
    if (existing) return existing;
    const created: UserState = {
      nextCursor: 0,
      summaries: new Map(),
      operations: new Map(),
      receipts: new Map(),
    };
    this.users.set(key, created);
    return created;
  }

  push(userId: string, deviceId: string, operations: LegacySummarySyncOperation[]): LegacySummarySyncPushReceipt {
    const state = this.stateFor(userId, deviceId);
    const results = operations.map((operation) => this.applyOperation(state, deviceId, operation));
    return {
      schemaVersion: API_SCHEMA_VERSION,
      deviceId,
      results,
    };
  }

  private applyOperation(state: UserState, deviceId: string, operation: LegacySummarySyncOperation): LegacySummarySyncOperationResult {
    const requestHash = sha256(operation);
    const prior = state.operations.get(operation.idempotencyKey);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        return {
          operationId: operation.operationId,
          entityId: operation.entityId,
          entityRevision: operation.entityRevision,
          status: "rejected",
          errorCode: "idempotency_key_reused",
        };
      }
      return { ...prior.result, status: "duplicate" };
    }

    let summary: DailyRingSummary;
    try {
      summary = parseDailyRingSummary(operation.payload);
    } catch (error) {
      const result: LegacySummarySyncOperationResult = {
        operationId: operation.operationId,
        entityId: operation.entityId,
        entityRevision: operation.entityRevision,
        status: "rejected",
        errorCode: error instanceof ContractError ? error.code : "invalid_summary",
      };
      state.operations.set(operation.idempotencyKey, { requestHash, result });
      return result;
    }

    if (operation.payloadHash !== sha256(summary)) {
      const result: LegacySummarySyncOperationResult = {
        operationId: operation.operationId,
        entityId: operation.entityId,
        entityRevision: operation.entityRevision,
        status: "rejected",
        errorCode: "payload_hash_mismatch",
      };
      state.operations.set(operation.idempotencyKey, { requestHash, result });
      return result;
    }

    if (operation.entityId !== summary.summaryId || operation.entityRevision !== summary.revision) {
      const result: LegacySummarySyncOperationResult = {
        operationId: operation.operationId,
        entityId: operation.entityId,
        entityRevision: operation.entityRevision,
        status: "rejected",
        errorCode: "operation_summary_mismatch",
      };
      state.operations.set(operation.idempotencyKey, { requestHash, result });
      return result;
    }

    const current = state.summaries.get(summary.summaryId);
    if (current && summary.revision < current.summary.revision) {
      const result: LegacySummarySyncOperationResult = {
        operationId: operation.operationId,
        entityId: summary.summaryId,
        entityRevision: summary.revision,
        status: "older",
        receipt: this.receipt(summary, "OLDER"),
      };
      state.operations.set(operation.idempotencyKey, { requestHash, result });
      return result;
    }

    if (current && summary.revision === current.summary.revision) {
      const result: LegacySummarySyncOperationResult = {
        operationId: operation.operationId,
        entityId: summary.summaryId,
        entityRevision: summary.revision,
        status: "duplicate",
        receipt: this.receipt(summary, "DUPLICATE"),
      };
      state.operations.set(operation.idempotencyKey, { requestHash, result });
      return result;
    }

    state.nextCursor += 1;
    state.summaries.set(summary.summaryId, { summary, cursor: state.nextCursor });
    const result: LegacySummarySyncOperationResult = {
      operationId: operation.operationId,
      entityId: summary.summaryId,
      entityRevision: summary.revision,
      status: "accepted",
      receipt: this.receipt(summary, "ACCEPTED"),
    };
    state.operations.set(operation.idempotencyKey, { requestHash, result });
    return result;
  }

  private receipt(summary: DailyRingSummary, outcome: SummaryReceipt["outcome"]): SummaryReceipt {
    return {
      schemaVersion: summary.schemaVersion,
      summaryId: summary.summaryId,
      revision: summary.revision,
      outcome,
      updatedAtEpochMillis: Date.now(),
    };
  }

  pull(userId: string, deviceId: string, cursor = 0): LegacySummarySyncPullEnvelope {
    const state = this.stateFor(userId, deviceId);
    const summaries = [...state.summaries.values()]
      .filter((entry) => entry.cursor > cursor)
      .sort((left, right) => left.cursor - right.cursor)
      .map((entry) => ({ summary: entry.summary, sourceCursor: entry.cursor }));
    return {
      schemaVersion: API_SCHEMA_VERSION,
      deviceId,
      cursor: state.nextCursor,
      summaries,
    };
  }

  recordReceipt(userId: string, deviceId: string, receiptValue: unknown): SummaryReceipt {
    const receipt = parseSummaryReceipt(receiptValue);
    const state = this.stateFor(userId, deviceId);
    const current = state.summaries.get(receipt.summaryId);
    if (current && receipt.revision > current.summary.revision) {
      throw new ContractError("receipt_ahead_of_server", "Receipt revision is newer than the server summary.");
    }
    state.receipts.set(receiptKey(deviceId, receipt.summaryId, receipt.revision), receipt);
    return receipt;
  }
}
