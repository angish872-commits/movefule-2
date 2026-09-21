import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";
import { clamp } from "../core/contracts";

export type RecoveryBand = "GOOD" | "MODERATE" | "LOW" | "UNCERTAIN" | "BLOCKED";

export interface MuscleRecoveryObservation {
  muscleId: string;
  soreness?: "NONE" | "MILD" | "MODERATE" | "HIGH";
  painReported?: boolean;
  normalizedRecentWorkload?: number;
  performanceDecline?: number;
  hoursSinceMeaningfulTraining?: number;
}

export interface MuscleRecoveryState {
  muscleId: string;
  band: RecoveryBand;
  availability: number | null;
  reasonCodes: string[];
}

function stateForMuscle(
  observation: MuscleRecoveryObservation,
): MuscleRecoveryState {
  const reasons: string[] = [];

  if (observation.painReported === true) {
    return {
      muscleId: observation.muscleId,
      band: "BLOCKED",
      availability: 0,
      reasonCodes: ["MUSCLE_BLOCKED_PAIN_REPORTED"],
    };
  }

  if (
    observation.soreness === undefined &&
    observation.normalizedRecentWorkload === undefined &&
    observation.performanceDecline === undefined &&
    observation.hoursSinceMeaningfulTraining === undefined
  ) {
    return {
      muscleId: observation.muscleId,
      band: "UNCERTAIN",
      availability: null,
      reasonCodes: ["RECOVERY_EVIDENCE_UNKNOWN"],
    };
  }

  let availability = 1;

  switch (observation.soreness) {
    case "HIGH":
      availability -= 0.55;
      reasons.push("HIGH_SORENESS");
      break;
    case "MODERATE":
      availability -= 0.3;
      reasons.push("MODERATE_SORENESS");
      break;
    case "MILD":
      availability -= 0.1;
      reasons.push("MILD_SORENESS");
      break;
    case "NONE":
      reasons.push("NO_REPORTED_SORENESS");
      break;
  }

  if (observation.normalizedRecentWorkload !== undefined) {
    const workload = clamp(observation.normalizedRecentWorkload, 0, 1);
    availability -= workload * 0.25;
    if (workload >= 0.75) reasons.push("HIGH_RECENT_WORKLOAD");
  }

  if (observation.performanceDecline !== undefined) {
    const decline = clamp(observation.performanceDecline, 0, 1);
    availability -= decline * 0.2;
    if (decline >= 0.2) reasons.push("RECENT_PERFORMANCE_DECLINE");
  }

  if (
    observation.hoursSinceMeaningfulTraining !== undefined &&
    observation.hoursSinceMeaningfulTraining < 24
  ) {
    availability -= 0.1;
    reasons.push("RECENTLY_TRAINED");
  }

  availability = clamp(availability, 0, 1);

  const band: RecoveryBand =
    availability >= 0.75
      ? "GOOD"
      : availability >= 0.45
        ? "MODERATE"
        : "LOW";

  return {
    muscleId: observation.muscleId,
    band,
    availability,
    reasonCodes: reasons,
  };
}

/**
 * Deterministic muscle-state estimator.
 *
 * This is intentionally a product heuristic, not a medical or scientific
 * diagnosis. It produces bounded programming state used by exercise selection
 * and session adaptation. Pain is never treated as ordinary soreness.
 */
export function estimateMuscleRecovery(
  context: AlgorithmContext,
  observations: readonly MuscleRecoveryObservation[],
  evidence: EvidenceRef[] = [],
): AlgorithmResult<readonly MuscleRecoveryState[]> {
  if (observations.length === 0) {
    return {
      algorithmId: "MF-069",
      status: "HOLD",
      reasonCodes: ["NO_MUSCLE_RECOVERY_OBSERVATIONS"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const states = observations.map(stateForMuscle);
  const anyBlocked = states.some((state) => state.band === "BLOCKED");
  const anyUnknown = states.some((state) => state.band === "UNCERTAIN");

  return {
    algorithmId: "MF-069",
    status: anyBlocked ? "PARTIAL" : anyUnknown ? "PARTIAL" : "SUCCESS",
    output: states,
    reasonCodes: [
      ...(anyBlocked ? ["ONE_OR_MORE_MUSCLES_BLOCKED"] : []),
      ...(anyUnknown ? ["ONE_OR_MORE_MUSCLES_UNCERTAIN"] : []),
    ],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
