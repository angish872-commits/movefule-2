import type { IncomingMessage, ServerResponse } from "node:http";
import { BarcodeError } from "../nutrition/packaged/barcode.ts";
import { packagedFallbackActions } from "../nutrition/packaged/fallback.ts";
import type { PackagedFoodResolution } from "../nutrition/packaged/packagedFoodService.ts";
import type { PackagedFoodService } from "../nutrition/packaged/service.ts";
import { response, sendJson } from "./requestSupport.ts";

export type PackagedFoodRouteContext = {
  userId: string;
  correlationId: string;
  url: URL;
};

export type PackagedFoodResolver = Pick<PackagedFoodService, "resolve">;

export function createPackagedFoodRouteHandler(service?: PackagedFoodResolver) {
  const configured = service !== undefined;

  const handler = async (
    req: IncomingMessage,
    res: ServerResponse,
    context: PackagedFoodRouteContext,
  ): Promise<boolean> => {
    if (context.url.pathname !== "/v1/nutrition/packaged") return false;
    if (req.method !== "GET") {
      res.setHeader("allow", "GET");
      sendJson(res, 405, response(null, { code: "method_not_allowed", message: "Only GET is allowed for packaged-food lookup.", retryable: false }, context.correlationId));
      return true;
    }
    if (!service) {
      sendJson(res, 503, response(null, {
        code: "packaged_food_provider_not_configured",
        message: "Packaged-food lookup is unavailable; use trusted search or manual review.",
        retryable: true,
      }, context.correlationId));
      return true;
    }

    const barcode = context.url.searchParams.get("barcode")?.trim() ?? "";
    const gramsRaw = context.url.searchParams.get("grams");
    let reviewedGrams: number | undefined;
    if (gramsRaw !== null) {
      const parsed = Number(gramsRaw);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100_000) {
        sendJson(res, 400, response(null, { code: "invalid_reviewed_grams", message: "grams must be a positive reviewed quantity.", retryable: false }, context.correlationId));
        return true;
      }
      reviewedGrams = parsed;
    }

    let resolution: PackagedFoodResolution;
    try {
      resolution = await service.resolve(barcode, reviewedGrams);
    } catch (error) {
      if (error instanceof BarcodeError) {
        sendJson(res, 400, response(null, { code: error.code, message: error.message, retryable: false }, context.correlationId));
        return true;
      }
      throw error;
    }

    if (resolution.status === "MANUAL_FALLBACK") {
      sendJson(res, 200, response({
        resolution,
        fallbackActions: packagedFallbackActions(resolution.reason),
        requiresUserReview: true,
      }, null, context.correlationId));
      return true;
    }

    sendJson(res, 200, response({
      resolution,
      requiresUserReview: true,
      canonicalAuthority: false,
    }, null, context.correlationId));
    return true;
  };

  return Object.assign(handler, { configured });
}
