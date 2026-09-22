import { buildTrustedExerciseCatalog, normalizeExerciseRecord } from "../../../../algorithms/training/src/catalog.ts";
import type { ExerciseCatalog } from "../../../../algorithms/training/src/contracts.ts";
import { sha256 } from "../domain/sync-store.ts";
import type { AppwriteTablesClient, RepositoryRow } from "../foundation/repository.ts";

function parseStringArray(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export class AppwriteExerciseCatalogStore {
  private readonly client: AppwriteTablesClient;
  private readonly databaseId: string;

  public constructor(client: AppwriteTablesClient, databaseId = "movefuel_mvp") {
    this.client = client;
    this.databaseId = databaseId;
  }

  public async loadTrusted(): Promise<ExerciseCatalog> {
    const result = await this.client.listRows({
      databaseId: this.databaseId,
      tableId: "exercise_catalog",
      queries: [{ field: "status", operator: "equal", value: "ACTIVE" }],
      limit: 5000,
    });
    const trusted = [];
    const versionParts: string[] = [];
    for (const row of [...result.rows].sort((a, b) => String(a.$id).localeCompare(String(b.$id)))) {
      const normalized = this.normalize(row);
      if (normalized.status !== "TRUSTED") continue;
      trusted.push(normalized.exercise);
      versionParts.push(`${normalized.exercise.exerciseId}:${String(row.revision ?? 0)}:${String(row.updatedAt ?? "")}`);
    }
    return buildTrustedExerciseCatalog(`appwrite-${sha256(versionParts.join("|")).slice(0, 16)}`, trusted);
  }

  private normalize(row: RepositoryRow) {
    return normalizeExerciseRecord({
      id: row.sourceRecordId ?? row.exerciseId,
      name: row.name,
      aliases: parseStringArray(row.aliasesJson),
      movementPattern: row.movementPattern,
      primaryMuscles: parseStringArray(row.primaryMusclesJson),
      secondaryMuscles: parseStringArray(row.secondaryMusclesJson),
      equipment: parseStringArray(row.equipmentJson),
      environmentCodes: parseStringArray(row.environmentJson),
      level: row.minimumExperience,
      skillLevel: row.skillLevel,
      progressionCompatibility: parseStringArray(row.progressionJson),
      substitutionGroup: row.substitutionGroup,
      contraindicationCodes: parseStringArray(row.contraindicationJson),
      fatigueCost: row.fatigueCost,
    }, {
      provider: typeof row.sourceProvider === "string" ? row.sourceProvider : "",
      sourceVersion: typeof row.sourceVersion === "string" ? row.sourceVersion : "",
      license: typeof row.sourceLicense === "string" ? row.sourceLicense : null,
      licenseReference: typeof row.sourceLicenseReference === "string" ? row.sourceLicenseReference : null,
      licenseVerified: row.sourceLicenseVerified === true,
    });
  }
}
