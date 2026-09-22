import type { IncomingMessage, ServerResponse } from "node:http";
import { privacyInventory } from "../privacy/privacy-inventory.ts";
import { AppwriteNotificationStore, LocalNotificationStore } from "../notification/notification-store.ts";
import { SupportTicketStore } from "../support/support-store.ts";
import type { EntitlementProvider } from "../billing/entitlements.ts";
import type { OwnerScopedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import { readJson, response, sendJson, type RequestContext } from "./requestSupport.ts";

export function createExperienceRouteHandler(options: {
  localNotificationStore: LocalNotificationStore;
  supportTicketStore: SupportTicketStore;
  entitlementProvider?: EntitlementProvider;
  repositoryFor: (context: RequestContext) => OwnerScopedRepository | undefined;
}) {
  const { localNotificationStore, supportTicketStore, entitlementProvider, repositoryFor } = options;
  return async (req: IncomingMessage, res: ServerResponse, context: { auth: RequestContext; url: URL; correlationId: string }): Promise<boolean> => {
    const { auth, url, correlationId } = context;
      if (req.method === "GET" && url.pathname === "/v1/privacy/inventory") {
        sendJson(res, 200, response(privacyInventory(), null, correlationId));
        return true;
      }

      if (req.method === "GET" && url.pathname === "/v1/notifications") {
        const repository = repositoryFor(auth);
        const notifications = repository ? new AppwriteNotificationStore(repository) : localNotificationStore;
        const unread = url.searchParams.get("unread") === "true";
        sendJson(res, 200, response({ notifications: await notifications.list(auth.userId, unread), nextCursor: null }, null, correlationId));
        return true;
      }

      const notificationReadMatch = url.pathname.match(/^\/v1\/notifications\/([^/]+)\/read$/);
      if (req.method === "POST" && notificationReadMatch) {
        const repository = repositoryFor(auth);
        const notifications = repository ? new AppwriteNotificationStore(repository) : localNotificationStore;
        sendJson(res, 200, response(await notifications.markRead(auth.userId, decodeURIComponent(notificationReadMatch[1]!)), null, correlationId));
        return true;
      }

      if (req.method === "POST" && url.pathname === "/v1/support/tickets") {
        const body = await readJson(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new ContractError("invalid_support_ticket", "Support ticket body must be an object.");
        const candidate = body as Record<string, unknown>;
        const repository = repositoryFor(auth);
        const ticket = await supportTicketStore.create(auth.userId, {
          category: candidate.category, subject: candidate.subject, body: candidate.body, safeContext: candidate.safeContext,
        }, repository);
        sendJson(res, 201, response(ticket, null, correlationId));
        return true;
      }

      if (req.method === "GET" && url.pathname === "/v1/entitlements") {
        if (!entitlementProvider) {
          throw new ContractError("billing_not_configured", "A production billing provider is not configured.", true);
        }
        sendJson(res, 200, response(entitlementProvider.get(auth.userId), null, correlationId));
        return true;
      }

      if (req.method === "POST" && (url.pathname === "/v1/billing/google/verify" || url.pathname === "/v1/billing/apple/verify")) {
        if (!entitlementProvider || entitlementProvider.mode !== "production") {
          throw new ContractError(
            "billing_not_configured",
            "Production store receipt verification is not configured. No purchase was accepted.",
            true,
          );
        }
        throw new ContractError(
          "billing_verifier_unavailable",
          "The configured entitlement reader does not implement receipt verification.",
          true,
        );
      }

    return false;
  };
}
