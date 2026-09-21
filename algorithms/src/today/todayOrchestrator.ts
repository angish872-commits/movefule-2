import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export type TodayDomain =
  | "NUTRITION"
  | "TRAINING"
  | "RECOVERY"
  | "CALENDAR"
  | "DEVICE"
  | "PROGRESS";

export interface TodayCandidate {
  id: string;
  domain: TodayDomain;
  title: string;
  valid: boolean;
  blockedBySafety: boolean;
  stale: boolean;
  unknownCriticalInput: boolean;
  urgency: number;
  importance: number;
  effort: number;
  reasonCodes: string[];
}

export interface RankedTodayAction extends TodayCandidate {
  score: number;
}

function score(candidate: TodayCandidate): number {
  const urgency = Math.max(0, Math.min(1, candidate.urgency));
  const importance = Math.max(0, Math.min(1, candidate.importance));
  const effort = Math.max(0, Math.min(1, candidate.effort));

  return urgency * 0.45 + importance * 0.45 + (1 - effort) * 0.1;
}

/**
 * Implements MF-096, MF-097 and MF-098 as a single orchestration pipeline:
 * validate -> suppress unsafe/stale/unknown -> rank remaining actions.
 */
export function rankTodayActions(
  context: AlgorithmContext,
  candidates: readonly TodayCandidate[],
  evidence: EvidenceRef[] = [],
): AlgorithmResult<readonly RankedTodayAction[]> {
  const eligible = candidates.filter(
    (candidate) =>
      candidate.valid &&
      !candidate.blockedBySafety &&
      !candidate.stale &&
      !candidate.unknownCriticalInput,
  );

  const ranked = eligible
    .map((candidate) => ({ ...candidate, score: score(candidate) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const suppressed = candidates.length - eligible.length;

  return {
    algorithmId: "MF-097",
    status: ranked.length > 0 ? "SUCCESS" : "HOLD",
    output: ranked,
    reasonCodes: [
      ...(suppressed > 0 ? ["TODAY_CANDIDATES_SUPPRESSED"] : []),
      ...(ranked.length === 0 ? ["NO_VALID_TODAY_ACTION"] : []),
    ],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
