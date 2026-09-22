import type { JsonValue, TrainingPlanEnvelope } from "../../../../algorithms/training/src/contracts.ts";
import { sha256 } from "../domain/sync-store.ts";
import type { AppwriteTablesClient, OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";

export type PersistTrainingPlanResult = { outcome: "CREATED" | "DUPLICATE"; planRowId: string; planRevisionId: string };
export type TrainingPlanOperationMetadata = { idempotencyKey: string; requestHash: string };
export type StoredTrainingPlanRevision = { rowId: string; plan: TrainingPlanEnvelope; idempotencyKey: string | null; requestHash: string | null };

export class TrainingPlanPersistenceError extends Error {
  public readonly code: "stale_plan_revision" | "plan_revision_conflict";

  public constructor(code: "stale_plan_revision" | "plan_revision_conflict", message: string) {
    super(message);
    this.name = "TrainingPlanPersistenceError";
    this.code = code;
  }
}

function rowId(prefix: string, value: string): string {
  return `${prefix}-${sha256(value).slice(0, 28)}`;
}

function object(value: JsonValue | undefined): Record<string, JsonValue> | null {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, JsonValue> : null;
}

function arrays(value: JsonValue | undefined): readonly JsonValue[] {
  return Array.isArray(value) ? value : [];
}

function parseEnvelope(row: RepositoryRow | null): StoredTrainingPlanRevision | null {
  if (!row || typeof row.envelopeJson !== "string") return null;
  try {
    const plan = JSON.parse(row.envelopeJson) as TrainingPlanEnvelope;
    if (!plan || typeof plan !== "object" || typeof plan.planId !== "string" || !Number.isInteger(plan.planRevision)) return null;
    return {
      rowId: row.$id,
      plan,
      idempotencyKey: typeof row.idempotencyKey === "string" ? row.idempotencyKey : null,
      requestHash: typeof row.requestHash === "string" ? row.requestHash : null,
    };
  } catch {
    return null;
  }
}

export class AppwriteTrainingPlanStore {
  private readonly ownerRepository: OwnerScopedRepository;
  private readonly serverClient: AppwriteTablesClient;
  private readonly databaseId: string;

  public constructor(ownerRepository: OwnerScopedRepository, serverClient: AppwriteTablesClient, databaseId = "movefuel_mvp") {
    this.ownerRepository = ownerRepository;
    this.serverClient = serverClient;
    this.databaseId = databaseId;
  }

  public planRowId(planId: string): string {
    return rowId("wp", planId);
  }

  public revisionRowId(planId: string, revision: number): string {
    return rowId("wpr", `${planId}:${revision}`);
  }

  public async currentRevision(userId: string, planId: string): Promise<number> {
    const row = await this.ownerRepository.getOwned("workout_plan", userId, this.planRowId(planId));
    const revision = Number(row?.currentRevision ?? 0);
    return Number.isInteger(revision) && revision >= 0 ? revision : 0;
  }

  public async readRevision(userId: string, planId: string, revision: number): Promise<StoredTrainingPlanRevision | null> {
    const parent = await this.ownerRepository.getOwned("workout_plan", userId, this.planRowId(planId));
    if (!parent || parent.planId !== planId) return null;
    return parseEnvelope(await this.serverClient.getRow(this.databaseId, "workout_plan_revision", this.revisionRowId(planId, revision)));
  }

  public async findByIdempotency(userId: string, planId: string, idempotencyKey: string): Promise<StoredTrainingPlanRevision | null> {
    const parent = await this.ownerRepository.getOwned("workout_plan", userId, this.planRowId(planId));
    if (!parent || parent.planId !== planId) return null;
    const rows = await this.serverClient.listRows({
      databaseId: this.databaseId,
      tableId: "workout_plan_revision",
      queries: [
        { field: "planId", operator: "equal", value: planId },
        { field: "idempotencyKey", operator: "equal", value: idempotencyKey },
      ],
      limit: 2,
    });
    return parseEnvelope(rows.rows[0] ?? null);
  }

  public async persist(
    userId: string,
    plan: TrainingPlanEnvelope,
    goalCategory: string,
    operation?: TrainingPlanOperationMetadata,
  ): Promise<PersistTrainingPlanResult> {
    const planRowId = this.planRowId(plan.planId);
    const revisionRowId = this.revisionRowId(plan.planId, plan.planRevision);
    const existingPlan = await this.ownerRepository.getOwned("workout_plan", userId, planRowId);
    if (existingPlan && Number(existingPlan.currentRevision ?? 0) > plan.planRevision) {
      throw new TrainingPlanPersistenceError("stale_plan_revision", "A newer canonical training plan revision already exists.");
    }

    const envelopeJson = JSON.stringify(plan);
    const envelopeHash = sha256(envelopeJson);
    const existingRevision = await this.serverClient.getRow(this.databaseId, "workout_plan_revision", revisionRowId);
    if (existingRevision) {
      const sameEnvelope = String(existingRevision.envelopeHash ?? "") === envelopeHash;
      const sameOperation = !operation || (
        String(existingRevision.idempotencyKey ?? "") === operation.idempotencyKey &&
        String(existingRevision.requestHash ?? "") === operation.requestHash
      );
      if (!sameEnvelope || !sameOperation) {
        throw new TrainingPlanPersistenceError("plan_revision_conflict", "The same plan revision id resolves to different immutable content or operation provenance.");
      }
      return { outcome: "DUPLICATE", planRowId, planRevisionId: revisionRowId };
    }

    const now = plan.generatedAt;
    if (!existingPlan) {
      await this.ownerRepository.createOwned("workout_plan", userId, planRowId, {
        planId: plan.planId,
        ownerType: "SYSTEM",
        name: "MoveFuel Training Plan",
        goalCategory,
        currentRevision: plan.planRevision,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.serverClient.createRow(this.databaseId, "workout_plan_revision", revisionRowId, {
      planRevisionId: revisionRowId,
      planId: plan.planId,
      revision: plan.planRevision,
      name: "MoveFuel Training Plan",
      notes: JSON.stringify({ reasonCodes: plan.reasonCodes, limitations: plan.limitations, validity: plan.validity }),
      source: "TRAINING_ENGINE_5",
      createdAt: now,
      envelopeJson,
      envelopeHash,
      algorithmBundleVersion: plan.algorithmBundleVersion,
      profileRevision: plan.profileRevision,
      historySnapshotHash: plan.programStateRef.replace(/^derived:/, ""),
      ...(operation ? { idempotencyKey: operation.idempotencyKey, requestHash: operation.requestHash } : {}),
    }, []);

    let sortOrder = 0;
    for (const rawSession of plan.sessions) {
      const session = object(rawSession);
      if (!session) continue;
      const semanticSessionId = typeof session.semanticSessionId === "string" ? session.semanticSessionId : "";
      const sessionLocalDate = typeof session.localDate === "string" ? session.localDate : "";
      const sessionPurpose = typeof session.purpose === "string" ? session.purpose : "";
      for (const rawExercise of arrays(session.exercises)) {
        const exercise = object(rawExercise);
        if (!exercise || typeof exercise.exerciseId !== "string") continue;
        const reps = object(exercise.repRange);
        const stepId = rowId("wps", `${revisionRowId}:${sortOrder}:${exercise.exerciseId}`);
        await this.serverClient.createRow(this.databaseId, "workout_plan_step", stepId, {
          stepId,
          planRevisionId: revisionRowId,
          sortOrder,
          exerciseId: exercise.exerciseId,
          ...(typeof exercise.sets === "number" ? { sets: exercise.sets } : {}),
          ...(reps && typeof reps.min === "number" ? { repsMin: reps.min } : {}),
          ...(reps && typeof reps.max === "number" ? { repsMax: reps.max } : {}),
          ...(typeof exercise.durationSeconds === "number" ? { durationSeconds: exercise.durationSeconds } : {}),
          ...(typeof exercise.restSeconds === "number" ? { restSeconds: exercise.restSeconds } : {}),
          optional: false,
          semanticSessionId,
          sessionLocalDate,
          sessionPurpose,
          substitutionIdsJson: JSON.stringify(arrays(exercise.substitutionExerciseIds)),
          progressionContextJson: JSON.stringify(arrays(exercise.progressionContext)),
          reasonCodesJson: JSON.stringify(arrays(exercise.reasonCodes)),
        }, []);
        sortOrder += 1;
      }
    }

    if (existingPlan) {
      await this.ownerRepository.updateOwned("workout_plan", userId, planRowId, {
        currentRevision: plan.planRevision,
        goalCategory,
        status: "ACTIVE",
        updatedAt: now,
      });
    }
    return { outcome: "CREATED", planRowId, planRevisionId: revisionRowId };
  }
}
