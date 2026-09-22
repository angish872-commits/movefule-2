import type {
  CalendarAvailability,
  GenerateTrainingPlanResult,
  PolicyBand,
  ReadinessInput,
  TrainingHistorySession,
  TrainingProfile,
} from "../../../../algorithms/training/src/contracts.ts";
import { generateTrainingPlan } from "../../../../algorithms/training/src/training-engine.ts";
import type { AppwriteExerciseCatalogStore } from "./catalog-store.ts";
import type {
  AppwriteTrainingPlanStore,
  PersistTrainingPlanResult,
  TrainingPlanOperationMetadata,
} from "./plan-store.ts";

type ReadyTrainingGenerationResult = Extract<GenerateTrainingPlanResult, { status: "READY" }>;

export type TrainingGenerationRequest = {
  userId: string;
  profile: TrainingProfile;
  policyBand: PolicyBand;
  readiness: ReadinessInput;
  history: readonly TrainingHistorySession[];
  availability: readonly CalendarAvailability[];
  generatedAt: string;
  planRevision: number;
  canonicalPlanId?: string;
  operation?: TrainingPlanOperationMetadata;
  seed?: string | null;
  /**
   * Backend-only final invariant hook. It runs after deterministic Training
   * generation + validator success and canonical id normalization, but before
   * any immutable workout_plan_revision/workout_plan_step persistence.
   */
  beforePersist?: (result: ReadyTrainingGenerationResult) => void | Promise<void>;
};

export type TrainingGenerationResponse = {
  result: GenerateTrainingPlanResult;
  persistence: PersistTrainingPlanResult | null;
};

/** Backend-owned adapter. Clients can supply observations/preferences upstream,
 * but only this service invokes the deterministic Training Engine and persists
 * a canonical plan revision. */
export class TrainingBackendService {
  private readonly catalogStore: AppwriteExerciseCatalogStore;
  private readonly planStore: AppwriteTrainingPlanStore;

  public constructor(catalogStore: AppwriteExerciseCatalogStore, planStore: AppwriteTrainingPlanStore) {
    this.catalogStore = catalogStore;
    this.planStore = planStore;
  }

  public async generateAndPersist(request: TrainingGenerationRequest): Promise<TrainingGenerationResponse> {
    if (request.profile.userId !== request.userId) throw new Error("training_profile_owner_mismatch");
    const catalog = await this.catalogStore.loadTrusted();
    const generated = generateTrainingPlan({
      profile: request.profile,
      policyBand: request.policyBand,
      readiness: request.readiness,
      history: request.history,
      availability: request.availability,
      catalog,
      generatedAt: request.generatedAt,
      planRevision: request.planRevision,
      seed: request.seed ?? null,
    });
    if (generated.status !== "READY") return { result: generated, persistence: null };

    const canonicalPlanId = request.canonicalPlanId?.trim() || generated.plan.planId;
    const result: ReadyTrainingGenerationResult = canonicalPlanId === generated.plan.planId
      ? generated
      : {
          ...generated,
          plan: { ...generated.plan, planId: canonicalPlanId },
          actionCandidates: generated.actionCandidates.map((candidate) => ({
            ...candidate,
            sourcePlanId: candidate.sourcePlanId ? canonicalPlanId : candidate.sourcePlanId,
          })),
        };

    await request.beforePersist?.(result);

    const persistence = await this.planStore.persist(
      request.userId,
      result.plan,
      request.profile.goalCodes[0] ?? "UNKNOWN",
      request.operation,
    );
    return { result, persistence };
  }
}
