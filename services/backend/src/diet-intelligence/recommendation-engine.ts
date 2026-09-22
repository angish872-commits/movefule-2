import type {
  DailyActionCandidate,
  JsonValue,
  NutritionProfile,
  NutritionState,
  RecommendationCandidate,
  RecommendationStatus,
  RevisionRef,
  TargetState,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { NutritionHardConstraintContext } from "./profile-policy.ts";
import { nutritionHash } from "./ledger-state.ts";

export const NUTRITION_POLICY_VERSION = "movefuel-nutrition-hard-policy-2026-08-v1";
export const NUTRITION_ALGORITHM_VERSION = "movefuel-diet-intelligence-2026-08-v1";
export const NUTRITION_RANKING_VERSION = "movefuel-nutrition-ranking-2026-08-v1";

export type RankingFeatureName =
  | "relevance"
  | "nutritionalGap"
  | "mealTiming"
  | "preference"
  | "feasibility"
  | "confidence";

export type RankingFeatures = Readonly<Record<RankingFeatureName, number | null>>;

export type CandidateRuntimeMetadata = {
  readonly semanticKey: string;
  readonly category: string;
  readonly sourceObjectId: string;
  readonly sourceRevision: string;
  readonly foodCodes: readonly string[];
  readonly allergenCodes: readonly string[];
  readonly blockedDietaryPatternCodes: readonly string[];
  readonly blockedReligiousRestrictionCodes: readonly string[];
  readonly requiresEligibleTarget: boolean;
  readonly requiresEvidence: boolean;
  readonly minimumDataQuality: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  readonly dependencyHash: string;
  readonly rankingFeatures: RankingFeatures;
  readonly displayTitle: string;
  readonly displayBody: string;
  readonly deepLink: JsonValue;
};

export type CandidateBuildInput = {
  userId: string;
  candidateId: string;
  recommendationType: string;
  targetRevision: number;
  profileRevision: number;
  stateRevision: number;
  reasonCodes: readonly string[];
  evidenceRefs: readonly RevisionRef[];
  validFrom: string;
  expiresAt: string;
  metadata: CandidateRuntimeMetadata;
};

export type CandidateWithMetadata = {
  readonly candidate: RecommendationCandidate;
  readonly metadata: CandidateRuntimeMetadata;
};

export type CandidateValidationResult = {
  readonly candidate: RecommendationCandidate;
  readonly metadata: CandidateRuntimeMetadata;
  readonly valid: boolean;
  readonly reasonCodes: readonly string[];
};

function uniq(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function normalizeSet(values: readonly string[]): Set<string> {
  return new Set(values.map((value) => value.trim().toUpperCase()).filter(Boolean));
}

function overlap(left: readonly string[], right: readonly string[]): readonly string[] {
  const set = normalizeSet(right);
  return uniq(left.map((value) => value.trim().toUpperCase()).filter((value) => set.has(value)));
}

function status(candidate: RecommendationCandidate, next: RecommendationStatus, extraReasons: readonly string[]): RecommendationCandidate {
  return Object.freeze({
    ...candidate,
    status: next,
    reasonCodes: uniq([...candidate.reasonCodes, ...extraReasons]),
  });
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function validIso(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createRecommendationCandidate(input: CandidateBuildInput): CandidateWithMetadata {
  if (!input.userId.trim() || !input.candidateId.trim()) throw new Error("CANDIDATE_IDENTITY_REQUIRED");
  if (!input.metadata.semanticKey.trim() || !input.metadata.sourceObjectId.trim()) throw new Error("CANDIDATE_SOURCE_REQUIRED");
  if (validIso(input.validFrom) === null || validIso(input.expiresAt) === null) throw new Error("CANDIDATE_VALIDITY_INVALID");
  const candidate: RecommendationCandidate = Object.freeze({
    schemaVersion: 1,
    candidateId: input.candidateId,
    userId: input.userId,
    recommendationType: input.recommendationType,
    status: "ELIGIBLE",
    targetRevision: input.targetRevision,
    profileRevision: input.profileRevision,
    stateRevision: input.stateRevision,
    score: 0,
    reasonCodes: uniq(input.reasonCodes),
    evidenceRefs: Object.freeze(input.evidenceRefs.map((ref) => Object.freeze({ ...ref }))),
    validity: Object.freeze({ validFrom: input.validFrom, expiresAt: input.expiresAt }),
    policyVersion: NUTRITION_POLICY_VERSION,
    algorithmVersion: NUTRITION_ALGORITHM_VERSION,
  });
  return Object.freeze({ candidate, metadata: Object.freeze({ ...input.metadata }) });
}

function dataQualityRank(value: NutritionState["dataQuality"]["overall"]): number {
  switch (value) {
    case "HIGH": return 3;
    case "MEDIUM": return 2;
    case "LOW": return 1;
    case "UNKNOWN": return 0;
  }
}

export type HardPolicyInput = {
  candidate: RecommendationCandidate;
  metadata: CandidateRuntimeMetadata;
  profile: NutritionProfile;
  hardConstraints: NutritionHardConstraintContext;
  state: NutritionState;
  targetState: TargetState | null;
};

/** Hard policy is monotonic: once blocked, no downstream function may re-enable it. */
export function applyHardPolicy(input: HardPolicyInput): RecommendationCandidate {
  const reasons: string[] = [];
  if (input.candidate.status === "BLOCKED") return input.candidate;
  if (input.candidate.userId !== input.profile.userId || input.candidate.userId !== input.state.userId) {
    reasons.push("CROSS_USER_CANDIDATE_BLOCKED");
  }
  if (input.profile.revision !== input.candidate.profileRevision || input.profile.revision !== input.state.profileRevision) {
    reasons.push("PROFILE_REVISION_BLOCKED");
  }
  const allergenHits = overlap(input.metadata.allergenCodes, input.profile.allergenCodes);
  if (allergenHits.length > 0) reasons.push(...allergenHits.map((code) => `ALLERGEN_BLOCKED:${code}`));

  const exclusionHits = overlap(input.metadata.foodCodes, input.hardConstraints.exclusionCodes);
  if (exclusionHits.length > 0) reasons.push(...exclusionHits.map((code) => `FOOD_EXCLUSION_BLOCKED:${code}`));
  const intoleranceHits = overlap(input.metadata.foodCodes, input.hardConstraints.intoleranceCodes);
  if (intoleranceHits.length > 0) reasons.push(...intoleranceHits.map((code) => `INTOLERANCE_BLOCKED:${code}`));

  const dietaryHits = overlap(input.metadata.blockedDietaryPatternCodes, input.profile.dietaryPatternCodes);
  if (dietaryHits.length > 0) reasons.push(...dietaryHits.map((code) => `DIETARY_PATTERN_BLOCKED:${code}`));
  const religiousHits = overlap(input.metadata.blockedReligiousRestrictionCodes, input.profile.religiousRestrictionCodes);
  if (religiousHits.length > 0) reasons.push(...religiousHits.map((code) => `DECLARED_RELIGIOUS_RESTRICTION_BLOCKED:${code}`));

  if (input.metadata.requiresEligibleTarget) {
    if (!input.targetState || input.targetState.eligibilityDecision !== "ELIGIBLE") {
      reasons.push("ELIGIBLE_TARGET_REQUIRED");
    } else {
      if (input.targetState.userId !== input.candidate.userId || input.targetState.userId !== input.state.userId) {
        reasons.push("TARGET_STATE_USER_BLOCKED");
      }
      if (input.targetState.revision !== input.candidate.targetRevision || input.targetState.revision !== input.state.targetRevision) {
        reasons.push("TARGET_STATE_REVISION_BLOCKED");
      }
    }
  }
  if (dataQualityRank(input.state.dataQuality.overall) < dataQualityRank(input.metadata.minimumDataQuality)) {
    reasons.push("INSUFFICIENT_NUTRITION_DATA_QUALITY");
  }
  return reasons.length > 0 ? status(input.candidate, "BLOCKED", reasons) : input.candidate;
}

export type CandidateValidatorInput = HardPolicyInput & {
  now: Date;
  evidenceExists: (ref: RevisionRef) => boolean;
  currentDependencyHash: string;
};

export function validateCandidate(input: CandidateValidatorInput): CandidateValidationResult {
  let candidate = applyHardPolicy(input);
  const reasons: string[] = [];
  const now = input.now.getTime();
  const from = validIso(candidate.validity.validFrom);
  const expires = candidate.validity.expiresAt === null ? null : validIso(candidate.validity.expiresAt);

  if (from === null || expires === null) reasons.push("CANDIDATE_VALIDITY_INVALID");
  else if (now < from) reasons.push("CANDIDATE_NOT_YET_VALID");
  else if (now >= expires) {
    reasons.push("CANDIDATE_EXPIRED");
    candidate = status(candidate, "EXPIRED", reasons);
  }

  if (candidate.targetRevision !== input.state.targetRevision) reasons.push("TARGET_REVISION_STALE");
  if (candidate.profileRevision !== input.state.profileRevision) reasons.push("PROFILE_REVISION_STALE");
  if (candidate.stateRevision !== input.state.revision) reasons.push("NUTRITION_STATE_REVISION_STALE");
  if (input.metadata.dependencyHash !== input.currentDependencyHash) reasons.push("DEPENDENCY_HASH_STALE");
  if (input.metadata.requiresEvidence && candidate.evidenceRefs.length === 0) reasons.push("REQUIRED_EVIDENCE_MISSING");
  for (const ref of candidate.evidenceRefs) {
    if (!input.evidenceExists(ref)) reasons.push(`EVIDENCE_OBJECT_MISSING:${ref.entityId}:${ref.revision}`);
  }

  if (candidate.status === "BLOCKED") reasons.push(...candidate.reasonCodes.filter((reason) => reason.includes("BLOCKED") || reason.includes("REQUIRED") || reason.includes("QUALITY")));
  const valid = candidate.status === "ELIGIBLE" && reasons.length === 0;
  return Object.freeze({
    candidate: valid ? candidate : candidate.status === "EXPIRED" ? candidate : status(candidate, "BLOCKED", reasons),
    metadata: input.metadata,
    valid,
    reasonCodes: uniq(reasons),
  });
}

export function validateAndDeduplicateCandidates(
  candidates: readonly CandidateWithMetadata[],
  context: Omit<CandidateValidatorInput, "candidate" | "metadata">,
): readonly CandidateValidationResult[] {
  const validated = candidates.map(({ candidate, metadata }) => validateCandidate({ ...context, candidate, metadata }));
  const eligible = validated.filter((result) => result.valid).sort((a, b) => a.candidate.candidateId.localeCompare(b.candidate.candidateId));
  const seen = new Set<string>();
  const results: CandidateValidationResult[] = validated.filter((result) => !result.valid);
  for (const result of eligible) {
    if (seen.has(result.metadata.semanticKey)) {
      results.push(Object.freeze({
        ...result,
        candidate: status(result.candidate, "BLOCKED", ["SEMANTIC_DUPLICATE_BLOCKED"]),
        valid: false,
        reasonCodes: Object.freeze(["SEMANTIC_DUPLICATE_BLOCKED"]),
      }));
      continue;
    }
    seen.add(result.metadata.semanticKey);
    results.push(result);
  }
  return Object.freeze(results.sort((a, b) => a.candidate.candidateId.localeCompare(b.candidate.candidateId)));
}

export type RecommendationFeedbackAction =
  | "ACCEPTED"
  | "DISMISSED"
  | "COMPLETED"
  | "NOT_RELEVANT"
  | "UNAVAILABLE"
  | "DISLIKED";

export type RecommendationFeedbackSignal = {
  readonly userId: string;
  readonly semanticKey: string;
  readonly action: RecommendationFeedbackAction;
  readonly occurredAt: string;
};

function feedbackValue(action: RecommendationFeedbackAction): number {
  if (action === "ACCEPTED" || action === "COMPLETED") return 1;
  if (action === "DISMISSED" || action === "NOT_RELEVANT" || action === "UNAVAILABLE" || action === "DISLIKED") return -1;
  return 0;
}

function personalizationAdjustment(userId: string, semanticKey: string, feedback: readonly RecommendationFeedbackSignal[], now: Date): number {
  let weighted = 0;
  let weightTotal = 0;
  for (const signal of feedback) {
    if (signal.userId !== userId || signal.semanticKey !== semanticKey) continue;
    const occurred = validIso(signal.occurredAt);
    if (occurred === null) continue;
    const ageDays = Math.max(0, (now.getTime() - occurred) / 86_400_000);
    const recency = Math.exp(-ageDays / 45);
    weighted += feedbackValue(signal.action) * recency;
    weightTotal += recency;
  }
  if (weightTotal === 0) return 0;
  return Math.max(-0.08, Math.min(0.08, (weighted / weightTotal) * 0.08));
}

const WEIGHTS: Readonly<Record<RankingFeatureName, number>> = Object.freeze({
  relevance: 0.28,
  nutritionalGap: 0.20,
  mealTiming: 0.14,
  preference: 0.14,
  feasibility: 0.16,
  confidence: 0.08,
});

export type RankedCandidate = {
  readonly candidate: RecommendationCandidate;
  readonly metadata: CandidateRuntimeMetadata;
  readonly scoreComponents: Readonly<Record<string, number>>;
};

function baseScore(features: RankingFeatures): { score: number; components: Readonly<Record<string, number>> } {
  let numerator = 0;
  let denominator = 0;
  const components: Record<string, number> = {};
  for (const name of Object.keys(WEIGHTS) as RankingFeatureName[]) {
    const value = features[name];
    if (value === null || !Number.isFinite(value)) continue;
    const normalized = clamp01(value);
    const weighted = normalized * WEIGHTS[name];
    numerator += weighted;
    denominator += WEIGHTS[name];
    components[name] = Math.round(weighted * 10_000) / 10_000;
  }
  const score = denominator === 0 ? 0 : numerator / denominator;
  return { score, components: Object.freeze(components) };
}

export type RankingContext = {
  userId: string;
  now: Date;
  feedback: readonly RecommendationFeedbackSignal[];
  recentSemanticKeys: readonly string[];
  recentCategories: readonly string[];
};

/** Accepts only validator-approved candidates; blocked candidates cannot be resurrected here. */
export function rankEligibleCandidates(
  validated: readonly CandidateValidationResult[],
  context: RankingContext,
): readonly RankedCandidate[] {
  const recentKeys = new Set(context.recentSemanticKeys);
  const recentCategories = new Set(context.recentCategories);
  const ranked: RankedCandidate[] = [];
  for (const result of validated) {
    if (!result.valid || result.candidate.status !== "ELIGIBLE" || result.candidate.userId !== context.userId) continue;
    const base = baseScore(result.metadata.rankingFeatures);
    const personalization = personalizationAdjustment(context.userId, result.metadata.semanticKey, context.feedback, context.now);
    const repetitionPenalty = recentKeys.has(result.metadata.semanticKey) ? 0.10 : 0;
    const categoryPenalty = recentCategories.has(result.metadata.category) ? 0.04 : 0;
    const finalScore = clamp01(base.score + personalization - repetitionPenalty - categoryPenalty);
    ranked.push(Object.freeze({
      candidate: Object.freeze({
        ...result.candidate,
        score: Math.round(finalScore * 10_000) / 10_000,
        reasonCodes: uniq([
          ...result.candidate.reasonCodes,
          "DETERMINISTIC_RANKING_APPLIED",
          ...(personalization === 0 ? [] : [personalization > 0 ? "BOUNDED_PREFERENCE_BOOST" : "BOUNDED_PREFERENCE_REDUCTION"]),
          ...(repetitionPenalty > 0 || categoryPenalty > 0 ? ["DIVERSITY_REPETITION_PENALTY"] : []),
        ]),
      }),
      metadata: result.metadata,
      scoreComponents: Object.freeze({
        ...base.components,
        personalization: Math.round(personalization * 10_000) / 10_000,
        repetitionPenalty,
        categoryPenalty,
      }),
    }));
  }
  return Object.freeze(ranked.sort((a, b) => b.candidate.score - a.candidate.score || a.candidate.candidateId.localeCompare(b.candidate.candidateId)));
}

/** Selects a safe diverse prefix without ever admitting a policy-blocked item. */
export function selectDiverseCandidates(ranked: readonly RankedCandidate[], limit: number): readonly RankedCandidate[] {
  const safeLimit = Math.max(0, Math.trunc(limit));
  const selected: RankedCandidate[] = [];
  const keys = new Set<string>();
  const categories = new Set<string>();
  for (const item of ranked) {
    if (item.candidate.status !== "ELIGIBLE" || keys.has(item.metadata.semanticKey)) continue;
    if (selected.length < safeLimit && !categories.has(item.metadata.category)) {
      selected.push(item);
      keys.add(item.metadata.semanticKey);
      categories.add(item.metadata.category);
    }
  }
  if (selected.length < safeLimit) {
    for (const item of ranked) {
      if (selected.length >= safeLimit) break;
      if (item.candidate.status !== "ELIGIBLE" || keys.has(item.metadata.semanticKey)) continue;
      selected.push(item);
      keys.add(item.metadata.semanticKey);
    }
  }
  return Object.freeze(selected);
}

export type NutritionInvalidationReason =
  | "MEAL_CONFIRMED"
  | "MEAL_CORRECTED"
  | "MEAL_DELETED"
  | "TARGET_REVISION_CHANGED"
  | "PROFILE_CHANGED"
  | "REGION_CONTEXT_CHANGED"
  | "TIME_CONTEXT_CHANGED"
  | "CALENDAR_CONTEXT_CHANGED"
  | "TRAINING_CONTEXT_CHANGED"
  | "RECOMMENDATION_EXPIRED";

export class NutritionInvalidationCoalescer {
  private readonly dirty = new Map<string, Set<NutritionInvalidationReason>>();

  mark(userId: string, reason: NutritionInvalidationReason): void {
    if (!userId.trim()) throw new Error("INVALIDATION_USER_REQUIRED");
    const reasons = this.dirty.get(userId) ?? new Set<NutritionInvalidationReason>();
    reasons.add(reason);
    this.dirty.set(userId, reasons);
  }

  drain(userId: string): readonly NutritionInvalidationReason[] {
    const reasons = [...(this.dirty.get(userId) ?? [])].sort();
    this.dirty.delete(userId);
    return Object.freeze(reasons);
  }
}

export function nutritionDependencyHash(input: {
  state: NutritionState;
  regionRevision?: string | null;
  calendarRevision?: string | null;
  trainingContextRevision?: string | null;
  timeContextRevision?: string | null;
}): string {
  return nutritionHash({
    stateRevision: input.state.revision,
    mealHash: input.state.confirmedMealRevisionHash,
    targetRevision: input.state.targetRevision,
    profileRevision: input.state.profileRevision,
    regionRevision: input.regionRevision ?? null,
    calendarRevision: input.calendarRevision ?? null,
    trainingContextRevision: input.trainingContextRevision ?? null,
    timeContextRevision: input.timeContextRevision ?? null,
  });
}

export function toDailyActionCandidate(item: RankedCandidate, requiresNetwork = false): DailyActionCandidate {
  if (item.candidate.status !== "ELIGIBLE") throw new Error("BLOCKED_NUTRITION_CANDIDATE_CANNOT_ADAPT");
  if (!item.candidate.validity.expiresAt) throw new Error("NUTRITION_CANDIDATE_EXPIRY_REQUIRED");
  return Object.freeze({
    schemaVersion: 1,
    candidateId: `nutrition-action:${item.candidate.candidateId}`,
    semanticActionKey: `nutrition:${item.metadata.semanticKey}`,
    userId: item.candidate.userId,
    domain: "NUTRITION",
    type: item.candidate.recommendationType,
    blockingState: "NON_BLOCKING",
    reasonCodes: uniq([...item.candidate.reasonCodes, "NUTRITION_DOMAIN_CANDIDATE"]),
    sourceObjectId: item.metadata.sourceObjectId,
    sourceRevision: item.metadata.sourceRevision,
    validFrom: item.candidate.validity.validFrom,
    expiresAt: item.candidate.validity.expiresAt,
    requiresNetwork,
    deepLink: item.metadata.deepLink,
  });
}

/** Guard used by cross-domain tests: Nutrition output carries no training prescription. */
export function assertNonPunitiveNutritionAction(action: DailyActionCandidate): void {
  if (action.domain !== "NUTRITION") throw new Error("NUTRITION_ACTION_DOMAIN_INVALID");
  const text = JSON.stringify(action).toUpperCase();
  const forbidden = ["FORCED_CARDIO", "PUNISHMENT_EXERCISE", "EXTRA_EXERCISE", "HARDER_TRAINING", "COMPENSATE_CALORIES"];
  if (forbidden.some((token) => text.includes(token))) throw new Error("NUTRITION_PUNISHMENT_EXERCISE_FORBIDDEN");
}
