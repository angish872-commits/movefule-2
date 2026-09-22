import type { MissedWorkoutDecision, PolicyBand, ReadinessResult } from "./contracts.ts";

export type MissedWorkoutInput = {
  futureAvailableWindow: boolean;
  consecutiveMisses: number;
  readiness: ReadinessResult;
  policyBand: PolicyBand;
};

/** Missed training is scheduling/adherence information, never a debt to repay. */
export function decideMissedWorkout(input: MissedWorkoutInput): MissedWorkoutDecision {
  const misses = Math.max(0, Math.trunc(input.consecutiveMisses));
  if (input.readiness.status === "STOP") {
    return { action: "CONTINUE_PROGRAM", reasonCodes: ["STOP_READINESS_NO_RESCHEDULE_OR_COMPENSATION"] };
  }
  if (misses >= 2 || input.readiness.status === "RECOVERY") {
    return {
      action: "SHORTEN_NEXT_IF_NEEDED",
      reasonCodes: ["REPEATED_MISS_OR_RECOVERY_REQUIRES_BOUNDED_ADAPTATION", "NO_VOLUME_DEBT"],
    };
  }
  if (input.futureAvailableWindow) {
    return { action: "RESCHEDULE_IF_AVAILABLE", reasonCodes: ["CALENDAR_MAY_FIND_NEW_WINDOW", "NO_PUNISHMENT_VOLUME"] };
  }
  return { action: "CONTINUE_PROGRAM", reasonCodes: ["CONTINUE_WITHOUT_COMPENSATION"] };
}
