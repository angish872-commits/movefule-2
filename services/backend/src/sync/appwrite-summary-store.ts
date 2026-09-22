import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository, RepositoryRow, ServerOwnedRepository } from "../foundation/repository.ts";
import {
  API_SCHEMA_VERSION,
  ContractError,
  parseDailyRingSummary,
  type DailyRingSummary,
  type LegacySummarySyncOperation,
  type LegacySummarySyncOperationResult,
  type LegacySummarySyncPullEnvelope,
  type LegacySummarySyncPullRequest,
  type LegacySummarySyncPushReceipt,
  type SummaryReceipt,
} from "../shared/contracts.ts";

type DailySummaryRow = {
  summaryId: string;
  userId: string;
  deviceId: string;
  revision: number;
  payloadJson: string;
  source: string;
  updatedAt: string;
  createdAt: string;
};

type LegacySummaryOperationRow = {
  operationId: string;
  userId: string;
  deviceId: string;
  entityType: string;
  entityId: string;
  entityRevision: number;
  operationType: string;
  idempotencyKey: string;
  requestHash: string;
  payloadHash: string;
  outcome: LegacySummarySyncOperationResult["status"];
  createdAt: string;
};

const requireId = (value: unknown, code: string, message: string): string => {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) {
    throw new ContractError(code, message);
  }
  return value.trim();
};

const operationRowId = (userId: string, idempotencyKey: string) =>
  `sync-operation-${sha256({ userId, idempotencyKey }).slice(0, 48)}`;

const summaryRowId = (userId: string, deviceId: string, summaryId: string, revision: number) =>
  `daily-summary-${sha256({ userId, deviceId, summaryId, revision }).slice(0, 48)}`;

const parseStoredSummary = (row: RepositoryRow<DailySummaryRow>): DailyRingSummary | null => {
  try {
    return parseDailyRingSummary(JSON.parse(row.payloadJson));
  } catch {
    return null;
  }
};

const receiptFor = (summary: DailyRingSummary, outcome: SummaryReceipt["outcome"]): SummaryReceipt => ({
  schemaVersion: summary.schemaVersion,
  summaryId: summary.summaryId,
  revision: summary.revision,
  outcome,
  updatedAtEpochMillis: Date.now(),
});

/**
 * Compatibility persistence for the legacy daily-summary protocol.
 * Its timestamp cursor is local to this compatibility surface and never writes
 * canonical sync_cursor. Canonical domain reconciliation uses SyncEnvelope.
 */
export class AppwriteSyncSummaryStore {
  private readonly repository: OwnerScopedRepository;
  private readonly serverRepository: ServerOwnedRepository;

  constructor(repository: OwnerScopedRepository, serverRepository: ServerOwnedRepository) {
    this.repository = repository;
    this.serverRepository = serverRepository;
  }

  async push(userId: string, deviceId: string, operations: LegacySummarySyncOperation[]): Promise<LegacySummarySyncPushReceipt> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const device = requireId(deviceId, "invalid_device_id", "deviceId is required.");
    const results: LegacySummarySyncOperationResult[] = [];
    for (const operation of operations) {
      results.push(await this.applyOperation(owner, device, operation));
    }
    return { schemaVersion: API_SCHEMA_VERSION, deviceId: device, results };
  }

  async pull(userId: string, request: LegacySummarySyncPullRequest): Promise<LegacySummarySyncPullEnvelope> {
    const owner = requireId(userId, "invalid_user_id", "userId is required.");
    const device = requireId(request.deviceId, "invalid_device_id", "deviceId is required.");
    const cursor = request.cursor ?? 0;
    if (!Number.isInteger(cursor) || cursor < 0) throw new ContractError("invalid_cursor", "cursor must be a non-negative integer.");
    const rows = await this.repository.listOwned<DailySummaryRow>("daily_summary", owner, {
      queries: [{ field: "deviceId", operator: "equal", value: device }],
      limit: 500,
    });
    const latest = new Map<string, { summary: DailyRingSummary; sourceCursor: number }>();
    for (const row of rows.rows) {
      const summary = parseStoredSummary(row);
      if (!summary) continue;
      const sourceCursor = summary.updatedAtEpochMillis;
      const current = latest.get(summary.summaryId);
      if (!current || summary.revision > current.summary.revision) latest.set(summary.summaryId, { summary, sourceCursor });
    }
    const summaries = [...latest.values()]
      .filter((entry) => entry.sourceCursor > cursor)
      .sort((left, right) => left.sourceCursor - right.sourceCursor);
    const nextCursor = Math.max(cursor, ...summaries.map((entry) => entry.sourceCursor), 0);
    return { schemaVersion: API_SCHEMA_VERSION, deviceId: device, cursor: nextCursor, summaries };
  }

  private async applyOperation(userId: string, deviceId: string, operation: LegacySummarySyncOperation): Promise<LegacySummarySyncOperationResult> {
    const requestHash = sha256(operation);
    const existing = await this.serverRepository.listForUser<LegacySummaryOperationRow>("sync_operation", userId, {
      queries: [
        { field: "deviceId", operator: "equal", value: deviceId },
        { field: "idempotencyKey", operator: "equal", value: operation.idempotencyKey },
      ],
      limit: 1,
    });
    const prior = existing.rows[0];
    if (prior) {
      if (prior.requestHash !== requestHash) {
        return this.result(operation, "rejected", "idempotency_key_reused");
      }
      return this.result(operation, "duplicate");
    }

    let summary: DailyRingSummary;
    try {
      summary = parseDailyRingSummary(operation.payload);
    } catch (error) {
      const result = this.result(operation, "rejected", error instanceof ContractError ? error.code : "invalid_summary");
      await this.saveOperation(userId, deviceId, operation, requestHash, result);
      return result;
    }
    if (operation.payloadHash !== sha256(summary)) {
      const result = this.result(operation, "rejected", "payload_hash_mismatch");
      await this.saveOperation(userId, deviceId, operation, requestHash, result);
      return result;
    }
    if (operation.entityId !== summary.summaryId || operation.entityRevision !== summary.revision) {
      const result = this.result(operation, "rejected", "operation_summary_mismatch");
      await this.saveOperation(userId, deviceId, operation, requestHash, result);
      return result;
    }

    const currentRows = await this.repository.listOwned<DailySummaryRow>("daily_summary", userId, {
      queries: [
        { field: "deviceId", operator: "equal", value: deviceId },
        { field: "summaryId", operator: "equal", value: summary.summaryId },
      ],
      limit: 100,
    });
    const current = currentRows.rows
      .map(parseStoredSummary)
      .filter((entry): entry is DailyRingSummary => entry !== null)
      .sort((left, right) => right.revision - left.revision)[0];
    if (current && summary.revision < current.revision) {
      const result = this.result(operation, "older", undefined, receiptFor(summary, "OLDER"));
      await this.saveOperation(userId, deviceId, operation, requestHash, result);
      return result;
    }
    if (current && summary.revision === current.revision) {
      const result = this.result(operation, "duplicate", undefined, receiptFor(summary, "DUPLICATE"));
      await this.saveOperation(userId, deviceId, operation, requestHash, result);
      return result;
    }

    const now = new Date().toISOString();
    await this.repository.createOwned<DailySummaryRow>(
      "daily_summary",
      userId,
      summaryRowId(userId, deviceId, summary.summaryId, summary.revision),
      {
        summaryId: summary.summaryId,
        userId,
        deviceId,
        revision: summary.revision,
        payloadJson: JSON.stringify(summary),
        source: summary.source,
        updatedAt: new Date(summary.updatedAtEpochMillis).toISOString(),
        createdAt: now,
      },
    );
    const result = this.result(operation, "accepted", undefined, receiptFor(summary, "ACCEPTED"));
    await this.saveOperation(userId, deviceId, operation, requestHash, result);
    return result;
  }

  private result(
    operation: LegacySummarySyncOperation,
    status: LegacySummarySyncOperationResult["status"],
    errorCode?: string,
    receipt?: SummaryReceipt,
  ): LegacySummarySyncOperationResult {
    return {
      operationId: operation.operationId,
      entityId: operation.entityId,
      entityRevision: operation.entityRevision,
      status,
      ...(receipt ? { receipt } : {}),
      ...(errorCode ? { errorCode } : {}),
    };
  }

  private async saveOperation(
    userId: string,
    deviceId: string,
    operation: LegacySummarySyncOperation,
    requestHash: string,
    result: LegacySummarySyncOperationResult,
  ): Promise<void> {
    const data: LegacySummaryOperationRow = {
      operationId: operation.operationId,
      userId,
      deviceId,
      entityType: operation.entityType,
      entityId: operation.entityId,
      entityRevision: operation.entityRevision,
      operationType: operation.operationType,
      idempotencyKey: operation.idempotencyKey,
      requestHash,
      payloadHash: operation.payloadHash,
      outcome: result.status,
      createdAt: new Date().toISOString(),
    };
    await this.serverRepository.createForUser("sync_operation", userId, operationRowId(userId, operation.idempotencyKey), data);
  }
}
