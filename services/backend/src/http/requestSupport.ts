import type { IncomingMessage, ServerResponse } from "node:http";
import {
  LocalTestSessionProvider,
  SessionResolutionError,
  type SessionProvider,
} from "../foundation/session.ts";
import { API_SCHEMA_VERSION, ContractError, type ApiEnvelope } from "../shared/contracts.ts";

const MAX_BODY_BYTES = 512 * 1024;

export function isConfiguredSecret(value: string | undefined): boolean {
  const normalized = value?.trim() ?? "";
  if (!normalized) return false;
  const upper = normalized.toUpperCase();
  return !upper.startsWith("REPLACE_") && upper !== "REPLACE_ME" && !upper.includes("PLACEHOLDER");
}

export type RequestContext = {
  userId: string;
  sessionId: string;
  provider: "appwrite" | "local-test";
  deviceId?: string;
  accessToken?: string;
};

export function response<T>(data: T | null, error: ApiEnvelope<T>["error"], correlationId: string): ApiEnvelope<T> {
  return {
    schemaVersion: API_SCHEMA_VERSION,
    correlationId,
    data,
    error,
  };
}

export function sendJson<T>(res: ServerResponse, status: number, body: ApiEnvelope<T>): void {
  const encoded = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(encoded);
}

export function contractErrorStatus(error: ContractError): number {
  if (["unauthenticated", "auth_not_configured", "invalid_session"].includes(error.code)) return 401;
  if (["not_found", "profile_not_found"].includes(error.code)) return 404;
  if ([
    "calendar_persistence_unavailable", "sync_entity_not_supported", "training_runtime_unavailable",
    "phone_sync_session_unavailable", "training_plan_recovery_unavailable", "billing_not_configured",
    "billing_verifier_unavailable", "report_narrative_unavailable",
  ].includes(error.code)) return 503;
  return error.code === "internal_error" ? 500 : 400;
}

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    bytes += buffer.byteLength;
    if (bytes > MAX_BODY_BYTES) throw new ContractError("body_too_large", "Request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ContractError("invalid_json", "Request body must be valid JSON.");
  }
}

export async function requireSession(
  req: IncomingMessage,
  provider: SessionProvider | null,
  requireAppwriteRuntime = false,
): Promise<RequestContext> {
  if (!provider) {
    throw new ContractError("auth_not_configured", "Appwrite session authentication is required before production use.");
  }
  try {
    const principal = await provider.resolve({ authorization: req.headers.authorization });
    if (!principal) throw new ContractError("unauthenticated", "A valid authenticated session is required.");
    if (requireAppwriteRuntime && (principal.provider !== "appwrite" || !principal.accessToken?.trim())) {
      throw new ContractError("production_session_incomplete", "Production requests require an Appwrite session with request-scoped persistence credentials.");
    }
    return principal;
  } catch (error) {
    if (error instanceof ContractError) throw error;
    if (error instanceof SessionResolutionError) {
      throw new ContractError(error.code, error.message, error.retryable);
    }
    throw new ContractError("invalid_session", "The authenticated session could not be validated.");
  }
}

export function requireDeviceId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ContractError("invalid_device_id", "deviceId is required.");
  }
  return value;
}
