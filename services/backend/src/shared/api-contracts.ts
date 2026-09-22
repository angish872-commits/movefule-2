import { randomUUID } from "node:crypto";

/**
 * Versioned transport primitives shared by every backend vertical slice.
 * This file intentionally has no HTTP-server dependency so it can be used by
 * route handlers, workers, and contract tests alike.
 */
export const API_SCHEMA_VERSION = 1 as const;

export type CorrelationId = string;

export type ApiError = {
  code: string;
  message: string;
  retryable: boolean;
  details?: Readonly<Record<string, unknown>>;
};

export type ApiEnvelope<T> = {
  schemaVersion: typeof API_SCHEMA_VERSION;
  correlationId: CorrelationId;
  data: T | null;
  error: ApiError | null;
};

export type ApiSuccess<T> = ApiEnvelope<T> & {
  data: T;
  error: null;
};

export type ApiFailure = ApiEnvelope<never> & {
  data: null;
  error: ApiError;
};

export function createCorrelationId(): CorrelationId {
  return randomUUID();
}

export function success<T>(data: T, correlationId = createCorrelationId()): ApiSuccess<T> {
  return {
    schemaVersion: API_SCHEMA_VERSION,
    correlationId,
    data,
    error: null,
  };
}

export function failure(
  code: string,
  message: string,
  retryable = false,
  correlationId = createCorrelationId(),
  details?: Readonly<Record<string, unknown>>,
): ApiFailure {
  return {
    schemaVersion: API_SCHEMA_VERSION,
    correlationId,
    data: null,
    error: {
      code,
      message,
      retryable,
      ...(details ? { details } : {}),
    },
  };
}

export function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== API_SCHEMA_VERSION || typeof candidate.correlationId !== "string" || !candidate.correlationId) {
    return false;
  }
  const hasData = candidate.data !== null;
  const hasError = candidate.error !== null;
  if (hasData === hasError) return false;
  if (hasError) {
    const error = candidate.error;
    if (!error || typeof error !== "object" || Array.isArray(error)) return false;
    const details = error as Record<string, unknown>;
    if (typeof details.code !== "string" || typeof details.message !== "string" || typeof details.retryable !== "boolean") {
      return false;
    }
  }
  return true;
}

export function assertApiEnvelope(value: unknown): ApiEnvelope<unknown> {
  if (!isApiEnvelope(value)) throw new Error("invalid_api_envelope");
  return value;
}
