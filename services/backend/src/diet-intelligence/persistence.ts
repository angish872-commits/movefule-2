import { createHash } from "node:crypto";
import type {
  NutritionRecommendation,
  RecommendationCandidate,
  RevisionRef,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { OwnerScopedRepository, RepositoryRow, ServerOwnedRepository } from "../foundation/repository.ts";
import type {
  CandidateRuntimeMetadata,
  RankedCandidate,
  RecommendationFeedbackAction,
} from "./recommendation-engine.ts";

function id(prefix: string, value: string): string {
  const hashLength = Math.max(1, 36 - prefix.length - 1);
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, hashLength)}`;
}

/** Deterministic server-side recommendation id. Mirrored by the service for expiry gating. */
export function dailyRecommendationId(input: {
  userId: string;
  localDate: string;
  inputRevisionHash: string;
  candidateId: string;
}): string {
  return id("nutrition-rec", `${input.userId}:${input.localDate}:${input.inputRevisionHash}:${input.candidateId}`);
}

function confidenceLabel(candidate: RecommendationCandidate, metadata: CandidateRuntimeMetadata): string {
  const confidence = metadata.rankingFeatures.confidence;
  if (confidence === null) return "UNKNOWN";
  if (confidence >= 0.8) return "HIGH";
  if (confidence >= 0.55) return "MEDIUM";
  return "LOW";
}

export interface RecommendationEvidenceWriter {
  writeEvidence(input: {
    evidenceId: string;
    recommendationId: string;
    evidenceType: string;
    objectId: string;
    summaryJson: string;
    sourceUpdatedAt: string;
    createdAt: string;
  }): Promise<void>;
}

type EvidenceClient = {
  createRow(
    databaseId: string,
    tableId: string,
    rowId: string,
    data: Record<string, unknown>,
    permissions?: readonly string[],
  ): Promise<unknown>;
};

/** Narrow server-only adapter for the existing recommendation_evidence table. */
export class AppwriteRecommendationEvidenceWriter implements RecommendationEvidenceWriter {
  private readonly client: EvidenceClient;
  private readonly databaseId: string;

  public constructor(client: EvidenceClient, databaseId = "movefuel_mvp") {
    this.client = client;
    this.databaseId = databaseId;
  }

  async writeEvidence(input: {
    evidenceId: string;
    recommendationId: string;
    evidenceType: string;
    objectId: string;
    summaryJson: string;
    sourceUpdatedAt: string;
    createdAt: string;
  }): Promise<void> {
    await this.client.createRow(this.databaseId, "recommendation_evidence", input.evidenceId, input, []);
  }
}

export type ServedRecommendationInput = {
  userId: string;
  localDate: string;
  inputRevisionHash: string;
  selected: RankedCandidate;
  alternatives: readonly RankedCandidate[];
  now?: Date;
  revision?: number;
};

export type ServedRecommendationResult = {
  readonly recommendation: NutritionRecommendation;
  readonly row: RepositoryRow;
};

/** Terminal feedback actions retire the served recommendation so it is not re-served as stale. */
const TERMINAL_FEEDBACK_ACTIONS = new Set<RecommendationFeedbackAction>(["ACCEPTED", "DISMISSED", "COMPLETED", "NOT_RELEVANT", "UNAVAILABLE", "DISLIKED"]);

export class DietRecommendationPersistence {
  private readonly repository: OwnerScopedRepository;
  private readonly recommendationRepository: ServerOwnedRepository;
  private readonly evidenceWriter: RecommendationEvidenceWriter | undefined;

  public constructor(repository: OwnerScopedRepository, recommendationRepository: ServerOwnedRepository, evidenceWriter?: RecommendationEvidenceWriter) {
    this.repository = repository;
    this.recommendationRepository = recommendationRepository;
    this.evidenceWriter = evidenceWriter;
  }

  async persistServed(input: ServedRecommendationInput): Promise<ServedRecommendationResult> {
    if (input.selected.candidate.userId !== input.userId) throw new Error("RECOMMENDATION_CROSS_USER_SELECTED_REJECTED");
    for (const alternative of input.alternatives) {
      if (alternative.candidate.userId !== input.userId) throw new Error("RECOMMENDATION_CROSS_USER_ALTERNATIVE_REJECTED");
    }
    if (input.selected.candidate.status !== "ELIGIBLE") throw new Error("RECOMMENDATION_SELECTED_CANDIDATE_NOT_ELIGIBLE");
    const now = input.now ?? new Date();
    const recommendationId = id("nutrition-rec", `${input.userId}:${input.localDate}:${input.inputRevisionHash}:${input.selected.candidate.candidateId}`);
    const candidateIds = [input.selected.candidate.candidateId, ...input.alternatives.map((item) => item.candidate.candidateId)];
    const recommendation: NutritionRecommendation = Object.freeze({
      schemaVersion: 1,
      recommendationId,
      userId: input.userId,
      revision: Math.max(1, Math.trunc(input.revision ?? 1)),
      selectedCandidateId: input.selected.candidate.candidateId,
      candidateIds: Object.freeze([...new Set(candidateIds)]),
      status: "ELIGIBLE",
      inputRevisionHash: input.inputRevisionHash,
      reasonCodes: Object.freeze([...input.selected.candidate.reasonCodes]),
      validity: Object.freeze({ ...input.selected.candidate.validity }),
      generatedAt: now.toISOString(),
    });

    const rowData = {
      recommendationId,
      localDate: input.localDate,
      category: input.selected.metadata.category,
      title: input.selected.metadata.displayTitle,
      body: input.selected.metadata.displayBody,
      ruleId: input.selected.candidate.recommendationType,
      ruleVersion: 1,
      state: "ACTIVE",
      inputRevisionHash: input.inputRevisionHash,
      confidenceLabel: confidenceLabel(input.selected.candidate, input.selected.metadata),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const existing = await this.recommendationRepository.getForUser("daily_recommendation", input.userId, recommendationId);
    const row = existing
      ? await this.recommendationRepository.updateForUser("daily_recommendation", input.userId, recommendationId, rowData)
      : await this.recommendationRepository.createForUser("daily_recommendation", input.userId, recommendationId, rowData);

    if (this.evidenceWriter) {
      const refs = new Map<string, RevisionRef>();
      for (const item of [input.selected, ...input.alternatives]) {
        for (const ref of item.candidate.evidenceRefs) refs.set(`${ref.entityId}:${ref.revision}`, ref);
      }
      for (const ref of [...refs.values()].sort((a, b) => a.entityId.localeCompare(b.entityId) || a.revision - b.revision)) {
        const evidenceId = id("rec-evidence", `${recommendationId}:${ref.entityId}:${ref.revision}`);
        await this.evidenceWriter.writeEvidence({
          evidenceId,
          recommendationId,
          evidenceType: "REVISION_REF",
          objectId: ref.entityId,
          summaryJson: JSON.stringify({ revision: ref.revision, schemaVersion: ref.schemaVersion }),
          sourceUpdatedAt: now.toISOString(),
          createdAt: now.toISOString(),
        });
      }
    }
    return Object.freeze({ recommendation, row });
  }

  async expire(userId: string, recommendationId: string, now = new Date()): Promise<RepositoryRow> {
    const existing = await this.recommendationRepository.getForUser("daily_recommendation", userId, recommendationId);
    if (!existing) throw new Error("RECOMMENDATION_NOT_FOUND");
    return this.recommendationRepository.updateForUser("daily_recommendation", userId, recommendationId, {
      state: "EXPIRED",
      updatedAt: now.toISOString(),
    });
  }

  async stateOf(userId: string, recommendationId: string): Promise<string | null> {
    const row = await this.recommendationRepository.getForUser("daily_recommendation", userId, recommendationId);
    return typeof row?.state === "string" && row.state ? row.state : null;
  }

  async recordFeedback(input: {
    userId: string;
    recommendationId: string;
    action: RecommendationFeedbackAction;
    sourceDevice: string;
    idempotencyKey: string;
    occurredAt: string;
  }): Promise<RepositoryRow> {
    if (!input.userId.trim() || !input.recommendationId.trim() || !input.sourceDevice.trim() || !input.idempotencyKey.trim()) {
      throw new Error("RECOMMENDATION_FEEDBACK_REQUIRED_FIELD_MISSING");
    }
    if (!Number.isFinite(Date.parse(input.occurredAt))) throw new Error("RECOMMENDATION_FEEDBACK_TIME_INVALID");
    const recommendation = await this.recommendationRepository.getForUser("daily_recommendation", input.userId, input.recommendationId);
    if (!recommendation) throw new Error("RECOMMENDATION_FEEDBACK_RECOMMENDATION_NOT_FOUND");
    const completionId = id("rec-feedback", `${input.userId}:${input.idempotencyKey}`);
    const existing = await this.repository.getOwned("action_completion", input.userId, completionId);
    if (existing) {
      if (existing.idempotencyKey !== input.idempotencyKey || existing.recommendationId !== input.recommendationId || existing.action !== input.action) {
        throw new Error("RECOMMENDATION_FEEDBACK_IDEMPOTENCY_CONFLICT");
      }
      return existing;
    }
    const row = await this.repository.createOwned("action_completion", input.userId, completionId, {
      completionId,
      recommendationId: input.recommendationId,
      action: input.action,
      sourceDevice: input.sourceDevice,
      idempotencyKey: input.idempotencyKey,
      occurredAt: input.occurredAt,
    });
    if (TERMINAL_FEEDBACK_ACTIONS.has(input.action) && String(recommendation.state ?? "") !== "EXPIRED") {
      await this.expire(input.userId, input.recommendationId, new Date(input.occurredAt)).catch(() => undefined);
    }
    return row;
  }
}
