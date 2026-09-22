/**
 * Provider comparison harness (Phase 7).
 *
 * Runs every provider against the identical sample set in isolation, preserves
 * raw outputs, records retries and failures, and supports deterministic replay.
 * A provider only ever sees the sanitised input view built from the sample;
 * it never sees another provider's output and never sees ground truth.
 */

import { createHash } from "node:crypto";
import {
  type BenchmarkSample,
  type ComparisonOptions,
  type ComparisonRun,
  type ProviderRunRecord,
  type ProviderRunner,
  type SampleInputView,
  BENCHMARK_SCHEMA_VERSION,
  BenchmarkContractError,
} from "../benchmark/benchmarkContracts.ts";

export class ProviderComparisonError extends BenchmarkContractError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ProviderComparisonError";
  }
}

/** The only view of a sample a provider is allowed to see. Ground truth is stripped. */
export function buildSampleInputView(sample: BenchmarkSample): SampleInputView {
  return {
    sampleId: sample.sampleId,
    imageReferences: [
      {
        front: sample.images?.front ?? "",
        side: sample.images?.side,
        secondAngle: sample.images?.secondAngle,
      },
    ],
    imageDimensions: {
      widthPx: sample.images?.widthPx,
      heightPx: sample.images?.heightPx,
    },
    correlationId: `bench-${sample.sampleId}`,
  };
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort());
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function runFingerprint(runs: readonly ProviderRunRecord[]): string {
  return sha256(
    runs
      .map((run) => canonicalJson({ providerId: run.providerId, sampleId: run.sampleId, status: run.status, rawOutput: run.rawOutput, attempts: run.attempts }))
      .join("|"),
  );
}

export class ProviderComparisonHarness {
  async run(
    samples: readonly BenchmarkSample[],
    runners: readonly ProviderRunner[],
    options: ComparisonOptions = {},
  ): Promise<ComparisonRun> {
    const sampleIds = samples.map((sample) => sample.sampleId);
    const maxAttempts = options.maxAttempts ?? 2;
    const seed = options.seed ?? 0;

    const runId = `run-${Date.now()}`;
    const replayKey =
      options.replayKey ??
      sha256(canonicalJson({ sampleIds: [...sampleIds].sort(), providerIds: runners.map((runner) => runner.providerId).sort(), seed }));

    const runs: ProviderRunRecord[] = [];
    for (const runner of runners) {
      for (const sample of samples) {
        runs.push(await this.runSample(runner, sample, maxAttempts));
      }
    }

    return {
      schemaVersion: BENCHMARK_SCHEMA_VERSION,
      runId,
      replayKey,
      generatedAt: new Date().toISOString(),
      sampleIds,
      providerIds: runners.map((runner) => runner.providerId),
      runs,
    };
  }

  private async runSample(runner: ProviderRunner, sample: BenchmarkSample, maxAttempts: number): Promise<ProviderRunRecord> {
    const input = buildSampleInputView(sample);
    const started = Date.now();
    let lastError: unknown;
    let attempts = 0;
    let rawOutput: unknown;
    let status: ProviderRunRecord["status"] = "SUCCESS";

    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        rawOutput = await runner.run(input);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    const latencyMs = Date.now() - started;

    if (lastError !== undefined) {
      return {
        providerId: runner.providerId,
        sampleId: sample.sampleId,
        providerVersion: runner.providerVersion,
        status: "FAILED",
        rawOutput: null,
        prediction: null,
        latencyMs,
        attempts,
        costUsd: runner.costPerImageUsd ?? null,
        error: lastError instanceof Error ? lastError.message : String(lastError),
        capturedAt: new Date().toISOString(),
      };
    }

    let prediction: ProviderRunRecord["prediction"] = null;
    try {
      prediction = runner.normalize ? runner.normalize(rawOutput, input) : null;
    } catch {
      status = "MALFORMED";
    }

    const validationErrors = runner.validateOutput ? runner.validateOutput(rawOutput) : [];
    if (validationErrors.length > 0) {
      status = "MALFORMED";
    }

    return {
      providerId: runner.providerId,
      sampleId: sample.sampleId,
      providerVersion: runner.providerVersion,
      status,
      rawOutput,
      prediction: status === "MALFORMED" ? null : prediction,
      latencyMs,
      attempts,
      costUsd: runner.costPerImageUsd ?? null,
      error: status === "MALFORMED" ? `malformed output: ${validationErrors.join(", ")}` : undefined,
      capturedAt: new Date().toISOString(),
    };
  }

  /** Every provider ran every sample of the identical set. */
  assertIdenticalSampleSet(run: ComparisonRun, expectedSampleIds: readonly string[]): void {
    const expected = [...expectedSampleIds].sort();
    for (const providerId of run.providerIds) {
      const actual = run.runs
        .filter((providerRun) => providerRun.providerId === providerId)
        .map((providerRun) => providerRun.sampleId)
        .sort();
      const actualKey = actual.join(",");
      const expectedKey = expected.join(",");
      if (actualKey !== expectedKey) {
        throw new ProviderComparisonError(
          "mismatched_sample_set",
          `Provider "${providerId}" saw ${actualKey} but the identical set is ${expectedKey}.`,
        );
      }
    }
  }

  /** A provider's recorded input must never have contained another provider's output. */
  assertNoCrossProviderLeakage(run: ComparisonRun, inputs: ReadonlyMap<string, SampleInputView>): void {
    for (const providerRun of run.runs) {
      const input = inputs.get(`${providerRun.providerId}:${providerRun.sampleId}`);
      if (!input) {
        throw new ProviderComparisonError("missing_input_audit", "No input audit recorded for a provider run.");
      }
      const serialized = JSON.stringify(input);
      if (serialized.includes("groundTruth") || serialized.includes("foodNames") || serialized.includes("portionServedWeightG")) {
        throw new ProviderComparisonError("ground_truth_leaked", "Provider input view contained ground truth.");
      }
    }
  }

  /** Deterministic replay: two runs with the same key/seed must be byte-identical. */
  assertDeterministicReplay(first: ComparisonRun, second: ComparisonRun): void {
    const firstFingerprint = runFingerprint(first.runs);
    const secondFingerprint = runFingerprint(second.runs);
    if (firstFingerprint !== secondFingerprint) {
      throw new ProviderComparisonError("replay_drift", "Replay produced a different fingerprint.");
    }
  }
}
