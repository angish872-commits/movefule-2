import { createHash } from "node:crypto";
import type { DailyActionCandidate, NutritionState, TargetState } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { ProfileResult } from "../foundation/profile.ts";
import {
  createRecommendationCandidate,
  nutritionDependencyHash,
  rankEligibleCandidates,
  toDailyActionCandidate,
  validateAndDeduplicateCandidates,
  type RankedCandidate,
  type RecommendationFeedbackAction,
} from "./recommendation-engine.ts";
import { normalizeNutritionProfile } from "./profile-policy.ts";
import { DietRecommendationPersistence, dailyRecommendationId } from "./persistence.ts";
import { ConfirmedNutritionLedgerReader, projectNutritionState } from "./ledger-state.ts";
import type { ConfirmedMealStoreLike } from "../meal/confirmed-meals.ts";

export type DietPlan = Readonly<{
  recommendationId: string | null;
  localDate: string;
  title: string;
  body: string;
  status: "READY" | "NEEDS_INPUT" | "CONSUMED";
  reasonCodes: readonly string[];
  validFrom: string;
  expiresAt: string;
}>;

function number(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0; }
function string(value: unknown): string { return typeof value === "string" ? value : ""; }

function reasonCodes(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return [];
    }
  }
  return [];
}

function targetState(profile: ProfileResult): TargetState | null {
  const target = profile.target;
  if (!target || number(target.revision) <= 0) return null;
  const decision = string(target.eligibilityDecision);
  if (decision !== "ELIGIBLE" && decision !== "INELIGIBLE" && decision !== "REQUIRES_REVIEW" && decision !== "UNKNOWN") return null;
  return Object.freeze({
    schemaVersion: 1,
    targetStateId: string(target.targetRevisionId) || string(target.$id),
    userId: profile.userId,
    revision: number(target.revision),
    effectiveDate: string(target.effectiveDate),
    source: string(target.source),
    manualEntry: target.manualEntry === true,
    eligibilityDecision: decision,
    eligibilityReasonCodes: reasonCodes(target.eligibilityReasonCodes ?? target.eligibilityReasonCodesJson),
    policyVersion: string(target.policyVersion),
    populationClass: string(target.populationClass),
    targetValues: { energyKcal: number(target.energyKcal), proteinG: number(target.proteinG) },
    createdAt: string(target.createdAt),
  });
}

/**
 * Initial diet-plan surface intentionally offers only an advisory next step.
 * It never invents a food, overrides targets, or turns incomplete meal records
 * into a prescriptive meal plan.
 */
export class DietPlanService {
  private readonly persistence: DietRecommendationPersistence | undefined;
  private readonly confirmedMeals: ConfirmedMealStoreLike | undefined;
  private readonly ledgerReader: ConfirmedNutritionLedgerReader;

  public constructor(
    persistence?: DietRecommendationPersistence,
    confirmedMeals?: ConfirmedMealStoreLike,
    ledgerReader = new ConfirmedNutritionLedgerReader(),
  ) {
    this.persistence = persistence;
    this.confirmedMeals = confirmedMeals;
    this.ledgerReader = ledgerReader;
  }

  async recommend(profileResult: ProfileResult, localDate: string, now = new Date()): Promise<DietPlan> {
    const ranked = await this.rankCandidate(profileResult, localDate, now);
    if (ranked === null || !ranked.selected) {
      return Object.freeze({
        recommendationId: null, localDate, title: ranked?.title ?? "Nutrition guidance", body: ranked?.body ?? "Review your targets and confirmed intake when ready.",
        status: "NEEDS_INPUT", reasonCodes: ["DIET_GUIDANCE_NOT_ELIGIBLE"], validFrom: now.toISOString(), expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    const { selected, title, body, dependencyHash } = ranked;
    const recommendationId = dailyRecommendationId({ userId: profileResult.userId, localDate, inputRevisionHash: dependencyHash, candidateId: selected.candidate.candidateId });
    if (this.persistence && (await this.persistence.stateOf(profileResult.userId, recommendationId)) === "EXPIRED") {
      return Object.freeze({ recommendationId: null, localDate, title, body, status: "CONSUMED", reasonCodes: ["RECOMMENDATION_CONSUMED"], validFrom: now.toISOString(), expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() });
    }
    const persisted = this.persistence ? await this.persistence.persistServed({ userId: profileResult.userId, localDate, inputRevisionHash: dependencyHash, selected, alternatives: [], now }) : null;
    return Object.freeze({ recommendationId: persisted?.recommendation.recommendationId ?? null, localDate, title, body, status: "READY", reasonCodes: selected.candidate.reasonCodes, validFrom: selected.candidate.validity.validFrom, expiresAt: selected.candidate.validity.expiresAt ?? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() });
  }

  async feedback(userId: string, recommendationId: string, action: RecommendationFeedbackAction, sourceDevice: string, idempotencyKey: string, occurredAt: string) {
    if (!this.persistence) throw new Error("DIET_FEEDBACK_PERSISTENCE_UNAVAILABLE");
    return this.persistence.recordFeedback({ userId, recommendationId, action, sourceDevice, idempotencyKey, occurredAt });
  }

  /**
   * Diet-domain output for the Today orchestrator. It reuses the same candidate
   * pipeline as recommend() through the legitimate toDailyActionCandidate
   * adapter, but never persists and never invents an action. An
   * ineligible/blocked profile, or a recommendation the user already acted on
   * (ACCEPTED/DISMISSED/COMPLETED), yields null so Today stays empty.
   */
  async todayCandidate(profileResult: ProfileResult, localDate: string, now = new Date()): Promise<DailyActionCandidate | null> {
    const ranked = await this.rankCandidate(profileResult, localDate, now);
    if (!ranked?.selected) return null;
    if (ranked.confirmedMealCount === 0) return null;
    if (this.persistence) {
      const recommendationId = dailyRecommendationId({
        userId: profileResult.userId,
        localDate,
        inputRevisionHash: ranked.dependencyHash,
        candidateId: ranked.selected.candidate.candidateId,
      });
      const state = await this.persistence.stateOf(profileResult.userId, recommendationId);
      if (state === "EXPIRED") return null;
    }
    return toDailyActionCandidate(ranked.selected);
  }

  private async rankCandidate(
    profileResult: ProfileResult,
    localDate: string,
    now = new Date(),
  ): Promise<{
    selected: RankedCandidate | undefined;
    title: string;
    body: string;
    dependencyHash: string;
    confirmedMealCount: number;
  } | null> {
    const parsedLocalDate = /^\d{4}-\d{2}-\d{2}$/.test(localDate) ? new Date(`${localDate}T00:00:00.000Z`) : null;
    if (!parsedLocalDate || !Number.isFinite(parsedLocalDate.getTime()) || parsedLocalDate.toISOString().slice(0, 10) !== localDate) {
      throw new Error("DIET_PLAN_LOCAL_DATE_INVALID");
    }
    const profileRow = profileResult.profile;
    const preferenceRow = profileResult.preferences;
    const normalized = normalizeNutritionProfile({
      userId: profileResult.userId,
      profileRevision: number(profileRow.revision),
      preferenceRevision: number(preferenceRow.revision),
      updatedAt: string(profileRow.updatedAt) || now.toISOString(),
      countryCode: profileRow.countryCode,
      unitSystem: profileRow.locale,
      valueJson: preferenceRow.valueJson,
    });
    const target = targetState(profileResult);
    if (!this.confirmedMeals) throw new Error("DIET_CONFIRMED_MEAL_LEDGER_UNAVAILABLE");
    const ledger = await this.ledgerReader.readAsync(this.confirmedMeals, profileResult.userId, localDate);
    const state: NutritionState = projectNutritionState({
      userId: profileResult.userId,
      localDate,
      ledger,
      profile: normalized.profile,
      targetState: target,
      revision: Math.max(1, Number.parseInt(createHash("sha256")
        .update(`${ledger.confirmedMealRevisionHash}:${normalized.profile.revision}:${target?.revision ?? 0}`)
        .digest("hex").slice(0, 8), 16)),
      now,
    });
    const dependencyHash = nutritionDependencyHash({ state });
    const hasEligibleTarget = target?.eligibilityDecision === "ELIGIBLE";
    const title = hasEligibleTarget ? "Review today’s confirmed intake" : "Finish your target setup";
    const body = hasEligibleTarget
      ? "Use confirmed meals as your record. This guidance is advisory and does not prescribe foods or change your targets."
      : "Review and confirm your starting calorie and protein targets before MoveFuel offers personalized nutrition guidance.";
    const candidate = createRecommendationCandidate({
      userId: profileResult.userId,
      candidateId: `diet-${createHash("sha256").update(`${profileResult.userId}:${localDate}:${dependencyHash}`).digest("hex").slice(0, 24)}`,
      recommendationType: hasEligibleTarget ? "REVIEW_CONFIRMED_INTAKE" : "COMPLETE_TARGET_SETUP",
      targetRevision: state.targetRevision,
      profileRevision: state.profileRevision,
      stateRevision: state.revision,
      reasonCodes: hasEligibleTarget ? ["ADVISORY_ONLY", "CONFIRMED_FACTS_REQUIRED"] : ["ELIGIBLE_TARGET_REQUIRED", "ADVISORY_ONLY"],
      evidenceRefs: ledger.evidenceRefs,
      validFrom: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        semanticKey: hasEligibleTarget ? "review-confirmed-intake" : "complete-target-setup",
        category: "NUTRITION_GUIDANCE",
        sourceObjectId: state.stateId,
        sourceRevision: String(state.revision),
        foodCodes: [], allergenCodes: [], blockedDietaryPatternCodes: [], blockedReligiousRestrictionCodes: [],
        requiresEligibleTarget: false,
        requiresEvidence: false,
        minimumDataQuality: "UNKNOWN",
        dependencyHash,
        rankingFeatures: { relevance: 1, nutritionalGap: hasEligibleTarget ? 0.5 : 1, mealTiming: 0.5, preference: 0.5, feasibility: 1, confidence: 0.4 },
        displayTitle: title,
        displayBody: body,
        deepLink: { destination: "FUEL" },
      },
    });
    const validated = validateAndDeduplicateCandidates([candidate], {
      profile: normalized.profile, hardConstraints: normalized.hardConstraints, state, targetState: target, now,
      evidenceExists: () => true, currentDependencyHash: dependencyHash,
    });
    const selected = rankEligibleCandidates(validated, { userId: profileResult.userId, now, feedback: [], recentSemanticKeys: [], recentCategories: [] })[0];
    return { selected, title, body, dependencyHash, confirmedMealCount: ledger.meals.length };
  }
}
