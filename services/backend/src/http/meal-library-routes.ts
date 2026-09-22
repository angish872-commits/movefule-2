import type { IncomingMessage, ServerResponse } from "node:http";
import type { ConfirmedMealStoreLike } from "../meal/confirmed-meals.ts";
import type { SavedMealStoreLike } from "../meal/saved-meals.ts";
import type { PersonalFoodInput, PersonalFoodStoreLike } from "../meal/personal-food.ts";
import { buildNutritionReport, defaultReportRange } from "../meal/nutrition-report.ts";
import type { NutritionCatalogStoreLike } from "../meal/nutrition-catalog.ts";
import { FdcApiError } from "../nutrition/nutrients/usdaClient.ts";
import {
  RouteInputError,
  asObject,
  envelope,
  methodNotAllowed,
  readJson,
  sendJson,
  type MealRouteContext,
} from "./meal-route-support.ts";

export type MealLibraryRouteDependencies = {
  confirmedMealStore: ConfirmedMealStoreLike;
  savedMealStore: SavedMealStoreLike;
  personalFoodStore: PersonalFoodStoreLike;
  nutritionCatalogStore: NutritionCatalogStoreLike;
  nutritionCatalogAvailable: boolean;
};

export async function handleMealLibraryRoute(
  req: IncomingMessage,
  res: ServerResponse,
  context: MealRouteContext,
  path: string,
  correlationId: string,
  deps: MealLibraryRouteDependencies,
): Promise<boolean> {
  if (path === "/v1/nutrition/search") {
    if (req.method !== "GET") return methodNotAllowed(res, correlationId, "GET");
    if (!deps.nutritionCatalogAvailable) {
      throw new RouteInputError("nutrition_catalog_not_configured", "A trusted nutrition catalogue is not configured for this route.", true);
    }
    const url = new URL(req.url ?? "/", "http://localhost");
    const query = url.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2 || query.length > 128) throw new RouteInputError("invalid_nutrition_query", "q must contain between 2 and 128 characters.");
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit === null ? 20 : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new RouteInputError("invalid_nutrition_limit", "limit must be an integer between 1 and 50.");
    try {
      sendJson(res, 200, envelope(await deps.nutritionCatalogStore.search(query, limit), null, correlationId));
    } catch (error) {
      if (!(error instanceof FdcApiError)) throw error;
      const code = error.code === "rate_limited" ? "nutrition_provider_rate_limited" : "nutrition_provider_unavailable";
      throw new RouteInputError(code, "The USDA nutrition provider is temporarily unavailable.", true);
    }
    return true;
  }

  const nutritionFoodMatch = path.match(/^\/v1\/nutrition\/foods\/([^/]+)$/);
  if (nutritionFoodMatch) {
    if (req.method !== "GET") return methodNotAllowed(res, correlationId, "GET");
    if (!deps.nutritionCatalogAvailable) {
      throw new RouteInputError("nutrition_catalog_not_configured", "A trusted nutrition catalogue is not configured for this route.", true);
    }
    let food;
    try {
      food = await deps.nutritionCatalogStore.get(decodeURIComponent(nutritionFoodMatch[1] ?? ""));
    } catch (error) {
      if (!(error instanceof FdcApiError)) throw error;
      const code = error.code === "rate_limited" ? "nutrition_provider_rate_limited" : "nutrition_provider_unavailable";
      throw new RouteInputError(code, "The USDA nutrition provider is temporarily unavailable.", true);
    }
    if (!food) throw new RouteInputError("nutrition_food_not_found", "Nutrition food was not found.");
    sendJson(res, 200, envelope({ food }, null, correlationId));
    return true;
  }

  if (path === "/v1/reports/nutrition") {
    if (req.method !== "GET") return methodNotAllowed(res, correlationId, "GET");
    const url = new URL(req.url ?? "/", "http://localhost");
    const defaults = defaultReportRange();
    const periodStart = url.searchParams.get("from") ?? defaults.periodStart;
    const periodEnd = url.searchParams.get("to") ?? defaults.periodEnd;
    const meals = await deps.confirmedMealStore.list(context.userId);
    try {
      const report = buildNutritionReport(meals, periodStart, periodEnd);
      sendJson(res, 200, envelope({ report }, null, correlationId));
    } catch (error) {
      const code = error instanceof Error && error.message === "report_range_too_large" ? "report_range_too_large" : "invalid_report_range";
      throw new RouteInputError(code, code === "report_range_too_large" ? "Report ranges may contain at most 366 days." : "Report dates must be valid YYYY-MM-DD values with the start before the end.");
    }
    return true;
  }

  if (path === "/v1/saved-meals") {
    if (req.method === "GET") {
      const url = new URL(req.url ?? "/", "http://localhost");
      sendJson(res, 200, envelope({ savedMeals: await deps.savedMealStore.list(context.userId, url.searchParams.get("query") ?? undefined) }, null, correlationId));
      return true;
    }
    if (req.method !== "POST") return methodNotAllowed(res, correlationId, "GET, POST");
    const body = asObject(await readJson(req));
    const result = await deps.savedMealStore.create(context.userId, {
      idempotencyKey: body.idempotencyKey as string,
      name: body.name as string,
      items: body.items,
    });
    sendJson(res, result.status === "DUPLICATE" ? 200 : 201, envelope(result, null, correlationId));
    return true;
  }

  if (path === "/v1/personal-food") {
    if (req.method === "GET") {
      sendJson(res, 200, envelope({ personalFoods: await deps.personalFoodStore.list(context.userId) }, null, correlationId));
      return true;
    }
    if (req.method !== "POST") return methodNotAllowed(res, correlationId, "GET, POST");
    const body = asObject(await readJson(req));
    const result = await deps.personalFoodStore.create(context.userId, {
      idempotencyKey: body.idempotencyKey as string,
      name: body.name as string,
      basisAmount: body.basisAmount as number,
      basisUnit: body.basisUnit as string,
      energyKcal: body.energyKcal as number,
      proteinG: body.proteinG as number,
      carbG: body.carbG as number,
      fatG: body.fatG as number,
      fiberG: body.fiberG as number,
      ...(body.provenanceNote === undefined ? {} : { provenanceNote: body.provenanceNote as string }),
    } satisfies PersonalFoodInput);
    sendJson(res, result.status === "DUPLICATE" ? 200 : 201, envelope(result, null, correlationId));
    return true;
  }

  const personalFoodMatch = path.match(/^\/v1\/personal-food\/([^/]+)$/);
  if (personalFoodMatch) {
    const personalFoodId = decodeURIComponent(personalFoodMatch[1] ?? "");
    if (req.method === "PATCH") {
      const body = asObject(await readJson(req));
      const result = await deps.personalFoodStore.update(context.userId, personalFoodId, {
        expectedRevision: body.expectedRevision as number,
        ...(body.name === undefined ? {} : { name: body.name as string }),
        ...(body.basisAmount === undefined ? {} : { basisAmount: body.basisAmount as number }),
        ...(body.basisUnit === undefined ? {} : { basisUnit: body.basisUnit as string }),
        ...(body.energyKcal === undefined ? {} : { energyKcal: body.energyKcal as number }),
        ...(body.proteinG === undefined ? {} : { proteinG: body.proteinG as number }),
        ...(body.carbG === undefined ? {} : { carbG: body.carbG as number }),
        ...(body.fatG === undefined ? {} : { fatG: body.fatG as number }),
        ...(body.fiberG === undefined ? {} : { fiberG: body.fiberG as number }),
        ...(body.provenanceNote === undefined ? {} : { provenanceNote: body.provenanceNote as string }),
      });
      sendJson(res, 200, envelope(result, null, correlationId));
      return true;
    }
    if (req.method === "DELETE") {
      const body = asObject(await readJson(req));
      const result = await deps.personalFoodStore.delete(context.userId, personalFoodId, body.expectedRevision as number);
      sendJson(res, 200, envelope(result, null, correlationId));
      return true;
    }
    return methodNotAllowed(res, correlationId, "PATCH, DELETE");
  }

  return false;
}
