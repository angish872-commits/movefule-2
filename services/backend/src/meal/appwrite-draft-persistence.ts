import { createHash } from "node:crypto";
import type {
  MealAnalysisRequest,
  MealDraft,
  MealDraftRevision,
} from "./contracts.ts";
import { MealStore } from "./store.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";
import type { ImageEstimatePersistenceSnapshot } from "../nutrition/algorithm/imageEstimatePipeline.ts";
import type { LiveImageEstimateServiceLike } from "../nutrition/service/liveImageEstimateService.ts";

type MealDraftRow = {
  draftId: string;
  userId: string;
  deviceId: string;
  mediaId?: string;
  status: MealDraft["state"];
  createdAt: string;
  updatedAt: string;
};

type MealDraftRevisionRow = {
  draftRevisionId: string;
  draftId: string;
  userId: string;
  revision: number;
  payloadJson: string;
  createdAt: string;
};

type DraftSnapshot = {
  draft: MealDraft;
  revisions: MealDraftRevision[];
  analyses: MealAnalysisRequest[];
  imageEstimate?: ImageEstimatePersistenceSnapshot;
};

function rowIdFor(prefix: string, logicalId: string): string {
  return `${prefix}${createHash("sha256").update(logicalId).digest("hex").slice(0, 30)}`;
}

function rowData<T extends Record<string, unknown>>(row: RepositoryRow<T>): T {
  return row as T;
}

function parseSnapshot(value: unknown, userId: string, draftId: string): DraftSnapshot | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as Partial<DraftSnapshot>;
    if (!parsed.draft || parsed.draft.userId !== userId || parsed.draft.draftId !== draftId) return null;
    if (!Array.isArray(parsed.revisions) || parsed.revisions.some((revision) => revision.userId !== userId || revision.draftId !== draftId)) return null;
    const analyses = Array.isArray(parsed.analyses)
      ? parsed.analyses.filter((analysis) => analysis.userId === userId && analysis.draftId === draftId)
      : [];
    const imageEstimate = parsed.imageEstimate &&
      parsed.imageEstimate.result?.ownerUserId === userId &&
      typeof parsed.imageEstimate.result.resultId === "string" &&
      parsed.imageEstimate.result.resultId.length > 0
      ? parsed.imageEstimate as ImageEstimatePersistenceSnapshot
      : undefined;
    return {
      draft: parsed.draft as MealDraft,
      revisions: parsed.revisions as MealDraftRevision[],
      analyses: analyses as MealAnalysisRequest[],
      ...(imageEstimate ? { imageEstimate } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Owner-scoped persistence for the stateful meal-capture workflow. The live
 * schema intentionally keeps draft metadata small; the revision payload is
 * the durable envelope for the complete contract DTO across Function calls.
 */
export class AppwriteMealDraftPersistence {
  private readonly repository: OwnerScopedRepository;
  private readonly imageEstimates = new Map<string, ImageEstimatePersistenceSnapshot>();

  constructor(repository: OwnerScopedRepository) {
    this.repository = repository;
  }

  async hydrate(userId: string, store: MealStore, imageEstimateService?: LiveImageEstimateServiceLike): Promise<void> {
    const drafts = await this.repository.listOwned<MealDraftRow>("meal_draft", userId, { limit: 100 });
    for (const draftRow of drafts.rows) {
      const draftData = rowData(draftRow);
      const revisions = await this.repository.listOwned<MealDraftRevisionRow>("meal_draft_revision", userId, {
        queries: [{ field: "draftId", operator: "equal", value: draftData.draftId }],
        limit: 100,
      });
      const ordered = [...revisions.rows].sort((left, right) => Number(rowData(right).revision) - Number(rowData(left).revision));
      const snapshot = ordered
        .map((row) => parseSnapshot(rowData(row).payloadJson, userId, draftData.draftId))
        .find((candidate): candidate is DraftSnapshot => candidate !== null);
      if (snapshot) {
        store.hydrateDraft(snapshot);
        if (snapshot.imageEstimate) {
          this.imageEstimates.set(`${userId}:${draftData.draftId}`, snapshot.imageEstimate);
          imageEstimateService?.hydrateResult?.(snapshot.imageEstimate);
        }
      }
    }
  }

  async persist(userId: string, store: MealStore, draftId: string, imageEstimate?: ImageEstimatePersistenceSnapshot): Promise<void> {
    const snapshot = store.snapshotDraft(userId, draftId);
    const estimateKey = `${userId}:${draftId}`;
    if (imageEstimate) this.imageEstimates.set(estimateKey, imageEstimate);
    const persistedEstimate = this.imageEstimates.get(estimateKey);
    const draft = snapshot.draft;
    const draftRowId = rowIdFor("md", draft.draftId);
    const draftData: MealDraftRow = {
      draftId: draft.draftId,
      userId,
      deviceId: "phone",
      ...(draft.imageRef?.objectId ? { mediaId: draft.imageRef.objectId } : {}),
      status: draft.state,
      createdAt: new Date(draft.createdAtEpochMillis).toISOString(),
      updatedAt: new Date(draft.updatedAtEpochMillis).toISOString(),
    };
    const existingDraft = await this.repository.getOwned<MealDraftRow>("meal_draft", userId, draftRowId);
    if (existingDraft) await this.repository.updateOwned("meal_draft", userId, draftRowId, draftData);
    else await this.repository.createOwned("meal_draft", userId, draftRowId, draftData);

    const payloadJson = JSON.stringify({ ...snapshot, ...(persistedEstimate ? { imageEstimate: persistedEstimate } : {}) });
    for (const revision of snapshot.revisions) {
      const revisionRowId = rowIdFor("mr", revision.draftRevisionId);
      const revisionData: MealDraftRevisionRow = {
        draftRevisionId: revision.draftRevisionId,
        draftId: draft.draftId,
        userId,
        revision: revision.revision,
        payloadJson,
        createdAt: new Date(revision.createdAtEpochMillis).toISOString(),
      };
      const existingRevision = await this.repository.getOwned<MealDraftRevisionRow>("meal_draft_revision", userId, revisionRowId);
      if (existingRevision) await this.repository.updateOwned("meal_draft_revision", userId, revisionRowId, revisionData);
      else await this.repository.createOwned("meal_draft_revision", userId, revisionRowId, revisionData);
    }
  }

  async findDraftForEstimate(userId: string, resultId: string): Promise<string | null> {
    for (const [key, snapshot] of this.imageEstimates) {
      if (key.startsWith(`${userId}:`) && snapshot.result.resultId === resultId) return key.slice(userId.length + 1);
    }
    return null;
  }
}
