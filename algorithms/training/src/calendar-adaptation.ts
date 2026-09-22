import type { InternalSessionRequirement } from "./contracts.ts";

function maxExercises(minutes: number): number {
  if (minutes <= 20) return 3;
  if (minutes <= 35) return 4;
  if (minutes <= 50) return 5;
  return 6;
}

/**
 * Calendar may constrain WHEN/how much time is available. It never edits an
 * exercise prescription. This function only returns a new Training-owned
 * requirement; the normal eligibility -> scoring -> generation -> validation
 * pipeline must run again after this boundary.
 */
export function adaptRequirementToCalendarWindow(
  requirement: InternalSessionRequirement,
  availableMinutes: number,
): InternalSessionRequirement | null {
  if (!Number.isFinite(availableMinutes)) return null;
  const bounded = Math.trunc(availableMinutes);
  if (bounded < 10) return null;
  const durationMinutes = Math.min(requirement.canonical.durationMinutes, bounded);
  const ratio = durationMinutes / requirement.canonical.durationMinutes;
  const volumeMultiplier = Math.min(requirement.volumeMultiplier, requirement.volumeMultiplier * ratio);
  return {
    ...requirement,
    canonical: {
      ...requirement.canonical,
      durationMinutes,
      volumeTargets: { multiplier: Math.round(volumeMultiplier * 1000) / 1000 },
      constraintCodes: [...requirement.canonical.constraintCodes, "CALENDAR_TIME_WINDOW_ADAPTATION"],
      reasonCodes: [...requirement.canonical.reasonCodes, "TRAINING_REGENERATES_AFTER_CALENDAR_CONSTRAINT"],
    },
    maxExercises: Math.min(requirement.maxExercises, maxExercises(durationMinutes)),
    volumeMultiplier,
  };
}
