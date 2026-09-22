import assert from "node:assert/strict";
import test from "node:test";
import type { NutritionProfile, TargetState } from "../../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { FoundationTableId } from "../../foundation/permissions.ts";
import type { ListRowsResult, OwnerScopedRepository, RepositoryListOptions, RepositoryRow } from "../../foundation/repository.ts";
import type { ConfirmedMeal } from "../../meal/contracts.ts";
import { DietPlanService } from "../../diet-intelligence/diet-plan-service.ts";
import {
  AppwriteRecommendationEvidenceWriter,
  ConfirmedNutritionLedgerReader,
  DietRecommendationPersistence,
  NutritionInvalidationCoalescer,
  applyHardPolicy,
  assertNonPunitiveNutritionAction,
  createRecommendationCandidate,
  evaluateTargetEligibility,
  normalizeNutritionProfile,
  nutritionDependencyHash,
  projectNutritionState,
  rankEligibleCandidates,
  selectDiverseCandidates,
  toDailyActionCandidate,
  validateAndDeduplicateCandidates,
  validateCandidate,
  type CandidateRuntimeMetadata,
  type CandidateWithMetadata,
} from "../../diet-intelligence/index.ts";

const NOW = new Date("2026-08-29T12:00:00.000Z");

function meal(overrides: Partial<ConfirmedMeal> = {}): ConfirmedMeal {
  return {
    mealId: "meal-a",
    userId: "user-a",
    localDate: "2026-08-29",
    mealType: "lunch",
    status: "CONFIRMED",
    currentRevision: 1,
    sourceDraftId: "draft-a",
    items: [{
      itemId: "item-a",
      displayName: "Dal bhat",
      portionGrams: 400,
      energyKcal: 600,
      proteinGrams: 22,
      carbGrams: 95,
      fatGrams: 14,
      fiberGrams: 12,
      confidence: "high",
      energyRangeKcal: { min: 560, max: 650 },
    }],
    totals: { energyKcal: 600, proteinGrams: 22, carbGrams: 95, fatGrams: 14, fiberGrams: 12 },
    confirmedAtEpochMillis: NOW.getTime() - 60_000,
    createdAtEpochMillis: NOW.getTime() - 120_000,
    updatedAtEpochMillis: NOW.getTime() - 60_000,
    ...overrides,
  };
}

class MealSource {
  public rows: ConfirmedMeal[];

  constructor(rows: ConfirmedMeal[]) {
    this.rows = rows;
  }

  list(_userId: string, _localDate?: string): ConfirmedMeal[] {
    return this.rows.map((row) => structuredClone(row));
  }
}

function normalizedProfile(userId = "user-a", value: Record<string, unknown> = {}) {
  return normalizeNutritionProfile({
    userId,
    profileRevision: 2,
    preferenceRevision: 3,
    updatedAt: NOW.toISOString(),
    countryCode: "NP",
    unitSystem: "METRIC",
    valueJson: JSON.stringify(value),
  });
}

function adultTarget(userId = "user-a", revision = 4): TargetState {
  return evaluateTargetEligibility({
    userId,
    dateOfBirth: "2000-01-01",
    goal: "General wellness",
    effectiveDate: "2026-08-29",
    requestedRevision: revision,
    manualEnergyKcal: 2200,
    manualProteinG: 110,
    calculatedEnergyKcal: null,
    calculatedProteinG: null,
    calculatedSupported: false,
    now: NOW,
  }).targetState;
}

function project(profile: NutritionProfile, targetState: TargetState | null, rows: ConfirmedMeal[] = [meal()]) {
  const ledger = new ConfirmedNutritionLedgerReader().read(new MealSource(rows), profile.userId, "2026-08-29");
  const nutritionState = projectNutritionState({
    userId: profile.userId,
    localDate: "2026-08-29",
    ledger,
    profile,
    targetState,
    revision: 7,
    now: NOW,
  });
  return { ledger, nutritionState };
}

function dietProfileResult() {
  return {
    userId: "user-a",
    source: "local_fixture" as const,
    profile: { revision: 2, updatedAt: NOW.toISOString(), countryCode: "NP", locale: "METRIC" },
    onboarding: {},
    preferences: { revision: 3, valueJson: "{}" },
    goal: null,
    target: {
      targetRevisionId: "target-a",
      revision: 4,
      effectiveDate: "2026-08-29",
      source: "CALCULATED",
      manualEntry: false,
      eligibilityDecision: "ELIGIBLE",
      eligibilityReasonCodes: [],
      policyVersion: "target-policy-v1",
      populationClass: "ADULT",
      energyKcal: 2200,
      proteinG: 110,
      createdAt: NOW.toISOString(),
    },
  };
}

function metadata(overrides: Partial<CandidateRuntimeMetadata> = {}): CandidateRuntimeMetadata {
  return {
    semanticKey: "meal:dal-bhat",
    category: "NEXT_MEAL",
    sourceObjectId: "recipe-dal-bhat",
    sourceRevision: "recipe-dal-bhat:3",
    foodCodes: ["LENTIL", "RICE"],
    allergenCodes: [],
    blockedDietaryPatternCodes: [],
    blockedReligiousRestrictionCodes: [],
    requiresEligibleTarget: false,
    requiresEvidence: true,
    minimumDataQuality: "LOW",
    dependencyHash: "unset",
    rankingFeatures: {
      relevance: 0.9,
      nutritionalGap: 0.7,
      mealTiming: 0.8,
      preference: 0.6,
      feasibility: 0.9,
      confidence: 0.9,
    },
    displayTitle: "Dal bhat option",
    displayBody: "A familiar option based on confirmed context.",
    deepLink: { route: "fuel", item: "recipe-dal-bhat" },
    ...overrides,
  };
}

function candidateFor(
  profile: NutritionProfile,
  targetState: TargetState | null,
  candidateId = "candidate-a",
  metadataOverrides: Partial<CandidateRuntimeMetadata> = {},
): { bundle: CandidateWithMetadata; nutritionState: ReturnType<typeof projectNutritionState>; dependencyHash: string } {
  const { nutritionState } = project(profile, targetState);
  const dependencyHash = nutritionDependencyHash({
    state: nutritionState,
    regionRevision: "NP:1",
    timeContextRevision: "2026-08-29:lunch",
  });
  const bundle = createRecommendationCandidate({
    userId: profile.userId,
    candidateId,
    recommendationType: "NEXT_MEAL",
    targetRevision: nutritionState.targetRevision,
    profileRevision: nutritionState.profileRevision,
    stateRevision: nutritionState.revision,
    reasonCodes: ["STRUCTURED_CANDIDATE"],
    evidenceRefs: [{ entityId: "meal-a", revision: 1, schemaVersion: 1 }],
    validFrom: "2026-08-29T10:00:00.000Z",
    expiresAt: "2026-08-29T15:00:00.000Z",
    metadata: metadata({ dependencyHash, ...metadataOverrides }),
  });
  return { bundle, nutritionState, dependencyHash };
}

function validate(bundle: CandidateWithMetadata, profileBundle: ReturnType<typeof normalizeNutritionProfile>, targetState: TargetState | null, nutritionState: ReturnType<typeof projectNutritionState>, dependencyHash: string) {
  return validateCandidate({
    candidate: bundle.candidate,
    metadata: bundle.metadata,
    profile: profileBundle.profile,
    hardConstraints: profileBundle.hardConstraints,
    state: nutritionState,
    targetState,
    now: NOW,
    evidenceExists: () => true,
    currentDependencyHash: dependencyHash,
  });
}

class MemoryRepository implements OwnerScopedRepository {
  readonly rows = new Map<string, RepositoryRow>();

  private key(table: FoundationTableId, rowId: string): string {
    return `${table}:${rowId}`;
  }

  async listOwned<T extends Record<string, unknown>>(table: FoundationTableId, userId: string, _options?: RepositoryListOptions): Promise<ListRowsResult<T>> {
    const rows = [...this.rows.entries()]
      .filter(([key, row]) => key.startsWith(`${table}:`) && row.userId === userId)
      .map(([, row]) => row as RepositoryRow<T>);
    return { rows, total: rows.length };
  }

  async getOwned<T extends Record<string, unknown>>(table: FoundationTableId, userId: string, rowId: string): Promise<RepositoryRow<T> | null> {
    const row = this.rows.get(this.key(table, rowId));
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  async createOwned<T extends Record<string, unknown>>(table: FoundationTableId, userId: string, rowId: string, data: T): Promise<RepositoryRow<T>> {
    const row = { $id: rowId, ...data, userId } as RepositoryRow<T>;
    this.rows.set(this.key(table, rowId), row as RepositoryRow);
    return row;
  }

  async updateOwned<T extends Record<string, unknown>>(table: FoundationTableId, userId: string, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const existing = await this.getOwned<T>(table, userId, rowId);
    if (!existing) throw new Error("OWNER_MISMATCH");
    const row = { ...existing, ...data, $id: rowId, userId } as RepositoryRow<T>;
    this.rows.set(this.key(table, rowId), row as RepositoryRow);
    return row;
  }

  async deleteOwned(table: FoundationTableId, userId: string, rowId: string): Promise<void> {
    if (!(await this.getOwned(table, userId, rowId))) throw new Error("OWNER_MISMATCH");
    this.rows.delete(this.key(table, rowId));
  }
}

class MemoryEvidenceClient {
  readonly rows = new Map<string, Record<string, unknown>>();

  async createRow(_databaseId: string, tableId: string, rowId: string, data: Record<string, unknown>): Promise<unknown> {
    this.rows.set(`${tableId}:${rowId}`, structuredClone(data));
    return data;
  }
}

test("unconfirmed meal never enters ledger and deleted latest revision is excluded", () => {
  const unconfirmed = meal({ mealId: "draft-like" }) as ConfirmedMeal & { status: string };
  unconfirmed.status = "DRAFT";
  const oldConfirmed = meal({ mealId: "deleted", currentRevision: 1, updatedAtEpochMillis: NOW.getTime() - 1000 });
  const deleted = meal({ mealId: "deleted", currentRevision: 2, status: "DELETED", updatedAtEpochMillis: NOW.getTime() });
  const snapshot = new ConfirmedNutritionLedgerReader().read(new MealSource([unconfirmed as ConfirmedMeal, oldConfirmed, deleted]), "user-a", "2026-08-29");
  assert.equal(snapshot.meals.length, 0);
  assert.equal(snapshot.totals, null);
});

test("corrected meal uses latest revision and historical snapshot is immutable", () => {
  const source = new MealSource([
    meal({ currentRevision: 1 }),
    meal({ currentRevision: 2, totals: { energyKcal: 650, proteinGrams: 25, carbGrams: 98, fatGrams: 15, fiberGrams: 13 }, updatedAtEpochMillis: NOW.getTime() }),
  ]);
  const snapshot = new ConfirmedNutritionLedgerReader().read(source, "user-a", "2026-08-29");
  assert.equal(snapshot.meals[0]?.currentRevision, 2);
  assert.equal(snapshot.totals?.energyKcal, 650);
  source.rows[1]!.totals.energyKcal = 9999;
  assert.equal(snapshot.totals?.energyKcal, 650);
  assert.equal(Object.isFrozen(snapshot.meals[0]!), true);
});

test("unknown remains unknown instead of becoming zero", () => {
  const profile = normalizedProfile();
  const { ledger, nutritionState } = project(profile.profile, null, []);
  const totals = nutritionState.totals as { recorded: unknown; recordedGap: { energyKcal: unknown; proteinG: unknown } };
  assert.equal(ledger.totals, null);
  assert.equal(totals.recorded, null);
  assert.equal(totals.recordedGap.energyKcal, null);
  assert.equal(totals.recordedGap.proteinG, null);
  assert.ok(nutritionState.dataQuality.missingCodes.includes("NO_CONFIRMED_MEALS_RECORDED"));
});

test("profile uses explicit structured declarations and does not promote legacy free text to hard policy", () => {
  const profile = normalizedProfile("user-a", {
    dietaryPreferences: "maybe peanut-free vegan",
    dietaryPatternCodes: ["vegan"],
    allergenCodes: ["peanut"],
    intoleranceCodes: ["lactose"],
    exclusionCodes: ["pork"],
    religiousRestrictionCodes: ["halal_declared"],
  });
  assert.deepEqual(profile.profile.dietaryPatternCodes, ["VEGAN"]);
  assert.deepEqual(profile.profile.allergenCodes, ["PEANUT"]);
  assert.deepEqual(profile.hardConstraints.intoleranceCodes, ["LACTOSE"]);
  assert.deepEqual(profile.hardConstraints.exclusionCodes, ["PORK"]);
  assert.ok(profile.profile.unknownFields.includes("legacyDietaryPreferences:UNPARSED"));
});

test("manual target cannot bypass youth eligibility", () => {
  const outcome = evaluateTargetEligibility({
    userId: "youth-user",
    dateOfBirth: "2012-01-01",
    goal: "Calorie deficit",
    effectiveDate: "2026-08-29",
    requestedRevision: 1,
    manualEnergyKcal: 1600,
    manualProteinG: 90,
    calculatedEnergyKcal: null,
    calculatedProteinG: null,
    calculatedSupported: false,
    now: NOW,
  });
  assert.equal(outcome.canPersist, false);
  assert.equal(outcome.targetState.eligibilityDecision, "INELIGIBLE");
  assert.deepEqual(outcome.targetState.targetValues, { energyKcal: null, proteinG: null });
});

test("allergen and incompatible declared diet candidates are blocked before ranking", () => {
  const allergyProfile = normalizedProfile("user-a", { allergenCodes: ["PEANUT"] });
  const target = adultTarget();
  const allergyBuilt = candidateFor(allergyProfile.profile, target, "allergy", { allergenCodes: ["PEANUT"] });
  const allergy = applyHardPolicy({ candidate: allergyBuilt.bundle.candidate, metadata: allergyBuilt.bundle.metadata, profile: allergyProfile.profile, hardConstraints: allergyProfile.hardConstraints, state: allergyBuilt.nutritionState, targetState: target });
  assert.equal(allergy.status, "BLOCKED");
  assert.ok(allergy.reasonCodes.includes("ALLERGEN_BLOCKED:PEANUT"));

  const veganProfile = normalizedProfile("user-a", { dietaryPatternCodes: ["VEGAN"] });
  const dietBuilt = candidateFor(veganProfile.profile, target, "diet", { blockedDietaryPatternCodes: ["VEGAN"] });
  const diet = applyHardPolicy({ candidate: dietBuilt.bundle.candidate, metadata: dietBuilt.bundle.metadata, profile: veganProfile.profile, hardConstraints: veganProfile.hardConstraints, state: dietBuilt.nutritionState, targetState: target });
  assert.equal(diet.status, "BLOCKED");
  assert.ok(diet.reasonCodes.includes("DIETARY_PATTERN_BLOCKED:VEGAN"));
});

test("personalization cannot resurrect a hard-blocked candidate", () => {
  const profile = normalizedProfile("user-a", { allergenCodes: ["PEANUT"] });
  const target = adultTarget();
  const built = candidateFor(profile.profile, target, "blocked", { allergenCodes: ["PEANUT"], semanticKey: "favorite" });
  const checked = validate(built.bundle, profile, target, built.nutritionState, built.dependencyHash);
  const ranked = rankEligibleCandidates([checked], {
    userId: "user-a",
    now: NOW,
    feedback: [{ userId: "user-a", semanticKey: "favorite", action: "ACCEPTED", occurredAt: NOW.toISOString() }],
    recentSemanticKeys: [],
    recentCategories: [],
  });
  assert.equal(checked.valid, false);
  assert.equal(ranked.length, 0);
});

test("expired and stale dependency candidates are invalid", () => {
  const profile = normalizedProfile();
  const target = adultTarget();
  const built = candidateFor(profile.profile, target);
  const expired = createRecommendationCandidate({
    userId: "user-a",
    candidateId: "expired",
    recommendationType: "NEXT_MEAL",
    targetRevision: built.nutritionState.targetRevision,
    profileRevision: built.nutritionState.profileRevision,
    stateRevision: built.nutritionState.revision,
    reasonCodes: [],
    evidenceRefs: [{ entityId: "meal-a", revision: 1, schemaVersion: 1 }],
    validFrom: "2026-08-29T08:00:00.000Z",
    expiresAt: "2026-08-29T09:00:00.000Z",
    metadata: metadata({ dependencyHash: built.dependencyHash }),
  });
  const expiredResult = validate(expired, profile, target, built.nutritionState, built.dependencyHash);
  assert.equal(expiredResult.valid, false);
  assert.equal(expiredResult.candidate.status, "EXPIRED");

  const staleResult = validateCandidate({
    candidate: built.bundle.candidate,
    metadata: built.bundle.metadata,
    profile: profile.profile,
    hardConstraints: profile.hardConstraints,
    state: built.nutritionState,
    targetState: target,
    now: NOW,
    evidenceExists: () => true,
    currentDependencyHash: "different",
  });
  assert.equal(staleResult.valid, false);
  assert.ok(staleResult.reasonCodes.includes("DEPENDENCY_HASH_STALE"));
});

test("semantic duplicates are deterministically deduplicated", () => {
  const profile = normalizedProfile();
  const target = adultTarget();
  const a = candidateFor(profile.profile, target, "candidate-a", { semanticKey: "same" });
  const b = candidateFor(profile.profile, target, "candidate-b", { semanticKey: "same" });
  const results = validateAndDeduplicateCandidates([b.bundle, a.bundle], {
    profile: profile.profile,
    hardConstraints: profile.hardConstraints,
    state: a.nutritionState,
    targetState: target,
    now: NOW,
    evidenceExists: () => true,
    currentDependencyHash: a.dependencyHash,
  });
  assert.equal(results.filter((item) => item.valid).length, 1);
  assert.equal(results.find((item) => item.valid)?.candidate.candidateId, "candidate-a");
  assert.ok(results.some((item) => item.reasonCodes.includes("SEMANTIC_DUPLICATE_BLOCKED")));
});

test("same inputs produce deterministic ranking and diversity", () => {
  const profile = normalizedProfile();
  const target = adultTarget();
  const a = candidateFor(profile.profile, target, "a", { semanticKey: "a", category: "A", rankingFeatures: { ...metadata().rankingFeatures, relevance: 0.7 } });
  const b = candidateFor(profile.profile, target, "b", { semanticKey: "b", category: "B", rankingFeatures: { ...metadata().rankingFeatures, relevance: 0.9 } });
  const results = validateAndDeduplicateCandidates([a.bundle, b.bundle], {
    profile: profile.profile,
    hardConstraints: profile.hardConstraints,
    state: a.nutritionState,
    targetState: target,
    now: NOW,
    evidenceExists: () => true,
    currentDependencyHash: a.dependencyHash,
  });
  const context = { userId: "user-a", now: NOW, feedback: [], recentSemanticKeys: [], recentCategories: [] } as const;
  const first = rankEligibleCandidates(results, context);
  const second = rankEligibleCandidates(results, context);
  assert.deepEqual(first, second);
  assert.deepEqual(selectDiverseCandidates(first, 2).map((item) => item.candidate.candidateId), ["b", "a"]);
});

test("feedback is idempotent, owner-scoped, and does not mutate meal facts", async () => {
  const profile = normalizedProfile();
  const target = adultTarget();
  const built = candidateFor(profile.profile, target);
  const checked = validate(built.bundle, profile, target, built.nutritionState, built.dependencyHash);
  const ranked = rankEligibleCandidates([checked], { userId: "user-a", now: NOW, feedback: [], recentSemanticKeys: [], recentCategories: [] });
  const repo = new MemoryRepository();
  const evidenceClient = new MemoryEvidenceClient();
  const serverRepository = {
    listForUser: repo.listOwned.bind(repo),
    getForUser: repo.getOwned.bind(repo),
    createForUser: repo.createOwned.bind(repo),
    updateForUser: repo.updateOwned.bind(repo),
  };
  const store = new DietRecommendationPersistence(repo, serverRepository, new AppwriteRecommendationEvidenceWriter(evidenceClient));
  const before = structuredClone(built.nutritionState.totals);
  const served = await store.persistServed({ userId: "user-a", localDate: "2026-08-29", inputRevisionHash: built.dependencyHash, selected: ranked[0]!, alternatives: [], now: NOW });
  const feedback = { userId: "user-a", recommendationId: served.recommendation.recommendationId, action: "DISLIKED" as const, sourceDevice: "phone-a", idempotencyKey: "feedback-1", occurredAt: NOW.toISOString() };
  const first = await store.recordFeedback(feedback);
  const second = await store.recordFeedback(feedback);
  assert.equal(first.$id, second.$id);
  assert.deepEqual(built.nutritionState.totals, before);
  assert.ok(evidenceClient.rows.size > 0);
  await assert.rejects(() => store.recordFeedback({ ...feedback, userId: "user-b", idempotencyKey: "other" }), /RECOMMENDATION_FEEDBACK_RECOMMENDATION_NOT_FOUND/);
  await store.expire("user-a", served.recommendation.recommendationId, NOW);
  assert.equal((await repo.getOwned("daily_recommendation", "user-a", served.recommendation.recommendationId))?.state, "EXPIRED");
});

test("AI disabled still produces correct deterministic recommendation output", () => {
  const profile = normalizedProfile();
  const target = adultTarget();
  const built = candidateFor(profile.profile, target);
  const checked = validate(built.bundle, profile, target, built.nutritionState, built.dependencyHash);
  const ranked = rankEligibleCandidates([checked], { userId: "user-a", now: NOW, feedback: [], recentSemanticKeys: [], recentCategories: [] });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0]?.candidate.candidateId, "candidate-a");
});

test("Nutrition candidate adapter cannot prescribe punishment exercise", () => {
  const profile = normalizedProfile();
  const target = adultTarget();
  const built = candidateFor(profile.profile, target);
  const checked = validate(built.bundle, profile, target, built.nutritionState, built.dependencyHash);
  const ranked = rankEligibleCandidates([checked], { userId: "user-a", now: NOW, feedback: [], recentSemanticKeys: [], recentCategories: [] });
  const action = toDailyActionCandidate(ranked[0]!);
  assert.equal(action.domain, "NUTRITION");
  assert.doesNotThrow(() => assertNonPunitiveNutritionAction(action));
});

test("cross-user ledger rows are rejected", () => {
  assert.throws(
    () => new ConfirmedNutritionLedgerReader().read(new MealSource([meal({ userId: "user-b" })]), "user-a", "2026-08-29"),
    /LEDGER_CROSS_USER_ROW_REJECTED/,
  );
});

test("diet plan derives provenance from canonical confirmed meals and preserves missing intake", async () => {
  const source = new MealSource([meal()]);
  const service = new DietPlanService(undefined, {
    persist: () => undefined,
    list: source.list.bind(source),
    get: () => null,
  });
  const withMeal = await service.recommend(dietProfileResult(), "2026-08-29", NOW);
  assert.equal(withMeal.status, "READY");
  assert.ok(withMeal.reasonCodes.includes("ADVISORY_ONLY"));
  assert.ok(withMeal.reasonCodes.includes("CONFIRMED_FACTS_REQUIRED"));

  const withoutMeals = new DietPlanService(undefined, {
    persist: () => undefined,
    list: () => [],
    get: () => null,
  });
  const empty = await withoutMeals.recommend(dietProfileResult(), "2026-08-29", NOW);
  assert.equal(empty.status, "READY");
  assert.ok(empty.reasonCodes.includes("ADVISORY_ONLY"));
  assert.ok(empty.reasonCodes.includes("CONFIRMED_FACTS_REQUIRED"));
});

test("invalidation coalesces duplicate dependency changes", () => {
  const invalidation = new NutritionInvalidationCoalescer();
  invalidation.mark("user-a", "MEAL_CORRECTED");
  invalidation.mark("user-a", "MEAL_CORRECTED");
  invalidation.mark("user-a", "TARGET_REVISION_CHANGED");
  assert.deepEqual(invalidation.drain("user-a"), ["MEAL_CORRECTED", "TARGET_REVISION_CHANGED"]);
  assert.deepEqual(invalidation.drain("user-a"), []);
});
