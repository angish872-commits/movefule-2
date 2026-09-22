import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { AppwriteServerTablesHttpClient } from "../foundation/appwrite-server-tables-client.ts";
import { ExerciseCatalogIngestionService, type ExerciseSourceBatch } from "./catalog-ingestion.ts";

 type SourceManifestEntry = {
  provider: string;
  sourceVersion: string;
  recordsPath: string;
  exerciseDataLicense?: string | null;
  exerciseDataLicenseReference?: string | null;
  licenseVerified: boolean;
  defaultEnvironmentCodes?: string[];
};

type SourceManifest = {
  schemaVersion: 1;
  importedAt?: string;
  sources: SourceManifestEntry[];
};

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!value) throw new Error(`missing_required_environment:${name}`);
  return value;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("exercise_source_manifest_invalid");
  return value as Record<string, unknown>;
}

function parseManifest(value: unknown): SourceManifest {
  const raw = asObject(value);
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.sources) || raw.sources.length === 0) {
    throw new Error("exercise_source_manifest_invalid");
  }
  const sources = raw.sources.map((item) => {
    const source = asObject(item);
    if (typeof source.provider !== "string" || typeof source.sourceVersion !== "string" || typeof source.recordsPath !== "string" ||
        typeof source.licenseVerified !== "boolean") {
      throw new Error("exercise_source_manifest_invalid");
    }
    const exerciseDataLicense = source.exerciseDataLicense;
    const exerciseDataLicenseReference = source.exerciseDataLicenseReference;
    if (!(exerciseDataLicense === undefined || exerciseDataLicense === null || typeof exerciseDataLicense === "string") ||
        !(exerciseDataLicenseReference === undefined || exerciseDataLicenseReference === null || typeof exerciseDataLicenseReference === "string")) {
      throw new Error("exercise_source_manifest_invalid");
    }
    const defaultEnvironmentCodes = source.defaultEnvironmentCodes;
    if (!(defaultEnvironmentCodes === undefined || (Array.isArray(defaultEnvironmentCodes) && defaultEnvironmentCodes.every((entry) => typeof entry === "string")))) {
      throw new Error("exercise_source_manifest_invalid");
    }
    return {
      provider: source.provider,
      sourceVersion: source.sourceVersion,
      recordsPath: source.recordsPath,
      exerciseDataLicense: exerciseDataLicense ?? null,
      exerciseDataLicenseReference: exerciseDataLicenseReference ?? null,
      licenseVerified: source.licenseVerified,
      ...(defaultEnvironmentCodes ? { defaultEnvironmentCodes: defaultEnvironmentCodes as string[] } : {}),
    } satisfies SourceManifestEntry;
  });
  return {
    schemaVersion: 1,
    sources,
    ...(typeof raw.importedAt === "string" ? { importedAt: raw.importedAt } : {}),
  };
}

async function recordsAt(path: string): Promise<readonly Record<string, unknown>[]> {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  if (Array.isArray(parsed)) return parsed.map(asObject);
  const object = asObject(parsed);
  if (Array.isArray(object.results)) return object.results.map(asObject);
  throw new Error(`exercise_source_records_invalid:${path}`);
}

async function main(): Promise<void> {
  const manifestPath = resolve(requiredEnvironment("MOVEFUEL_EXERCISE_SOURCE_MANIFEST"));
  const manifest = parseManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  const base = dirname(manifestPath);
  const batches: ExerciseSourceBatch[] = [];
  for (const source of manifest.sources) {
    batches.push({
      provider: source.provider,
      sourceVersion: source.sourceVersion,
      license: source.exerciseDataLicense ?? null,
      licenseReference: source.exerciseDataLicenseReference ?? null,
      licenseVerified: source.licenseVerified,
      ...(source.defaultEnvironmentCodes ? { defaultEnvironmentCodes: source.defaultEnvironmentCodes } : {}),
      records: await recordsAt(resolve(base, source.recordsPath)),
    });
  }

  const client = new AppwriteServerTablesHttpClient({
    endpoint: requiredEnvironment("APPWRITE_ENDPOINT"),
    projectId: requiredEnvironment("APPWRITE_PROJECT_ID"),
    apiKey: requiredEnvironment("APPWRITE_API_KEY"),
  });
  const databaseId = process.env.APPWRITE_DATABASE_ID?.trim() || "movefuel_mvp";
  if (databaseId !== "movefuel_mvp") throw new Error("exercise_catalog_import_requires_movefuel_mvp");
  const result = await new ExerciseCatalogIngestionService(client, databaseId).import(batches, manifest.importedAt ?? new Date().toISOString());
  process.stdout.write(`${JSON.stringify({
    catalogVersion: result.catalogVersion,
    trusted: result.trusted,
    unverified: result.unverified,
    rejected: result.rejected,
    created: result.created,
    updated: result.updated,
    unchanged: result.unchanged,
  })}\n`);
}

await main();
