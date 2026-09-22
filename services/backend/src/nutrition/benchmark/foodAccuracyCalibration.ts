/**
 * Wave-4 Food Intelligence accuracy/calibration harness.
 *
 * Evaluates evidence produced elsewhere. It is not a food-identification model,
 * nutrient authority, or confirmation authority. Unexecuted predictions remain
 * NOT_EXECUTED rather than becoming zero-valued accuracy measurements.
 */
import {
  intervalCoverage,
  meanAbsoluteError,
  meanAbsolutePercentageError,
  type MetricResult,
} from "./benchmarkMetrics.ts";

export const FOOD_ACCURACY_CALIBRATION_VERSION = "1.0.0" as const;

export type FoodIdentityCoverageCategory =
  | "NEPALI" | "INDIAN" | "WESTERN" | "MIXED_DISH" | "SAUCE" | "SOUP"
  | "PACKAGED" | "VISUAL_NEAR_NEIGHBOR" | "PREPARATION_VARIANT";

export type FoodIdentityCoverageCase = Readonly<{
  caseId: string;
  category: FoodIdentityCoverageCategory;
  displayName: string;
  acceptableNames: readonly string[];
  preparation: string | null;
  expectedDecision: "IDENTIFY_OR_REVIEW" | "ABSTAIN_OR_CLARIFY";
}>;

type CoverageSeed = readonly [string, readonly string[], string | null, FoodIdentityCoverageCase["expectedDecision"]?];

function identityGroup(category: FoodIdentityCoverageCategory, rows: readonly CoverageSeed[]): readonly FoodIdentityCoverageCase[] {
  return rows.map(([displayName, acceptableNames, preparation, expectedDecision], index) => Object.freeze({
    caseId: `${category.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
    category,
    displayName,
    acceptableNames: Object.freeze([...acceptableNames]),
    preparation,
    expectedDecision: expectedDecision ?? "IDENTIFY_OR_REVIEW",
  }));
}

/** Labels/review expectations for later live-provider runs; never model predictions. */
export const FOOD_IDENTITY_COVERAGE_CASES: readonly FoodIdentityCoverageCase[] = Object.freeze([
  ...identityGroup("NEPALI", [
    ["dal bhat", ["dal bhat", "dal bhat tarkari"], null],
    ["momo", ["momo", "momos", "dumpling"], "steamed"],
    ["sel roti", ["sel roti"], "fried"],
    ["chiura", ["chiura", "beaten rice", "flattened rice"], null],
    ["aloo tama", ["aloo tama", "potato bamboo shoot curry"], "cooked"],
    ["gundruk", ["gundruk", "fermented leafy greens"], "cooked"],
    ["yomari", ["yomari"], "steamed"],
    ["thukpa", ["thukpa", "noodle soup"], "cooked"],
  ]),
  ...identityGroup("INDIAN", [
    ["idli", ["idli"], "steamed"],
    ["dosa", ["dosa", "dosai"], "cooked"],
    ["chana masala", ["chana masala", "chole"], "cooked"],
    ["rajma", ["rajma", "kidney bean curry"], "cooked"],
    ["paneer tikka", ["paneer tikka"], "grilled"],
    ["biryani", ["biryani"], "cooked"],
    ["poha", ["poha", "flattened rice"], "cooked"],
    ["upma", ["upma"], "cooked"],
  ]),
  ...identityGroup("WESTERN", [
    ["scrambled eggs", ["scrambled eggs"], "cooked"],
    ["oatmeal", ["oatmeal", "porridge"], "cooked"],
    ["grilled chicken", ["grilled chicken", "chicken breast"], "grilled"],
    ["caesar salad", ["caesar salad"], null],
    ["cheeseburger", ["cheeseburger", "burger"], null],
    ["pizza", ["pizza"], "baked"],
    ["spaghetti bolognese", ["spaghetti bolognese", "pasta bolognese"], "cooked"],
    ["mashed potatoes", ["mashed potatoes"], "cooked"],
  ]),
  ...identityGroup("MIXED_DISH", [
    ["rice and curry plate", ["rice and curry", "curry rice plate"], null],
    ["burrito bowl", ["burrito bowl"], null],
    ["stir-fry noodles", ["stir fry noodles", "stir-fried noodles"], "fried"],
    ["poke bowl", ["poke bowl"], null],
    ["vegetable casserole", ["vegetable casserole", "casserole"], "baked"],
    ["mixed salad bowl", ["mixed salad", "salad bowl"], null],
  ]),
  ...identityGroup("SAUCE", [
    ["tomato sauce", ["tomato sauce"], "cooked"],
    ["peanut sauce", ["peanut sauce"], null],
    ["mayonnaise", ["mayonnaise", "mayo"], null],
    ["chutney", ["chutney"], null],
  ]),
  ...identityGroup("SOUP", [
    ["lentil soup", ["lentil soup", "dal soup"], "cooked"],
    ["tomato soup", ["tomato soup"], "cooked"],
    ["chicken noodle soup", ["chicken noodle soup"], "cooked"],
    ["vegetable soup", ["vegetable soup"], "cooked"],
  ]),
  ...identityGroup("PACKAGED", [
    ["yogurt cup", ["yogurt", "yoghurt"], null],
    ["breakfast cereal", ["breakfast cereal", "cereal"], null],
    ["canned beans", ["canned beans", "beans"], null],
    ["crackers", ["crackers"], null],
  ]),
  ...identityGroup("VISUAL_NEAR_NEIGHBOR", [
    ["plain rice vs pulao", ["plain rice", "rice", "pulao", "pilaf"], null, "ABSTAIN_OR_CLARIFY"],
    ["dal vs sambar", ["dal", "sambar"], null, "ABSTAIN_OR_CLARIFY"],
    ["fried potato vs roasted potato", ["fried potato", "roasted potato"], null, "ABSTAIN_OR_CLARIFY"],
  ]),
  ...identityGroup("PREPARATION_VARIANT", [
    ["chicken raw vs cooked", ["chicken"], null, "ABSTAIN_OR_CLARIFY"],
    ["egg boiled vs fried", ["egg"], null, "ABSTAIN_OR_CLARIFY"],
    ["rice steamed vs fried", ["rice"], null, "ABSTAIN_OR_CLARIFY"],
  ]),
]);

export type FoodIdentityPrediction = Readonly<{ name: string; confidence: number | null }>;
export type FoodIdentityEvaluationCase = Readonly<{
  caseId: string;
  category: FoodIdentityCoverageCategory;
  acceptableNames: readonly string[];
  candidates: readonly FoodIdentityPrediction[];
  shouldAbstain: boolean;
  abstained: boolean;
}>;

export type IdentityCalibrationReport = Readonly<{
  sampleCount: number;
  identifiableCount: number;
  expectedAbstentionCount: number;
  top1Accuracy: MetricResult;
  top3Accuracy: MetricResult;
  abstentionPrecision: MetricResult;
  abstentionRecall: MetricResult;
  brierScore: MetricResult;
  expectedCalibrationError: MetricResult;
  highConfidenceWrongRate: MetricResult;
  perCategoryTop1: Readonly<Record<string, MetricResult>>;
}>;

const normalizeName = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");
const ratio = (n: number, d: number, reason: string): MetricResult => d > 0
  ? { measurable: true, value: n / d }
  : { measurable: false, reason };
const average = (values: readonly number[], reason: string): MetricResult => values.length > 0
  ? { measurable: true, value: values.reduce((sum, value) => sum + value, 0) / values.length }
  : { measurable: false, reason };

export function evaluateIdentityCalibration(
  cases: readonly FoodIdentityEvaluationCase[],
  options: { confidenceBins?: number; highConfidenceThreshold?: number } = {},
): IdentityCalibrationReport {
  const identifiable = cases.filter((entry) => !entry.shouldAbstain);
  const expectedAbstention = cases.filter((entry) => entry.shouldAbstain);
  const predictedAbstention = cases.filter((entry) => entry.abstained);
  const trueAbstentions = predictedAbstention.filter((entry) => entry.shouldAbstain).length;
  const hit = (entry: FoodIdentityEvaluationCase, limit: number): boolean => {
    const names = new Set(entry.acceptableNames.map(normalizeName));
    return !entry.abstained && entry.candidates.slice(0, limit).some((candidate) => names.has(normalizeName(candidate.name)));
  };
  const top1Hits = identifiable.filter((entry) => hit(entry, 1)).length;
  const top3Hits = identifiable.filter((entry) => hit(entry, 3)).length;
  const scoredConfidence: Array<{ confidence: number; correct: number }> = [];
  for (const entry of identifiable) {
    if (entry.abstained || entry.candidates.length === 0) continue;
    const confidence = entry.candidates[0]!.confidence;
    if (typeof confidence === "number" && Number.isFinite(confidence) && confidence >= 0 && confidence <= 1) {
      scoredConfidence.push({ confidence, correct: hit(entry, 1) ? 1 : 0 });
    }
  }

  const brier = scoredConfidence.map(({ confidence, correct }) => (confidence - correct) ** 2);
  const bins = Math.max(2, Math.floor(options.confidenceBins ?? 5));
  let ece = 0;
  if (scoredConfidence.length > 0) {
    for (let index = 0; index < bins; index += 1) {
      const lower = index / bins;
      const upper = (index + 1) / bins;
      const inBin = scoredConfidence.filter(({ confidence }) => confidence >= lower && (index === bins - 1 ? confidence <= upper : confidence < upper));
      if (inBin.length === 0) continue;
      const avgConfidence = inBin.reduce((sum, row) => sum + row.confidence, 0) / inBin.length;
      const accuracy = inBin.reduce((sum, row) => sum + row.correct, 0) / inBin.length;
      ece += (inBin.length / scoredConfidence.length) * Math.abs(avgConfidence - accuracy);
    }
  }

  const highThreshold = options.highConfidenceThreshold ?? 0.8;
  const highConfidence = scoredConfidence.filter(({ confidence }) => confidence >= highThreshold);
  const highConfidenceWrong = highConfidence.filter(({ correct }) => correct === 0).length;
  const expectedCalibrationError: MetricResult = scoredConfidence.length > 0
    ? { measurable: true, value: ece }
    : { measurable: false, reason: "no confidence-bearing predictions" };
  const perCategory: Record<string, MetricResult> = {};
  for (const category of [...new Set(cases.map((entry) => entry.category))].sort()) {
    const rows = identifiable.filter((entry) => entry.category === category);
    perCategory[category] = ratio(rows.filter((entry) => hit(entry, 1)).length, rows.length, "no identifiable cases in category");
  }

  return Object.freeze({
    sampleCount: cases.length,
    identifiableCount: identifiable.length,
    expectedAbstentionCount: expectedAbstention.length,
    top1Accuracy: ratio(top1Hits, identifiable.length, "no identifiable identity cases"),
    top3Accuracy: ratio(top3Hits, identifiable.length, "no identifiable identity cases"),
    abstentionPrecision: ratio(trueAbstentions, predictedAbstention.length, "no predicted abstentions"),
    abstentionRecall: ratio(trueAbstentions, expectedAbstention.length, "no expected abstention cases"),
    brierScore: average(brier, "no confidence-bearing predictions"),
    expectedCalibrationError,
    highConfidenceWrongRate: ratio(highConfidenceWrong, highConfidence.length, "no high-confidence predictions"),
    perCategoryTop1: Object.freeze(perCategory),
  });
}

export type MediaQualityChallenge = Readonly<{
  caseId: string;
  condition: "BLUR" | "DARKNESS" | "OVEREXPOSURE" | "SEVERE_CROP" | "MOTION" | "TINY_FOOD_REGION" | "OCCLUSION" | "BAD_ANGLE" | "MULTIPLE_FOODS";
  expectedMinimumAction: "WARN" | "CLARIFY" | "ABSTAIN_OR_RETAKE";
  primaryGate: "PIXEL_QUALITY" | "SEGMENTATION" | "IDENTITY_PREPARATION" | "PORTION_EVIDENCE";
}>;

export const MEDIA_QUALITY_CHALLENGES: readonly MediaQualityChallenge[] = Object.freeze([
  { caseId: "media-blur", condition: "BLUR", expectedMinimumAction: "ABSTAIN_OR_RETAKE", primaryGate: "PIXEL_QUALITY" },
  { caseId: "media-dark", condition: "DARKNESS", expectedMinimumAction: "WARN", primaryGate: "PIXEL_QUALITY" },
  { caseId: "media-overexposed", condition: "OVEREXPOSURE", expectedMinimumAction: "WARN", primaryGate: "PIXEL_QUALITY" },
  { caseId: "media-severe-crop", condition: "SEVERE_CROP", expectedMinimumAction: "CLARIFY", primaryGate: "IDENTITY_PREPARATION" },
  { caseId: "media-motion", condition: "MOTION", expectedMinimumAction: "ABSTAIN_OR_RETAKE", primaryGate: "PIXEL_QUALITY" },
  { caseId: "media-tiny-region", condition: "TINY_FOOD_REGION", expectedMinimumAction: "CLARIFY", primaryGate: "SEGMENTATION" },
  { caseId: "media-occlusion", condition: "OCCLUSION", expectedMinimumAction: "CLARIFY", primaryGate: "IDENTITY_PREPARATION" },
  { caseId: "media-bad-angle", condition: "BAD_ANGLE", expectedMinimumAction: "CLARIFY", primaryGate: "PORTION_EVIDENCE" },
  { caseId: "media-multiple-foods", condition: "MULTIPLE_FOODS", expectedMinimumAction: "CLARIFY", primaryGate: "SEGMENTATION" },
]);

export type WeighedFoodGroundTruth = Readonly<{
  sampleId: string;
  massG: number;
  energyKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}>;
export type CalibrationPredictionState = "COMPLETE" | "ABSTAINED" | "PENDING_LIVE_ALGORITHM_RUN" | "FAILED";
export type CalibrationInterval = Readonly<{ minimum: number; central: number; maximum: number }>;
export type WeighedFoodPrediction = Readonly<{
  sampleId: string;
  state: CalibrationPredictionState;
  massG: CalibrationInterval | null;
  energyKcal: CalibrationInterval | null;
  proteinG: CalibrationInterval | null;
  carbG: CalibrationInterval | null;
  fatG: CalibrationInterval | null;
  algorithmVersion: string | null;
  modelVersion: string | null;
}>;
export type WeighedCalibrationReport = Readonly<{
  status: "EXECUTED" | "PARTIAL" | "NOT_EXECUTED";
  groundTruthCount: number;
  predictionCount: number;
  completedCount: number;
  abstainedCount: number;
  failedCount: number;
  pendingCount: number;
  portionMaeG: MetricResult;
  portionMape: MetricResult;
  calorieMaeKcal: MetricResult;
  calorieMape: MetricResult;
  proteinMaeG: MetricResult;
  proteinMape: MetricResult;
  massIntervalCoverage: MetricResult;
  calorieIntervalCoverage: MetricResult;
  proteinIntervalCoverage: MetricResult;
}>;

function validateInterval(interval: CalibrationInterval | null, field: string): void {
  if (interval === null) return;
  if (![interval.minimum, interval.central, interval.maximum].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error(`food_calibration_invalid_interval:${field}`);
  }
  if (interval.minimum > interval.central || interval.central > interval.maximum) throw new Error(`food_calibration_unordered_interval:${field}`);
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("food_calibration_invalid_numeric_value");
  return parsed;
}

function intervalFromColumns(minimum: string, central: string, maximum: string, field: string): CalibrationInterval | null {
  const values = [parseNumber(minimum), parseNumber(central), parseNumber(maximum)];
  if (values.every((value) => value === null)) return null;
  if (values.some((value) => value === null)) throw new Error(`food_calibration_partial_interval:${field}`);
  const interval: CalibrationInterval = { minimum: values[0]!, central: values[1]!, maximum: values[2]! };
  validateInterval(interval, field);
  return interval;
}

/** Rejects partial intervals instead of converting missing values to zero. */
export function parseWeighedPredictionCsv(csv: string): readonly WeighedFoodPrediction[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return Object.freeze([]);
  const headers = lines[0]!.split(",");
  const required = [
    "sample_id", "predicted_min_g", "predicted_central_g", "predicted_max_g",
    "predicted_min_kcal", "predicted_central_kcal", "predicted_max_kcal",
    "predicted_min_protein_g", "predicted_central_protein_g", "predicted_max_protein_g",
    "predicted_min_carb_g", "predicted_central_carb_g", "predicted_max_carb_g",
    "predicted_min_fat_g", "predicted_central_fat_g", "predicted_max_fat_g",
    "prediction_state", "algorithm_version", "model_version",
  ];
  for (const name of required) if (!headers.includes(name)) throw new Error(`food_calibration_missing_column:${name}`);
  const index = Object.fromEntries(headers.map((name, position) => [name, position])) as Record<string, number>;
  const get = (columns: string[], name: string): string => columns[index[name]!] ?? "";
  const states = new Set<CalibrationPredictionState>(["COMPLETE", "ABSTAINED", "PENDING_LIVE_ALGORITHM_RUN", "FAILED"]);
  return Object.freeze(lines.slice(1).map((line) => {
    const columns = line.split(",");
    const sampleId = get(columns, "sample_id").trim();
    if (!sampleId) throw new Error("food_calibration_sample_id_required");
    const state = get(columns, "prediction_state").trim() as CalibrationPredictionState;
    if (!states.has(state)) throw new Error(`food_calibration_invalid_state:${state}`);
    const prediction: WeighedFoodPrediction = {
      sampleId,
      state,
      massG: intervalFromColumns(get(columns, "predicted_min_g"), get(columns, "predicted_central_g"), get(columns, "predicted_max_g"), "massG"),
      energyKcal: intervalFromColumns(get(columns, "predicted_min_kcal"), get(columns, "predicted_central_kcal"), get(columns, "predicted_max_kcal"), "energyKcal"),
      proteinG: intervalFromColumns(get(columns, "predicted_min_protein_g"), get(columns, "predicted_central_protein_g"), get(columns, "predicted_max_protein_g"), "proteinG"),
      carbG: intervalFromColumns(get(columns, "predicted_min_carb_g"), get(columns, "predicted_central_carb_g"), get(columns, "predicted_max_carb_g"), "carbG"),
      fatG: intervalFromColumns(get(columns, "predicted_min_fat_g"), get(columns, "predicted_central_fat_g"), get(columns, "predicted_max_fat_g"), "fatG"),
      algorithmVersion: get(columns, "algorithm_version").trim() || null,
      modelVersion: get(columns, "model_version").trim() || null,
    };
    if (state === "COMPLETE" && (!prediction.massG || !prediction.energyKcal || !prediction.proteinG)) {
      throw new Error(`food_calibration_complete_prediction_missing_core_interval:${sampleId}`);
    }
    return Object.freeze(prediction);
  }));
}

const unavailableMetric = (reason: string): MetricResult => ({ measurable: false, reason });

export function evaluateWeighedFoodCalibration(
  groundTruth: readonly WeighedFoodGroundTruth[],
  predictions: readonly WeighedFoodPrediction[],
): WeighedCalibrationReport {
  const truth = new Map<string, WeighedFoodGroundTruth>();
  for (const row of groundTruth) {
    if (!row.sampleId.trim()) throw new Error("food_calibration_ground_truth_id_required");
    if (truth.has(row.sampleId)) throw new Error(`food_calibration_duplicate_ground_truth:${row.sampleId}`);
    for (const value of [row.massG, row.energyKcal, row.proteinG, row.carbG, row.fatG]) {
      if (!Number.isFinite(value) || value < 0) throw new Error(`food_calibration_invalid_ground_truth:${row.sampleId}`);
    }
    truth.set(row.sampleId, row);
  }

  const seen = new Set<string>();
  for (const row of predictions) {
    if (seen.has(row.sampleId)) throw new Error(`food_calibration_duplicate_prediction:${row.sampleId}`);
    seen.add(row.sampleId);
    validateInterval(row.massG, "massG");
    validateInterval(row.energyKcal, "energyKcal");
    validateInterval(row.proteinG, "proteinG");
    validateInterval(row.carbG, "carbG");
    validateInterval(row.fatG, "fatG");
  }

  const completed = predictions.filter((row) => row.state === "COMPLETE" && truth.has(row.sampleId));
  const pending = predictions.filter((row) => row.state === "PENDING_LIVE_ALGORITHM_RUN").length;
  const abstained = predictions.filter((row) => row.state === "ABSTAINED").length;
  const failed = predictions.filter((row) => row.state === "FAILED").length;
  const status: WeighedCalibrationReport["status"] = completed.length === 0
    ? "NOT_EXECUTED"
    : completed.length === truth.size && pending === 0 && failed === 0 ? "EXECUTED" : "PARTIAL";

  const paired = <K extends "massG" | "energyKcal" | "proteinG">(key: K) => completed.flatMap((prediction) => {
    const actual = truth.get(prediction.sampleId)!;
    const interval = prediction[key];
    return interval ? [{ predicted: interval.central, interval, actual: actual[key] }] : [];
  });
  const mass = paired("massG");
  const energy = paired("energyKcal");
  const protein = paired("proteinG");
  const absent = "no completed weighed predictions";

  return Object.freeze({
    status,
    groundTruthCount: groundTruth.length,
    predictionCount: predictions.length,
    completedCount: completed.length,
    abstainedCount: abstained,
    failedCount: failed,
    pendingCount: pending,
    portionMaeG: mass.length ? meanAbsoluteError(mass.map((row) => row.predicted), mass.map((row) => row.actual)) : unavailableMetric(absent),
    portionMape: mass.length ? meanAbsolutePercentageError(mass.map((row) => row.predicted), mass.map((row) => row.actual)) : unavailableMetric(absent),
    calorieMaeKcal: energy.length ? meanAbsoluteError(energy.map((row) => row.predicted), energy.map((row) => row.actual)) : unavailableMetric(absent),
    calorieMape: energy.length ? meanAbsolutePercentageError(energy.map((row) => row.predicted), energy.map((row) => row.actual)) : unavailableMetric(absent),
    proteinMaeG: protein.length ? meanAbsoluteError(protein.map((row) => row.predicted), protein.map((row) => row.actual)) : unavailableMetric(absent),
    proteinMape: protein.length ? meanAbsolutePercentageError(protein.map((row) => row.predicted), protein.map((row) => row.actual)) : unavailableMetric(absent),
    massIntervalCoverage: mass.length ? intervalCoverage(mass.map((row) => ({ minimum: row.interval.minimum, maximum: row.interval.maximum })), mass.map((row) => row.actual)) : unavailableMetric(absent),
    calorieIntervalCoverage: energy.length ? intervalCoverage(energy.map((row) => ({ minimum: row.interval.minimum, maximum: row.interval.maximum })), energy.map((row) => row.actual)) : unavailableMetric(absent),
    proteinIntervalCoverage: protein.length ? intervalCoverage(protein.map((row) => ({ minimum: row.interval.minimum, maximum: row.interval.maximum })), protein.map((row) => row.actual)) : unavailableMetric(absent),
  });
}
