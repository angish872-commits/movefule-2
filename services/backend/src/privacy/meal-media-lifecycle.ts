import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";
import type { MealImageStore } from "../meal/local-image-store.ts";
import type { PrivacyPreferenceService } from "./preferences.ts";

const TEMPORARY_MEDIA_TTL_HOURS = 24;
const MAX_PURGE_BATCH = 100;

type MediaState = "temporary" | "retained" | "delete_pending" | "deleted";

type LocalMediaRecord = {
  userId: string;
  draftId: string;
  mealId: string | null;
  objectId: string;
  state: MediaState;
  deleteAfter: string;
  createdAt: string;
  deletedAt: string | null;
};

export type MediaLifecycleOutcome =
  | { outcome: "TEMPORARY"; deleteAfter: string }
  | { outcome: "RETAINED"; deleteAfter: string }
  | { outcome: "DELETED"; deletedAt: string }
  | { outcome: "DELETE_SCHEDULED"; deleteAfter: string }
  | { outcome: "ALREADY_DELETED"; deletedAt: string | null }
  | { outcome: "NOT_FOUND" };

export type PurgeResult = {
  scanned: number;
  deleted: number;
  alreadyDeleted: number;
  scheduledRetry: number;
};

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString();
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString();
}

function requireNow(now: string): string {
  const millis = Date.parse(now);
  if (!Number.isFinite(millis)) throw new Error("invalid_media_lifecycle_time");
  return new Date(millis).toISOString();
}

function parseAppwriteObjectId(objectId: string): { bucketId: string; fileId: string } | null {
  const match = /^appwrite-meal-image:([A-Za-z0-9._-]{1,36}):([A-Za-z0-9._-]{1,36})$/.exec(objectId);
  return match ? { bucketId: match[1]!, fileId: match[2]! } : null;
}

function objectIdForRow(row: RepositoryRow): string | null {
  const bucketId = typeof row.bucketId === "string" ? row.bucketId : "";
  const fileId = typeof row.objectId === "string" ? row.objectId : "";
  return bucketId && fileId ? `appwrite-meal-image:${bucketId}:${fileId}` : null;
}

function rowState(row: RepositoryRow): MediaState {
  const state = String(row.state ?? "").toLowerCase();
  return state === "retained" || state === "delete_pending" || state === "deleted" ? state : "temporary";
}

export class MealMediaLifecycleService {
  private readonly imageStore: MealImageStore;
  private readonly privacyPreferences: PrivacyPreferenceService;
  private readonly local = new Map<string, LocalMediaRecord>();

  public constructor(imageStore: MealImageStore, privacyPreferences: PrivacyPreferenceService) {
    this.imageStore = imageStore;
    this.privacyPreferences = privacyPreferences;
  }

  public async registerTemporary(
    userId: string,
    draftId: string,
    objectId: string,
    repository?: OwnerScopedRepository,
    now = new Date().toISOString(),
  ): Promise<MediaLifecycleOutcome> {
    const normalizedNow = requireNow(now);
    const deleteAfter = addHours(normalizedNow, TEMPORARY_MEDIA_TTL_HOURS);
    if (!repository) {
      const key = this.localKey(userId, objectId);
      const existing = this.local.get(key);
      if (existing?.state === "deleted") return { outcome: "ALREADY_DELETED", deletedAt: existing.deletedAt };
      this.local.set(key, {
        userId,
        draftId,
        mealId: null,
        objectId,
        state: "temporary",
        deleteAfter,
        createdAt: existing?.createdAt ?? normalizedNow,
        deletedAt: null,
      });
      return { outcome: "TEMPORARY", deleteAfter };
    }

    const row = await this.findOwnedRow(userId, objectId, repository);
    if (!row) return { outcome: "NOT_FOUND" };
    if (rowState(row) === "deleted") return { outcome: "ALREADY_DELETED", deletedAt: typeof row.deletedAt === "string" ? row.deletedAt : null };
    await repository.updateOwned("meal_media", userId, row.$id, {
      draftId,
      state: "temporary",
      deleteAfter,
      deletedAt: null,
    });
    return { outcome: "TEMPORARY", deleteAfter };
  }

  public async applyConfirmedPolicy(
    userId: string,
    objectId: string,
    mealId: string,
    repository?: OwnerScopedRepository,
    now = new Date().toISOString(),
  ): Promise<MediaLifecycleOutcome> {
    const normalizedNow = requireNow(now);
    const profile = await this.privacyPreferences.get(userId, repository);
    if (profile.retainMealImages && profile.imageRetentionDays !== null) {
      const deleteAfter = addDays(normalizedNow, profile.imageRetentionDays);
      if (!repository) {
        const key = this.localKey(userId, objectId);
        const existing = this.local.get(key);
        if (!existing) return { outcome: "NOT_FOUND" };
        if (existing.state === "deleted") return { outcome: "ALREADY_DELETED", deletedAt: existing.deletedAt };
        this.local.set(key, { ...existing, mealId, state: "retained", deleteAfter, deletedAt: null });
      } else {
        const row = await this.findOwnedRow(userId, objectId, repository);
        if (!row) return { outcome: "NOT_FOUND" };
        if (rowState(row) === "deleted") return { outcome: "ALREADY_DELETED", deletedAt: typeof row.deletedAt === "string" ? row.deletedAt : null };
        await repository.updateOwned("meal_media", userId, row.$id, {
          mealId,
          state: "retained",
          deleteAfter,
          deletedAt: null,
        });
      }
      return { outcome: "RETAINED", deleteAfter };
    }
    return await this.deleteOrSchedule(userId, objectId, mealId, repository, normalizedNow);
  }

  public async purgeDue(
    userId: string,
    repository?: OwnerScopedRepository,
    now = new Date().toISOString(),
  ): Promise<PurgeResult> {
    const normalizedNow = requireNow(now);
    const due = repository
      ? (await repository.listOwned("meal_media", userId, {
          queries: [{ field: "deleteAfter", operator: "lessThanEqual", value: normalizedNow }],
          limit: MAX_PURGE_BATCH,
        })).rows
      : [...this.local.values()].filter((row) => row.userId === userId && row.deleteAfter <= normalizedNow);
    const result: PurgeResult = { scanned: due.length, deleted: 0, alreadyDeleted: 0, scheduledRetry: 0 };
    for (const candidate of due) {
      const state = "$id" in candidate ? rowState(candidate) : candidate.state;
      if (state === "deleted") {
        result.alreadyDeleted += 1;
        continue;
      }
      const objectId = "$id" in candidate ? objectIdForRow(candidate) : candidate.objectId;
      if (!objectId) {
        result.scheduledRetry += 1;
        continue;
      }
      const outcome = await this.deleteOrSchedule(
        userId,
        objectId,
        "$id" in candidate && typeof candidate.mealId === "string" ? candidate.mealId : "$id" in candidate ? "" : candidate.mealId ?? "",
        repository,
        normalizedNow,
      );
      if (outcome.outcome === "DELETED") result.deleted += 1;
      else if (outcome.outcome === "ALREADY_DELETED") result.alreadyDeleted += 1;
      else if (outcome.outcome === "DELETE_SCHEDULED") result.scheduledRetry += 1;
    }
    return result;
  }

  public async isModelImprovementEligible(
    userId: string,
    objectId: string,
    repository?: OwnerScopedRepository,
    now = new Date().toISOString(),
  ): Promise<boolean> {
    const normalizedNow = requireNow(now);
    const profile = await this.privacyPreferences.get(userId, repository);
    if (!profile.modelImprovementAllowed || !profile.retainMealImages || profile.imageRetentionDays === null) return false;
    if (!repository) {
      const record = this.local.get(this.localKey(userId, objectId));
      return Boolean(record && record.state === "retained" && record.deletedAt === null && record.deleteAfter > normalizedNow);
    }
    const row = await this.findOwnedRow(userId, objectId, repository);
    if (!row || rowState(row) !== "retained" || typeof row.deleteAfter !== "string") return false;
    return !row.deletedAt && row.deleteAfter > normalizedNow;
  }

  private async deleteOrSchedule(
    userId: string,
    objectId: string,
    mealId: string,
    repository: OwnerScopedRepository | undefined,
    now: string,
  ): Promise<MediaLifecycleOutcome> {
    const row = repository ? await this.findOwnedRow(userId, objectId, repository) : null;
    const local = repository ? null : this.local.get(this.localKey(userId, objectId));
    if (!row && !local) return { outcome: "NOT_FOUND" };
    if ((row && rowState(row) === "deleted") || local?.state === "deleted") {
      return { outcome: "ALREADY_DELETED", deletedAt: row && typeof row.deletedAt === "string" ? row.deletedAt : local?.deletedAt ?? null };
    }
    if (!this.imageStore.delete) {
      await this.markPending(userId, objectId, mealId, repository, row, local, now);
      return { outcome: "DELETE_SCHEDULED", deleteAfter: now };
    }
    try {
      await this.imageStore.delete(objectId);
    } catch {
      await this.markPending(userId, objectId, mealId, repository, row, local, now);
      return { outcome: "DELETE_SCHEDULED", deleteAfter: now };
    }
    if (repository && row) {
      await repository.updateOwned("meal_media", userId, row.$id, { mealId: mealId || row.mealId, state: "deleted", deleteAfter: now, deletedAt: now });
    } else if (local) {
      this.local.set(this.localKey(userId, objectId), { ...local, mealId: mealId || local.mealId, state: "deleted", deleteAfter: now, deletedAt: now });
    }
    return { outcome: "DELETED", deletedAt: now };
  }

  private async markPending(
    userId: string,
    objectId: string,
    mealId: string,
    repository: OwnerScopedRepository | undefined,
    row: RepositoryRow | null,
    local: LocalMediaRecord | null | undefined,
    now: string,
  ): Promise<void> {
    if (repository && row) {
      await repository.updateOwned("meal_media", userId, row.$id, { mealId: mealId || row.mealId, state: "delete_pending", deleteAfter: now });
    } else if (local) {
      this.local.set(this.localKey(userId, objectId), { ...local, mealId: mealId || local.mealId, state: "delete_pending", deleteAfter: now });
    }
  }

  private async findOwnedRow(userId: string, objectId: string, repository: OwnerScopedRepository): Promise<RepositoryRow | null> {
    const parsed = parseAppwriteObjectId(objectId);
    if (!parsed) return null;
    const rows = await repository.listOwned("meal_media", userId, {
      queries: [
        { field: "bucketId", operator: "equal", value: parsed.bucketId },
        { field: "objectId", operator: "equal", value: parsed.fileId },
      ],
      limit: 2,
    });
    return rows.rows[0] ?? null;
  }

  private localKey(userId: string, objectId: string): string {
    return `${userId.trim()}::${objectId}`;
  }
}
