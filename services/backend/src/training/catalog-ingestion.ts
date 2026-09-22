import { buildTrustedExerciseCatalog, normalizeExerciseRecord, type ExerciseImportContext, type RawExerciseRecord } from "../../../../algorithms/training/src/catalog.ts";
import type { ExerciseDefinition } from "../../../../algorithms/training/src/contracts.ts";
import { sha256 } from "../domain/sync-store.ts";
import type { AppwriteTablesClient, RepositoryRow } from "../foundation/repository.ts";

const PROVENANCE_ONLY_REASONS = new Set([
  "SOURCE_PROVIDER_MISSING",
  "SOURCE_VERSION_MISSING",
  "SOURCE_RECORD_ID_MISSING",
  "SOURCE_LICENSE_NOT_VERIFIED",
  "SOURCE_LICENSE_MISSING",
  "SOURCE_LICENSE_REFERENCE_MISSING",
]);

export type ExerciseSourceBatch = {
  provider: string;
  sourceVersion: string;
  /** Exercise-data license only. Media/image/video licenses are not accepted here. */
  license?: string | null;
  /** Exercise-data license reference only. */
  licenseReference?: string | null;
  licenseVerified: boolean;
  defaultEnvironmentCodes?: readonly string[];
  records: readonly RawExerciseRecord[];
};

export type ExerciseIngestionClassification = {
  sourceProvider: string;
  sourceRecordId: string | null;
  status: "TRUSTED" | "UNVERIFIED" | "REJECTED";
  reasonCodes: readonly string[];
  exercise: ExerciseDefinition | null;
};

export type ExerciseCatalogImportResult = {
  catalogVersion: string;
  trusted: number;
  unverified: number;
  rejected: number;
  created: number;
  updated: number;
  unchanged: number;
  classifications: readonly ExerciseIngestionClassification[];
};

function text(record: RawExerciseRecord, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function sourceRecordId(record: RawExerciseRecord): string | null {
  return text(record, "sourceRecordId", "source_record_id", "id", "slug", "exerciseId");
}

/**
 * Do not let ambiguous raw `license` / image-license fields promote a record.
 * A trusted exercise-data license must come from the reviewed source manifest
 * or an explicit sourceLicense/source_license field.
 */
function sourceDataRecord(record: RawExerciseRecord): RawExerciseRecord {
  const copy: Record<string, unknown> = { ...record };
  delete copy.license;
  delete copy.licenseReference;
  delete copy.imageLicense;
  delete copy.image_license;
  delete copy.mediaLicense;
  delete copy.media_license;
  delete copy.videoLicense;
  delete copy.video_license;
  return copy;
}

function contextFor(batch: ExerciseSourceBatch): ExerciseImportContext {
  return {
    provider: batch.provider,
    sourceVersion: batch.sourceVersion,
    license: batch.license ?? null,
    licenseReference: batch.licenseReference ?? null,
    licenseVerified: batch.licenseVerified,
    ...(batch.defaultEnvironmentCodes ? { defaultEnvironmentCodes: batch.defaultEnvironmentCodes } : {}),
  };
}

export function classifyExerciseSourceBatches(batches: readonly ExerciseSourceBatch[]): readonly ExerciseIngestionClassification[] {
  const classifications: ExerciseIngestionClassification[] = [];
  for (const batch of [...batches].sort((a, b) => `${a.provider}\u0000${a.sourceVersion}`.localeCompare(`${b.provider}\u0000${b.sourceVersion}`))) {
    const context = contextFor(batch);
    const records = [...batch.records].sort((a, b) => String(sourceRecordId(a) ?? "").localeCompare(String(sourceRecordId(b) ?? "")));
    for (const raw of records) {
      const record = sourceDataRecord(raw);
      const normalized = normalizeExerciseRecord(record, context);
      if (normalized.status === "TRUSTED") {
        classifications.push({
          sourceProvider: batch.provider.trim(),
          sourceRecordId: normalized.exercise.source.recordId,
          status: "TRUSTED",
          reasonCodes: normalized.reasonCodes,
          exercise: normalized.exercise,
        });
        continue;
      }
      const provenanceOnly = normalized.reasonCodes.length > 0 && normalized.reasonCodes.every((reason) => PROVENANCE_ONLY_REASONS.has(reason));
      classifications.push({
        sourceProvider: batch.provider.trim(),
        sourceRecordId: sourceRecordId(record),
        status: provenanceOnly ? "UNVERIFIED" : "REJECTED",
        reasonCodes: normalized.reasonCodes,
        exercise: null,
      });
    }
  }
  return classifications;
}

function rowId(exerciseId: string): string {
  return `exercise-${sha256(exerciseId).slice(0, 27)}`;
}

function json(values: readonly string[]): string {
  return JSON.stringify([...values]);
}

function canonicalRow(exercise: ExerciseDefinition): Record<string, unknown> {
  return {
    exerciseId: exercise.exerciseId,
    sourceRecordId: exercise.source.recordId,
    name: exercise.canonicalName,
    aliasesJson: json(exercise.aliases),
    movementPattern: exercise.movementPattern,
    primaryMusclesJson: json(exercise.primaryMuscles),
    secondaryMusclesJson: json(exercise.secondaryMuscles),
    equipmentJson: json(exercise.equipmentCodes),
    environmentJson: json(exercise.environmentCodes),
    minimumExperience: exercise.minimumExperience,
    skillLevel: exercise.skill,
    progressionJson: json(exercise.progressionCompatibility),
    substitutionGroup: exercise.substitutionGroup,
    contraindicationJson: json(exercise.contraindicationCodes),
    fatigueCost: exercise.fatigueCost,
    sourceProvider: exercise.source.provider,
    sourceVersion: exercise.source.sourceVersion,
    sourceLicense: exercise.source.license,
    sourceLicenseReference: exercise.source.licenseReference,
    sourceLicenseVerified: true,
    status: "ACTIVE",
  };
}

function sameCanonicalRow(existing: RepositoryRow, desired: Record<string, unknown>): boolean {
  return Object.entries(desired).every(([key, value]) => existing[key] === value);
}

export class ExerciseCatalogIngestionService {
  private readonly client: AppwriteTablesClient;
  private readonly databaseId: string;

  public constructor(client: AppwriteTablesClient, databaseId = "movefuel_mvp") {
    this.client = client;
    this.databaseId = databaseId;
  }

  public async import(batches: readonly ExerciseSourceBatch[], importedAt = new Date().toISOString()): Promise<ExerciseCatalogImportResult> {
    if (!Number.isFinite(Date.parse(importedAt))) throw new Error("invalid_exercise_catalog_import_time");
    const classifications = classifyExerciseSourceBatches(batches);
    const trustedCandidates = classifications
      .filter((item): item is ExerciseIngestionClassification & { exercise: ExerciseDefinition } => item.status === "TRUSTED" && item.exercise !== null)
      .map((item) => item.exercise);
    const catalogVersion = `exercise-import-${sha256(trustedCandidates.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      source: exercise.source,
    }))).slice(0, 16)}`;
    const catalog = buildTrustedExerciseCatalog(catalogVersion, trustedCandidates);

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    for (const exercise of catalog.exercises) {
      const id = rowId(exercise.exerciseId);
      const desired = canonicalRow(exercise);
      const existing = await this.client.getRow(this.databaseId, "exercise_catalog", id);
      if (existing && sameCanonicalRow(existing, desired)) {
        unchanged += 1;
        continue;
      }
      if (!existing) {
        await this.client.createRow(this.databaseId, "exercise_catalog", id, {
          ...desired,
          revision: 1,
          updatedAt: importedAt,
        }, []);
        created += 1;
        continue;
      }
      const currentRevision = typeof existing.revision === "number" && Number.isInteger(existing.revision) && existing.revision >= 1
        ? existing.revision
        : 0;
      await this.client.updateRow(this.databaseId, "exercise_catalog", id, {
        ...desired,
        revision: currentRevision + 1,
        updatedAt: importedAt,
      });
      updated += 1;
    }

    return {
      catalogVersion: catalog.catalogVersion,
      trusted: classifications.filter((item) => item.status === "TRUSTED").length,
      unverified: classifications.filter((item) => item.status === "UNVERIFIED").length,
      rejected: classifications.filter((item) => item.status === "REJECTED").length,
      created,
      updated,
      unchanged,
      classifications,
    };
  }
}
