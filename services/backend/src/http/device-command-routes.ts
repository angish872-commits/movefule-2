import { IncomingMessage, ServerResponse } from "node:http";
import { ContractError, type ApiEnvelope } from "../shared/contracts.ts";
import type { DeviceCommandStoreLike } from "../device/appwrite-device-commands.ts";

const API_SCHEMA_VERSION = 1 as const;
type Context = { userId: string; correlationId: string };

function envelope<T>(data: T | null, error: ApiEnvelope<T>["error"], correlationId: string): ApiEnvelope<T> { return { schemaVersion: API_SCHEMA_VERSION, correlationId, data, error }; }
function sendJson<T>(res: ServerResponse, status: number, body: ApiEnvelope<T>): void { res.statusCode = status; res.setHeader("content-type", "application/json; charset=utf-8"); res.setHeader("cache-control", "no-store"); res.end(JSON.stringify(body)); }
async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  if (chunks.length === 0) return {};
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ContractError("invalid_json", "Request body must be valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContractError("invalid_request", "Request body must be an object.");
  return value as Record<string, unknown>;
}

type DeviceCommandRouteContext = Context & { accessToken?: string };

export function createDeviceCommandRouteHandler(options: { store: DeviceCommandStoreLike | ((context: DeviceCommandRouteContext) => DeviceCommandStoreLike) }) {
  const defaultStore = options.store;
  return async function handle(req: IncomingMessage, res: ServerResponse, context?: Context): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const ackMatch = url.pathname.match(/^\/v1\/devices\/commands\/([^/]+)\/ack$/);
    if (url.pathname !== "/v1/devices/commands" && !ackMatch) return false;
    const correlationId = context?.correlationId ?? "device-command-correlation";
    if (!context?.userId?.trim()) { sendJson(res, 401, envelope(null, { code: "unauthenticated", message: "An authenticated user context is required.", retryable: false }, correlationId)); return true; }
    try {
      const store = typeof defaultStore === "function" ? defaultStore(context) : defaultStore;
      if (url.pathname === "/v1/devices/commands" && req.method === "GET") {
        sendJson(res, 200, envelope({ commands: await store.list(context.userId, url.searchParams.get("targetDeviceId") ?? undefined) }, null, correlationId));
        return true;
      }
      if (url.pathname === "/v1/devices/commands" && req.method === "POST") {
        const body = await readJson(req);
        const result = await store.enqueue(context.userId, {
          idempotencyKey: body.idempotencyKey as string,
          targetDeviceId: body.targetDeviceId as string,
          commandType: body.commandType as Parameters<DeviceCommandStoreLike["enqueue"]>[1]["commandType"],
          ...(body.objectId === undefined ? {} : { objectId: body.objectId as string }),
          ...(body.objectRevision === undefined ? {} : { objectRevision: body.objectRevision as number }),
        });
        sendJson(res, result.created ? 201 : 200, envelope(result, null, correlationId));
        return true;
      }
      if (ackMatch && req.method === "POST") {
        const body = await readJson(req);
        const result = await store.acknowledge(context.userId, decodeURIComponent(ackMatch[1] ?? ""), body.result as "ACKNOWLEDGED" | "FAILED", body.errorCode as string | undefined);
        sendJson(res, 200, envelope({ command: result }, null, correlationId));
        return true;
      }
      sendJson(res, 405, envelope(null, { code: "method_not_allowed", message: "Use GET/POST for device commands.", retryable: false }, correlationId));
      return true;
    } catch (error) {
      const failure = error instanceof ContractError ? error : new ContractError("internal_error", "Unexpected device command error.", true);
      const status = failure.code.endsWith("not_found") ? 404 : failure.code === "idempotency_key_reused" || failure.code === "device_not_trusted" || failure.code === "command_terminal" ? 409 : failure.code === "internal_error" ? 500 : 400;
      sendJson(res, status, envelope(null, { code: failure.code, message: failure.message, retryable: failure.retryable }, correlationId));
      return true;
    }
  };
}
