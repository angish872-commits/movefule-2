import type {
  ExerciseCatalog,
  ExerciseDefinition,
  ExerciseSkill,
  ExperienceBand,
  MovementPattern,
  ProgressionCompatibility,
} from "./contracts.ts";

export type RawExerciseRecord = Readonly<Record<string, unknown>>;

export type ExerciseImportContext = {
  provider: string;
  sourceVersion: string;
  license?: string | null;
  licenseReference?: string | null;
  licenseVerified: boolean;
  defaultEnvironmentCodes?: readonly string[];
};

export type ExerciseNormalizationResult =
  | { status: "TRUSTED"; exercise: ExerciseDefinition; reasonCodes: readonly string[] }
  | { status: "REJECTED"; reasonCodes: readonly string[] };

const MOVEMENTS = new Set<MovementPattern>(["SQUAT", "HINGE", "PUSH", "PULL", "LUNGE", "CARRY", "CORE", "CARDIO"]);
const PROGRESSION = new Set<ProgressionCompatibility>(["REPS", "LOAD", "TIME", "RANGE"]);

function normalizedCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function text(record: RawExerciseRecord, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function stringList(record: RawExerciseRecord, ...keys: string[]): readonly string[] {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return [value.trim()];
    if (Array.isArray(value)) {
      return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].sort();
    }
  }
  return [];
}

function numberValue(record: RawExerciseRecord, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function movement(record: RawExerciseRecord): MovementPattern | null {
  const raw = text(record, "movementPattern", "movement_pattern", "movement");
  if (!raw) return null;
  const value = normalizedCode(raw) as MovementPattern;
  return MOVEMENTS.has(value) ? value : null;
}

function experience(record: RawExerciseRecord): Exclude<ExperienceBand, "UNKNOWN"> | null {
  const raw = text(record, "minimumExperience", "minimum_experience", "level");
  if (!raw) return null;
  const value = normalizedCode(raw);
  if (value === "BEGINNER" || value === "INTERMEDIATE" || value === "ADVANCED") return value;
  return null;
}

function skill(record: RawExerciseRecord, minimumExperience: Exclude<ExperienceBand, "UNKNOWN">): ExerciseSkill {
  const raw = text(record, "skill", "skillLevel", "skill_level");
  const value = raw ? normalizedCode(raw) : null;
  if (value === "FOUNDATION" || value === "INTERMEDIATE" || value === "ADVANCED") return value;
  if (minimumExperience === "BEGINNER") return "FOUNDATION";
  return minimumExperience;
}

function equipment(record: RawExerciseRecord): readonly string[] {
  return stringList(record, "equipmentCodes", "equipment_codes", "equipment")
    .map(normalizedCode)
    .filter((value) => !["BODY_ONLY", "BODY_WEIGHT", "NONE", "NO_EQUIPMENT"].includes(value));
}

function stableExerciseId(provider: string, recordId: string): string {
  return `${normalizedCode(provider).toLowerCase()}__${normalizedCode(recordId).toLowerCase()}`;
}

export function normalizeExerciseRecord(record: RawExerciseRecord, context: ExerciseImportContext): ExerciseNormalizationResult {
  const reasons: string[] = [];
  const provider = context.provider.trim();
  const sourceVersion = context.sourceVersion.trim();
  const recordId = text(record, "sourceRecordId", "source_record_id", "id", "slug", "exerciseId");
  const canonicalName = text(record, "canonicalName", "name");
  const movementPattern = movement(record);
  const minimumExperience = experience(record);
  const fatigueCost = numberValue(record, "fatigueCost", "fatigue_cost");
  const recordLicense = text(record, "license", "sourceLicense", "source_license") ?? context.license ?? null;
  const recordLicenseReference = text(record, "licenseReference", "license_reference", "sourceLicenseReference") ?? context.licenseReference ?? null;
  const environments = stringList(record, "environmentCodes", "environment_codes", "environments").map(normalizedCode);
  const environmentCodes = environments.length > 0 ? environments : (context.defaultEnvironmentCodes ?? []).map(normalizedCode);

  if (!provider) reasons.push("SOURCE_PROVIDER_MISSING");
  if (!sourceVersion) reasons.push("SOURCE_VERSION_MISSING");
  if (!recordId) reasons.push("SOURCE_RECORD_ID_MISSING");
  if (!canonicalName) reasons.push("CANONICAL_NAME_MISSING");
  if (!movementPattern) reasons.push("MOVEMENT_PATTERN_MISSING_OR_UNSUPPORTED");
  if (!minimumExperience) reasons.push("MINIMUM_EXPERIENCE_MISSING_OR_UNSUPPORTED");
  if (fatigueCost === null || fatigueCost < 0 || fatigueCost > 1) reasons.push("FATIGUE_COST_MISSING_OR_INVALID");
  if (!context.licenseVerified) reasons.push("SOURCE_LICENSE_NOT_VERIFIED");
  if (!recordLicense) reasons.push("SOURCE_LICENSE_MISSING");
  if (!recordLicenseReference) reasons.push("SOURCE_LICENSE_REFERENCE_MISSING");
  if (environmentCodes.length === 0) reasons.push("ENVIRONMENT_CODES_MISSING");

  if (reasons.length > 0 || !recordId || !canonicalName || !movementPattern || !minimumExperience || fatigueCost === null || !recordLicense || !recordLicenseReference) {
    return { status: "REJECTED", reasonCodes: [...new Set(reasons)].sort() };
  }

  const aliases = stringList(record, "aliases")
    .filter((alias) => alias.localeCompare(canonicalName, undefined, { sensitivity: "accent" }) !== 0)
    .sort((a, b) => a.localeCompare(b));
  const progressionCompatibility = stringList(record, "progressionCompatibility", "progression_compatibility")
    .map(normalizedCode)
    .filter((value): value is ProgressionCompatibility => PROGRESSION.has(value as ProgressionCompatibility));
  const contraindicationCodes = stringList(record, "contraindicationCodes", "contraindication_codes").map(normalizedCode).sort();
  const substitutionGroup = normalizedCode(text(record, "substitutionGroup", "substitution_group") ?? `MOVEMENT_${movementPattern}`);

  return {
    status: "TRUSTED",
    exercise: {
      exerciseId: stableExerciseId(provider, recordId),
      canonicalName,
      aliases,
      movementPattern,
      primaryMuscles: stringList(record, "primaryMuscles", "primary_muscles").map(normalizedCode),
      secondaryMuscles: stringList(record, "secondaryMuscles", "secondary_muscles").map(normalizedCode),
      equipmentCodes: equipment(record),
      environmentCodes: [...new Set(environmentCodes)].sort(),
      minimumExperience,
      skill: skill(record, minimumExperience),
      progressionCompatibility,
      substitutionGroup,
      contraindicationCodes,
      fatigueCost,
      source: {
        provider,
        recordId,
        sourceVersion,
        license: recordLicense,
        licenseReference: recordLicenseReference,
      },
    },
    reasonCodes: ["SOURCE_LICENSE_VERIFIED", "CATALOG_RECORD_NORMALIZED"],
  };
}

function canonicalKey(exercise: ExerciseDefinition): string {
  return [normalizedCode(exercise.canonicalName), exercise.movementPattern, exercise.equipmentCodes.join("+")].join("|");
}

function sourceKey(exercise: ExerciseDefinition): string {
  return `${exercise.source.provider}\u0000${exercise.source.recordId}\u0000${exercise.exerciseId}`;
}

export function buildTrustedExerciseCatalog(catalogVersion: string, exercises: readonly ExerciseDefinition[]): ExerciseCatalog {
  const byId = new Map<string, ExerciseDefinition>();
  const byCanonical = new Map<string, ExerciseDefinition>();
  for (const exercise of [...exercises].sort((a, b) => sourceKey(a).localeCompare(sourceKey(b)))) {
    if (!exercise.source.provider.trim() || !exercise.source.recordId.trim() || !exercise.source.sourceVersion.trim() || !exercise.source.license.trim() || !exercise.source.licenseReference.trim()) {
      throw new Error(`Untrusted exercise source metadata: ${exercise.exerciseId}`);
    }
    const existingId = byId.get(exercise.exerciseId);
    if (existingId && sourceKey(existingId) !== sourceKey(exercise)) throw new Error(`Duplicate exercise ID: ${exercise.exerciseId}`);
    const key = canonicalKey(exercise);
    const existing = byCanonical.get(key);
    if (!existing || sourceKey(exercise).localeCompare(sourceKey(existing)) < 0) byCanonical.set(key, exercise);
    byId.set(exercise.exerciseId, exercise);
  }
  const trusted = [...byCanonical.values()].sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
  return { catalogVersion: catalogVersion.trim(), exercises: trusted };
}
