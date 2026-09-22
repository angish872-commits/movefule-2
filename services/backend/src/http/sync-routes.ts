import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import {
  API_SCHEMA_VERSION,
  ContractError,
  type ApiEnvelope,
  type LegacySummarySyncPullRequest,
  type LegacySummarySyncPushBatch,
} from "../shared/contracts.ts";
import { SyncProductAdapter, type SyncProductAdapterLike } from "../sync/adapter.ts";
import type { DeviceTrustStoreLike } from "../device/appwrite-device-trust.ts";
import type {
  LegacySummaryWatchDeliveryRequest,
  LegacySummaryWatchReceiptRequest,
  WorkoutCompleteRequest,
  WorkoutExerciseEventRequest,
  WorkoutListRequest,
  WorkoutStartRequest,
  WorkoutTransitionRequest,
} from "../sync/types.ts";

const DEFAULT_MAX_BODY_BYTES = 512 * 1024;
const LEGACY_SUMMARY_PUSH_PATHS = new Set(["/v1/legacy/summary-sync/push", "/v1/sync/push"]);
const LEGACY_SUMMARY_PULL_PATHS = new Set(["/v1/legacy/summary-sync/pull", "/v1/sync/pull"]);

type RequestContext = { userId: string; accessToken?: string };
type Authenticator = (request: IncomingMessage, environment: string) => RequestContext | Promise<RequestContext>;

export type SyncRouteOptions = {
  adapter?: SyncProductAdapterLike | ((context: RequestContext) => SyncProductAdapterLike | Promise<SyncProductAdapterLike>);
  environment?: string;
  maxBodyBytes?: number;
  authenticate?: Authenticator;
  deviceTrust?: DeviceTrustStoreLike | ((context: RequestContext) => DeviceTrustStoreLike | Promise<DeviceTrustStoreLike>);
  /** Explicit test/local compatibility switch. Production mutations use /v1/sync/reconcile. */
  allowLegacyWorkoutMutationRoutes?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const defaultAuthenticator: Authenticator = (request, environment) => {
  if (environment === "production") {
    throw new ContractError("auth_not_configured", "Appwrite session authentication is required before production use.");
  }
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer local-user:")) {
    throw new ContractError("unauthenticated", "Use the explicit local development credential format.");
  }
  const userId = header.slice("Bearer local-user:".length).trim();
  if (!userId) throw new ContractError("unauthenticated", "Local user id is missing.");
  return { userId };
};

function envelope<T>(data: T | null, error: ApiEnvelope<T>["error"], correlationId: string): ApiEnvelope<T> {
  return { schemaVersion: API_SCHEMA_VERSION, correlationId, data, error };
}

function sendJson<T>(response: ServerResponse, status: number, body: ApiEnvelope<T>): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    bytes += buffer.byteLength;
    if (bytes > maxBodyBytes) throw new ContractError("body_too_large", "Request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ContractError("invalid_json", "Request body must be valid JSON.");
  }
}

const requireObject = (value: unknown, code: string, message: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new ContractError(code, message);
  return value;
};

const requireString = (value: unknown, code: string, message: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) throw new ContractError(code, message);
  return value.trim();
};

const decodedCapture = (match: RegExpMatchArray): string => {
  const value = match[1];
  if (!value) throw new ContractError("invalid_path_parameter", "Route path parameter is required.");
  return decodeURIComponent(value);
};

const statusFor = (code: string): number => {
  if (["unauthenticated", "auth_not_configured"].includes(code)) return 401;
  if (code === "not_found") return 404;
  if (["stale_revision", "idempotency_key_reused", "authority_mismatch", "workout_already_active", "receipt_conflict", "delivery_terminal"].includes(code)) return 409;
  if (code === "internal_error") return 500;
  return 400;
};

export function createSyncProductHandler(options: SyncRouteOptions = {}) {
  const environment = options.environment ?? process.env.MOVEFUEL_ENV ?? "local";
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const defaultAdapter = typeof options.adapter === "function"
    ? new SyncProductAdapter()
    : options.adapter ?? new SyncProductAdapter();
  const authenticate = options.authenticate ?? defaultAuthenticator;
  const allowLegacyWorkoutMutationRoutes = options.allowLegacyWorkoutMutationRoutes ?? environment === "local";
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const correlationId = randomUUID();
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const auth = await authenticate(request, environment);
      const adapter = typeof options.adapter === "function"
        ? await options.adapter(auth)
        : defaultAdapter;
      const deviceTrust = typeof options.deviceTrust === "function"
        ? await options.deviceTrust(auth)
        : options.deviceTrust;

      if (request.method === "POST" && LEGACY_SUMMARY_PUSH_PATHS.has(url.pathname)) {
        const body = requireObject(await readJson(request, maxBodyBytes), "invalid_legacy_summary_sync_batch", "Legacy summary push body must be an object.");
        const result = await adapter.push(auth.userId, body as unknown as LegacySummarySyncPushBatch);
        sendJson(response, 200, envelope(result, null, correlationId));
        return;
      }

      if (request.method === "POST" && LEGACY_SUMMARY_PULL_PATHS.has(url.pathname)) {
        const body = requireObject(await readJson(request, maxBodyBytes), "invalid_legacy_summary_sync_request", "Legacy summary pull body must be an object.");
        const result = await adapter.pull(auth.userId, body as unknown as LegacySummarySyncPullRequest);
        sendJson(response, 200, envelope(result, null, correlationId));
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/watch/deliveries") {
        const body = requireObject(await readJson(request, maxBodyBytes), "invalid_watch_delivery", "Watch delivery body must be an object.");
        const phoneDeviceId = requireString(body.phoneDeviceId, "invalid_phone_device_id", "phoneDeviceId is required.");
        const watchDeviceId = requireString(body.watchDeviceId, "invalid_watch_device_id", "watchDeviceId is required.");
        if (deviceTrust && !deviceTrust.isTrustedPair(auth.userId, phoneDeviceId, watchDeviceId)) {
          throw new ContractError("device_not_trusted", "The phone and watch must have an active owner trust session.");
        }
        const result = await adapter.createWatchDelivery(auth.userId, body as unknown as LegacySummaryWatchDeliveryRequest);
        sendJson(response, result.created ? 201 : 200, envelope(result, null, correlationId));
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/watch/deliveries") {
        const watchDeviceId = url.searchParams.get("watchDeviceId");
        if (deviceTrust && !deviceTrust.isTrustedWatch(auth.userId, watchDeviceId ?? "")) {
          throw new ContractError("device_not_trusted", "The watch does not have an active owner trust session.");
        }
        const result = await adapter.listWatchDeliveries(auth.userId, watchDeviceId ?? "");
        sendJson(response, 200, envelope(result, null, correlationId));
        return;
      }

      const attemptMatch = request.method === "POST"
        ? url.pathname.match(/^\/v1\/watch\/deliveries\/([^/]+)\/attempt$/)
        : null;
      if (attemptMatch) {
        const body = requireObject(await readJson(request, maxBodyBytes), "invalid_watch_attempt", "Watch attempt body must be an object.");
        const attemptedAt = body.attemptedAtEpochMillis === undefined ? undefined : Number(body.attemptedAtEpochMillis);
        const result = await adapter.markWatchAttempt(auth.userId, decodedCapture(attemptMatch), attemptedAt);
        sendJson(response, 200, envelope(result, null, correlationId));
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/watch/receipts") {
        const raw = requireObject(await readJson(request, maxBodyBytes), "invalid_watch_receipt", "Watch receipt body must be an object.");
        const receiptValue = isRecord(raw.receipt) ? { ...raw.receipt, watchDeviceId: raw.watchDeviceId ?? raw.deviceId ?? raw.receipt.watchDeviceId } : raw;
        if (deviceTrust && isRecord(receiptValue)) {
          const watchDeviceId = requireString(receiptValue.watchDeviceId, "invalid_watch_device_id", "watchDeviceId is required.");
          if (!deviceTrust.isTrustedWatch(auth.userId, watchDeviceId)) {
            throw new ContractError("device_not_trusted", "The watch does not have an active owner trust session.");
          }
        }
        const result = await adapter.recordWatchReceipt(auth.userId, receiptValue as unknown as LegacySummaryWatchReceiptRequest);
        sendJson(response, 200, envelope(result, null, correlationId));
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/workouts") {
        const fromRaw = url.searchParams.get("from");
        const toRaw = url.searchParams.get("to");
        const stateRaw = url.searchParams.get("state");
        const limitRaw = url.searchParams.get("limit");
        const query: WorkoutListRequest = {
          ...(fromRaw ? { fromEpochMillis: Number(fromRaw) } : {}),
          ...(toRaw ? { toEpochMillis: Number(toRaw) } : {}),
          ...(stateRaw ? { state: stateRaw as WorkoutListRequest["state"] } : {}),
          ...(limitRaw ? { limit: Number(limitRaw) } : {}),
        };
        const result = await adapter.listWorkouts(auth.userId, query);
        sendJson(response, 200, envelope(result, null, correlationId));
        return;
      }

      if (!allowLegacyWorkoutMutationRoutes && request.method === "POST" &&
          (url.pathname === "/v1/workouts/start" ||
            /^\/v1\/workouts\/[^/]+\/(transition|events|complete)$/.test(url.pathname))) {
        throw new ContractError(
          "canonical_reconciliation_required",
          "Direct workout mutation routes are isolated; submit a SyncEnvelope to /v1/sync/reconcile.",
        );
      }

      if (request.method === "POST" && url.pathname === "/v1/workouts/start") {
        const body = requireObject(await readJson(request, maxBodyBytes), "invalid_workout_start", "Workout start body must be an object.");
        const result = await adapter.startWorkout(auth.userId, body as unknown as WorkoutStartRequest);
        sendJson(response, result.outcome === "ACCEPTED" ? 201 : 200, envelope(result, null, correlationId));
        return;
      }

      const transitionMatch = request.method === "POST"
        ? url.pathname.match(/^\/v1\/workouts\/([^/]+)\/transition$/)
        : null;
      if (transitionMatch) {
        const body = requireObject(await readJson(request, maxBodyBytes), "invalid_workout_transition", "Workout transition body must be an object.");
        const result = await adapter.transitionWorkout(auth.userId, {
          ...body,
          sessionId: decodedCapture(transitionMatch),
        } as unknown as WorkoutTransitionRequest);
        sendJson(response, 200, envelope(result, null, correlationId));
        return;
      }

      const workoutEventsMatch = url.pathname.match(/^\/v1\/workouts\/([^/]+)\/events$/);
      if (request.method === "POST" && workoutEventsMatch) {
        const body = requireObject(await readJson(request, maxBodyBytes), "invalid_workout_event", "Workout event body must be an object.");
        const result = await adapter.recordWorkoutEvent(auth.userId, {
          ...body,
          sessionId: decodedCapture(workoutEventsMatch),
        } as unknown as WorkoutExerciseEventRequest);
        sendJson(response, result.outcome === "ACCEPTED" ? 201 : 200, envelope(result, null, correlationId));
        return;
      }
      if (request.method === "GET" && workoutEventsMatch) {
        const result = await adapter.listWorkoutEvents(auth.userId, decodedCapture(workoutEventsMatch));
        sendJson(response, 200, envelope(result, null, correlationId));
        return;
      }

      const completeMatch = request.method === "POST"
        ? url.pathname.match(/^\/v1\/workouts\/([^/]+)\/complete$/)
        : null;
      if (completeMatch) {
        const body = requireObject(await readJson(request, maxBodyBytes), "invalid_workout_complete", "Workout complete body must be an object.");
        const result = await adapter.completeWorkout(auth.userId, {
          ...body,
          sessionId: decodedCapture(completeMatch),
        } as unknown as WorkoutCompleteRequest);
        sendJson(response, 200, envelope(result, null, correlationId));
        return;
      }

      sendJson(response, 404, envelope(null, { code: "not_found", message: "Route not found.", retryable: false }, correlationId));
    } catch (error) {
      const contractError = error instanceof ContractError
        ? error
        : new ContractError("internal_error", "Unexpected sync product backend error.", true);
      sendJson(response, statusFor(contractError.code), envelope(null, {
        code: contractError.code,
        message: contractError.message,
        retryable: contractError.retryable,
      }, correlationId));
    }
  };
}

export function createSyncProductServer(options: SyncRouteOptions = {}) {
  return createHttpServer(createSyncProductHandler(options));
}
