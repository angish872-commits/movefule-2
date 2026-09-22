import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type CorpusSample,
  validateProvenance,
  validateLicence,
  validateAttribution,
  validateEvidenceClassMetricRules,
  validateReferenceHasNoGroundTruth,
  validateSupportedFormat,
  verifySha256,
  findDuplicateChecksums,
  findDuplicateSourceIdentifiers,
  toMetricValue,
  extractMeasuredFields,
  corpusReplayKey,
  validateCorpus,
  LIVE_PROVIDER_CALL,
  LIVE_NETWORK_IMPORTS,
  SUPPORTED_IMAGE_EXTENSIONS,
} from "../../nutrition/validation/internetCorpus.ts";

const CORPUS_DIR = fileURLToPath(new URL("../../../../../research/nutrition-research/benchmark/internet-corpus/", import.meta.url));

function loadSamples(): CorpusSample[] {
  return readdirSync(join(CORPUS_DIR, "samples"))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(CORPUS_DIR, "samples", name), "utf8")) as CorpusSample);
}

const baseTemplate = loadSamples()[0];

function makeSample(overrides: Partial<CorpusSample>): CorpusSample {
  return { ...baseTemplate, ...overrides } as CorpusSample;
}

function makeClassSample(evidenceClass: CorpusSample["evidence_class"], overrides: Partial<CorpusSample> = {}): CorpusSample {
  const base = loadSamples().find((sample) => sample.evidence_class === evidenceClass);
  if (!base) throw new Error(`no fixture for ${evidenceClass}`);
  return { ...base, ...overrides } as CorpusSample;
}

function codeOf(results: ReturnType<typeof validateProvenance>): string[] {
  return results.map((result) => result.code);
}

test("every corpus sample passes provenance validation", () => {
  const samples = loadSamples();
  assert.equal(samples.length, 30);
  assert.deepEqual(validateCorpus(samples), []);
});

test("unknown licence is rejected", () => {
  assert.ok(validateLicence(makeSample({ licence: "unknown" })));
  assert.ok(validateLicence(makeSample({ licence: "" })));
  assert.ok(validateLicence(makeSample({ licence: "Unknown licence status" })));
  assert.ok(codeOf(validateProvenance(makeSample({ licence: "unknown" }))).includes("unknown_licence"));
});

test("known licence passes", () => {
  assert.equal(validateLicence(makeSample({ licence: "CC BY 4.0" })), null);
  assert.equal(validateLicence(makeSample({ licence: "CC0" })), null);
  assert.equal(validateLicence(makeSample({ licence: "CC BY-SA 4.0" })), null);
});

test("missing attribution is rejected when the licence requires it", () => {
  const missingAttribution = makeSample({ licence: "CC BY 4.0", attribution_requirements: "" });
  assert.equal(validateAttribution(missingAttribution)?.code, "missing_attribution");
  const missingAuthor = makeSample({ licence: "CC BY 4.0", author_owner: "" });
  assert.equal(validateAttribution(missingAuthor)?.code, "missing_author");
});

test("attribution is not required for public-domain licences", () => {
  assert.equal(validateAttribution(makeSample({ licence: "CC0", attribution_requirements: "" })), null);
});

test("duplicate checksum detection", () => {
  const a = makeSample({});
  const b = makeSample({ stable_sample_id: "dup-1", sha256: a.sha256 });
  const c = makeSample({ stable_sample_id: "dup-2", sha256: "other".padEnd(64, "0") });
  const duplicates = findDuplicateChecksums([a, b, c]);
  assert.deepEqual([...duplicates.get(a.sha256) ?? []].sort(), [a.stable_sample_id, b.stable_sample_id].sort());
});

test("duplicate source identifier detection", () => {
  const a = makeSample({});
  const b = makeSample({ stable_sample_id: "dup-1", source_dataset: a.source_dataset, original_identifier: a.original_identifier });
  const c = makeSample({ stable_sample_id: "dup-2", source_dataset: a.source_dataset, original_identifier: "other-id" });
  assert.deepEqual(findDuplicateSourceIdentifiers([a, b, c]).sort(), [a.stable_sample_id, b.stable_sample_id].sort());
});

test("every corpus image file exists locally", () => {
  for (const sample of loadSamples()) {
    assert.ok(existsSync(join(CORPUS_DIR, sample.local_image_path)), `missing image ${sample.local_image_path}`);
  }
  assert.equal(existsSync(join(CORPUS_DIR, "images", "ic-999.png")), false);
});

test("SHA-256 mismatch is detected and the real images match their records", () => {
  for (const sample of loadSamples()) {
    const bytes = readFileSync(join(CORPUS_DIR, sample.local_image_path));
    assert.equal(verifySha256(sample, new Uint8Array(bytes)), null, `checksum mismatch for ${sample.stable_sample_id}`);
  }
  const corrupted = makeSample({ sha256: "f".repeat(64) });
  assert.equal(verifySha256(corrupted, new Uint8Array([1, 2, 3]))?.code, "sha256_mismatch");
});

test("unsupported image format is rejected", () => {
  assert.equal(validateSupportedFormat(makeSample({ file_extension: "gif" }))?.code, "unsupported_image_format");
  assert.equal(validateSupportedFormat(makeSample({ file_extension: "bmp" }))?.code, "unsupported_image_format");
  for (const ext of SUPPORTED_IMAGE_EXTENSIONS) {
    assert.equal(validateSupportedFormat(makeSample({ file_extension: ext })), null);
  }
});

test("identity-only blocks nutrition metrics", () => {
  const labelled = makeClassSample("LABELLED_IDENTITY_ONLY");
  assert.deepEqual(validateCorpus([labelled]), []);
  const leaked = makeClassSample("LABELLED_IDENTITY_ONLY", { allowed_metrics: ["identity_top1", "calorie_error"] });
  assert.ok(codeOf(validateProvenance(leaked)).includes("identity_only_blocks_nutrition"));
});

test("reference-only blocks gram and calorie metrics", () => {
  const reference = makeClassSample("REFERENCE_ONLY");
  assert.deepEqual(validateCorpus([reference]), []);
  for (const metric of ["gram_error", "calorie_error"]) {
    const leaked = makeClassSample("REFERENCE_ONLY", { allowed_metrics: [metric] });
    assert.ok(codeOf(validateProvenance(leaked)).includes("reference_only_blocks_measurement"));
  }
});

test("measured dataset evaluates only fields the source supplies", () => {
  const measured = makeClassSample("MEASURED_DATASET");
  assert.deepEqual(validateCorpus([measured]), []);
  const leaked = makeClassSample("MEASURED_DATASET", { allowed_metrics: ["fiber_error"] });
  assert.ok(codeOf(validateProvenance(leaked)).includes("measured_only_supplied_fields"));
});

test("measured fields are preserved unchanged through extraction and re-serialisation", () => {
  for (const sample of loadSamples().filter((entry) => entry.evidence_class === "MEASURED_DATASET")) {
    const original = JSON.stringify(sample.available_ground_truth_fields);
    const extracted = extractMeasuredFields(sample);
    assert.equal(JSON.stringify(extracted), original, `ground truth mutated for ${sample.stable_sample_id}`);
    assert.deepEqual(JSON.parse(JSON.stringify(extracted)) as unknown, sample.available_ground_truth_fields);
  }
});

test("missing values never become zero", () => {
  assert.equal(toMetricValue(null).measurable, false);
  assert.equal(toMetricValue(undefined).measurable, false);
  assert.equal(toMetricValue("").measurable, false);
  assert.equal(toMetricValue("missing").measurable, false);
  const zero = toMetricValue(0);
  assert.equal(zero.measurable, true);
  assert.equal(zero.value, 0);
});

test("regional reference image never becomes recipe ground truth", () => {
  const reference = makeSample({ evidence_class: "REFERENCE_ONLY", available_ground_truth_fields: {} });
  assert.equal(validateReferenceHasNoGroundTruth(reference), null);
  const badReference = makeSample({
    evidence_class: "REFERENCE_ONLY",
    available_ground_truth_fields: { total_calories_kcal: 500 },
  });
  assert.equal(validateReferenceHasNoGroundTruth(badReference)?.code, "reference_must_not_be_recipe_truth");
});

test("deterministic replay key", () => {
  const samples = loadSamples();
  const first = corpusReplayKey(samples);
  assert.equal(corpusReplayKey(samples), first);
  assert.equal(corpusReplayKey([...samples].reverse()), first);
  const altered = makeSample({ sha256: "e".repeat(64) });
  assert.notEqual(corpusReplayKey([...samples.slice(0, -1), altered]), first);
});

test("no live provider call", () => {
  assert.equal(LIVE_PROVIDER_CALL, false);
  assert.equal(LIVE_NETWORK_IMPORTS, 0);
});

test("corpus class balance matches the plan", () => {
  const counts = new Map<string, number>();
  for (const sample of loadSamples()) {
    counts.set(sample.evidence_class, (counts.get(sample.evidence_class) ?? 0) + 1);
  }
  assert.equal(counts.get("MEASURED_DATASET"), 10);
  assert.equal(counts.get("LABELLED_IDENTITY_ONLY"), 10);
  assert.equal(counts.get("REFERENCE_ONLY"), 10);
});
