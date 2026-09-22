import type { IncomingMessage, ServerResponse } from "node:http";
import { DietPlanService } from "../diet-intelligence/diet-plan-service.ts";
import { DietRecommendationPersistence } from "../diet-intelligence/persistence.ts";
import type { RecommendationFeedbackAction } from "../diet-intelligence/recommendation-engine.ts";
import type { ProfileService } from "../foundation/profile.ts";
import type { OwnerScopedRepository, ServerOwnedRepository } from "../foundation/repository.ts";
import type { ConfirmedMealStoreLike } from "../meal/confirmed-meals.ts";
import { ContractError } from "../shared/contracts.ts";
import { readJson, response, sendJson, type RequestContext } from "./requestSupport.ts";

const feedbackActions = new Set<RecommendationFeedbackAction>(["ACCEPTED", "DISMISSED", "COMPLETED", "NOT_RELEVANT", "UNAVAILABLE", "DISLIKED"]);

export function createDietRouteHandler(options: {
  profileService: ProfileService;
  repositoryFor: (context: RequestContext) => OwnerScopedRepository | undefined;
  confirmedMealsFor: (context: RequestContext) => ConfirmedMealStoreLike;
  serverRepository?: ServerOwnedRepository;
}) {
  return async (req: IncomingMessage, res: ServerResponse, context: { auth: RequestContext; url: URL; correlationId: string }): Promise<boolean> => {
    const { auth, url, correlationId } = context;
    if (req.method === "GET" && url.pathname === "/v1/diet/recommendation") {
      const profile = await options.profileService.get(auth.userId, options.repositoryFor(auth));
      if (!profile) throw new ContractError("profile_not_found", "Finish profile setup before requesting nutrition guidance.");
      const localDate = url.searchParams.get("localDate") ?? new Date().toISOString().slice(0, 10);
      const repository = options.repositoryFor(auth);
      const plan = await new DietPlanService(
        repository && options.serverRepository ? new DietRecommendationPersistence(repository, options.serverRepository) : undefined,
        options.confirmedMealsFor(auth),
      ).recommend(profile, localDate);
      sendJson(res, 200, response(plan, null, correlationId));
      return true;
    }
    const feedbackMatch = url.pathname.match(/^\/v1\/diet\/recommendation\/([^/]+)\/feedback$/);
    if (req.method !== "POST" || !feedbackMatch) return false;
    const body = await readJson(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ContractError("invalid_diet_feedback", "Diet feedback must be an object.");
    const input = body as Record<string, unknown>;
    const action = input.action;
    const sourceDevice = input.sourceDevice;
    const idempotencyKey = input.idempotencyKey;
    const occurredAt = input.occurredAt;
    if (typeof action !== "string" || !feedbackActions.has(action as RecommendationFeedbackAction) || typeof sourceDevice !== "string" || typeof idempotencyKey !== "string" || typeof occurredAt !== "string") {
      throw new ContractError("invalid_diet_feedback", "Diet feedback requires a supported action, sourceDevice, idempotencyKey, and occurredAt.");
    }
    const repository = options.repositoryFor(auth);
    if (!repository || !options.serverRepository) throw new ContractError("diet_feedback_persistence_unavailable", "Diet feedback requires canonical persistence.", true);
    await new DietPlanService(
      new DietRecommendationPersistence(repository, options.serverRepository),
      options.confirmedMealsFor(auth),
    ).feedback(auth.userId, decodeURIComponent(feedbackMatch[1]!), action as RecommendationFeedbackAction, sourceDevice, idempotencyKey, occurredAt);
    sendJson(res, 200, response({ accepted: true }, null, correlationId));
    return true;
  };
}
