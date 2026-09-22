import { IncomingMessage, ServerResponse } from "node:http";
import { ContractError, type ApiEnvelope } from "../shared/contracts.ts";
import { HealthStore, type HealthStoreLike } from "../health/health-store.ts";

const API_SCHEMA_VERSION = 1 as const;

type HealthRouteContext = { userId: string; correlationId: string; accessToken?: string };

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
    if (bytes > 512 * 1024) throw new ContractError("body_too_large", "Request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ContractError("invalid_json", "Request body must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ContractError("invalid_request", "Request body must be an object.");
  return parsed as Record<string, unknown>;
}

export function createHealthRouteHandler(options: { store?: HealthStoreLike | ((context: HealthRouteContext) => HealthStoreLike) } = {}) {
  const defaultStore = options.store ?? new HealthStore();
  return async function handleHealthRoute(req: IncomingMessage, res: ServerResponse, context?: HealthRouteContext): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/v1/health/import" && url.pathname !== "/v1/health/connections" && url.pathname !== "/v1/health/summaries" && url.pathname !== "/v1/health/gaps") return false;
    const correlationId = context?.correlationId ?? "health-correlation";
    if (!context?.userId?.trim()) {
      sendJson(res, 401, envelope(null, { code: "unauthenticated", message: "An authenticated user context is required.", retryable: false }, correlationId));
      return true;
    }
    try {
      const store = typeof defaultStore === "function" ? defaultStore(context) : defaultStore;
      if (url.pathname === "/v1/health/connections") {
        if (req.method !== "GET") {
          sendJson(res, 405, envelope(null, { code: "method_not_allowed", message: "Use GET for health connections.", retryable: false }, correlationId));
          return true;
        }
        sendJson(res, 200, envelope({ connections: await store.listConnections(context.userId) }, null, correlationId));
        return true;
      }
      if (url.pathname === "/v1/health/summaries") {
        if (req.method !== "GET") {
          sendJson(res, 405, envelope(null, { code: "method_not_allowed", message: "Use GET for health summaries.", retryable: false }, correlationId));
          return true;
        }
        sendJson(res, 200, envelope({ summaries: await store.listSummaries(context.userId, url.searchParams.get("localDate") ?? undefined, url.searchParams.get("dataType") ?? undefined) }, null, correlationId));
        return true;
      }
      if (url.pathname === "/v1/health/gaps") {
        if (req.method !== "GET") {
          sendJson(res, 405, envelope(null, { code: "method_not_allowed", message: "Use GET for health gaps.", retryable: false }, correlationId));
          return true;
        }
        const dataType = url.searchParams.get("dataType") ?? "";
        const localDate = url.searchParams.get("localDate") ?? "";
        const assessment = await store.assessGap(context.userId, {
          localDate,
          dataType,
          ...(url.searchParams.get("expectedStart") ? { expectedStart: url.searchParams.get("expectedStart")! } : {}),
          ...(url.searchParams.get("expectedEnd") ? { expectedEnd: url.searchParams.get("expectedEnd")! } : {}),
        });
        sendJson(res, 200, envelope({ assessment }, null, correlationId));
        return true;
      }
      if (req.method !== "POST") {
        sendJson(res, 405, envelope(null, { code: "method_not_allowed", message: "Use POST for health import.", retryable: false }, correlationId));
        return true;
      }
      const body = await readJson(req);
      const result = await store.import(context.userId, {
        connectionId: body.connectionId as string,
        platform: body.platform as Parameters<HealthStore["import"]>[1]["platform"],
        sourceName: body.sourceName as string,
        permissionState: body.permissionState as Parameters<HealthStore["import"]>[1]["permissionState"],
        dataType: body.dataType as string,
        samples: body.samples,
        ...(body.cursorToken === undefined ? {} : { cursorToken: body.cursorToken as string }),
      });
      const { cursorMetadata: _cursorMetadata, ...safeResult } = result;
      sendJson(res, 200, envelope(safeResult, null, correlationId));
      return true;
    } catch (error) {
      const failure = error instanceof ContractError
        ? { code: error.code, message: error.message, retryable: error.retryable }
        : { code: "internal_error", message: "Unexpected health import error.", retryable: true };
      sendJson(res, error instanceof ContractError ? 400 : 500, envelope(null, failure, correlationId));
      return true;
    }
  };
}
