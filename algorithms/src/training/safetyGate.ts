import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export type SafetyDecision = "STOP" | "HOLD" | "ADAPT" | "PROCEED";

export interface TrainingSafetyInput {
  painReported: boolean | null;
  illnessReported: boolean | null;
  acuteWarningReported?: boolean | null;
  sorenessKnown: boolean;
  sorenessSeverity?: "NONE" | "MILD" | "MODERATE" | "HIGH";
}

export interface TrainingSafetyOutput {
  decision: SafetyDecision;
  allowAutomaticProgression: boolean;
  reasonCodes: string[];
}

/**
 * Canonical hard safety gate.
 *
 * Provenance:
 * - preserves the explicit pain/illness STOP behavior from the older v1/v2 engines;
 * - keeps soreness separate from pain;
 * - adds UNKNOWN/HOLD behavior required by MoveFuel-2.
 */
export function evaluateTrainingSafety(
  context: AlgorithmContext,
  input: TrainingSafetyInput,
  evidence: EvidenceRef[] = [],
): AlgorithmResult<TrainingSafetyOutput> {
  const reasons: string[] = [];

  if (input.painReported === true) {
    reasons.push("TRAINING_STOP_PAIN_REPORTED");
  }

  if (input.illnessReported === true) {
    reasons.push("TRAINING_STOP_ILLNESS_REPORTED");
  }

  if (input.acuteWarningReported === true) {
    reasons.push("TRAINING_STOP_ACUTE_WARNING");
  }

  if (reasons.length > 0) {
    return {
      algorithmId: "MF-061",
      status: "STOP",
      output: {
        decision: "STOP",
        allowAutomaticProgression: false,
        reasonCodes: reasons,
      },
      reasonCodes: reasons,
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  if (
    input.painReported === null ||
    input.illnessReported === null ||
    !input.sorenessKnown
  ) {
    const holdReasons = ["TRAINING_SAFETY_INPUT_INCOMPLETE"];

    return {
      algorithmId: "MF-061",
      status: "HOLD",
      output: {
        decision: "HOLD",
        allowAutomaticProgression: false,
        reasonCodes: holdReasons,
      },
      reasonCodes: holdReasons,
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  if (
    input.sorenessSeverity === "HIGH" ||
    input.sorenessSeverity === "MODERATE"
  ) {
    reasons.push("TRAINING_ADAPT_FOR_SORENESS");
  }

  const isYouth = context.ageYears !== undefined && context.ageYears < 18;
  if (isYouth) {
    reasons.push("YOUTH_AUTOMATIC_LOAD_PROGRESSION_DISABLED");
  }

  const decision: SafetyDecision =
    reasons.includes("TRAINING_ADAPT_FOR_SORENESS") ? "ADAPT" : "PROCEED";

  return {
    algorithmId: "MF-061",
    status: "SUCCESS",
    output: {
      decision,
      allowAutomaticProgression: !isYouth,
      reasonCodes: reasons,
    },
    reasonCodes: reasons,
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
