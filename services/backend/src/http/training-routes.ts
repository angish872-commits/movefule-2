import type { IncomingMessage, ServerResponse } from "node:http";
import type { OwnerScopedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import {
  TrainingGenerationError,
  type TrainingGenerationCoordinator,
} from "../training/generation-coordinator.ts";
import {
  TrainingSetupContractError,
  TrainingSetupService,
  type TrainingSetupInput,
} from "../training/setup-service.ts";
import type { CurrentTrainingPlanStore } from "../training/current-plan-store.ts";
import { readJson, response, sendJson, type RequestContext } from "./requestSupport.ts";

export type TrainingRouteRuntime = {
  coordinator: TrainingGenerationCoordinator;
};

export type TrainingRouteOptions = {
  setupService: TrainingSetupService;
  repositoryFor: (context: RequestContext) => OwnerScopedRepository | undefined;
  runtimeFor: (context: RequestContext) => TrainingRouteRuntime | null;
};

export type CurrentTrainingPlanRouteContext = {
  userId: string;
  correlationId: string;
  accessToken?: string;
};

export type CurrentTrainingPlanReader = Pick<CurrentTrainingPlanStore, "readCurrent">;
export type CurrentTrainingPlanResolver = (
  context: CurrentTrainingPlanRouteContext,
) => CurrentTrainingPlanReader | null | Promise<CurrentTrainingPlanReader | null>;

type TrainingGenerationHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  context: { auth: RequestContext; url: URL; correlationId: string },
) => Promise<boolean>;

type CurrentPlanHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  context: CurrentTrainingPlanRouteContext & { url: URL },
) => Promise<boolean>;

export function createTrainingRouteHandler(options: TrainingRouteOptions): TrainingGenerationHandler;
export function createTrainingRouteHandler(resolveReader: CurrentTrainingPlanResolver): CurrentPlanHandler;
export function createTrainingRouteHandler(
  optionsOrResolver: TrainingRouteOptions | CurrentTrainingPlanResolver,
): TrainingGenerationHandler | CurrentPlanHandler {
  if (typeof optionsOrResolver === "function") {
    const resolveReader = optionsOrResolver;
    return async function currentPlanHandler(
      req: IncomingMessage,
      res: ServerResponse,
      context: CurrentTrainingPlanRouteContext & { url: URL },
    ): Promise<boolean> {
      if (context.url.pathname !== "/v1/training/current-plan") return false;
      if (req.method !== "GET") throw new ContractError("not_found", "Training current-plan route not found.");
      const reader = await resolveReader(context);
      if (!reader) {
        throw new ContractError("training_plan_recovery_unavailable", "Canonical Training plan recovery is not configured.", true);
      }
      const result = await reader.readCurrent(context.userId);
      sendJson(res, 200, response(result, null, context.correlationId));
      return true;
    };
  }

  const options = optionsOrResolver;
  return async function trainingHandler(
    req: IncomingMessage,
    res: ServerResponse,
    context: { auth: RequestContext; url: URL; correlationId: string },
  ): Promise<boolean> {
    const { auth, url, correlationId } = context;
    if (url.pathname !== "/v1/training/setup" && url.pathname !== "/v1/training/generate") return false;
    const repository = options.repositoryFor(auth);
    try {
      if (url.pathname === "/v1/training/setup") {
        if (req.method === "GET") {
          sendJson(res, 200, response(await options.setupService.get(auth.userId, repository), null, correlationId));
          return true;
        }
        if (req.method !== "PUT") throw new ContractError("method_not_allowed", "Use GET or PUT for /v1/training/setup.");
        const body = await readJson(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw new ContractError("invalid_training_setup", "Training setup request must be an object.");
        }
        const candidate = body as Record<string, unknown>;
        const saved = await options.setupService.save(auth.userId, {
          experienceBand: candidate.experienceBand as TrainingSetupInput["experienceBand"],
          equipmentCodes: candidate.equipmentCodes as readonly string[],
          environmentCodes: candidate.environmentCodes as readonly string[],
          availabilityMinutesByDay: candidate.availabilityMinutesByDay as Readonly<Record<string, number>>,
          preferenceCodes: candidate.preferenceCodes as readonly string[],
          limitationCodes: candidate.limitationCodes as readonly string[],
        }, repository);
        sendJson(res, 200, response(saved, null, correlationId));
        return true;
      }

      if (req.method !== "POST") throw new ContractError("method_not_allowed", "Use POST for /v1/training/generate.");
      const runtime = options.runtimeFor(auth);
      if (!runtime) throw new ContractError("training_runtime_unavailable", "Canonical Training persistence is not configured.", true);
      const body = await readJson(req);
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new ContractError("invalid_training_generation", "Training generation request must be an object.");
      }
      const candidate = body as Record<string, unknown>;
      const result = await runtime.coordinator.generate(auth.userId, {
        idempotencyKey: typeof candidate.idempotencyKey === "string" ? candidate.idempotencyKey : "",
        expectedPlanRevision: typeof candidate.expectedPlanRevision === "number" ? candidate.expectedPlanRevision : Number.NaN,
        ...(candidate.seed === null || typeof candidate.seed === "string" ? { seed: candidate.seed as string | null } : {}),
      });
      sendJson(res, result.status === "READY" ? 201 : 200, response(result, null, correlationId));
      return true;
    } catch (error) {
      if (error instanceof TrainingSetupContractError || error instanceof TrainingGenerationError) {
        throw new ContractError(error.code, error.message, false);
      }
      throw error;
    }
  };
}
