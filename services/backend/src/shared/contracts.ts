export const API_SCHEMA_VERSION = 1 as const;
export const SUMMARY_SCHEMA_VERSION = 1 as const;

export type SummarySource = "MOVEFUEL";
export type WorkoutState =
  | "IDLE"
  | "PREPARING"
  | "ACTIVE"
  | "PAUSED"
  | "ENDING"
  | "COMPLETED"
  | "FAILED";

export type DailyRingSummary = {
  schemaVersion: typeof SUMMARY_SCHEMA_VERSION;
  source: SummarySource;
  summaryId: string;
  revision: number;
  updatedAtEpochMillis: number;
  energyKcal: number;
  energyGoalKcal: number;
  proteinGrams: number;
  proteinGoalGrams: number;
  movementMinutes: number;
  movementGoalMinutes: number;
  workoutState: WorkoutState;
};

export type SummaryReceiptOutcome = "ACCEPTED" | "DUPLICATE" | "OLDER" | "REJECTED";

export type SummaryReceipt = {
  schemaVersion: typeof SUMMARY_SCHEMA_VERSION;
  summaryId: string;
  revision: number;
  outcome: SummaryReceiptOutcome;
  updatedAtEpochMillis: number;
};

/**
 * Legacy watch-summary compatibility transport only.
 *
 * These types are deliberately prefixed LegacySummary so they cannot be
 * mistaken for the canonical MoveFuel SyncEnvelope/SyncReceipt protocol.
 * New domain mutations must import the generated canonical contracts instead.
 */
export type LegacySummarySyncEntityType = "daily_summary";
export type LegacySummarySyncOperationType = "create" | "append_revision";

export type LegacySummarySyncOperation = {
  operationId: string;
  entityType: LegacySummarySyncEntityType;
  entityId: string;
  entityRevision: number;
  operationType: LegacySummarySyncOperationType;
  idempotencyKey: string;
  expectedServerRevision?: number;
  payload: DailyRingSummary;
  payloadHash: string;
};

export type LegacySummarySyncPushBatch = {
  schemaVersion: typeof API_SCHEMA_VERSION;
  deviceId: string;
  operations: LegacySummarySyncOperation[];
};

export type LegacySummarySyncOperationResult = {
  operationId: string;
  entityId: string;
  entityRevision: number;
  status: "accepted" | "duplicate" | "older" | "rejected";
  receipt?: SummaryReceipt;
  errorCode?: string;
};

export type LegacySummarySyncPushReceipt = {
  schemaVersion: typeof API_SCHEMA_VERSION;
  deviceId: string;
  results: LegacySummarySyncOperationResult[];
};

export type LegacySummarySyncPullRequest = {
  schemaVersion: typeof API_SCHEMA_VERSION;
  deviceId: string;
  /** Process-local compatibility cursor. Never persisted to canonical sync_cursor. */
  cursor?: number;
};

export type LegacySummarySyncPullEnvelope = {
  schemaVersion: typeof API_SCHEMA_VERSION;
  deviceId: string;
  /** Process-local compatibility cursor. Never a canonical SyncReceipt cursor. */
  cursor: number;
  summaries: Array<{
    summary: DailyRingSummary;
    sourceCursor: number;
  }>;
};

export type ApiError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type ApiEnvelope<T> = {
  schemaVersion: typeof API_SCHEMA_VERSION;
  correlationId: string;
  data: T | null;
  error: ApiError | null;
};

const WORKOUT_STATES: ReadonlySet<string> = new Set([
  "IDLE",
  "PREPARING",
  "ACTIVE",
  "PAUSED",
  "ENDING",
  "COMPLETED",
  "FAILED",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

export function validateDailyRingSummary(value: unknown): string[] {
  if (!isRecord(value)) return ["invalid_summary"];
  const errors: string[] = [];
  if (value.schemaVersion !== SUMMARY_SCHEMA_VERSION) errors.push("unsupported_schema_version");
  if (value.source !== "MOVEFUEL") errors.push("unsupported_source");
  if (!isNonEmptyString(value.summaryId)) errors.push("blank_summary_id");
  if (!isNonNegativeInteger(value.revision)) errors.push("invalid_revision");
  if (!isPositiveInteger(value.updatedAtEpochMillis)) errors.push("invalid_timestamp");
  if (!isNonNegativeInteger(value.energyKcal)) errors.push("negative_energy");
  if (!isPositiveInteger(value.energyGoalKcal)) errors.push("invalid_energy_goal");
  if (!isNonNegativeInteger(value.proteinGrams)) errors.push("negative_protein");
  if (!isPositiveInteger(value.proteinGoalGrams)) errors.push("invalid_protein_goal");
  if (!isNonNegativeInteger(value.movementMinutes)) errors.push("negative_movement");
  if (!isPositiveInteger(value.movementGoalMinutes)) errors.push("invalid_movement_goal");
  if (typeof value.workoutState !== "string" || !WORKOUT_STATES.has(value.workoutState)) {
    errors.push("invalid_workout_state");
  }
  return errors;
}

export function parseDailyRingSummary(value: unknown): DailyRingSummary {
  const errors = validateDailyRingSummary(value);
  if (errors.length > 0) throw new ContractError("invalid_summary", errors.join(", "));
  return value as DailyRingSummary;
}

export function validateSummaryReceipt(value: unknown): string[] {
  if (!isRecord(value)) return ["invalid_receipt"];
  const errors: string[] = [];
  if (value.schemaVersion !== SUMMARY_SCHEMA_VERSION) errors.push("unsupported_schema_version");
  if (!isNonEmptyString(value.summaryId)) errors.push("blank_summary_id");
  if (!isNonNegativeInteger(value.revision)) errors.push("invalid_revision");
  if (!["ACCEPTED", "DUPLICATE", "OLDER", "REJECTED"].includes(String(value.outcome))) {
    errors.push("invalid_outcome");
  }
  if (!isPositiveInteger(value.updatedAtEpochMillis)) errors.push("invalid_timestamp");
  return errors;
}

export function parseSummaryReceipt(value: unknown): SummaryReceipt {
  const errors = validateSummaryReceipt(value);
  if (errors.length > 0) throw new ContractError("invalid_receipt", errors.join(", "));
  return value as SummaryReceipt;
}

export class ContractError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    retryable = false,
  ) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.name = "ContractError";
  }
}
