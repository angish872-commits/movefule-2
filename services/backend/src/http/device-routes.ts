import { IncomingMessage, ServerResponse } from "node:http";
import { ContractError, type ApiEnvelope } from "../shared/contracts.ts";
import type { DeviceTrustStoreLike } from "../device/appwrite-device-trust.ts";

const API_SCHEMA_VERSION = 1 as const;
type DeviceRouteContext = { userId: string; correlationId: string; accessToken?: string };

function envelope<T>(data: T | null, error: ApiEnvelope<T>["error"], correlationId: string): ApiEnvelope<T> {
  return { schemaVersion: API_SCHEMA_VERSION, correlationId, data, error };
}

function sendJson<T>(res: ServerResponse, status: number, body: ApiEnvelope<T>): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    bytes += buffer.byteLength;
    if (bytes > 32 * 1024) throw new ContractError("body_too_large", "Request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ContractError("invalid_json", "Request body must be valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ContractError("invalid_request", "Request body must be an object.");
  return parsed as Record<string, unknown>;
}

export function createDeviceRouteHandler(options: { store?: DeviceTrustStoreLike | ((context: DeviceRouteContext) => DeviceTrustStoreLike) } = {}) {
  const defaultStore = options.store;
  return async function handleDeviceRoute(req: IncomingMessage, res: ServerResponse, context?: DeviceRouteContext): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/v1/devices/trust" && !/^\/v1\/devices\/trust\/[^/]+\/revoke$/.test(url.pathname)) return false;
    const correlationId = context?.correlationId ?? "device-correlation";
    if (!context?.userId?.trim()) {
      sendJson(res, 401, envelope(null, { code: "unauthenticated", message: "An authenticated user context is required.", retryable: false }, correlationId));
      return true;
    }
    try {
      const store = typeof defaultStore === "function" ? defaultStore(context) : defaultStore;
      if (!store) throw new ContractError("device_store_not_configured", "Device trust storage is not configured.", true);
      if (url.pathname === "/v1/devices/trust" && req.method === "GET") {
        sendJson(res, 200, envelope({ sessions: await store.list(context.userId) }, null, correlationId));
        return true;
      }
      if (url.pathname === "/v1/devices/trust" && req.method === "POST") {
        const body = await readJson(req);
        const result = await store.trust(context.userId, {
          phoneDeviceId: body.phoneDeviceId as string,
          watchDeviceId: body.watchDeviceId as string,
          idempotencyKey: body.idempotencyKey as string,
        });
        sendJson(res, result.created ? 201 : 200, envelope(result, null, correlationId));
        return true;
      }
      const revokeMatch = url.pathname.match(/^\/v1\/devices\/trust\/([^/]+)\/revoke$/);
      if (revokeMatch && req.method === "POST") {
        sendJson(res, 200, envelope({ session: await store.revoke(context.userId, decodeURIComponent(revokeMatch[1] ?? "")) }, null, correlationId));
        return true;
      }
      sendJson(res, 405, envelope(null, { code: "method_not_allowed", message: "Use GET/POST on trust or POST to revoke.", retryable: false }, correlationId));
      return true;
    } catch (error) {
      const failure = error instanceof ContractError ? error : new ContractError("internal_error", "Unexpected device trust error.", true);
      sendJson(res, error instanceof ContractError && error.code === "device_session_not_found" ? 404 : error instanceof ContractError ? 400 : 500,
        envelope(null, { code: failure.code, message: failure.message, retryable: failure.retryable }, correlationId));
      return true;
    }
  };
}
