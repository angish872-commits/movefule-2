import type { IncomingMessage, ServerResponse } from "node:http";
import type { OwnerScopedRepository } from "../foundation/repository.ts";
import type { ProfileService } from "../foundation/profile.ts";
import { ContractError } from "../shared/contracts.ts";
import type { MealMediaLifecycleService } from "../privacy/meal-media-lifecycle.ts";
import {
  PrivacyPreferenceContractError,
  PrivacyPreferenceService,
  type PrivacyPreferenceInput,
} from "../privacy/preferences.ts";
import { readJson, response, sendJson, type RequestContext } from "./requestSupport.ts";

export type PrivacyRouteOptions = {
  privacyPreferences: PrivacyPreferenceService;
  mediaLifecycle: MealMediaLifecycleService;
  profileService: ProfileService;
  repositoryFor: (context: RequestContext) => OwnerScopedRepository | undefined;
};

function asPrivacyInput(value: unknown): PrivacyPreferenceInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError("invalid_privacy_preference", "Privacy preference request must be an object.");
  }
  const candidate = value as Record<string, unknown>;
  const retention = candidate.imageRetentionDays;
  if (typeof candidate.retainMealImages !== "boolean" ||
      typeof candidate.analyticsAllowed !== "boolean" ||
      typeof candidate.modelImprovementAllowed !== "boolean" ||
      !(retention === null || (typeof retention === "number" && Number.isInteger(retention)))) {
    throw new ContractError("invalid_privacy_preference", "Explicit retainMealImages, imageRetentionDays, analyticsAllowed and modelImprovementAllowed values are required.");
  }
  return {
    retainMealImages: candidate.retainMealImages,
    imageRetentionDays: retention,
    analyticsAllowed: candidate.analyticsAllowed,
    modelImprovementAllowed: candidate.modelImprovementAllowed,
  };
}

export function createPrivacyRouteHandler(options: PrivacyRouteOptions) {
  return async function privacyHandler(
    req: IncomingMessage,
    res: ServerResponse,
    context: { auth: RequestContext; url: URL; correlationId: string },
  ): Promise<boolean> {
    const { auth, url, correlationId } = context;
    if (url.pathname !== "/v1/privacy" && url.pathname !== "/v1/privacy/media/purge") return false;
    const repository = options.repositoryFor(auth);
    try {
      if (url.pathname === "/v1/privacy") {
        if (req.method === "GET") {
          sendJson(res, 200, response(await options.privacyPreferences.get(auth.userId, repository), null, correlationId));
          return true;
        }
        if (req.method !== "PUT") throw new ContractError("method_not_allowed", "Use GET or PUT for /v1/privacy.");
        const input = asPrivacyInput(await readJson(req));
        const profile = await options.profileService.get(auth.userId, repository);
        const exportLocale = typeof profile?.profile.locale === "string" ? profile.profile.locale : "";
        const saved = await options.privacyPreferences.save(auth.userId, input, repository, exportLocale);
        sendJson(res, 200, response(saved, null, correlationId));
        return true;
      }

      if (req.method !== "POST") throw new ContractError("method_not_allowed", "Use POST for /v1/privacy/media/purge.");
      const purge = await options.mediaLifecycle.purgeDue(auth.userId, repository);
      sendJson(res, 200, response(purge, null, correlationId));
      return true;
    } catch (error) {
      if (error instanceof PrivacyPreferenceContractError) {
        throw new ContractError(error.code, error.message);
      }
      throw error;
    }
  };
}
