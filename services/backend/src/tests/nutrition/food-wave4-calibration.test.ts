import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FOOD_IDENTITY_COVERAGE_CASES,
  MEDIA_QUALITY_CHALLENGES,
  evaluateIdentityCalibration,
  evaluateWeighedFoodCalibration,
  parseWeighedPredictionCsv,
  type FoodIdentityEvaluationCase,
  type WeighedFoodGroundTruth,
  type WeighedFoodPrediction,
} from "../../nutrition/benchmark/foodAccuracyCalibration.ts";
import {
  authorityClassOf,
  reliabilityTierOf,
} from "../../nutrition/portion/portionEvidence.ts";
import {
  assertTrustedNutritionSnapshot,
  isTrustedNutrientSource,
} from "../../meal/canonical-food.ts";

const groundTruthFile = new URL("../../../../../research/nutrition-research/benchmark/v4/nutrition5k-ground-truth-15pct.json", import.meta.url);
const predictionTemplate = new URL("../../../../../research/nutrition-research/benchmark/v4/calorie-predictions.template.csv", import.meta.url);

type GroundTruthFile = {
  sample_count: number;
  samples: Array<{
    sample_id: string;
    actual_calories_kcal: number;
    actual_protein_g: number;
    actual_carb_g: number;
    actual_fat_g: number;
    actual_mass_g: number;
  }>;
};

function measuredGroundTruth(): WeighedFoodGroundTruth[] {
  const parsed = JSON.parse(readFileSync(groundTruthFile, "utf8")) as GroundTruthFile;
  assert.equal(parsed.sample_count, 10);
  return parsed.samples.map((sample) => ({
    sampleId: sample.sample_id,
    massG: sample.actual_mass_g,
    energyKcal: sample.actual_calories_kcal,
    proteinG: sample.actual_protein_g,
    carbG: sample.actual_carb_g,
    fatG: sample.actual_fat_g,
  }));
}

const value = (metric: { measurable: boolean; value?: number }): number => {
  assert.equal(metric.measurable, true);
  return metric.value!;
};

test("Wave-4 identity coverage catalogue spans 48 regional and ambiguity cases without claiming model execution", () => {
  assert.equal(FOOD_IDENTITY_COVERAGE_CASES.length, 48);
  assert.equal(new Set(FOOD_IDENTITY_COVERAGE_CASES.map((entry) => entry.caseId)).size, 48);
  const counts = new Map<string, number>();
  for (const entry of FOOD_IDENTITY_COVERAGE_CASES) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries(counts), {
    NEPALI: 8,
    INDIAN: 8,
    WESTERN: 8,
    MIXED_DISH: 6,
    SAUCE: 4,
    SOUP: 4,
    PACKAGED: 4,
    VISUAL_NEAR_NEIGHBOR: 3,
    PREPARATION_VARIANT: 3,
  });
  assert.equal(FOOD_IDENTITY_COVERAGE_CASES.filter((entry) => entry.expectedDecision === "ABSTAIN_OR_CLARIFY").length, 6);
});

test("identity calibration measures top-k, confidence calibration and safe abstention separately", () => {
  const cases: FoodIdentityEvaluationCase[] = [
    { caseId: "n1", category: "NEPALI", acceptableNames: ["dal bhat"], candidates: [{ name: "dal bhat", confidence: 0.9 }], shouldAbstain: false, abstained: false },
    { caseId: "n2", category: "NEPALI", acceptableNames: ["momo"], candidates: [{ name: "dumpling", confidence: 0.7 }, { name: "momo", confidence: 0.2 }], shouldAbstain: false, abstained: false },
    { caseId: "i1", category: "INDIAN", acceptableNames: ["idli"], candidates: [{ name: "dosa", confidence: 0.85 }, { name: "idli", confidence: 0.1 }], shouldAbstain: false, abstained: false },
    { caseId: "w1", category: "WESTERN", acceptableNames: ["pizza"], candidates: [], shouldAbstain: false, abstained: true },
    { caseId: "a1", category: "VISUAL_NEAR_NEIGHBOR", acceptableNames: ["dal", "sambar"], candidates: [], shouldAbstain: true, abstained: true },
    { caseId: "a2", category: "PREPARATION_VARIANT", acceptableNames: ["egg"], candidates: [{ name: "fried egg", confidence: 0.93 }], shouldAbstain: true, abstained: false },
  ];

  const report = evaluateIdentityCalibration(cases);
  assert.equal(report.sampleCount, 6);
  assert.equal(report.identifiableCount, 4);
  assert.equal(report.expectedAbstentionCount, 2);
  assert.equal(value(report.top1Accuracy), 0.25);
  assert.equal(value(report.top3Accuracy), 0.75);
  assert.equal(value(report.abstentionPrecision), 0.5);
  assert.equal(value(report.abstentionRecall), 0.5);
  assert.ok(value(report.brierScore) > 0);
  assert.ok(value(report.expectedCalibrationError) >= 0);
  assert.equal(value(report.highConfidenceWrongRate), 0.5);
});

test("all requested bad-media challenges demand warning, clarification or abstention rather than fake precision", () => {
  assert.equal(MEDIA_QUALITY_CHALLENGES.length, 9);
  assert.deepEqual(new Set(MEDIA_QUALITY_CHALLENGES.map((entry) => entry.condition)), new Set([
    "BLUR", "DARKNESS", "OVEREXPOSURE", "SEVERE_CROP", "MOTION", "TINY_FOOD_REGION", "OCCLUSION", "BAD_ANGLE", "MULTIPLE_FOODS",
  ]));
  assert.equal(MEDIA_QUALITY_CHALLENGES.some((entry) => !["WARN", "CLARIFY", "ABSTAIN_OR_RETAKE"].includes(entry.expectedMinimumAction)), false);
});

test("portion evidence hierarchy keeps declared/physical evidence ahead of weak visual or behavioral priors", () => {
  assert.equal(reliabilityTierOf("MANUAL_GRAMS"), 1);
  assert.equal(reliabilityTierOf("PACKAGE_LABEL"), 1);
  assert.equal(reliabilityTierOf("BARCODE_SERVING"), 2);
  assert.equal(reliabilityTierOf("PIECE_COUNT"), 2);
  assert.equal(reliabilityTierOf("CONTAINER_FILL_VOLUME"), 3);
  assert.equal(reliabilityTierOf("PREVIOUS_CONFIRMED_PORTION"), 5);
  assert.equal(reliabilityTierOf("VISUAL_MODEL_PORTION_PRIOR"), 5);
  assert.ok(reliabilityTierOf("MANUAL_GRAMS") < reliabilityTierOf("VISUAL_MODEL_PORTION_PRIOR"));
  assert.ok(reliabilityTierOf("PACKAGE_LABEL") < reliabilityTierOf("VISUAL_MODEL_PORTION_PRIOR"));
  assert.ok(reliabilityTierOf("BARCODE_SERVING") < reliabilityTierOf("VISUAL_MODEL_PORTION_PRIOR"));
  assert.equal(authorityClassOf("MANUAL_GRAMS"), "DIRECT");
  assert.equal(authorityClassOf("PACKAGE_LABEL"), "DECLARED");
  assert.equal(authorityClassOf("CALIBRATED_VOLUME"), "CALIBRATED_PHYSICAL");
  assert.equal(authorityClassOf("PREVIOUS_CONFIRMED_PORTION"), "BEHAVIORAL_PRIOR");
  assert.equal(authorityClassOf("VISUAL_MODEL_PORTION_PRIOR"), "VISUAL_PRIOR");
});

test("AI identity/provider markers cannot silently become canonical numeric nutrient authority", () => {
  for (const source of ["AI", "GEMINI", "VISION", "MODEL_PREDICTION", "LLM", "gemini-vision"]) {
    assert.equal(isTrustedNutrientSource(source), false, source);
  }
  assert.equal(isTrustedNutrientSource("USDA_FDC"), true);
  assert.equal(isTrustedNutrientSource("MOVEFUEL_RECIPE"), true);
  assert.throws(() => assertTrustedNutritionSnapshot({
    schemaVersion: 1,
    snapshotId: "snapshot-ai",
    sourceType: "GEMINI",
    sourceReference: "provider-output",
    sourceRevision: null,
    portionGrams: 100,
    nutrients: { energyKcal: 123, proteinGrams: 7, carbGrams: 10, fatGrams: 4, fiberGrams: null },
    dataQuality: "HIGH",
    limitations: [],
    createdAt: "2026-09-01T00:00:00.000Z",
  }), /not permitted|untrusted/i);
});

test("repository weighed ground truth imports as ten real measured samples while pending template remains NOT_EXECUTED", () => {
  const truth = measuredGroundTruth();
  const predictions = parseWeighedPredictionCsv(readFileSync(predictionTemplate, "utf8"));
  assert.equal(truth.length, 10);
  assert.equal(predictions.length, 10);
  assert.equal(predictions.every((row) => row.state === "PENDING_LIVE_ALGORITHM_RUN"), true);
  const report = evaluateWeighedFoodCalibration(truth, predictions);
  assert.equal(report.status, "NOT_EXECUTED");
  assert.equal(report.groundTruthCount, 10);
  assert.equal(report.completedCount, 0);
  assert.equal(report.pendingCount, 10);
  assert.equal(report.portionMaeG.measurable, false);
  assert.equal(report.calorieMaeKcal.measurable, false);
  assert.equal(report.proteinMaeG.measurable, false);
});

test("calibration evaluator reports exact-zero error for an oracle fixture without conflating it with live execution", () => {
  const truth = measuredGroundTruth();
  const predictions: WeighedFoodPrediction[] = truth.map((row) => ({
    sampleId: row.sampleId,
    state: "COMPLETE",
    massG: { minimum: row.massG, central: row.massG, maximum: row.massG },
    energyKcal: { minimum: row.energyKcal, central: row.energyKcal, maximum: row.energyKcal },
    proteinG: { minimum: row.proteinG, central: row.proteinG, maximum: row.proteinG },
    carbG: { minimum: row.carbG, central: row.carbG, maximum: row.carbG },
    fatG: { minimum: row.fatG, central: row.fatG, maximum: row.fatG },
    algorithmVersion: "TEST_ORACLE_ONLY",
    modelVersion: "TEST_ORACLE_ONLY",
  }));
  const report = evaluateWeighedFoodCalibration(truth, predictions);
  assert.equal(report.status, "EXECUTED");
  assert.equal(value(report.portionMaeG), 0);
  assert.equal(value(report.calorieMaeKcal), 0);
  assert.equal(value(report.proteinMaeG), 0);
  assert.equal(value(report.massIntervalCoverage), 1);
  assert.equal(value(report.calorieIntervalCoverage), 1);
  assert.equal(value(report.proteinIntervalCoverage), 1);
});

test("calibration parser rejects partial intervals instead of converting missing values to zero", () => {
  const csv = [
    "sample_id,predicted_min_g,predicted_central_g,predicted_max_g,predicted_min_kcal,predicted_central_kcal,predicted_max_kcal,predicted_min_protein_g,predicted_central_protein_g,predicted_max_protein_g,predicted_min_carb_g,predicted_central_carb_g,predicted_max_carb_g,predicted_min_fat_g,predicted_central_fat_g,predicted_max_fat_g,prediction_state,algorithm_version,model_version",
    "sample-1,90,,110,100,120,140,5,6,7,10,12,14,3,4,5,COMPLETE,algo,model",
  ].join("\n");
  assert.throws(() => parseWeighedPredictionCsv(csv), /partial_interval:massG/);
});

test("abstained calibration rows remain abstentions and never become zero-valued completed predictions", () => {
  const truth = measuredGroundTruth().slice(0, 1);
  const predictions: WeighedFoodPrediction[] = [{
    sampleId: truth[0]!.sampleId,
    state: "ABSTAINED",
    massG: null,
    energyKcal: null,
    proteinG: null,
    carbG: null,
    fatG: null,
    algorithmVersion: "algo",
    modelVersion: "model",
  }];
  const report = evaluateWeighedFoodCalibration(truth, predictions);
  assert.equal(report.status, "NOT_EXECUTED");
  assert.equal(report.abstainedCount, 1);
  assert.equal(report.completedCount, 0);
  assert.equal(report.portionMaeG.measurable, false);
});
