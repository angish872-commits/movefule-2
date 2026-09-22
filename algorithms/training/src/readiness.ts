import type { ReadinessInput, ReadinessResult } from "./contracts.ts";

export type BoundedReadinessInput = ReadinessInput & {
  recentWorkloadRatio?: number | null;
  healthSignal?: "NORMAL" | "CAUTION" | "STOP" | null;
  deviceDataQuality?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" | null;
};

function boundedScore(value: number | null | undefined, invert = false): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10) return null;
  const normalized = value / 10;
  return invert ? 1 - normalized : normalized;
}

export function calculateReadiness(input: BoundedReadinessInput): ReadinessResult {
  const reasons: string[] = [];
  if (input.painFlag) reasons.push("PAIN_FLAG");
  if (input.illnessFlag) reasons.push("ILLNESS_FLAG");
  if (input.healthSignal === "STOP") reasons.push("HEALTH_CONTEXT_STOP");
  if (reasons.length > 0) {
    return { score: 0, status: "STOP", volumeMultiplier: 0, confidence: "HIGH", reasonCodes: reasons };
  }

  const values = [
    boundedScore(input.sleepQuality),
    boundedScore(input.energy),
    boundedScore(input.motivation),
    boundedScore(input.soreness, true),
  ].filter((value): value is number => value !== null);

  if (values.length === 0) {
    return {
      score: null,
      status: "REDUCED",
      volumeMultiplier: 0.8,
      confidence: "LOW",
      reasonCodes: ["READINESS_DATA_UNKNOWN", ...(input.deviceDataQuality === "UNKNOWN" ? ["DEVICE_CONTEXT_UNKNOWN"] : [])],
    };
  }

  let normalized = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (input.healthSignal === "CAUTION") {
    normalized -= 0.1;
    reasons.push("HEALTH_CONTEXT_CAUTION");
  }
  if (typeof input.recentWorkloadRatio === "number" && Number.isFinite(input.recentWorkloadRatio) && input.recentWorkloadRatio > 1.5) {
    normalized -= Math.min(0.15, (input.recentWorkloadRatio - 1.5) * 0.1);
    reasons.push("RECENT_WORKLOAD_ELEVATED");
  }
  normalized = Math.max(0, Math.min(1, normalized));
  const score = Math.round(normalized * 100);
  const confidence = values.length >= 3 ? "HIGH" : values.length === 2 ? "MEDIUM" : "LOW";

  if (normalized >= 0.75) {
    return { score, status: "FULL", volumeMultiplier: 1, confidence, reasonCodes: [...reasons, "READINESS_FULL"] };
  }
  if (normalized >= 0.55) {
    return { score, status: "REDUCED", volumeMultiplier: 0.8, confidence, reasonCodes: [...reasons, "READINESS_REDUCED"] };
  }
  return { score, status: "RECOVERY", volumeMultiplier: 0.6, confidence, reasonCodes: [...reasons, "READINESS_RECOVERY"] };
}
