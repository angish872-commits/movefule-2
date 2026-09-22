import type { AppwriteTablesClient, OwnerScopedRepository, ServerOwnedRepository } from "../foundation/repository.ts";
import type { ProfileService } from "../foundation/profile.ts";
import type { RequestContext } from "../http/requestSupport.ts";
import { createDietRouteHandler } from "../http/diet-routes.ts";
import type { ConfirmedMealStoreLike } from "../meal/confirmed-meals.ts";

/**
 * Builds the diet route handler from services chosen by the backend
 * dependency-composition root. Diet guidance stays advisory.
 */
export function createProductRouteHandlers(options: {
  profileService: ProfileService;
  repositoryFor: (context: RequestContext) => OwnerScopedRepository | undefined;
  ownerRepositoryForContext: (context: { userId: string; accessToken?: string }) => OwnerScopedRepository | undefined;
  confirmedMealsFor: (context: { userId: string; accessToken?: string }) => ConfirmedMealStoreLike;
  serverOwnedRepository?: ServerOwnedRepository;
}) {
  const dietHandler = createDietRouteHandler({
    profileService: options.profileService,
    repositoryFor: options.repositoryFor,
    confirmedMealsFor: options.confirmedMealsFor,
    ...(options.serverOwnedRepository ? { serverRepository: options.serverOwnedRepository } : {}),
  });
  return { dietHandler };
}
