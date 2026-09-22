/**
 * Benchmark evaluator (Phase 7).
 *
 * Computes per-provider, per-category metrics from a comparison run and the
 * benchmark ground truth. Metrics whose ground truth is absent are reported
 * NOT_MEASURABLE, never zero. No single winner score is produced by averaging
 * unrelated metrics; category scores and a decision matrix are produced
 * instead. The evaluator never feeds ground truth back to a provider and never
 * uses user confirmation as hidden ground truth in the same run.
 */

import {
  type BenchmarkSample,
  type BenchmarkGroundTruthRegion,
  type PipelinePrediction,
  type ProviderRunRecord,
  type ProviderRunStatus,
  BENCHMARK_SCHEMA_VERSION,
} from "./benchmarkContracts.ts";
import {
  type MetricResult,
  notMeasurable,
  metric,
  mean,
  median,
  percentile,
  matchBoxes,
  regionPrecision,
  regionRecall,
  missedFoodRate,
  duplicateRegionRate,
  iou,
  top1Accuracy,
  top3Accuracy,
  unknownFoodHandling,
  foodTypeAccuracy,
  meanAbsoluteError,
  medianAbsoluteError,
  meanAbsolutePercentageError,
  centralBias,
  intervalCoverage,
} from "./benchmarkMetrics.ts";
import { type ProviderPredictionCandidate, type ProviderPrediction } from "./benchmarkContracts.ts";
import { providerCanBeEnabled, type ProviderDescriptor } from "./benchmarkContracts.ts";

export type NutritionDimension =
  | "energyKcal"
  | "proteinG"
  | "carbG"
  | "fatG"
  | "fiberG"
  | "sodiumMg";

export type NutritionMetrics = {
  absoluteError: MetricResult;
  percentageError: MetricResult;
};

export type CategoryScore = {
  category: string;
  score: MetricResult | null;
  measurableSamples: number;
};

export type DecisionMatrixRow = {
  criterion: string;
  value: string | number;
  evidence: string;
};

export type ProviderMetrics = {
  providerId: string;
  providerName: string;
  providerVersion: string;
  adapterType: string;
  quality: {
    acceptRejectCorrectness: MetricResult;
    retakeRequiredCorrectness: MetricResult;
  };
  segmentation: {
    regionPrecision: MetricResult;
    regionRecall: MetricResult;
    meanIoU: MetricResult;
    missedFoodRate: MetricResult;
    duplicateRegionRate: MetricResult;
  };
  identity: {
    top1: MetricResult;
    top3: MetricResult;
    unknownFoodHandling: MetricResult;
    foodTypeAccuracy: MetricResult;
  };
  sourceResolution: {
    correctSourceRate: MetricResult;
    unresolvedSourceRate: MetricResult;
    incorrectSourceRate: MetricResult;
  };
  portion: {
    gramMae: MetricResult;
    gramMedianAbsoluteError: MetricResult;
    gramMape: MetricResult;
    intervalCoverage: MetricResult;
    centralBias: MetricResult;
    pieceCountError: MetricResult;
  };
  nutrition: Record<NutritionDimension, NutritionMetrics>;
  interaction: {
    clarificationQuestionCount: MetricResult;
    unnecessaryQuestionRate: MetricResult;
    correctionRate: MetricResult;
    manualEntryFallbackRate: MetricResult;
  };
  operational: {
    schemaValidOutputRate: MetricResult;
    malformedResponseRate: MetricResult;
    providerFailureRate: MetricResult;
    latencyMedianMs: MetricResult;
    latencyP95Ms: MetricResult;
    costPerImageUsd: MetricResult;
    costPerConfirmedMealUsd: MetricResult;
  };
  categoryScores: readonly CategoryScore[];
  decisionMatrix: readonly DecisionMatrixRow[];
};

export type BenchmarkResult = {
  schemaVersion: number;
  runId: string;
  generatedAt: string;
  sampleIds: readonly string[];
  excludedSampleIds: readonly string[];
  providerMetrics: readonly ProviderMetrics[];
  comparison: {
    sameSampleSetForAllProviders: boolean;
    noCrossProviderLeakage: boolean;
    replayKey: string;
    metricsVersion: number;
  };
};

export type EvaluatorOptions = {
  runId?: string;
  replayKey?: string;
  minIoU?: number;
  confirmedMealCount?: number;
};

const NUTRITION_DIMENSIONS: readonly NutritionDimension[] = ["energyKcal", "proteinG", "carbG", "fatG", "fiberG", "sodiumMg"];

function aggregate(sampleMetrics: readonly MetricResult[]): MetricResult {
  const measurable = sampleMetrics.filter((entry): entry is Extract<MetricResult, { measurable: true }> => entry.measurable);
  if (measurable.length === 0) return notMeasurable("no samples with required ground truth");
  return metric(mean(measurable.map((entry) => entry.value)));
}

function isExcluded(sample: BenchmarkSample): boolean {
  return sample.reviewStatus === "EXCLUDED" || sample.privacyConsent !== "CONSENTED";
}

const isCandidate = (value: unknown): value is ProviderPredictionCandidate =>
  typeof value === "object" && value !== null && typeof (value as { name?: unknown }).name === "string";

export class BenchmarkEvaluator {
  evaluate(
    samples: readonly BenchmarkSample[],
    runs: readonly ProviderRunRecord[],
    pipelinePredictions: readonly PipelinePrediction[],
    descriptors: readonly ProviderDescriptor[],
    options: EvaluatorOptions = {},
  ): BenchmarkResult {
    const minIoU = options.minIoU ?? 0.5;
    const runId = options.runId ?? "bench-run";
    const sampleIds = samples.map((sample) => sample.sampleId);
    const excludedSampleIds = samples.filter(isExcluded).map((sample) => sample.sampleId);
    const included = samples.filter((sample) => !isExcluded(sample));

    const descriptorById = new Map(descriptors.map((descriptor) => [descriptor.providerId, descriptor]));
    const providerIds = [...new Set(runs.map((run) => run.providerId))];
    const predictionBySample = new Map(pipelinePredictions.map((prediction) => [prediction.sampleId, prediction]));

    const providerMetrics = providerIds.map((providerId) => {
      const providerRuns = runs.filter((run) => run.providerId === providerId);
      const descriptor = descriptorById.get(providerId);
      return this.evaluateProvider(
        providerId,
        descriptor,
        providerRuns,
        included,
        predictionBySample,
        minIoU,
        options.confirmedMealCount,
      );
    });

    const sampleSetByIdentity = new Set(providerIds.map((providerId) => {
      const providerSampleIds = runs.filter((run) => run.providerId === providerId).map((run) => run.sampleId).sort();
      return `${providerId}:${providerSampleIds.join(",")}`;
    }));

    return {
      schemaVersion: BENCHMARK_SCHEMA_VERSION,
      runId,
      generatedAt: new Date().toISOString(),
      sampleIds,
      excludedSampleIds,
      providerMetrics,
      comparison: {
        sameSampleSetForAllProviders: sampleSetByIdentity.size <= 1,
        noCrossProviderLeakage: true,
        replayKey: options.replayKey ?? "",
        metricsVersion: 1,
      },
    };
  }

  private evaluateProvider(
    providerId: string,
    descriptor: ProviderDescriptor | undefined,
    runs: readonly ProviderRunRecord[],
    included: readonly BenchmarkSample[],
    predictionBySample: ReadonlyMap<string, PipelinePrediction>,
    minIoU: number,
    confirmedMealCount: number | undefined,
  ): ProviderMetrics {
    const statusCounts = new Map<ProviderRunStatus, number>();
    for (const run of runs) statusCounts.set(run.status, (statusCounts.get(run.status) ?? 0) + 1);
    const totalRuns = runs.length;
    const failedRuns = statusCounts.get("FAILED") ?? 0;
    const malformedRuns = statusCounts.get("MALFORMED") ?? 0;

    const successfulRuns = runs.filter((run) => run.status === "SUCCESS");
    const latencies = successfulRuns.map((run) => run.latencyMs);
    const costs = runs.filter((run) => run.costUsd !== null && run.costUsd !== undefined).map((run) => run.costUsd as number);

    // Identity / segmentation / source metrics are computed per included sample.
    const sampleById = new Map(included.map((sample) => [sample.sampleId, sample]));
    const runBySample = new Map(runs.map((run) => [run.sampleId, run]));

    const top1Values: MetricResult[] = [];
    const top3Values: MetricResult[] = [];
    const unknownValues: MetricResult[] = [];
    const foodTypeValues: MetricResult[] = [];
    const precisionValues: MetricResult[] = [];
    const recallValues: MetricResult[] = [];
    const missedValues: MetricResult[] = [];
    const duplicateValues: MetricResult[] = [];
    const iouValues: MetricResult[] = [];
    const sourceCorrectValues: MetricResult[] = [];
    const sourceUnresolvedValues: MetricResult[] = [];
    const sourceIncorrectValues: MetricResult[] = [];

    for (const sample of included) {
      const run = runBySample.get(sample.sampleId);
      const prediction = run?.prediction ?? null;
      const candidates = (prediction?.candidates ?? []).filter(isCandidate);
      const groundTruthIdentity = {
        foodNames: sample.foodNames,
        foodType: sample.foodType,
      };

      top1Values.push(top1Accuracy(candidates, groundTruthIdentity));
      top3Values.push(top3Accuracy(candidates, groundTruthIdentity));
      const unknownReported = prediction?.unknownFood === true || candidates.length === 0;
      unknownValues.push(unknownFoodHandling(candidates, unknownReported, groundTruthIdentity));
      foodTypeValues.push(foodTypeAccuracy(candidates, { foodNames: sample.foodNames, foodType: sample.foodType }));

      const gtRegions = sample.groundTruthRegions;
      const predictedBoxes = (prediction?.regions ?? []).map((region) => region.bbox);
      if (gtRegions && gtRegions.length > 0) {
        const gtBoxes = gtRegions.map((region: BenchmarkGroundTruthRegion) => region.bbox);
        precisionValues.push(regionPrecision(predictedBoxes, gtBoxes, minIoU));
        recallValues.push(regionRecall(predictedBoxes, gtBoxes, minIoU));
        missedValues.push(missedFoodRate(predictedBoxes, gtBoxes, minIoU));
        duplicateValues.push(duplicateRegionRate(predictedBoxes, gtBoxes, minIoU));
        const matches = matchBoxes(predictedBoxes, gtBoxes, minIoU);
        const pairIoUs = [...matches.entries()].map(([predIndex, gtIndex]) => iou(predictedBoxes[predIndex]!, gtBoxes[gtIndex]!));
        iouValues.push(pairIoUs.length > 0 ? metric(mean(pairIoUs)) : notMeasurable("no matched regions"));
      }

      if (sample.groundTruthSource) {
        const selected = prediction?.selectedSource ?? null;
        const correct =
          selected !== null &&
          ((sample.groundTruthSource.fdcId !== undefined && selected.fdcId === sample.groundTruthSource.fdcId) ||
            (sample.groundTruthSource.recipeId !== undefined && selected.recipeId === sample.groundTruthSource.recipeId));
        const unresolved = selected === null || selected.fdcId === undefined && selected.recipeId === undefined;
        sourceCorrectValues.push(correct ? metric(1) : metric(0));
        sourceUnresolvedValues.push(unresolved ? metric(1) : metric(0));
        sourceIncorrectValues.push(!correct && !unresolved ? metric(1) : metric(0));
      }
    }

    // Portion metrics from paired pipeline predictions with ground truth.
    const gramPairsPredicted: number[] = [];
    const gramPairsGroundTruth: number[] = [];
    const intervalPairs: { minimum: number; maximum: number }[] = [];
    const intervalGroundTruth: number[] = [];
    const pieceErrors: number[] = [];
    for (const sample of included) {
      const prediction = predictionBySample.get(sample.sampleId);
      const gtGrams = sample.portionServedWeightG;
      if (gtGrams === undefined || prediction?.portionInterval?.minimumGrams === undefined || prediction?.portionInterval?.maximumGrams === undefined) {
        continue;
      }
      const central = (prediction.portionInterval.minimumGrams + prediction.portionInterval.maximumGrams) / 2;
      gramPairsPredicted.push(central);
      gramPairsGroundTruth.push(gtGrams);
      intervalPairs.push({ minimum: prediction.portionInterval.minimumGrams, maximum: prediction.portionInterval.maximumGrams });
      intervalGroundTruth.push(gtGrams);
    }

    // Nutrition metrics: computed only from pipeline predictions with ground truth.
    const nutrition: Record<NutritionDimension, NutritionMetrics> = {} as Record<NutritionDimension, NutritionMetrics>;
    for (const dimension of NUTRITION_DIMENSIONS) {
      const predicted: number[] = [];
      const groundTruth: number[] = [];
      for (const sample of included) {
        const prediction = predictionBySample.get(sample.sampleId);
        const gtValue = sample.groundTruthNutrients?.[dimension];
        const predictedValue = prediction?.nutrients?.[dimension];
        if (gtValue !== undefined && predictedValue !== undefined) {
          predicted.push(predictedValue);
          groundTruth.push(gtValue);
        }
      }
      nutrition[dimension] = {
        absoluteError: meanAbsoluteError(predicted, groundTruth),
        percentageError: meanAbsolutePercentageError(predicted, groundTruth),
      };
    }

    // Interaction metrics from pipeline predictions.
    const questionCounts: number[] = [];
    const corrections: number[] = [];
    const manualFallbacks: number[] = [];
    for (const sample of included) {
      const prediction = predictionBySample.get(sample.sampleId);
      if (prediction?.clarificationQuestionCount !== undefined) questionCounts.push(prediction.clarificationQuestionCount);
      if (prediction?.correctionApplied !== undefined) corrections.push(prediction.correctionApplied ? 1 : 0);
      if (prediction?.manualEntryFallback !== undefined) manualFallbacks.push(prediction.manualEntryFallback ? 1 : 0);
    }

    const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
    const categoryScores: CategoryScore[] = [
      { category: "quality", score: null, measurableSamples: 0 },
      { category: "segmentation", score: aggregate([...precisionValues, ...recallValues]), measurableSamples: precisionValues.length },
      { category: "identity", score: aggregate(top1Values), measurableSamples: top1Values.length },
      { category: "source_resolution", score: aggregate(sourceCorrectValues), measurableSamples: sourceCorrectValues.length },
      { category: "portion", score: aggregate(gramPairsPredicted.map((value, index) => metric(Math.abs(value - gramPairsGroundTruth[index]!)))), measurableSamples: gramPairsPredicted.length },
      { category: "nutrition", score: aggregate(Object.values(nutrition).map((entry) => entry.percentageError)), measurableSamples: 0 },
      { category: "interaction", score: questionCounts.length > 0 ? metric(mean(questionCounts)) : notMeasurable("no clarification data"), measurableSamples: questionCounts.length },
      { category: "operational", score: totalRuns > 0 ? metric((totalRuns - failedRuns - malformedRuns) / totalRuns) : notMeasurable("no runs"), measurableSamples: totalRuns },
    ];

    const decisionMatrix: DecisionMatrixRow[] = [
      { criterion: "adapter_type", value: descriptor?.adapterType ?? "UNKNOWN", evidence: "registry descriptor" },
      { criterion: "deployment_type", value: descriptor?.deploymentType ?? "UNKNOWN", evidence: "registry descriptor" },
      { criterion: "licence_status", value: descriptor?.licenceStatus ?? "UNKNOWN", evidence: "registry descriptor" },
      { criterion: "enabled", value: descriptor ? (providerCanBeEnabled(descriptor) && descriptor.enabled ? "yes" : "no") : "unknown", evidence: "registry gate" },
      { criterion: "evidence_status", value: descriptor?.evidenceStatus ?? "UNKNOWN", evidence: "registry descriptor" },
      { criterion: "top1_accuracy", value: aggregate(top1Values).measurable ? (aggregate(top1Values) as { value: number }).value : "NOT_MEASURABLE", evidence: "benchmark" },
    ];

    return {
      providerId,
      providerName: descriptor?.providerName ?? providerId,
      providerVersion: runs[0]?.providerVersion ?? "unknown",
      adapterType: descriptor?.adapterType ?? "UNKNOWN",
      quality: {
        acceptRejectCorrectness: notMeasurable("pixel-level quality ground truth not yet collected"),
        retakeRequiredCorrectness: notMeasurable("retake ground truth not yet collected"),
      },
      segmentation: {
        regionPrecision: aggregate(precisionValues),
        regionRecall: aggregate(recallValues),
        meanIoU: aggregate(iouValues),
        missedFoodRate: aggregate(missedValues),
        duplicateRegionRate: aggregate(duplicateValues),
      },
      identity: {
        top1: aggregate(top1Values),
        top3: aggregate(top3Values),
        unknownFoodHandling: aggregate(unknownValues),
        foodTypeAccuracy: aggregate(foodTypeValues),
      },
      sourceResolution: {
        correctSourceRate: aggregate(sourceCorrectValues),
        unresolvedSourceRate: aggregate(sourceUnresolvedValues),
        incorrectSourceRate: aggregate(sourceIncorrectValues),
      },
      portion: {
        gramMae: meanAbsoluteError(gramPairsPredicted, gramPairsGroundTruth),
        gramMedianAbsoluteError: medianAbsoluteError(gramPairsPredicted, gramPairsGroundTruth),
        gramMape: meanAbsolutePercentageError(gramPairsPredicted, gramPairsGroundTruth),
        intervalCoverage: intervalCoverage(intervalPairs, intervalGroundTruth),
        centralBias: centralBias(gramPairsPredicted, gramPairsGroundTruth),
        pieceCountError: notMeasurable("piece predictions not yet collected"),
      },
      nutrition,
      interaction: {
        clarificationQuestionCount: questionCounts.length > 0 ? metric(mean(questionCounts)) : notMeasurable("no clarification data"),
        unnecessaryQuestionRate: notMeasurable("answer-impact ground truth not yet collected"),
        correctionRate: corrections.length > 0 ? metric(mean(corrections)) : notMeasurable("no correction data"),
        manualEntryFallbackRate: manualFallbacks.length > 0 ? metric(mean(manualFallbacks)) : notMeasurable("no manual-entry data"),
      },
      operational: {
        schemaValidOutputRate: totalRuns > 0 ? metric((totalRuns - malformedRuns) / totalRuns) : notMeasurable("no runs"),
        malformedResponseRate: totalRuns > 0 ? metric(malformedRuns / totalRuns) : notMeasurable("no runs"),
        providerFailureRate: totalRuns > 0 ? metric(failedRuns / totalRuns) : notMeasurable("no runs"),
        latencyMedianMs: latencies.length > 0 ? metric(median(latencies)) : notMeasurable("no successful runs"),
        latencyP95Ms: latencies.length > 0 ? metric(percentile(latencies, 95)) : notMeasurable("no successful runs"),
        costPerImageUsd: costs.length > 0 ? metric(totalCost / costs.length) : notMeasurable("no cost data"),
        costPerConfirmedMealUsd:
          confirmedMealCount !== undefined && confirmedMealCount > 0 ? metric(totalCost / confirmedMealCount) : notMeasurable("no confirmed meal count"),
      },
      categoryScores,
      decisionMatrix,
    };
  }
}
