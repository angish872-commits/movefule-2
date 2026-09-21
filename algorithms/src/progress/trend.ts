import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export interface DatedValue {
  date: string;
  value: number;
}

export interface SmoothedTrendPoint extends DatedValue {
  sampleCount: number;
}

/**
 * Simple bounded moving average used as a deterministic trend primitive.
 * This is analytics only; it is not a diagnosis or automatic target change.
 */
export function smoothTrend(
  context: AlgorithmContext,
  algorithmId: "MF-106" | "MF-107",
  values: readonly DatedValue[],
  windowSize = 7,
  evidence: EvidenceRef[] = [],
): AlgorithmResult<readonly SmoothedTrendPoint[]> {
  if (values.length === 0) {
    return {
      algorithmId,
      status: "HOLD",
      reasonCodes: ["NO_TREND_DATA"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const size = Math.max(1, Math.floor(windowSize));
  const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date));

  const output = sorted.map((point, index) => {
    const start = Math.max(0, index - size + 1);
    const slice = sorted.slice(start, index + 1);
    const valid = slice.filter((item) => Number.isFinite(item.value));
    const average =
      valid.reduce((sum, item) => sum + item.value, 0) /
      Math.max(1, valid.length);

    return {
      date: point.date,
      value: average,
      sampleCount: valid.length,
    };
  });

  return {
    algorithmId,
    status: "SUCCESS",
    output,
    reasonCodes: [],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
