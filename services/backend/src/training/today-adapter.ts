import type { JsonValue, TrainingActionCandidate, TrainingPlanEnvelope } from "../../../../algorithms/training/src/contracts.ts";
import type { DailyActionCandidate } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import { sha256 } from "../domain/sync-store.ts";

export class TrainingTodayCandidateError extends Error {
  public readonly code: "training_candidate_provenance_missing";

  public constructor(message: string) {
    super(message);
    this.name = "TrainingTodayCandidateError";
    this.code = "training_candidate_provenance_missing";
  }
}

export function toDailyTrainingCandidate(candidate: TrainingActionCandidate): DailyActionCandidate {
  if (candidate.type === "TRAINING_SESSION" && (!candidate.sourcePlanId || candidate.sourcePlanRevision === null || !candidate.semanticSessionId)) {
    throw new TrainingTodayCandidateError("A Training session candidate requires source plan, revision, and semantic session provenance.");
  }
  const semanticSessionId = candidate.semanticSessionId ?? candidate.candidateId;
  const sourceObjectId = candidate.sourcePlanId ?? candidate.candidateId;
  const sourceRevision = candidate.sourcePlanRevision === null ? "derived" : String(candidate.sourcePlanRevision);
  return {
    schemaVersion: 1,
    candidateId: candidate.candidateId,
    semanticActionKey: `training:${candidate.type}:${semanticSessionId}`,
    userId: candidate.userId,
    domain: "TRAINING",
    type: candidate.type,
    blockingState: candidate.type === "TRAINING_SETUP" ? "BLOCKING" : "NON_BLOCKING",
    reasonCodes: candidate.reasonCodes,
    sourceObjectId,
    sourceRevision,
    validFrom: candidate.validFrom,
    expiresAt: candidate.expiresAt,
    requiresNetwork: false,
    deepLink: {
      destination: candidate.type === "TRAINING_SESSION" ? "training/session" : "training",
      semanticSessionId,
      sourcePlanId: candidate.sourcePlanId,
      sourcePlanRevision: candidate.sourcePlanRevision,
    },
  };
}

function object(value: JsonValue): Readonly<Record<string, JsonValue>> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, JsonValue>> : null;
}

/** Rebuilds candidate projections from immutable canonical plan provenance.
 * This is used for idempotent response replay and Today projection refresh; it
 * does not score or prescribe Training. */
export function dailyTrainingCandidatesForPlan(userId: string, plan: TrainingPlanEnvelope): readonly DailyActionCandidate[] {
  const expiresAt = plan.validity.expiresAt ?? plan.generatedAt;
  return plan.sessions.flatMap((rawSession, index) => {
    const session = object(rawSession);
    const semanticSessionId = typeof session?.semanticSessionId === "string" ? session.semanticSessionId : "";
    if (!semanticSessionId) return [];
    const purpose = typeof session?.purpose === "string" ? session.purpose : "UNKNOWN";
    return [toDailyTrainingCandidate({
      candidateId: `training-candidate-${sha256({ planId: plan.planId, semanticSessionId }).slice(0, 32)}`,
      userId,
      type: "TRAINING_SESSION",
      score: Math.max(1, 100 - index * 5),
      sourcePlanId: plan.planId,
      sourcePlanRevision: plan.planRevision,
      semanticSessionId,
      reasonCodes: ["VALID_TRAINING_SESSION", `PURPOSE_${purpose}`],
      validFrom: plan.validity.validFrom,
      expiresAt,
    })];
  });
}
