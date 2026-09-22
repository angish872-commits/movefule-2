import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { MealContractError } from "../meal/contracts.ts";
import { PersonalFoodContractError } from "../meal/personal-food.ts";
import { AnalysisRateLimitError } from "../meal/analysis-rate-limit.ts";
import { EstimateAccessError, ImageEstimatePipelineError } from "../nutrition/algorithm/imageEstimatePipeline.ts";

const API_SCHEMA_VERSION = 1 as const;
const MAX_BODY_BYTES = 512 * 1024;

export type MealRouteContext = {
  userId: string;
  deviceId?: string;
  correlationId?: string;
  accessToken?: string;
};

type ApiError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type MealApiEnvelope<T> = {
  schemaVersion: typeof API_SCHEMA_VERSION;
  correlationId: string;
  data: T | null;
  error: ApiError | null;
};

export class RouteInputError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export function envelope<T>(data: T | null, error: ApiError | null, correlationId: string): MealApiEnvelope<T> {
  return { schemaVersion: API_SCHEMA_VERSION, correlationId, data, error };
}

export function sendJson<T>(res: ServerResponse, status: number, body: MealApiEnvelope<T>): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    bytes += buffer.byteLength;
    if (bytes > MAX_BODY_BYTES) throw new RouteInputError("body_too_large", "Request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RouteInputError("invalid_json", "Request body must be valid JSON.");
  }
}

export async function readBinary(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > maxBytes) throw new RouteInputError("body_too_large", "Meal image is too large.");
    chunks.push(buffer);
  }
  if (bytes === 0) throw new RouteInputError("invalid_media_size", "Meal image is empty.");
  return Buffer.concat(chunks);
}

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RouteInputError("invalid_request", "Request body must be an object.");
  }
  return value as Record<string, unknown>;
}

export function correlationIdFor(req: IncomingMessage, context?: MealRouteContext): string {
  const header = req.headers["x-correlation-id"];
  return context?.correlationId ?? (Array.isArray(header) ? header[0] : header) ?? randomUUID();
}

export function methodNotAllowed(res: ServerResponse, correlationId: string, allow: string): true {
  res.setHeader("allow", allow);
  sendJson(res, 405, envelope(null, {
    code: "method_not_allowed",
    message: `Use ${allow} for this route.`,
    retryable: false,
  }, correlationId));
  return true;
}

export function errorResponse(error: unknown, correlationId: string): { status: number; body: MealApiEnvelope<null> } {
  if (error instanceof MealContractError) {
    const status = error.code.endsWith("not_found") ? 404 :
      error.code === "draft_already_confirmed" || error.code === "draft_revision_conflict" ||
      error.code === "idempotency_key_reused" || error.code === "analysis_required" ||
      error.code === "analysis_failed" || error.code === "analysis_not_retryable" ||
      error.code === "analysis_already_completed" || error.code === "meal_already_deleted" ? 409 : 400;
    return { status, body: envelope(null, { code: error.code, message: error.message, retryable: error.retryable }, correlationId) };
  }
  if (error instanceof EstimateAccessError) {
    return { status: 403, body: envelope(null, { code: error.code, message: error.message, retryable: false }, correlationId) };
  }
  if (error instanceof ImageEstimatePipelineError) {
    return {
      status: error.code === "estimate_not_found" ? 404 : error.code === "idempotency_key_reused" ? 409 : 400,
      body: envelope(null, { code: error.code, message: error.message, retryable: false }, correlationId),
    };
  }
  if (error instanceof PersonalFoodContractError) {
    const status = error.code === "personal_food_not_found" ? 404 :
      error.code === "personal_food_revision_conflict" || error.code === "personal_food_idempotency_reused" ? 409 : 400;
    return { status, body: envelope(null, { code: error.code, message: error.message, retryable: error.retryable }, correlationId) };
  }
  if (error instanceof AnalysisRateLimitError) {
    return { status: 429, body: envelope(null, { code: error.code, message: error.message, retryable: true }, correlationId) };
  }
  if (error instanceof RouteInputError) {
    const notFound = error.code === "nutrition_food_not_found";
    const providerUnavailable = error.code === "nutrition_provider_unavailable" || error.code === "nutrition_provider_rate_limited";
    return {
      status: notFound ? 404 : providerUnavailable ? 503 : error.code === "body_too_large" ? 413 : 400,
      body: envelope(null, { code: error.code, message: error.message, retryable: error.retryable }, correlationId),
    };
  }
  return {
    status: 500,
    body: envelope(null, { code: "internal_error", message: "Unexpected meal route error.", retryable: true }, correlationId),
  };
}
