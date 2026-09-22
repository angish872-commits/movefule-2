import type { PrivacyProfile } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";

export type PrivacyPreferenceInput = {
  retainMealImages: boolean;
  imageRetentionDays: number | null;
  analyticsAllowed: boolean;
  modelImprovementAllowed: boolean;
};

export class PrivacyPreferenceContractError extends Error {
  public readonly code: "invalid_privacy_preference";

  public constructor(message: string) {
    super(message);
    this.name = "PrivacyPreferenceContractError";
    this.code = "invalid_privacy_preference";
  }
}

function requireUserId(userId: string): string {
  const normalized = userId.trim();
  if (!normalized) throw new PrivacyPreferenceContractError("A non-empty userId is required.");
  return normalized;
}

function validateInput(input: PrivacyPreferenceInput): PrivacyPreferenceInput {
  if (typeof input.retainMealImages !== "boolean" || typeof input.analyticsAllowed !== "boolean" || typeof input.modelImprovementAllowed !== "boolean") {
    throw new PrivacyPreferenceContractError("Privacy preference flags must be boolean.");
  }
  if (input.imageRetentionDays !== null && (!Number.isInteger(input.imageRetentionDays) || input.imageRetentionDays < 1 || input.imageRetentionDays > 3650)) {
    throw new PrivacyPreferenceContractError("imageRetentionDays must be null or an integer from 1 to 3650.");
  }
  if (!input.retainMealImages && input.imageRetentionDays !== null) {
    throw new PrivacyPreferenceContractError("imageRetentionDays must be null when retainMealImages is false.");
  }
  return input;
}

function profileFromRow(userId: string, row: RepositoryRow): PrivacyProfile {
  const retention = typeof row.imageRetentionDays === "number" && Number.isInteger(row.imageRetentionDays) && row.imageRetentionDays >= 1 && row.imageRetentionDays <= 3650
    ? row.imageRetentionDays
    : null;
  const revision = typeof row.revision === "number" && Number.isInteger(row.revision) && row.revision >= 0 ? row.revision : 0;
  return {
    schemaVersion: 1,
    userId,
    retainMealImages: row.retainMealImages === true,
    imageRetentionDays: row.retainMealImages === true ? retention : null,
    analyticsAllowed: row.analyticsAllowed === true,
    modelImprovementAllowed: row.modelImprovementAllowed === true,
    revision,
    updatedAt: typeof row.updatedAt === "string" && row.updatedAt ? row.updatedAt : new Date(0).toISOString(),
  };
}

function latest(rows: readonly RepositoryRow[]): RepositoryRow | null {
  return [...rows].sort((left, right) => {
    const byRevision = Number(right.revision ?? 0) - Number(left.revision ?? 0);
    return byRevision !== 0 ? byRevision : String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? ""));
  })[0] ?? null;
}

export function defaultPrivacyProfile(userId: string): PrivacyProfile {
  return {
    schemaVersion: 1,
    userId: requireUserId(userId),
    retainMealImages: false,
    imageRetentionDays: null,
    analyticsAllowed: false,
    modelImprovementAllowed: false,
    revision: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

export class PrivacyPreferenceService {
  private readonly local = new Map<string, PrivacyProfile>();

  public async get(userId: string, repository?: OwnerScopedRepository): Promise<PrivacyProfile> {
    const owner = requireUserId(userId);
    if (!repository) return this.local.get(owner) ?? defaultPrivacyProfile(owner);
    const rows = await repository.listOwned("privacy_preference", owner, { limit: 20 });
    const row = latest(rows.rows);
    return row ? profileFromRow(owner, row) : defaultPrivacyProfile(owner);
  }

  public async save(
    userId: string,
    input: PrivacyPreferenceInput,
    repository?: OwnerScopedRepository,
    exportLocale = "",
  ): Promise<PrivacyProfile> {
    const owner = requireUserId(userId);
    const validated = validateInput(input);
    const now = new Date().toISOString();
    const current = await this.get(owner, repository);
    const next: PrivacyProfile = {
      schemaVersion: 1,
      userId: owner,
      retainMealImages: validated.retainMealImages,
      imageRetentionDays: validated.retainMealImages ? validated.imageRetentionDays : null,
      analyticsAllowed: validated.analyticsAllowed,
      modelImprovementAllowed: validated.modelImprovementAllowed,
      revision: current.revision + 1,
      updatedAt: now,
    };

    if (!repository) {
      this.local.set(owner, next);
      return next;
    }

    const rows = await repository.listOwned("privacy_preference", owner, { limit: 20 });
    const existing = latest(rows.rows);
    const normalizedExportLocale = exportLocale.trim() || (typeof existing?.exportLocale === "string" ? existing.exportLocale.trim() : "");
    if (!normalizedExportLocale) {
      throw new PrivacyPreferenceContractError("An explicit export locale from the user profile is required when persisting privacy preferences.");
    }
    const data = {
      retainMealImages: next.retainMealImages,
      imageRetentionDays: next.imageRetentionDays,
      analyticsAllowed: next.analyticsAllowed,
      modelImprovementAllowed: next.modelImprovementAllowed,
      exportLocale: normalizedExportLocale,
      revision: next.revision,
      updatedAt: next.updatedAt,
    };
    if (existing) await repository.updateOwned("privacy_preference", owner, existing.$id, data);
    else await repository.createOwned("privacy_preference", owner, owner, data);
    return next;
  }
}
