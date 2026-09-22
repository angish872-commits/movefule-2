import type { IncomingMessage, ServerResponse } from "node:http";
import type { CalendarSnapshot, SyncEnvelope, SyncReceipt } from "../calendar/types.ts";
import type { CalendarService } from "../calendar/calendar-service.ts";
import { bindAuthenticatedSyncSession } from "../sync/canonical-reconciliation.ts";
import { ContractError } from "../shared/contracts.ts";
import { readJson, response, sendJson } from "./requestSupport.ts";

export type CalendarRouteContext = {
  userId: string;
  sessionId: string;
  correlationId: string;
  provider?: "appwrite" | "local-test";
  accessToken?: string;
};

export type CalendarServiceLike = Pick<CalendarService, "current" | "reconcile">;
export type CalendarServiceResolver =
  | CalendarServiceLike
  | null
  | ((context: CalendarRouteContext) => CalendarServiceLike | null | Promise<CalendarServiceLike | null>);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const routeOperation = (pathname: string): string | null => ({
  "/v1/calendar/move": "MOVE_CALENDAR_ENTRY",
  "/v1/calendar/lock": "LOCK_CALENDAR_ENTRY",
  "/v1/calendar/unlock": "LOCK_CALENDAR_ENTRY",
  "/v1/calendar/missed": "RESOLVE_MISSED_PLACEMENT",
  "/v1/calendar/unavailable": "SET_UNAVAILABLE",
  "/v1/calendar/rest-day": "PLACE_REST_DAY",
  "/v1/calendar/training-placement": "PLACE_TRAINING_SESSION",
  "/v1/calendar/adapt": "REQUEST_TRAINING_ADAPTATION",
  "/v1/calendar/training-adaptation": "REQUEST_TRAINING_ADAPTATION",
} as Record<string, string>)[pathname] ?? null;

const resolveService = async (
  resolver: CalendarServiceResolver,
  context: CalendarRouteContext,
): Promise<CalendarServiceLike | null> =>
  typeof resolver === "function" ? await resolver(context) : resolver;

/**
 * Calendar HTTP adapter only. Persistence/Appwrite construction remains in
 * backend-runtime.ts, the modular-monolith composition root.
 */
export function createCalendarRouteHandler(serviceResolver: CalendarServiceResolver) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    context: CalendarRouteContext & { url: URL },
  ): Promise<boolean> => {
    if (!context.url.pathname.startsWith("/v1/calendar")) return false;
    // Preserve the existing date-range projection endpoint while canonical
    // Calendar owns the revision snapshot and command surface.
    if (req.method === "GET" && context.url.pathname === "/v1/calendar" &&
        (context.url.searchParams.has("from") || context.url.searchParams.has("to"))) return false;
    const service = await resolveService(serviceResolver, context);
    if (!service) throw new ContractError("calendar_persistence_unavailable", "Calendar persistence is not configured.", true);

    if (req.method === "GET" && context.url.pathname === "/v1/calendar") {
      const snapshot: CalendarSnapshot = await service.current(context.userId);
      sendJson(res, 200, response(snapshot, null, context.correlationId));
      return true;
    }

    const expectedOperation = context.url.pathname === "/v1/calendar/commands"
      ? null
      : routeOperation(context.url.pathname);
    if (req.method === "POST" && (context.url.pathname === "/v1/calendar/commands" || expectedOperation)) {
      const body = await readJson(req);
      if (!isRecord(body)) throw new ContractError("invalid_sync_envelope", "Calendar command body must be a SyncEnvelope object.");
      const envelope = body as unknown as SyncEnvelope<unknown>;
      if (expectedOperation && envelope.operation !== expectedOperation) {
        throw new ContractError("calendar_route_operation_mismatch", "Calendar route and SyncEnvelope operation do not match.");
      }
      if (context.url.pathname === "/v1/calendar/unlock" &&
          (!isRecord(envelope.payload) || envelope.payload.locked !== false)) {
        throw new ContractError("invalid_calendar_unlock", "Unlock requires payload.locked=false.");
      }
      if (context.url.pathname === "/v1/calendar/lock" &&
          (!isRecord(envelope.payload) || envelope.payload.locked !== true)) {
        throw new ContractError("invalid_calendar_lock", "Lock requires payload.locked=true.");
      }
      bindAuthenticatedSyncSession(envelope, context.sessionId);
      const receipt: SyncReceipt = await service.reconcile(context.userId, envelope);
      sendJson(res, 200, response(receipt, null, context.correlationId));
      return true;
    }

    throw new ContractError("not_found", "Calendar route not found.");
  };
}
