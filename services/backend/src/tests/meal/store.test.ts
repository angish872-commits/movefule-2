import assert from "node:assert/strict";
import test from "node:test";
import { MealContractError, type ConfirmedMeal } from "../../meal/contracts.ts";
import { CandidateOnlyImageRouteRequiredAnalyzer, DeterministicLocalMealAnalyzer, deterministicLocalMealAnalyzer } from "../../meal/providers.ts";
import { MealStore } from "../../meal/store.ts";

function store(): MealStore {
  let nextId = 0;
  return new MealStore({
    now: () => 1_700_000_000_000,
    idFactory: () => `id-${++nextId}`,
  });
}

function draftInput(note = "fixture:chicken-curry-rice") {
  return {
    localDate: "2026-08-01",
    mealType: "lunch" as const,
    sourceType: "sample" as const,
    note,
    imageRef: "private-object-1",
  };
}

test("deterministic provider serves only an explicit sample fixture and never maps arbitrary live text to nutrition", async () => {
  const provider = new DeterministicLocalMealAnalyzer();
  const live = await provider.analyze({
    draft: { draftId: "live", userId: "user-a", localDate: "2026-08-01", mealType: "lunch", sourceType: "camera", note: "chicken curry and rice", state: "DRAFT", activeRevision: 1, createdAtEpochMillis: 1, updatedAtEpochMillis: 1 },
  });
  assert.equal(live.state, "FAILED");
  assert.equal(live.errorCode, "provider_not_configured");
  assert.deepEqual(live.items, []);

  const sample = await provider.analyze({
    draft: { draftId: "sample", userId: "user-a", localDate: "2026-08-01", mealType: "lunch", sourceType: "sample", note: "fixture:chicken-curry-rice", state: "DRAFT", activeRevision: 1, createdAtEpochMillis: 1, updatedAtEpochMillis: 1 },
  });
  assert.equal(sample.state, "COMPLETED");
  assert.equal(sample.totals.energyKcal, 620);
});

test("draft and analysis are resumable but do not affect daily totals", async () => {
  const meals = store();
  const draft = meals.createDraft("user-a", draftInput());
  assert.equal(meals.getDailyTotals("user-a", "2026-08-01").confirmedMealCount, 0);

  const request = await meals.requestAnalysis("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "analysis-1",
  });
  assert.equal(request.state, "COMPLETED");
  assert.equal(request.result?.totals.energyKcal, 620);
  assert.equal(meals.getDailyTotals("user-a", "2026-08-01").energyKcal, 0);
  assert.equal(meals.getDraft("user-a", draft.draftId).state, "NEEDS_REVIEW");
});

test("confirmation is explicit, idempotent, and increments totals once", async () => {
  const meals = store();
  const draft = meals.createDraft("user-a", draftInput());
  const request = await meals.requestAnalysis("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "analysis-1",
  });
  const items = request.result?.items ?? [];
  const first = meals.confirmMeal("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "confirm-1",
    confirmed: true,
    items,
  });
  const duplicate = meals.confirmMeal("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "confirm-1",
    confirmed: true,
    items,
  });

  assert.equal(first.status, "CONFIRMED");
  assert.equal(duplicate.status, "DUPLICATE");
  assert.equal(first.meal.status, "CONFIRMED");
  assert.equal(first.totals.energyKcal, 620);
  assert.equal(first.totals.confirmedMealCount, 1);
  assert.equal(duplicate.totals.confirmedMealCount, 1);
  assert.equal(meals.getDailyTotals("user-a", "2026-08-01").energyKcal, 620);
});

test("confirmed meal list and detail remain user-scoped and date-filterable", async () => {
  const meals = store();
  const draft = meals.createDraft("user-a", draftInput());
  const request = await meals.requestAnalysis("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "analysis-list-1",
  });
  const confirmed = meals.confirmMeal("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "confirm-list-1",
    confirmed: true,
    items: request.result?.items,
  });

  assert.equal(meals.listConfirmedMeals("user-a").length, 1);
  assert.equal(meals.listConfirmedMeals("user-a", "2026-08-01")[0]?.mealId, confirmed.meal.mealId);
  assert.equal(meals.listConfirmedMeals("user-a", "2026-08-02").length, 0);
  assert.deepEqual(meals.listConfirmedMeals("user-b"), []);
  assert.throws(() => meals.getConfirmedMeal("user-b", confirmed.meal.mealId), (error: unknown) =>
    error instanceof MealContractError && error.code === "meal_not_found");
});

test("confirmation cannot happen without explicit confirmation or completed analysis", async () => {
  const meals = store();
  const draft = meals.createDraft("user-a", draftInput());
  assert.throws(() => meals.confirmMeal("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "confirm-1",
    confirmed: false,
  }), (error: unknown) => error instanceof MealContractError && error.code === "confirmation_required");

  assert.throws(() => meals.confirmMeal("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "confirm-2",
    confirmed: true,
  }), (error: unknown) => error instanceof MealContractError && error.code === "analysis_required");
  assert.equal(meals.getDailyTotals("user-a", "2026-08-01").confirmedMealCount, 0);
  await meals.requestAnalysis("user-a", { draftId: draft.draftId, idempotencyKey: "analysis-1" });
});

test("corrected values are used only after review and stale revisions are rejected", async () => {
  const meals = store();
  const draft = meals.createDraft("user-a", draftInput("fixture:oatmeal-berries"));
  const request = await meals.requestAnalysis("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "analysis-1",
  });
  const revised = meals.reviseDraft("user-a", draft.draftId, {
    expectedRevision: 1,
    items: [{
      displayName: "Corrected oatmeal",
      portionGrams: 300,
      energyKcal: 350,
      proteinGrams: 12,
      carbGrams: 58,
      fatGrams: 8,
      fiberGrams: 8,
    }],
  });
  assert.equal(revised.activeRevision, 2);
  assert.throws(() => meals.reviseDraft("user-a", draft.draftId, {
    expectedRevision: 1,
    items: [{ displayName: "stale", portionGrams: 1, energyKcal: 1, proteinGrams: 1 }],
  }), (error: unknown) => error instanceof MealContractError && error.code === "draft_revision_conflict");

  const confirmed = meals.confirmMeal("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "confirm-1",
    confirmed: true,
  });
  assert.equal(confirmed.meal.totals.energyKcal, 350);
  assert.equal(request.result?.totals.energyKcal, 365);
});

test("analysis idempotency and user ownership are enforced", async () => {
  const meals = store();
  const draft = meals.createDraft("user-a", draftInput());
  const first = await meals.requestAnalysis("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "same-key",
  });
  const duplicate = await meals.requestAnalysis("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "same-key",
  });
  assert.deepEqual(duplicate, first);
  await assert.rejects(() => meals.requestAnalysis("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "same-key",
    provider: "gemini",
  }), (error: unknown) => error instanceof MealContractError && error.code === "idempotency_key_reused");
  assert.throws(() => meals.getDraft("user-b", draft.draftId), (error: unknown) =>
    error instanceof MealContractError && error.code === "draft_not_found");
});

test("a slow analysis can be cancelled without a late provider result reviving it", async () => {
  let enteredResolve!: () => void;
  let releaseResolve!: () => void;
  const entered = new Promise<void>((resolve) => { enteredResolve = resolve; });
  const release = new Promise<void>((resolve) => { releaseResolve = resolve; });
  const provider = {
    name: "local_deterministic" as const,
    version: "slow-test",
    async analyze(input: Parameters<typeof deterministicLocalMealAnalyzer.analyze>[0]) {
      enteredResolve();
      await release;
      return deterministicLocalMealAnalyzer.analyze(input);
    },
  };
  const meals = new MealStore({ defaultProvider: provider });
  const draft = meals.createDraft("user-a", draftInput());
  const pending = meals.requestAnalysis("user-a", { draftId: draft.draftId, idempotencyKey: "analysis-slow" });
  await entered;
  const requestId = meals.getDraft("user-a", draft.draftId).analysisRequestId;
  assert.ok(requestId);
  const cancelled = meals.cancelAnalysis("user-a", { requestId, expectedRevision: 1 });
  assert.equal(cancelled.state, "CANCELLED");
  releaseResolve();
  const completedCall = await pending;
  assert.equal(completedCall.state, "CANCELLED");
  assert.equal(meals.getDraft("user-a", draft.draftId).state, "DRAFT");
});

test("failed analysis retries with a higher attempt and keeps retry idempotent", async () => {
  let attempts = 0;
  const provider = {
    name: "local_deterministic" as const,
    version: "retry-test",
    async analyze(input: Parameters<typeof deterministicLocalMealAnalyzer.analyze>[0]) {
      attempts += 1;
      if (attempts === 1) {
        return {
          state: "FAILED" as const,
          provider: "local_deterministic" as const,
          providerVersion: "retry-test",
          items: [],
          totals: { energyKcal: 0, proteinGrams: 0, carbGrams: 0, fatGrams: 0, fiberGrams: 0 },
          errorCode: "provider_not_configured" as const,
        };
      }
      return deterministicLocalMealAnalyzer.analyze(input);
    },
  };
  const meals = new MealStore({ defaultProvider: provider });
  const draft = meals.createDraft("user-a", draftInput());
  const failed = await meals.requestAnalysis("user-a", { draftId: draft.draftId, idempotencyKey: "analysis-failed" });
  assert.equal(failed.state, "FAILED");
  assert.equal(meals.getAnalysis("user-a", failed.requestId).state, "FAILED");
  const retried = await meals.retryAnalysis("user-a", { requestId: failed.requestId, idempotencyKey: "analysis-retry" });
  const duplicate = await meals.retryAnalysis("user-a", { requestId: failed.requestId, idempotencyKey: "analysis-retry" });
  assert.equal(failed.state, "FAILED");
  assert.equal(retried.state, "COMPLETED");
  assert.equal(retried.activeAttempt, 2);
  assert.deepEqual(duplicate, retried);
  await assert.rejects(() => meals.retryAnalysis("user-a", { requestId: failed.requestId, idempotencyKey: "analysis-retry-2" }), (error: unknown) =>
    error instanceof MealContractError && error.code === "analysis_already_completed");
});

test("confirmed meals support revision-aware correction and idempotent tombstones", async () => {
  const meals = store();
  const draft = meals.createDraft("user-a", draftInput());
  const analysis = await meals.requestAnalysis("user-a", { draftId: draft.draftId, idempotencyKey: "analysis-mutate" });
  const confirmed = meals.confirmMeal("user-a", {
    draftId: draft.draftId,
    idempotencyKey: "confirm-mutate",
    confirmed: true,
    items: analysis.result?.items,
  });
  const revised = meals.reviseConfirmedMeal("user-a", {
    mealId: confirmed.meal.mealId,
    idempotencyKey: "meal-revision-1",
    expectedRevision: 1,
    items: [{ displayName: "Corrected meal", portionGrams: 100, energyKcal: 100, proteinGrams: 10 }],
  });
  assert.equal(revised.currentRevision, 2);
  assert.equal(meals.getDailyTotals("user-a", "2026-08-01").energyKcal, 100);
  const tombstone = meals.deleteConfirmedMeal("user-a", {
    mealId: revised.mealId,
    idempotencyKey: "meal-delete-1",
    expectedRevision: 2,
  });
  const duplicate = meals.deleteConfirmedMeal("user-a", {
    mealId: revised.mealId,
    idempotencyKey: "meal-delete-1",
    expectedRevision: 2,
  });
  assert.equal(tombstone.status, "DELETED");
  assert.deepEqual(duplicate, tombstone);
  assert.equal(meals.listConfirmedMeals("user-a").length, 0);
  assert.equal(meals.getDailyTotals("user-a", "2026-08-01").confirmedMealCount, 0);
});

test("legacy gemini meal-analysis compatibility route cannot become nutrient authority", async () => {
  const provider = new CandidateOnlyImageRouteRequiredAnalyzer();
  const result = await provider.analyze({
    draft: {
      draftId: "draft-legacy-cutoff",
      userId: "user-a",
      localDate: "2026-08-01",
      mealType: "lunch",
      sourceType: "camera",
      state: "DRAFT",
      activeRevision: 1,
      createdAtEpochMillis: 1,
      updatedAtEpochMillis: 1,
    },
  });
  assert.equal(result.state, "FAILED");
  assert.equal(result.provider, "gemini");
  assert.equal(result.errorCode, "provider_not_implemented");
  assert.deepEqual(result.items, []);
  assert.equal(result.totals.energyKcal, 0);
  assert.match(result.providerVersion, /candidate-only-image-route-required/);
});

test("reviewed manual meal can be confirmed without invoking an AI provider", () => {
  let nextId = 0;
  const store = new MealStore({ now: () => 1_700_000_000_000, idFactory: () => `manual-${++nextId}` });
  const draft = store.createDraft("manual-user", {
    localDate: "2026-08-12",
    mealType: "dinner",
    sourceType: "manual",
  });
  const revised = store.reviseDraft("manual-user", draft.draftId, {
    expectedRevision: draft.activeRevision,
    items: [{ displayName: "Rice", portionGrams: 180, energyKcal: 234, proteinGrams: 4.9, carbGrams: 50, fatGrams: 0.5, fiberGrams: 0.7, confidence: "high", energyRangeKcal: { min: 234, max: 234 } }],
  });
  const confirmed = store.confirmMeal("manual-user", {
    draftId: draft.draftId,
    idempotencyKey: "manual-confirm",
    confirmed: true,
    expectedRevision: revised.activeRevision,
  });
  assert.equal(confirmed.meal.status, "CONFIRMED");
  assert.equal(confirmed.meal.items[0]!.displayName, "Rice");
  assert.equal(confirmed.meal.totals.energyKcal, 234);
});


test("rehydrating confirmed meals replaces stale in-memory owner projections", () => {
  const meals = store();
  const base = {
    userId: "user-a",
    localDate: "2026-08-01",
    mealType: "lunch" as const,
    status: "CONFIRMED" as const,
    currentRevision: 1,
    items: [{ displayName: "Meal", portionGrams: 100, energyKcal: 100, proteinGrams: 10 }],
    totals: { energyKcal: 100, proteinGrams: 10, carbGrams: 0, fatGrams: 0, fiberGrams: 0 },
    confirmedAtEpochMillis: 1,
    createdAtEpochMillis: 1,
    updatedAtEpochMillis: 1,
  };
  const oldMeal: ConfirmedMeal = { ...base, mealId: "old-meal", sourceDraftId: "old-draft" };
  const currentMeal: ConfirmedMeal = { ...base, mealId: "current-meal", sourceDraftId: "current-draft", totals: { ...base.totals, energyKcal: 250 } };

  meals.hydrateConfirmedMeals("user-a", [oldMeal]);
  meals.hydrateConfirmedMeals("user-a", [currentMeal]);

  assert.deepEqual(meals.listConfirmedMeals("user-a").map((meal) => meal.mealId), ["current-meal"]);
  assert.equal(meals.getDailyTotals("user-a", "2026-08-01").energyKcal, 250);
  assert.throws(() => meals.getConfirmedMeal("user-a", "old-meal"), (error: unknown) =>
    error instanceof MealContractError && error.code === "meal_not_found");
});
