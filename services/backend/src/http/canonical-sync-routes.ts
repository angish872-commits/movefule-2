import type { IncomingMessage, ServerResponse } from "node:http";
import type { SyncEnvelope, SyncReceipt } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import { bindAuthenticatedSyncSession } from "../sync/canonical-reconciliation.ts";
import { ContractError } from "../shared/contracts.ts";
import { readJson, response, sendJson } from "./requestSupport.ts";

export type CanonicalSyncRouteContext = {
  userId: string;
  sessionId: string;
  correlationId: string;
  provider?: "appwrite" | "local-test";
  accessToken?: string;
};

export type CanonicalReconciler = {
  reconcile(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt>;
};

export type CanonicalReconcilerResolver = (
  context: CanonicalSyncRouteContext,
  entityType: string,
) => CanonicalReconciler | null | Promise<CanonicalReconciler | null>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Canonical generic sync. Legacy daily-summary sync is deliberately elsewhere. */
export function createCanonicalSyncRouteHandler(resolveReconciler: CanonicalReconcilerResolver) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    context: CanonicalSyncRouteContext & { url: URL },
  ): Promise<boolean> => {
    if (context.url.pathname !== "/v1/sync/reconcile") return false;
    if (req.method !== "POST") throw new ContractError("not_found", "Canonical sync route not found.");
    const body = await readJson(req);
    if (!isRecord(body)) throw new ContractError("invalid_sync_envelope", "Canonical sync body must be a SyncEnvelope object.");
    const envelope = body as unknown as SyncEnvelope<unknown>;
    // Server-only, non-enumerable binding. It cannot be supplied by the client
    // and does not enter canonical payload/request hashes or persisted journals.
    bindAuthenticatedSyncSession(envelope, context.sessionId);
    const reconciler = await resolveReconciler(context, envelope.entityType);
    if (!reconciler) {
      throw new ContractError("sync_entity_not_supported", `Canonical sync is not configured for ${String(envelope.entityType)}.`, false);
    }
    const receipt = await reconciler.reconcile(context.userId, envelope);
    sendJson(res, 200, response(receipt, null, context.correlationId));
    return true;
  };
}
