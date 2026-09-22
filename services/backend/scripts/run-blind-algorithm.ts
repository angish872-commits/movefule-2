/**
 * MoveFuel blind end-to-end algorithm executor.
 *
 * Inference input is a leak-resistant manifest with image metadata only. The
 * script never reads sealed meal truth. It runs candidate-only vision, source-
 * backed nutrition lookup, physical portion evidence, exact-source density,
 * deterministic nutrient calculation, and writes prediction-only rows.
 */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  BLIND_INFERENCE_MANIFEST_SCHEMA,
  candidateNutritionQueries,
  nutritionLookupIndex,
  nutritionSearchFromIndex,
  parseBlindInferenceManifest,
  sourceBoundDensityResolver,
  type BlindInferenceSample,
  type RuntimeLookupDocument,
} from "../src/nutrition/benchmark/blindRuntimeSupport.ts";
import { GeminiFoodSceneAdapter } from "../src/nutrition/vision/providers/geminiFoodSceneAdapter.ts";
import { OpenRouterFoodSceneAdapter } from "../src/nutrition/vision/providers/openRouterFoodSceneAdapter.ts";
import type { CandidateGenerationResult, CandidateProvider, CandidateRequest, RegionFoodCandidate } from "../src/nutrition/vision/candidateProviderAdapter.ts";
import type { SegmentationAdapter, SegmentationAnalysis, SegmentationRequest, SegmentationRegion } from "../src/nutrition/vision/segmentationAdapter.ts";
import { MetadataOnlyQualityAssessor } from "../src/nutrition/vision/qualityAssessment.ts";
import { OpenCvPixelQualityAssessor } from "../src/nutrition/vision/openCvPixelQualityAssessor.ts";
import { KnowledgeNutritionResolver, type NutritionRecord } from "../src/nutrition/identity/knowledgeNutritionResolver.ts";
import { createMoveFuelAlgorithm, MOVEFUEL_ALGORITHM_VERSION } from "../src/nutrition/algorithm/moveFuelAlgorithm.ts";
import { blindPredictionFromEstimate, type BlindPredictionRow } from "../src/nutrition/benchmark/blindPrediction.ts";
import { SidecarDepthScaleAdapter } from "../src/nutrition/portion/sidecarDepthScaleAdapter.ts";
import type { KnowledgeSnapshot } from "../src/nutrition/identity/knowledgeSnapshot.ts";
import { FdcApiClient, type Transport } from "../src/nutrition/nutrients/usdaClient.ts";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "../../..");
const PYROOT = path.join(ROOT, "research", "nutrition-research", "python");
const PHYSICAL_EVIDENCE_WORKER = path.join(ROOT, "research", "algorithm-validation", "nutrition5k-rgbd-physical-evidence.py");

type Args = {
  manifest: string;
  output: string;
  diagnostics: string;
  sceneDir: string;
  knowledgeDb: string | null;
  knowledgeSnapshot: string | null;
  nutrition5kOverheadRoot: string | null;
  depthSidecarDir: string | null;
  limit: number | null;
  countryPrior: string | null;
  allowDemoKey: boolean;
  reuseScenes: boolean;
  providerTimeoutMs: number;
  pythonBin: string;
};

type SafeScene = {
  schema: "movefuel-safe-scene-v6-1";
  sample_id: string;
  provider: string;
  provider_version: string;
  latency_ms: number;
  warnings: readonly string[];
  regions: readonly (SegmentationRegion & { candidates: readonly RegionFoodCandidate[] })[];
};

function parseArgs(argv: readonly string[]): Args {
  const value = (name: string): string | null => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1]! : null;
  };
  const required = (name: string): string => {
    const v = value(name);
    if (!v) throw new Error(`missing_required_argument:${name}`);
    return path.resolve(v);
  };
  const limitRaw = value("--limit");
  const timeoutRaw = value("--provider-timeout-ms");
  return {
    manifest: required("--manifest"),
    output: required("--output"),
    diagnostics: required("--diagnostics"),
    sceneDir: path.resolve(value("--scene-dir") ?? path.join(ROOT, "research", "algorithm-validation", "empirical-output", "scenes")),
    knowledgeDb: value("--knowledge-db") ? path.resolve(value("--knowledge-db")!) : null,
    knowledgeSnapshot: value("--knowledge-snapshot") ? path.resolve(value("--knowledge-snapshot")!) : null,
    nutrition5kOverheadRoot: value("--nutrition5k-overhead-root") ? path.resolve(value("--nutrition5k-overhead-root")!) : null,
    depthSidecarDir: value("--depth-sidecar-dir") ? path.resolve(value("--depth-sidecar-dir")!) : null,
    limit: limitRaw ? Math.max(1, Number(limitRaw)) : null,
    countryPrior: value("--country-prior"),
    allowDemoKey: argv.includes("--allow-demo-key"),
    reuseScenes: argv.includes("--reuse-scenes"),
    providerTimeoutMs: timeoutRaw ? Math.max(1000, Number(timeoutRaw)) : 30_000,
    pythonBin: value("--python-bin") ?? "python3",
  };
}

function mimeFor(file: string, declared: string): "image/png" | "image/webp" | "image/jpeg" {
  if (declared === "image/png" || declared === "image/webp" || declared === "image/jpeg") return declared;
  const ext = path.extname(file).toLowerCase();
  return ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
}

const directFileImageStore = {
  async read(objectId: string) {
    return { bytes: await readFile(objectId), mediaType: mimeFor(objectId, "") };
  },
};

function timeoutFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

function fdcTransport(timeoutMs: number): Transport {
  return {
    async request({ url, method, headers, body }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { method, headers, ...(body !== undefined ? { body } : {}), signal: controller.signal });
        return { status: response.status, headers: response.headers, text: await response.text() };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function safeScenePath(sceneDir: string, sampleId: string): string {
  return path.join(sceneDir, `${sampleId}.json`);
}

async function verifyImage(sample: BlindInferenceSample): Promise<void> {
  const bytes = await readFile(sample.image_path);
  if (sample.checksum) {
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest.toLowerCase() !== sample.checksum.toLowerCase()) throw new Error(`${sample.sample_id}:image_checksum_mismatch`);
  }
}

async function resolveSampleImage(sample: BlindInferenceSample, manifestFile: string): Promise<BlindInferenceSample> {
  if (path.isAbsolute(sample.image_path)) return sample;
  const candidates = [
    path.resolve(ROOT, sample.image_path),
    path.resolve(ROOT, "research", sample.image_path),
    path.resolve(path.dirname(manifestFile), sample.image_path),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return { ...sample, image_path: candidate };
    } catch {
      // Try the next documented relative-path root.
    }
  }
  throw new Error(`${sample.sample_id}:image_not_found`);
}

function sceneToSegmentation(scene: SafeScene): SegmentationAnalysis {
  return {
    provider: scene.provider,
    providerVersion: scene.provider_version,
    status: "COMPLETED",
    regions: scene.regions.map(({ candidates: _candidates, ...region }) => region),
    latencyMs: scene.latency_ms,
    warnings: scene.warnings,
  };
}

class SafeSceneReplayAdapter implements SegmentationAdapter, CandidateProvider {
  readonly name = "movefuel-safe-scene-replay";
  private readonly scene: SafeScene;
  constructor(scene: SafeScene) { this.scene = scene; }
  async segment(_input: SegmentationRequest): Promise<SegmentationAnalysis> { return sceneToSegmentation(this.scene); }
  async generateCandidates(input: CandidateRequest): Promise<CandidateGenerationResult> {
    const region = this.scene.regions.find((entry) => entry.regionId === input.regionId);
    const candidates = region?.candidates ?? [];
    return {
      provider: this.scene.provider,
      providerVersion: this.scene.provider_version,
      regionId: input.regionId,
      status: candidates.length > 0 ? "COMPLETED" : "UNKNOWN",
      candidates,
      warnings: candidates.length > 0 ? [] : ["no identity candidate in replay scene"],
    };
  }
}

function parseSafeScene(value: unknown): SafeScene {
  const scene = value as SafeScene;
  if (!scene || scene.schema !== "movefuel-safe-scene-v6-1" || !Array.isArray(scene.regions)) throw new Error("invalid_safe_scene_replay");
  return scene;
}

async function obtainScene(sample: BlindInferenceSample, adapter: (SegmentationAdapter & CandidateProvider) | null, args: Args): Promise<SafeScene> {
  const file = safeScenePath(args.sceneDir, sample.sample_id);
  if (args.reuseScenes) {
    try { return parseSafeScene(JSON.parse(await readFile(file, "utf8"))); } catch { /* generate fresh */ }
  }
  if (!adapter) throw new Error(`${sample.sample_id}:gemini_not_configured_and_no_replay_scene`);
  const segmentation = await adapter.segment({ imageReference: sample.image_path, mimeType: sample.mime_type, widthPx: sample.width_px, heightPx: sample.height_px, checksum: sample.checksum ?? undefined });
  const regions = [] as Array<SegmentationRegion & { candidates: readonly RegionFoodCandidate[] }>;
  for (const region of segmentation.regions) {
    const generated = await adapter.generateCandidates({ imageReference: sample.image_path, regionId: region.regionId, mimeType: sample.mime_type, checksum: sample.checksum ?? undefined });
    regions.push({ ...region, candidates: generated.candidates });
  }
  const scene: SafeScene = {
    schema: "movefuel-safe-scene-v6-1",
    sample_id: sample.sample_id,
    provider: segmentation.provider,
    provider_version: segmentation.providerVersion,
    latency_ms: segmentation.latencyMs,
    warnings: segmentation.warnings,
    regions,
  };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(scene, null, 2) + "\n", { mode: 0o600 });
  return scene;
}

function allQueries(scenes: readonly SafeScene[]): string[] {
  const result: string[] = [];
  for (const scene of scenes) for (const region of scene.regions) for (const q of candidateNutritionQueries(region.candidates)) {
    if (!result.some((existing) => existing.toLowerCase() === q.toLowerCase())) result.push(q);
  }
  return result;
}

async function localFdcLookup(db: string, queries: readonly string[], outputDir: string, pythonBin: string, timeoutMs: number): Promise<Map<string, readonly NutritionRecord[]>> {
  const q = path.join(outputDir, "fdc-queries.json");
  const out = path.join(outputDir, "fdc-runtime-lookup.json");
  await writeFile(q, JSON.stringify({ queries }, null, 2) + "\n");
  const env = { ...process.env, PYTHONPATH: PYROOT };
  await execFileAsync(pythonBin, ["-m", "movefuel_fdc.runtime_lookup", "--db", db, "--queries", q, "--output", out, "--limit", "40"], { env, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 });
  return nutritionLookupIndex(JSON.parse(await readFile(out, "utf8")) as RuntimeLookupDocument);
}

async function liveFdcLookup(queries: readonly string[], apiKey: string, timeoutMs: number): Promise<Map<string, readonly NutritionRecord[]>> {
  const client = new FdcApiClient(fdcTransport(timeoutMs), { apiKey, timeoutMs, maxRetries: 2 });
  const map = new Map<string, readonly NutritionRecord[]>();
  for (const query of queries) {
    try {
      map.set(query.toLowerCase(), await client.searchNutritionRecords(query, 20, 6));
    } catch {
      map.set(query.toLowerCase(), []);
    }
  }
  return map;
}

async function loadKnowledgeSnapshot(file: string | null): Promise<KnowledgeSnapshot | null> {
  if (!file) return null;
  try { return JSON.parse(await readFile(file, "utf8")) as KnowledgeSnapshot; } catch { return null; }
}

async function findDepth(root: string | null, dishId: string | null): Promise<string | null> {
  if (!root || !dishId) return null;
  const dir = path.join(root, dishId);
  try {
    const names = await readdir(dir);
    for (const preferred of ["depth_raw.png", "depth.png"]) if (names.includes(preferred)) return path.join(dir, preferred);
    const candidate = names.filter((name) => /^depth.*\.(?:png|tif|tiff)$/i.test(name) && !/color|vis|render/i.test(name)).sort()[0];
    return candidate ? path.join(dir, candidate) : null;
  } catch { return null; }
}

async function sidecarFor(sample: BlindInferenceSample, scene: SafeScene, args: Args, outputDir: string): Promise<{ adapter: SidecarDepthScaleAdapter | null; source: string | null }> {
  if (args.depthSidecarDir) {
    const file = path.join(args.depthSidecarDir, `${sample.sample_id}.json`);
    try { return { adapter: await SidecarDepthScaleAdapter.fromFile(file), source: file }; } catch { /* continue */ }
  }
  const depth = await findDepth(args.nutrition5kOverheadRoot, sample.dish_id);
  if (!depth) return { adapter: null, source: null };
  const sceneFile = path.join(outputDir, `${sample.sample_id}.physical-scene.json`);
  const sidecar = path.join(outputDir, `${sample.sample_id}.depth-sidecar.json`);
  // The physical-evidence worker reads only region geometry/masks and raw depth;
  // no meal mass/calorie/nutrient truth is passed to it.
  await writeFile(sceneFile, JSON.stringify({ regions: scene.regions.map(({ candidates: _c, ...region }) => region) }, null, 2) + "\n");
  const env = { ...process.env, PYTHONPATH: PYROOT };
  await execFileAsync(args.pythonBin, [PHYSICAL_EVIDENCE_WORKER, "--depth", depth, "--scene", sceneFile, "--output", sidecar, "--sample-id", sample.sample_id], { env, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
  return { adapter: await SidecarDepthScaleAdapter.fromFile(sidecar), source: sidecar };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const PRED_FIELDS: readonly (keyof BlindPredictionRow)[] = [
  "sample_id", "category", "predicted_min_g", "predicted_central_g", "predicted_max_g",
  "predicted_min_kcal", "predicted_central_kcal", "predicted_max_kcal",
  "predicted_min_protein_g", "predicted_central_protein_g", "predicted_max_protein_g",
  "predicted_min_carb_g", "predicted_central_carb_g", "predicted_max_carb_g",
  "predicted_min_fat_g", "predicted_central_fat_g", "predicted_max_fat_g",
  "prediction_state", "algorithm_version", "model_version",
];

async function writePredictions(file: string, rows: readonly BlindPredictionRow[]): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const lines = [PRED_FIELDS.join(","), ...rows.map((row) => PRED_FIELDS.map((field) => csvCell(row[field])).join(","))];
  await writeFile(file, lines.join("\n") + "\n", { mode: 0o600 });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(path.dirname(args.output), { recursive: true });
  await mkdir(path.dirname(args.diagnostics), { recursive: true });
  await mkdir(args.sceneDir, { recursive: true });
  const manifest = parseBlindInferenceManifest(JSON.parse(await readFile(args.manifest, "utf8")));
  if (manifest.schema !== BLIND_INFERENCE_MANIFEST_SCHEMA) throw new Error("invalid_manifest_schema");
  const selectedSamples = args.limit ? manifest.samples.slice(0, args.limit) : [...manifest.samples];
  const samples = await Promise.all(selectedSamples.map((sample) => resolveSampleImage(sample, args.manifest)));
  for (const sample of samples) await verifyImage(sample);

  const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  const gemini = geminiKey ? new GeminiFoodSceneAdapter({
    apiKey: geminiKey,
    imageStore: directFileImageStore,
    model: process.env.MOVEFUEL_FOOD_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-3.6-flash",
    fetcher: timeoutFetch(args.providerTimeoutMs),
    context: args.countryPrior ? { countryPrior: args.countryPrior } : {},
  }) : null;
  const openRouter = openRouterKey ? new OpenRouterFoodSceneAdapter({
    apiKey: openRouterKey,
    imageStore: directFileImageStore,
    model: process.env.OPENROUTER_FOOD_VISION_MODEL || "google/gemini-2.5-flash",
    fetcher: timeoutFetch(args.providerTimeoutMs),
    timeoutMs: args.providerTimeoutMs,
    context: args.countryPrior ? { countryPrior: args.countryPrior } : {},
  }) : null;
  const preferredProvider = process.env.MOVEFUEL_FOOD_VISION_PROVIDER?.trim().toLowerCase();
  const sceneAdapter = preferredProvider === "gemini"
    ? gemini
    : preferredProvider === "openrouter"
      ? openRouter
      : openRouter ?? gemini;

  const scenes: SafeScene[] = [];
  const sceneFailures: Record<string, string> = {};
  for (const sample of samples) {
    try { scenes.push(await obtainScene(sample, sceneAdapter, args)); }
    catch (error) { sceneFailures[sample.sample_id] = error instanceof Error ? error.message : "scene_failure"; }
  }

  const queries = allQueries(scenes);
  const workDir = path.dirname(args.diagnostics);
  let lookup = new Map<string, readonly NutritionRecord[]>();
  let nutritionBackend = "none";
  if (args.knowledgeDb) {
    try {
      lookup = await localFdcLookup(args.knowledgeDb, queries, workDir, args.pythonBin, Math.max(120_000, args.providerTimeoutMs * 20));
      nutritionBackend = "bulk_usda_catalogue";
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown local lookup error";
      throw new Error(`local_fdc_lookup_failed:${reason}`);
    }
  }
  if (lookup.size === 0) {
    const key = (process.env.USDA_FDC_API_KEY || process.env.FDC_API_KEY || (args.allowDemoKey ? "DEMO_KEY" : "")).trim();
    if (key) { lookup = await liveFdcLookup(queries, key, args.providerTimeoutMs); nutritionBackend = key === "DEMO_KEY" ? "live_usda_demo_key" : "live_usda_private_key"; }
  }
  const search = nutritionSearchFromIndex(lookup);
  const resolver = new KnowledgeNutritionResolver({ search });
  const snapshot = await loadKnowledgeSnapshot(args.knowledgeSnapshot);
  const resolveDensity = sourceBoundDensityResolver(snapshot);
  const predictions: BlindPredictionRow[] = [];
  const diagnostics: Array<Record<string, unknown>> = [];

  for (const sample of samples) {
    const scene = scenes.find((entry) => entry.sample_id === sample.sample_id);
    if (!scene) {
      diagnostics.push({ sample_id: sample.sample_id, status: "ABSTAINED", stage: "scene", reason: sceneFailures[sample.sample_id] ?? "scene_unavailable" });
      continue;
    }
    try {
      const replay = new SafeSceneReplayAdapter(scene);
      const physical = await sidecarFor(sample, scene, args, workDir);
      const algorithm = createMoveFuelAlgorithm({
        qualityAssessor: new MetadataOnlyQualityAssessor(),
        pixelQualityAssessor: new OpenCvPixelQualityAssessor({ imageStore: directFileImageStore, pythonPath: PYROOT, pythonBin: args.pythonBin }),
        segmentationAdapter: replay,
        candidateProvider: replay,
        resolveFood: (candidates, itemType) => resolver.resolve(candidates, itemType),
        resolveDensityForSource: (resolved) => resolveDensity(resolved),
        depthScaleAdapter: physical.adapter,
      });
      const result = await algorithm.run({
        requestId: `blind-v6:${sample.sample_id}`,
        ownerUserId: "blind-benchmark",
        imageReference: sample.image_path,
        mimeType: sample.mime_type,
        widthPx: sample.width_px,
        heightPx: sample.height_px,
        checksum: sample.checksum ?? undefined,
      });
      const modelVersion = scene.provider_version;
      const row = blindPredictionFromEstimate({ sampleId: sample.sample_id, category: sample.category, result, algorithmVersion: MOVEFUEL_ALGORITHM_VERSION, modelVersion });
      if (row) predictions.push(row);
      diagnostics.push({
        sample_id: sample.sample_id,
        status: row ? "PREDICTED" : "ABSTAINED",
        state: result.state,
        physical_evidence: physical.source ? "CALIBRATED_SIDECAR" : "NONE",
        nutrition_backend: nutritionBackend,
        item_count: result.items.length,
        items: result.items.map((item) => ({
          region_id: item.regionId,
          candidates: item.candidates.map((c) => ({ name: c.name, confidence: c.providerConfidence, preparation: c.preparationCandidates[0]?.label ?? null })),
          selected_source: item.selectedSource ? { source: item.selectedSource.source, fdc_id: item.selectedSource.fdcId, data_type: item.selectedSource.dataType, description: item.selectedSource.description } : null,
          portion: item.portion ? { min_g: item.portion.minimumGrams, central_g: item.portion.centralGrams, max_g: item.portion.maximumGrams, confidence: item.portion.confidence, evidence_used: item.portion.evidenceUsed, uncertainties: item.portion.uncertainties } : null,
          nutrients: item.nutrients ? Object.fromEntries(Object.entries(item.nutrients).map(([name, range]) => [name, {
            minimum: range.minimum,
            central: range.central,
            maximum: range.maximum,
          }])) : null,
          confidence: item.confidence,
        })),
      });
    } catch (error) {
      diagnostics.push({ sample_id: sample.sample_id, status: "ABSTAINED", stage: "algorithm", reason: error instanceof Error ? error.message : "algorithm_failure" });
    }
  }

  await writePredictions(args.output, predictions);
  const diag = {
    schema: "movefuel-blind-runtime-diagnostics-v6-1",
    manifest_schema: manifest.schema,
    requested_samples: samples.length,
    scene_completed_samples: scenes.length,
    prediction_count: predictions.length,
    abstention_count: samples.length - predictions.length,
    prediction_coverage: samples.length > 0 ? predictions.length / samples.length : 0,
    nutrition_backend: nutritionBackend,
    knowledge_snapshot_present: snapshot !== null,
    physical_depth_root_present: args.nutrition5kOverheadRoot !== null,
    ground_truth_fields_used: [],
    scenes_are_candidate_only: true,
    rows: diagnostics,
  };
  await writeFile(args.diagnostics, JSON.stringify(diag, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ status: "COMPLETED", requested_samples: samples.length, predictions: predictions.length, coverage: diag.prediction_coverage, output: args.output, diagnostics: args.diagnostics }, null, 2));
}

main().catch((error) => {
  // Sanitized failure: never print provider bodies, request URLs or secret values.
  console.error(JSON.stringify({ status: "FAILED", error: error instanceof Error ? error.message : "unknown_error" }, null, 2));
  process.exitCode = 2;
});
