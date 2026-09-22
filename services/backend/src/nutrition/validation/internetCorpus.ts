import { createHash } from "node:crypto";

export type EvidenceClass = "MEASURED_DATASET" | "LABELLED_IDENTITY_ONLY" | "REFERENCE_ONLY";

export interface CorpusSample {
  stable_sample_id: string;
  source_dataset: string;
  original_identifier: string;
  original_source_reference: string;
  author_owner: string;
  retrieval_date: string;
  licence: string;
  licence_evidence_reference: string;
  attribution_requirements: string;
  evidence_class: EvidenceClass;
  food_label: string;
  cuisine_region: string;
  local_image_path: string;
  file_extension: string;
  sha256: string;
  width: number;
  height: number;
  source_width: number;
  source_height: number;
  download_bytes: number;
  available_ground_truth_fields: Record<string, unknown>;
  unavailable_ground_truth_fields: string[];
  allowed_metrics: string[];
  blocked_not_measurable_metrics: string[];
  exclusion_reason: string | null;
}

export interface ProvenanceError {
  sampleId: string;
  code: string;
  message: string;
}

export const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"] as const;

type MetricResult = { measurable: true; value: number } | { measurable: false; reason: string };

const BLOCKED_MEASUREMENT_METRICS = ["gram_error", "calorie_error", "nutrient_error", "per_region_gram_error", "fiber_error", "sodium_error"];
const MEASURED_NUTRITION_METRICS = ["calorie_error", "fat_error", "carb_error", "protein_error"];
const IDENTITY_METRICS = ["identity_top1", "identity_top3"];

function requiresAttribution(licence: string): boolean {
  return /^(CC BY|CC BY-SA|CC-BY-ND|Attribution|GFDL)/i.test(licence.trim());
}

function isUnknownLicence(licence: string): boolean {
  const value = licence.trim().toLowerCase();
  return value === "" || value === "unknown" || value.includes("unknown licence") || value === "unlicensed" || value.includes("no licence");
}

function error(sampleId: string, code: string, message: string): ProvenanceError {
  return { sampleId, code, message };
}

/** Licence must be explicit and known; unknown/unlicensed images are rejected. */
export function validateLicence(sample: CorpusSample): ProvenanceError | null {
  if (isUnknownLicence(sample.licence)) {
    return error(sample.stable_sample_id, "unknown_licence", `licence "${sample.licence}" is unknown or unlicensed`);
  }
  return null;
}

/** Attribution is mandatory for licences that require it (CC BY family, GFDL). */
export function validateAttribution(sample: CorpusSample): ProvenanceError | null {
  if (!requiresAttribution(sample.licence)) return null;
  if (!sample.attribution_requirements.trim()) {
    return error(sample.stable_sample_id, "missing_attribution", `licence ${sample.licence} requires attribution but none recorded`);
  }
  if (!sample.author_owner.trim()) {
    return error(sample.stable_sample_id, "missing_author", `licence ${sample.licence} requires an author for attribution`);
  }
  return null;
}

/** Identity-only samples may never carry gram/calorie/nutrient metrics. */
export function validateEvidenceClassMetricRules(sample: CorpusSample): ProvenanceError | null {
  const blocked = (metric: string): boolean => !sample.blocked_not_measurable_metrics.includes(metric);
  if (sample.evidence_class === "LABELLED_IDENTITY_ONLY") {
    for (const metric of ["gram_error", "calorie_error", "nutrient_error"]) {
      if (sample.allowed_metrics.includes(metric) || blocked(metric)) {
        return error(sample.stable_sample_id, "identity_only_blocks_nutrition",
          `LABELLED_IDENTITY_ONLY sample must block ${metric} as NOT_MEASURABLE`);
      }
    }
  }
  if (sample.evidence_class === "REFERENCE_ONLY") {
    for (const metric of ["gram_error", "calorie_error", "nutrient_error"]) {
      if (sample.allowed_metrics.includes(metric) || blocked(metric)) {
        return error(sample.stable_sample_id, "reference_only_blocks_measurement",
          `REFERENCE_ONLY sample must block ${metric} as NOT_MEASURABLE`);
      }
    }
  }
  if (sample.evidence_class === "MEASURED_DATASET") {
    for (const metric of ["fiber_error", "sodium_error", "per_region_gram_error"]) {
      if (sample.allowed_metrics.includes(metric)) {
        return error(sample.stable_sample_id, "measured_only_supplied_fields",
          `MEASURED_DATASET may only evaluate fields supplied by the source (${metric} is not supplied)`);
      }
    }
  }
  return null;
}

/** Reference-only samples are visual testing material and must carry no food truth. */
export function validateReferenceHasNoGroundTruth(sample: CorpusSample): ProvenanceError | null {
  if (sample.evidence_class !== "REFERENCE_ONLY") return null;
  const keys = Object.keys(sample.available_ground_truth_fields);
  if (keys.length > 0) {
    return error(sample.stable_sample_id, "reference_must_not_be_recipe_truth",
      `REFERENCE_ONLY sample must not carry ground truth fields (found ${keys.join(", ")})`);
  }
  return null;
}

/** Missing values in ground truth must surface as NOT_MEASURABLE, never as zero. */
export function toMetricValue(field: unknown): MetricResult {
  if (field === null || field === undefined || field === "") return { measurable: false, reason: "missing ground truth" };
  const numeric = typeof field === "number" ? field : Number(field);
  if (typeof field === "string" && field.trim() === "") return { measurable: false, reason: "missing ground truth" };
  if (!Number.isFinite(numeric)) return { measurable: false, reason: "missing ground truth" };
  return { measurable: true, value: numeric };
}

export function extractMeasuredFields(sample: CorpusSample): Record<string, unknown> {
  return sample.available_ground_truth_fields;
}

export function validateSupportedFormat(sample: CorpusSample): ProvenanceError | null {
  const ext = sample.file_extension.toLowerCase();
  if (!(SUPPORTED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return error(sample.stable_sample_id, "unsupported_image_format", `extension "${ext}" is not supported`);
  }
  return null;
}

/** Recomputes the SHA-256 of the local image bytes and compares with the recorded checksum. */
export function verifySha256(sample: CorpusSample, imageBytes: Uint8Array): ProvenanceError | null {
  const digest = createHash("sha256").update(imageBytes).digest("hex");
  if (digest !== sample.sha256) {
    return error(sample.stable_sample_id, "sha256_mismatch", `recorded ${sample.sha256} != recomputed ${digest}`);
  }
  return null;
}

/** Detect two samples pointing at identical image bytes. */
export function findDuplicateChecksums(samples: CorpusSample[]): Map<string, string[]> {
  const byChecksum = new Map<string, string[]>();
  for (const sample of samples) {
    const list = byChecksum.get(sample.sha256) ?? [];
    list.push(sample.stable_sample_id);
    byChecksum.set(sample.sha256, list);
  }
  const duplicates = new Map<string, string[]>();
  for (const [checksum, ids] of byChecksum) {
    if (ids.length > 1) duplicates.set(checksum, ids);
  }
  return duplicates;
}

/** Detect repeated source identifiers (same source dataset + original identifier). */
export function findDuplicateSourceIdentifiers(samples: CorpusSample[]): string[] {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const sample of samples) {
    const key = `${sample.source_dataset}::${sample.original_identifier}`;
    const existing = seen.get(key);
    if (existing !== undefined) {
      duplicates.add(existing);
      duplicates.add(sample.stable_sample_id);
    } else {
      seen.set(key, sample.stable_sample_id);
    }
  }
  return [...duplicates];
}

export function validateProvenance(sample: CorpusSample): ProvenanceError[] {
  const errors: ProvenanceError[] = [];
  const push = (result: ProvenanceError | null): void => {
    if (result) errors.push(result);
  };
  push(validateLicence(sample));
  push(validateAttribution(sample));
  push(validateEvidenceClassMetricRules(sample));
  push(validateReferenceHasNoGroundTruth(sample));
  push(validateSupportedFormat(sample));
  if (sample.exclusion_reason !== null) {
    errors.push(error(sample.stable_sample_id, "excluded", `sample is excluded: ${sample.exclusion_reason}`));
  }
  return errors;
}

/**
 * Deterministic fingerprint of the corpus: independent of ordering, ties every
 * sample to its recorded checksum, and changes if any sample is replaced.
 */
export function corpusReplayKey(samples: CorpusSample[]): string {
  const parts = samples
    .map((sample) => `${sample.stable_sample_id}|${sample.sha256}|${sample.licence}|${sample.evidence_class}`)
    .sort();
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

/**
 * Corpus validation is a pure, offline process. The module performs no network
 * calls and no provider requests; this flag is the machine-checked assertion.
 */
export const LIVE_PROVIDER_CALL = false;
export const LIVE_NETWORK_IMPORTS = 0;

/** Compares every corpus sample against its provenance rules and returns all failures. */
export function validateCorpus(samples: CorpusSample[]): ProvenanceError[] {
  return samples.flatMap(validateProvenance);
}
