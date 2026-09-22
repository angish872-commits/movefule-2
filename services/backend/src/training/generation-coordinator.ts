import type { DailyActionCandidate, TrainingPlanEnvelope } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import { sha256 } from "../domain/sync-store.ts";
import type { RepositoryRow, ServerOwnedRepository } from "../foundation/repository.ts";
import type { AppwriteTrainingPlanStore } from "./plan-store.ts";
import type { TrainingRuntimeInputBuilder } from "./runtime-input.ts";
import type { TrainingBackendService } from "./training-service.ts";
import { dailyTrainingCandidatesForPlan, toDailyTrainingCandidate } from "./today-adapter.ts";

const IDEMPOTENCY_SCOPE = "training.generate.v1";
const IDEMPOTENCY_TTL_DAYS = 7;

export type TrainingCalendarConstraint = {
  localDate: string;
  semanticSessionId: string;
  availableMinutes: number;
};

export type GenerateCanonicalTrainingCommand = {
  idempotencyKey: string;
  expectedPlanRevision: number;
  seed?: string | null;
  /** Server-only constraint originating from the authorized Calendar boundary. */
  calendarConstraint?: TrainingCalendarConstraint;
};

export type CanonicalTrainingGenerationResult =
  | {
      status: "READY";
      plan: TrainingPlanEnvelope;
      dailyCandidates: readonly DailyActionCandidate[];
      persistenceOutcome: "CREATED" | "DUPLICATE" | "RECOVERED";
    }
  | {
      status: "MISSING_INFORMATION";
      setupAction: DailyActionCandidate;
      missingFields: readonly string[];
    }
  | {
      status: "BLOCKED";
      reasonCodes: readonly string[];
      missingFields: readonly string[];
    };

export class TrainingGenerationError extends Error {
  public readonly code:
    | "invalid_training_generation"
    | "stale_plan_revision"
    | "idempotency_key_reused"
    | "training_generation_recovery_failed";

  public constructor(code: TrainingGenerationError["code"], message: string) {
    super(message);
    this.name = "TrainingGenerationError";
    this.code = code;
  }
}

type IdempotencyRow = {
  keyId: string;
  userId: string;
  scope: string;
  keyHash: string;
  requestHash: string;
  responseRef?: string;
  state: string;
  expiresAt: string;
  createdAt: string;
};

function nonEmptyKey(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) {
    throw new TrainingGenerationError("invalid_training_generation", "idempotencyKey must be 1-128 characters.");
  }
  return normalized;
}

function expectedRevision(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new TrainingGenerationError("invalid_training_generation", "expectedPlanRevision must be a non-negative integer.");
  }
  return value;
}

function validateCalendarConstraint(value: TrainingCalendarConstraint | undefined): TrainingCalendarConstraint | null {
  if (!value) return null;
  const semanticSessionId = typeof value.semanticSessionId === "string" ? value.semanticSessionId.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.localDate) || !semanticSessionId || semanticSessionId.length > 128 ||
      !Number.isFinite(value.availableMinutes) || !Number.isInteger(value.availableMinutes) || value.availableMinutes < 10 || value.availableMinutes > 240) {
    throw new TrainingGenerationError("invalid_training_generation", "Calendar Training constraint is invalid or below the 10-minute safe minimum.");
  }
  return { localDate: value.localDate, semanticSessionId, availableMinutes: value.availableMinutes };
}

function assertCalendarConstraintSatisfied(plan: TrainingPlanEnvelope, constraint: TrainingCalendarConstraint): void {
  for (const raw of plan.sessions) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const session = raw as { readonly [key: string]: unknown };
    if (session.semanticSessionId !== constraint.semanticSessionId) continue;
    if (session.localDate !== constraint.localDate) {
      throw new TrainingGenerationError("training_generation_recovery_failed", "Regenerated Training semantic session moved outside the authoritative Calendar date constraint.");
    }
    if (typeof session.expectedDurationMinutes !== "number" || !Number.isFinite(session.expectedDurationMinutes) ||
        session.expectedDurationMinutes > constraint.availableMinutes) {
      throw new TrainingGenerationError("training_generation_recovery_failed", "Regenerated Training session does not satisfy the authoritative Calendar duration constraint.");
    }
    return;
  }
  throw new TrainingGenerationError("training_generation_recovery_failed", "Regenerated Training plan does not contain the authoritative semantic session required by Calendar.");
}

export function canonicalTrainingPlanId(userId: string): string {
  return `training-plan-${sha256(userId).slice(0, 22)}`;
}

function keyRowId(userId: string, idempotencyKey: string): string {
  return `training-idem-${sha256({ userId, scope: IDEMPOTENCY_SCOPE, idempotencyKey }).slice(0, 22)}`;
}

function expiresAt(createdAt: string): string {
  return new Date(Date.parse(createdAt) + IDEMPOTENCY_TTL_DAYS * 86_400_000).toISOString();
}

function setupCandidate(userId: string, generatedAt: string, missingFields: readonly string[]): DailyActionCandidate {
  const expires = new Date(Date.parse(generatedAt) + 24 * 3_600_000).toISOString();
  return toDailyTrainingCandidate({
    candidateId: `training-setup-${sha256({ userId, missingFields }).slice(0, 32)}`,
    userId,
    type: "TRAINING_SETUP",
    score: 100,
    sourcePlanId: null,
    sourcePlanRevision: null,
    semanticSessionId: null,
    reasonCodes: ["TRAINING_SETUP_REQUIRED", "UNKNOWN_REMAINS_UNKNOWN", ...missingFields.map((field) => `MISSING_${field.toUpperCase()}`)],
    validFrom: generatedAt,
    expiresAt: expires,
  });
}

export class TrainingGenerationCoordinator {
  private readonly runtimeInputs: TrainingRuntimeInputBuilder;
  private readonly training: TrainingBackendService;
  private readonly plans: AppwriteTrainingPlanStore;
  private readonly idempotency: ServerOwnedRepository;
  private readonly now: () => Date;

  public constructor(options: {
    runtimeInputs: TrainingRuntimeInputBuilder;
    training: TrainingBackendService;
    plans: AppwriteTrainingPlanStore;
    idempotency: ServerOwnedRepository;
    now?: () => Date;
  }) {
    this.runtimeInputs = options.runtimeInputs;
    this.training = options.training;
    this.plans = options.plans;
    this.idempotency = options.idempotency;
    this.now = options.now ?? (() => new Date());
  }

  public async generate(userId: string, command: GenerateCanonicalTrainingCommand): Promise<CanonicalTrainingGenerationResult> {
    const owner = userId.trim();
    if (!owner) throw new TrainingGenerationError("invalid_training_generation", "An authenticated user is required.");
    const idempotencyKey = nonEmptyKey(command.idempotencyKey);
    const expectedPlanRevision = expectedRevision(command.expectedPlanRevision);
    const calendarConstraint = validateCalendarConstraint(command.calendarConstraint);
    const planId = canonicalTrainingPlanId(owner);
    const requestHash = sha256({
      userId: owner,
      scope: IDEMPOTENCY_SCOPE,
      expectedPlanRevision,
      seed: command.seed ?? null,
      calendarConstraint,
    });
    const rowId = keyRowId(owner, idempotencyKey);
    let journal = await this.idempotency.getForUser<IdempotencyRow>("idempotency_key", owner, rowId);
    if (journal && journal.requestHash !== requestHash) {
      throw new TrainingGenerationError("idempotency_key_reused", "The idempotency key was already used for a different Training generation request.");
    }

    const recovered = await this.plans.findByIdempotency(owner, planId, idempotencyKey);
    if (recovered) {
      if (recovered.requestHash !== requestHash) {
        throw new TrainingGenerationError("idempotency_key_reused", "The idempotency key resolves to a different immutable Training request.");
      }
      if (!journal) {
        const createdAt = recovered.plan.generatedAt;
        journal = await this.createOrReadJournal(owner, rowId, idempotencyKey, requestHash, createdAt);
      }
      await this.idempotency.updateForUser("idempotency_key", owner, rowId, { state: "COMPLETE", responseRef: recovered.rowId });
      return {
        status: "READY",
        plan: recovered.plan,
        dailyCandidates: dailyTrainingCandidatesForPlan(owner, recovered.plan),
        persistenceOutcome: "RECOVERED",
      };
    }

    const runtimeAt = journal?.createdAt ?? this.now().toISOString();
    const runtime = await this.runtimeInputs.build(owner, runtimeAt);
    if (runtime.status === "MISSING_INFORMATION") {
      return {
        status: "MISSING_INFORMATION",
        setupAction: setupCandidate(owner, runtimeAt, runtime.action.missingFields),
        missingFields: runtime.action.missingFields,
      };
    }

    let engineInput = runtime.input;
    if (calendarConstraint) {
      const hasDate = engineInput.availability.some((slot) => slot.localDate === calendarConstraint.localDate);
      if (!hasDate) {
        throw new TrainingGenerationError("invalid_training_generation", "Calendar adaptation date is outside the current canonical Training availability horizon.");
      }
      engineInput = {
        ...engineInput,
        availability: engineInput.availability.map((slot) => slot.localDate === calendarConstraint.localDate
          ? { ...slot, availableMinutes: calendarConstraint.availableMinutes, locked: false }
          : slot),
      };
    }

    const currentRevision = await this.plans.currentRevision(owner, planId);
    if (currentRevision !== expectedPlanRevision) {
      throw new TrainingGenerationError(
        "stale_plan_revision",
        `Expected Training plan revision ${expectedPlanRevision}, but canonical revision is ${currentRevision}.`,
      );
    }

    if (!journal) journal = await this.createOrReadJournal(owner, rowId, idempotencyKey, requestHash, runtimeAt);
    if (journal.requestHash !== requestHash) {
      throw new TrainingGenerationError("idempotency_key_reused", "The idempotency key was concurrently used for a different request.");
    }
    const generatedAt = journal.createdAt;
    try {
      const response = await this.training.generateAndPersist({
        userId: owner,
        ...engineInput,
        generatedAt,
        planRevision: currentRevision + 1,
        canonicalPlanId: planId,
        operation: { idempotencyKey, requestHash },
        seed: command.seed ?? null,
        ...(calendarConstraint ? { beforePersist: (result) => assertCalendarConstraintSatisfied(result.plan, calendarConstraint) } : {}),
      });
      if (response.result.status !== "READY" || !response.persistence) {
        await this.idempotency.updateForUser("idempotency_key", owner, rowId, { state: "NO_MUTATION" });
        return {
          status: "BLOCKED",
          reasonCodes: response.result.status === "BLOCKED" ? response.result.reasonCodes : ["TRAINING_GENERATION_BLOCKED"],
          missingFields: response.result.status === "BLOCKED" ? response.result.missingFields : [],
        };
      }
      await this.idempotency.updateForUser("idempotency_key", owner, rowId, {
        state: "COMPLETE",
        responseRef: response.persistence.planRevisionId,
      });
      return {
        status: "READY",
        plan: response.result.plan,
        dailyCandidates: dailyTrainingCandidatesForPlan(owner, response.result.plan),
        persistenceOutcome: response.persistence.outcome,
      };
    } catch (error) {
      await this.idempotency.updateForUser("idempotency_key", owner, rowId, { state: "RETRYABLE" }).catch(() => undefined);
      throw error;
    }
  }

  private async createOrReadJournal(
    userId: string,
    rowId: string,
    idempotencyKey: string,
    requestHash: string,
    createdAt: string,
  ): Promise<RepositoryRow<IdempotencyRow>> {
    const row: IdempotencyRow = {
      keyId: rowId,
      userId,
      scope: IDEMPOTENCY_SCOPE,
      keyHash: sha256(idempotencyKey),
      requestHash,
      state: "PENDING",
      expiresAt: expiresAt(createdAt),
      createdAt,
    };
    try {
      return await this.idempotency.createForUser("idempotency_key", userId, rowId, row);
    } catch (error) {
      const winner = await this.idempotency.getForUser<IdempotencyRow>("idempotency_key", userId, rowId);
      if (!winner) throw error;
      return winner;
    }
  }
}
