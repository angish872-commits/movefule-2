import { ContractError, type LegacySummarySyncOperation } from "../shared/contracts.ts";
import type {
  LegacySummaryQueuedOperation,
  LegacySummaryOperationExecution,
  RetryFailure,
  RetryPolicyOptions,
  RetrySchedule,
} from "./types.ts";

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MILLIS = 1_000;
const DEFAULT_MAX_DELAY_MILLIS = 60_000;

const TERMINAL_SYNC_STATUSES = new Set(["accepted", "duplicate", "older"]);

export const DEFAULT_RETRYABLE_ERROR_CODES = new Set([
  "internal_error",
  "temporarily_unavailable",
  "timeout",
  "network_error",
  "rate_limited",
]);

export class OfflineRetryPolicy {
  public readonly maxAttempts: number;
  public readonly baseDelayMillis: number;
  public readonly maxDelayMillis: number;

  constructor(options: RetryPolicyOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.baseDelayMillis = options.baseDelayMillis ?? DEFAULT_BASE_DELAY_MILLIS;
    this.maxDelayMillis = options.maxDelayMillis ?? DEFAULT_MAX_DELAY_MILLIS;
    if (!Number.isInteger(this.maxAttempts) || this.maxAttempts < 1) {
      throw new ContractError("invalid_retry_policy", "maxAttempts must be a positive integer.");
    }
    if (!Number.isInteger(this.baseDelayMillis) || this.baseDelayMillis < 0) {
      throw new ContractError("invalid_retry_policy", "baseDelayMillis must be a non-negative integer.");
    }
    if (!Number.isInteger(this.maxDelayMillis) || this.maxDelayMillis < this.baseDelayMillis) {
      throw new ContractError("invalid_retry_policy", "maxDelayMillis must be at least baseDelayMillis.");
    }
  }

  schedule(attemptCount: number, nowEpochMillis: number, failure: RetryFailure): RetrySchedule {
    if (!Number.isInteger(attemptCount) || attemptCount < 0) {
      throw new ContractError("invalid_retry_attempt", "attemptCount must be a non-negative integer.");
    }
    if (!Number.isInteger(nowEpochMillis) || nowEpochMillis < 0) {
      throw new ContractError("invalid_retry_timestamp", "Retry timestamp must be a non-negative integer.");
    }

    const nextAttempt = attemptCount + 1;
    const retryable = failure.retryable === true || DEFAULT_RETRYABLE_ERROR_CODES.has(failure.code);
    if (!retryable || nextAttempt > this.maxAttempts) {
      return { attempt: nextAttempt, retry: false, delayMillis: 0 };
    }

    const delayMillis = Math.min(
      this.maxDelayMillis,
      this.baseDelayMillis * (2 ** Math.max(0, attemptCount)),
    );
    return {
      attempt: nextAttempt,
      retry: true,
      delayMillis,
      nextAttemptAtEpochMillis: nowEpochMillis + delayMillis,
    };
  }

  isTerminal(execution: LegacySummaryOperationExecution): boolean {
    return TERMINAL_SYNC_STATUSES.has(execution.status) || !this.isRetryableError(execution.errorCode);
  }

  isRetryableError(code?: string): boolean {
    return code !== undefined && DEFAULT_RETRYABLE_ERROR_CODES.has(code);
  }
}

/** Process-local retry queue for the deprecated daily-summary transport only. */
export class OfflineSyncQueue {
  private readonly entries = new Map<string, LegacySummaryQueuedOperation>();
  private readonly policy: OfflineRetryPolicy;

  constructor(policy = new OfflineRetryPolicy()) {
    this.policy = policy;
  }

  enqueue(operation: LegacySummarySyncOperation, nowEpochMillis = Date.now()): LegacySummaryQueuedOperation {
    const existing = this.entries.get(operation.idempotencyKey);
    if (existing) {
      if (JSON.stringify(existing.operation) !== JSON.stringify(operation)) {
        throw new ContractError("idempotency_key_reused", "The idempotency key is already bound to another operation.");
      }
      return { ...existing, operation: { ...existing.operation } };
    }
    const entry: LegacySummaryQueuedOperation = {
      operation,
      attemptCount: 0,
      nextAttemptAtEpochMillis: nowEpochMillis,
      state: "PENDING",
    };
    this.entries.set(operation.idempotencyKey, entry);
    return { ...entry, operation: { ...entry.operation } };
  }

  due(nowEpochMillis = Date.now(), limit = 50): LegacySummaryQueuedOperation[] {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new ContractError("invalid_queue_limit", "Queue limit must be a positive integer.");
    }
    return [...this.entries.values()]
      .filter((entry) => entry.state === "PENDING" && entry.nextAttemptAtEpochMillis <= nowEpochMillis)
      .sort((left, right) => left.nextAttemptAtEpochMillis - right.nextAttemptAtEpochMillis)
      .slice(0, limit)
      .map((entry) => ({ ...entry, operation: { ...entry.operation } }));
  }

  applyResult(
    idempotencyKey: string,
    execution: LegacySummaryOperationExecution,
    nowEpochMillis = Date.now(),
  ): LegacySummaryQueuedOperation {
    const entry = this.requireEntry(idempotencyKey);
    if (this.policy.isTerminal(execution)) {
      entry.state = "COMPLETED";
      entry.lastErrorCode = execution.errorCode;
      return { ...entry, operation: { ...entry.operation } };
    }
    return this.recordFailure(idempotencyKey, { code: execution.errorCode ?? "unknown_error" }, nowEpochMillis);
  }

  recordTransportFailure(
    idempotencyKey: string,
    failure: RetryFailure,
    nowEpochMillis = Date.now(),
  ): LegacySummaryQueuedOperation {
    return this.recordFailure(idempotencyKey, failure, nowEpochMillis);
  }

  get(idempotencyKey: string): LegacySummaryQueuedOperation | undefined {
    const entry = this.entries.get(idempotencyKey);
    return entry ? { ...entry, operation: { ...entry.operation } } : undefined;
  }

  private recordFailure(
    idempotencyKey: string,
    failure: RetryFailure,
    nowEpochMillis: number,
  ): LegacySummaryQueuedOperation {
    const entry = this.requireEntry(idempotencyKey);
    const schedule = this.policy.schedule(entry.attemptCount, nowEpochMillis, failure);
    entry.attemptCount = schedule.attempt;
    entry.lastErrorCode = failure.code;
    if (schedule.retry && schedule.nextAttemptAtEpochMillis !== undefined) {
      entry.state = "PENDING";
      entry.nextAttemptAtEpochMillis = schedule.nextAttemptAtEpochMillis;
    } else {
      entry.state = "FAILED";
    }
    return { ...entry, operation: { ...entry.operation } };
  }

  private requireEntry(idempotencyKey: string): LegacySummaryQueuedOperation {
    const entry = this.entries.get(idempotencyKey);
    if (!entry) throw new ContractError("queue_entry_not_found", "The legacy summary operation is not queued.");
    return entry;
  }
}
