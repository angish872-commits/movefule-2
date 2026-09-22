import type { ProgressionInput, ProgressionResult } from "./contracts.ts";

function validRpe(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
}

/**
 * Deterministic progression decision. Nutrition intake is intentionally absent
 * from this contract: food intake and missed nutrition targets cannot increase
 * training prescription.
 */
export function decideProgression(input: ProgressionInput): ProgressionResult {
  const reasons: string[] = [];
  const prescribedSets = Math.max(1, Math.trunc(input.prescribedSets));
  const completedSets = Math.max(0, Math.trunc(input.completedSets));
  const rpe = validRpe(input.effortRpe);

  if (input.painOrSafetyConcern) {
    return { decision: "BOUNDED_REDUCE", reasonCodes: ["SAFETY_CONCERN_BLOCKS_PROGRESSION"] };
  }
  if (input.missedSession) {
    return { decision: "REPEAT", reasonCodes: ["MISSED_SESSION_NO_PUNISHMENT_PROGRESSION"] };
  }
  if (completedSets < prescribedSets) {
    const ratio = completedSets / prescribedSets;
    return ratio < 0.5
      ? { decision: "BOUNDED_REDUCE", reasonCodes: ["LOW_COMPLETION_BOUNDED_REDUCTION"] }
      : { decision: "REPEAT", reasonCodes: ["PARTIAL_COMPLETION_REPEAT"] };
  }
  if (input.targetRepsMet === false) {
    return { decision: "REPEAT", reasonCodes: ["TARGET_REPS_NOT_MET"] };
  }
  if (rpe !== null && rpe >= 9.5) {
    return { decision: "REPEAT", reasonCodes: ["HIGH_EFFORT_BLOCKS_PROGRESSION"] };
  }
  if (input.policyBand === "YOUTH") {
    if (input.targetRepsMet === true && (rpe === null || rpe <= 8)) {
      return { decision: "PROGRESS", reasonCodes: ["YOUTH_SKILL_FIRST_SMALL_PROGRESS_ONLY"] };
    }
    return { decision: "MAINTAIN", reasonCodes: ["YOUTH_CONSERVATIVE_MAINTENANCE"] };
  }
  if (input.policyBand === "UNKNOWN") {
    return { decision: "MAINTAIN", reasonCodes: ["POLICY_BAND_UNKNOWN_NO_PROGRESSION"] };
  }
  if (input.targetRepsMet === true && (rpe === null || rpe <= 8.5)) {
    reasons.push("TARGET_REPS_MET_WITH_BOUNDED_EFFORT");
    return { decision: "PROGRESS", reasonCodes: reasons };
  }
  if (rpe !== null && rpe >= 9) {
    return { decision: "MAINTAIN", reasonCodes: ["HIGH_EFFORT_MAINTAIN"] };
  }
  return { decision: "MAINTAIN", reasonCodes: ["INSUFFICIENT_PROGRESS_EVIDENCE"] };
}

export type PrescriptionProgression = {
  sets: number;
  repRange: { min: number; max: number } | null;
  durationSeconds: number | null;
  decision: ProgressionResult["decision"];
  reasonCodes: readonly string[];
};

/** Apply only small deterministic changes. Load is not fabricated because the
 * canonical prescription does not contain an authoritative load value. */
export function applyBoundedProgression(input: ProgressionInput): PrescriptionProgression {
  const result = decideProgression(input);
  const prior = input.prior;
  if (result.decision === "BOUNDED_REDUCE") {
    return {
      sets: Math.max(1, prior.sets - 1),
      repRange: prior.repRange,
      durationSeconds: prior.durationSeconds === null ? null : Math.max(60, Math.round(prior.durationSeconds * 0.9)),
      decision: result.decision,
      reasonCodes: result.reasonCodes,
    };
  }
  if (result.decision !== "PROGRESS") {
    return { sets: prior.sets, repRange: prior.repRange, durationSeconds: prior.durationSeconds, decision: result.decision, reasonCodes: result.reasonCodes };
  }
  if (prior.durationSeconds !== null && prior.progressionContext.includes("TIME")) {
    const increment = Math.max(15, Math.min(60, Math.round(prior.durationSeconds * 0.08)));
    return {
      sets: prior.sets,
      repRange: prior.repRange,
      durationSeconds: prior.durationSeconds + increment,
      decision: result.decision,
      reasonCodes: [...result.reasonCodes, "TIME_PROGRESS_CAPPED_AT_EIGHT_PERCENT"],
    };
  }
  if (prior.repRange !== null && prior.progressionContext.includes("REPS")) {
    const increment = input.policyBand === "YOUTH" ? 1 : 2;
    return {
      sets: prior.sets,
      repRange: { min: prior.repRange.min, max: prior.repRange.max + increment },
      durationSeconds: prior.durationSeconds,
      decision: result.decision,
      reasonCodes: [...result.reasonCodes, input.policyBand === "YOUTH" ? "YOUTH_REP_PROGRESS_PLUS_ONE" : "REP_PROGRESS_PLUS_TWO_MAX"],
    };
  }
  return {
    sets: prior.sets,
    repRange: prior.repRange,
    durationSeconds: prior.durationSeconds,
    decision: "MAINTAIN",
    reasonCodes: [...result.reasonCodes, "NO_SUPPORTED_BOUNDED_PROGRESS_AXIS"],
  };
}
