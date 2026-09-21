import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export interface CalendarWindow {
  date: string;
  availableMinutes: number;
  locked: boolean;
  recoveryBlocked: boolean;
}

export interface WorkoutPlacementRequest {
  workoutId: string;
  requiredMinutes: number;
  earliestDate: string;
  latestDate: string;
  preferredDates?: string[];
}

export interface WorkoutPlacement {
  workoutId: string;
  date: string;
  adaptedMinutes: number;
  reasonCodes: string[];
}

function within(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/**
 * Deterministic first-pass placement solver. It respects locks/recovery and
 * prefers dates before adapting session length.
 */
export function placeWorkout(
  context: AlgorithmContext,
  request: WorkoutPlacementRequest,
  windows: readonly CalendarWindow[],
  evidence: EvidenceRef[] = [],
): AlgorithmResult<WorkoutPlacement> {
  const eligible = windows
    .filter(
      (window) =>
        within(window.date, request.earliestDate, request.latestDate) &&
        !window.locked &&
        !window.recoveryBlocked &&
        window.availableMinutes > 0,
    )
    .sort((a, b) => {
      const aPreferred = request.preferredDates?.includes(a.date) ? 1 : 0;
      const bPreferred = request.preferredDates?.includes(b.date) ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;

      const aFits = a.availableMinutes >= request.requiredMinutes ? 1 : 0;
      const bFits = b.availableMinutes >= request.requiredMinutes ? 1 : 0;
      if (aFits !== bFits) return bFits - aFits;

      return a.date.localeCompare(b.date);
    });

  const selected = eligible[0];

  if (!selected) {
    return {
      algorithmId: "MF-091",
      status: "HOLD",
      reasonCodes: ["NO_VALID_WORKOUT_CALENDAR_SLOT"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const adaptedMinutes = Math.min(
    request.requiredMinutes,
    selected.availableMinutes,
  );

  return {
    algorithmId: "MF-091",
    status: "SUCCESS",
    output: {
      workoutId: request.workoutId,
      date: selected.date,
      adaptedMinutes,
      reasonCodes:
        adaptedMinutes < request.requiredMinutes
          ? ["SESSION_TIME_ADAPTED"]
          : [],
    },
    reasonCodes:
      adaptedMinutes < request.requiredMinutes
        ? ["SESSION_TIME_ADAPTED"]
        : [],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
