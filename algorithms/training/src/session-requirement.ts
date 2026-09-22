import type {
  CalendarAvailability,
  InternalSessionRequirement,
  MovementPattern,
  NormalizedTrainingProfile,
  ReadinessResult,
  TrainingSessionPurpose,
} from "./contracts.ts";
import type { WeeklyTrainingIntent } from "./program-engine.ts";
import { stableHash } from "./util.ts";

const MOVEMENTS: Readonly<Record<TrainingSessionPurpose, { required: readonly MovementPattern[]; optional: readonly MovementPattern[] }>> = {
  FULL_BODY: { required: ["SQUAT", "PUSH", "PULL"], optional: ["HINGE", "LUNGE", "CORE", "CARRY"] },
  UPPER: { required: ["PUSH", "PULL"], optional: ["CORE", "CARRY"] },
  LOWER: { required: ["SQUAT", "HINGE"], optional: ["LUNGE", "CORE", "CARRY"] },
  CONDITIONING: { required: ["CARDIO"], optional: ["CARRY", "CORE"] },
  RETURN: { required: ["SQUAT", "PUSH", "PULL"], optional: ["CORE", "HINGE"] },
  FOUNDATION: { required: ["SQUAT", "PUSH", "PULL", "CORE"], optional: ["HINGE", "LUNGE", "CARRY"] },
};

function maxExercises(minutes: number): number {
  if (minutes <= 20) return 3;
  if (minutes <= 35) return 4;
  if (minutes <= 50) return 5;
  return 6;
}

export function buildSessionRequirements(
  intent: WeeklyTrainingIntent,
  profile: NormalizedTrainingProfile,
  availability: readonly CalendarAvailability[],
  readiness: ReadinessResult,
): readonly InternalSessionRequirement[] {
  if (readiness.status === "STOP") return [];
  const windows = [...availability]
    .filter((slot) => !slot.locked && Number.isFinite(slot.availableMinutes) && slot.availableMinutes > 0)
    .sort((a, b) => a.localDate.localeCompare(b.localDate) || a.weekday.localeCompare(b.weekday));
  return windows.slice(0, intent.frequency).map((slot, index) => {
    const purpose = intent.sessionPurposes[index]!;
    const movements = MOVEMENTS[purpose];
    const profileMinutes = profile.availabilityMinutesByDay[slot.weekday.trim().toUpperCase()] ?? slot.availableMinutes;
    const durationMinutes = Math.max(10, Math.min(90, slot.availableMinutes, profileMinutes));
    const volumeMultiplier = Math.min(1, readiness.volumeMultiplier) * (profile.policyBand === "YOUTH" ? 0.8 : purpose === "RETURN" ? 0.75 : 1);
    const semanticSessionId = `training-session-${stableHash([profile.canonical.userId, slot.localDate, purpose, index])}`;
    const requirementId = `training-requirement-${stableHash([semanticSessionId, durationMinutes, volumeMultiplier])}`;
    const constraintCodes = [
      `POLICY_BAND:${profile.policyBand}`,
      `READINESS:${readiness.status}`,
      `PURPOSE:${purpose}`,
    ];
    return {
      canonical: {
        schemaVersion: 1,
        requirementId,
        semanticSessionId,
        movementTargets: { required: movements.required, optional: movements.optional },
        volumeTargets: { multiplier: Math.round(volumeMultiplier * 1000) / 1000 },
        durationMinutes,
        equipmentCodes: [...profile.equipmentCodes].sort(),
        constraintCodes,
        reasonCodes: [...intent.reasonCodes, ...readiness.reasonCodes],
      },
      localDate: slot.localDate,
      purpose,
      requiredMovements: movements.required,
      optionalMovements: movements.optional,
      maxExercises: maxExercises(durationMinutes),
      volumeMultiplier,
    };
  });
}
