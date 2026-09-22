import type { TrainingPlanEnvelope } from "../../../../algorithms/training/src/contracts.ts";
import { sha256 } from "../domain/sync-store.ts";
import type { AppwriteTablesClient, OwnerScopedRepository } from "../foundation/repository.ts";

export type CurrentTrainingPlanRecovery =
  | { state: "CURRENT"; plan: TrainingPlanEnvelope }
  | { state: "NO_CURRENT_PLAN"; plan: null }
  | {
      state: "INTEGRITY_FAILURE";
      plan: null;
      reasonCode: string;
      canonicalPlanId?: string;
      canonicalRevision?: number;
    };

type WorkoutPlanHeadRow = {
  planId: string;
  userId: string;
  currentRevision: number;
  status: string;
};

type WorkoutPlanRevisionRow = {
  planRevisionId: string;
  planId: string;
  revision: number;
  envelopeJson?: string;
  envelopeHash?: string;
};

const revisionRowId = (planId: string, revision: number): string =>
  `wpr-${sha256(`${planId}:${revision}`).slice(0, 28)}`;

const integrityFailure = (
  reasonCode: string,
  head?: Pick<WorkoutPlanHeadRow, "planId" | "currentRevision">,
): CurrentTrainingPlanRecovery => ({
  state: "INTEGRITY_FAILURE",
  plan: null,
  reasonCode,
  ...(head?.planId ? { canonicalPlanId: head.planId } : {}),
  ...(Number.isInteger(head?.currentRevision) ? { canonicalRevision: head!.currentRevision } : {}),
});

export class CurrentTrainingPlanStore {
  private readonly ownerRepository: OwnerScopedRepository;
  private readonly serverClient: AppwriteTablesClient;
  private readonly databaseId: string;

  public constructor(ownerRepository: OwnerScopedRepository, serverClient: AppwriteTablesClient, databaseId = "movefuel_mvp") {
    this.ownerRepository = ownerRepository;
    this.serverClient = serverClient;
    this.databaseId = databaseId;
  }

  public async readCurrent(userId: string): Promise<CurrentTrainingPlanRecovery> {
    const heads = await this.ownerRepository.listOwned<WorkoutPlanHeadRow>("workout_plan", userId, {
      queries: [{ field: "status", operator: "equal", value: "ACTIVE" }],
      limit: 3,
    });
    if (heads.rows.length === 0) return { state: "NO_CURRENT_PLAN", plan: null };
    if (heads.rows.length !== 1) return integrityFailure("MULTIPLE_ACTIVE_TRAINING_PLAN_HEADS");

    const head = heads.rows[0]!;
    if (head.userId !== userId || typeof head.planId !== "string" || !head.planId.trim()) {
      return integrityFailure("TRAINING_PLAN_HEAD_OWNER_OR_ID_INVALID");
    }
    if (!Number.isInteger(head.currentRevision) || head.currentRevision < 1) {
      return integrityFailure("TRAINING_PLAN_HEAD_REVISION_INVALID", head);
    }

    const rowId = revisionRowId(head.planId, head.currentRevision);
    const revision = await this.serverClient.getRow<WorkoutPlanRevisionRow>(
      this.databaseId,
      "workout_plan_revision",
      rowId,
    );
    if (!revision) return integrityFailure("TRAINING_PLAN_REVISION_MISSING", head);
    if (revision.planRevisionId !== rowId || revision.planId !== head.planId) {
      return integrityFailure("TRAINING_PLAN_REVISION_PLAN_ID_MISMATCH", head);
    }
    if (revision.revision !== head.currentRevision) {
      return integrityFailure("TRAINING_PLAN_REVISION_NUMBER_MISMATCH", head);
    }
    if (typeof revision.envelopeJson !== "string" || !revision.envelopeJson.length ||
        typeof revision.envelopeHash !== "string" || !revision.envelopeHash.length) {
      return integrityFailure("TRAINING_PLAN_ENVELOPE_MISSING", head);
    }
    if (sha256(revision.envelopeJson) !== revision.envelopeHash) {
      return integrityFailure("TRAINING_PLAN_ENVELOPE_HASH_MISMATCH", head);
    }

    let plan: TrainingPlanEnvelope;
    try {
      plan = JSON.parse(revision.envelopeJson) as TrainingPlanEnvelope;
    } catch {
      return integrityFailure("TRAINING_PLAN_ENVELOPE_INVALID_JSON", head);
    }
    if (!plan || typeof plan !== "object" || plan.planId !== head.planId) {
      return integrityFailure("TRAINING_PLAN_ENVELOPE_PLAN_ID_MISMATCH", head);
    }
    if (plan.planRevision !== head.currentRevision) {
      return integrityFailure("TRAINING_PLAN_ENVELOPE_REVISION_MISMATCH", head);
    }

    return { state: "CURRENT", plan };
  }
}
