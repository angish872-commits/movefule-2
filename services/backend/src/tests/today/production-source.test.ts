import assert from "node:assert/strict";
import test from "node:test";
import type { DailyActionCandidate, TrainingPlanEnvelope } from "../../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { ConfirmedMeal } from "../../meal/contracts.ts";
import { DietPlanService } from "../../diet-intelligence/diet-plan-service.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../../foundation/repository.ts";
import type { ProfileResult, ProfileService } from "../../foundation/profile.ts";
import { createProductionTodaySource } from "../../today/production-source.ts";
import { buildTodayBundle, emptyTodaySourceSnapshot } from "../../today/service.ts";
import { decideToday } from "../../today/decision-orchestrator.ts";

const NOW = new Date("2026-09-03T10:00:00.000Z");

class EmptyConfirmedMealStore {
  list(userId: string): ConfirmedMeal[] { return []; }
  persist(): void { /* no-op */ }
  get(): null { return null; }
}

class ProfileServiceStub {
  private readonly profile: ProfileResult | null;

  public constructor(profile: ProfileResult | null) {
    this.profile = profile;
  }

  async get(userId: string): Promise<ProfileResult | null> {
    return userId === "user-a" ? this.profile : null;
  }
}

function ownerRepositoryStub(): OwnerScopedRepository {
  return {
    listOwned: async () => ({ rows: [], total: 0 }),
    getOwned: async () => null,
    createOwned: async () => ({} as RepositoryRow),
    updateOwned: async () => ({} as RepositoryRow),
    deleteOwned: async () => undefined,
  } as unknown as OwnerScopedRepository;
}

function profile(): ProfileResult {
  return {
    userId: "user-a",
    source: "local_fixture",
    profile: { revision: 2, updatedAt: NOW.toISOString(), countryCode: "NP", locale: "METRIC" },
    onboarding: {},
    preferences: { revision: 3, valueJson: "{}" },
    goal: null,
    target: {
      targetRevisionId: "target-a",
      revision: 4,
      effectiveDate: "2026-09-03",
      source: "CALCULATED",
      manualEntry: false,
      eligibilityDecision: "ELIGIBLE",
      eligibilityReasonCodes: ["ADULT_POPULATION"],
      policyVersion: "target-policy-v1",
      populationClass: "ADULT",
      energyKcal: 2200,
      proteinG: 110,
      createdAt: NOW.toISOString(),
    },
  };
}

function plan(sessions: Array<Record<string, unknown>>): TrainingPlanEnvelope {
  return {
    schemaVersion: 1,
    planId: "training-plan-user-a",
    planRevision: 3,
    programStateRef: "derived:abc",
    profileRevision: 2,
    sessions: sessions as TrainingPlanEnvelope["sessions"],
    exerciseCatalogVersion: "v1",
    trainingPolicyVersion: "v1",
    programAlgorithmVersion: "v1",
    exerciseScoringVersion: "v1",
    progressionVersion: "v1",
    algorithmBundleVersion: "v1",
    generatedAt: NOW.toISOString(),
    validity: { validFrom: NOW.toISOString(), expiresAt: new Date(NOW.getTime() + 24 * 3_600_000).toISOString() },
    reasonCodes: ["VALID_TRAINING_SESSION"],
    limitations: [],
    seed: null,
  };
}

function request(localDate: string) {
  return { userId: "user-a", localDate, timezone: "UTC", networkAvailable: true, now: NOW.toISOString() };
}

test("Today source adapts only the canonical Training session dated for today", async () => {
  const sessionToday = {
    semanticSessionId: "session-0903",
    localDate: "2026-09-03",
    purpose: "FULL_BODY",
    expectedDurationMinutes: 40,
    exercises: [],
    reasonCodes: ["VALID_TRAINING_SESSION"],
  };
  const sessionOther = {
    semanticSessionId: "session-0904",
    localDate: "2026-09-04",
    purpose: "UPPER",
    expectedDurationMinutes: 40,
    exercises: [],
    reasonCodes: ["VALID_TRAINING_SESSION"],
  };
  const source = createProductionTodaySource({
    profileService: new ProfileServiceStub(profile()) as unknown as ProfileService,
    dietService: new DietPlanService(undefined, new EmptyConfirmedMealStore()),
    confirmedMealsFor: () => new EmptyConfirmedMealStore(),
    ownerRepositoryForContext: () => ownerRepositoryStub(),
    currentPlanFor: async () => ({ state: "CURRENT" as const, plan: plan([sessionToday, sessionOther]) }),
    now: () => NOW,
  });
  const snapshot = await source(request("2026-09-03"));
  assert.equal(snapshot.domains.training.length, 1);
  const candidate = snapshot.domains.training[0]!.candidate;
  assert.equal(candidate.domain, "TRAINING");
  assert.equal(candidate.type, "TRAINING_SESSION");
  assert.equal((candidate.deepLink as Record<string, unknown>).semanticSessionId, "session-0903");
});

test("Today source yields an empty Training domain when no session is dated today", async () => {
  const source = createProductionTodaySource({
    profileService: new ProfileServiceStub(profile()) as unknown as ProfileService,
    dietService: new DietPlanService(undefined, new EmptyConfirmedMealStore()),
    confirmedMealsFor: () => new EmptyConfirmedMealStore(),
    ownerRepositoryForContext: () => ownerRepositoryStub(),
    currentPlanFor: async () => ({ state: "CURRENT" as const, plan: plan([]) }),
    now: () => NOW,
  });
  const snapshot = await source(request("2026-09-03"));
  assert.equal(snapshot.domains.training.length, 0);
  assert.equal(snapshot.domains.nutrition.length, 0);
});

test("Today source emits no Food/Calendar/Health/Device/Progress fabrication", async () => {
  const source = createProductionTodaySource({
    profileService: new ProfileServiceStub(null) as unknown as ProfileService,
    dietService: new DietPlanService(undefined, new EmptyConfirmedMealStore()),
    confirmedMealsFor: () => new EmptyConfirmedMealStore(),
    ownerRepositoryForContext: () => ownerRepositoryStub(),
    currentPlanFor: async () => ({ state: "NO_CURRENT_PLAN" as const, plan: null }),
    now: () => NOW,
  });
  const snapshot = await source(request("2026-09-03"));
  assert.equal(snapshot.domains.food.length, 0);
  assert.equal(snapshot.domains.nutrition.length, 0);
  assert.equal(snapshot.domains.training.length, 0);
  assert.equal(snapshot.domains.calendar.length, 0);
  assert.equal(snapshot.domains.healthDevice.length, 0);

  const empty = emptyTodaySourceSnapshot();
  const decision = decideToday({
    userId: "user-a",
    localDate: "2026-09-03",
    timezone: "UTC",
    candidates: [
      ...snapshot.domains.food,
      ...snapshot.domains.nutrition,
      ...snapshot.domains.training,
      ...snapshot.domains.calendar,
      ...snapshot.domains.healthDevice,
    ],
    networkAvailable: true,
    now: NOW.toISOString(),
  });
  assert.equal(decision.primaryAction, null);
  assert.deepEqual(empty.domains, snapshot.domains);
});

test("assembled Today source is accepted by buildTodayBundle and ranks a valid training action", async () => {
  const sessionToday = {
    semanticSessionId: "session-0903",
    localDate: "2026-09-03",
    purpose: "FULL_BODY",
    expectedDurationMinutes: 40,
    exercises: [],
    reasonCodes: ["VALID_TRAINING_SESSION"],
  };
  const source = createProductionTodaySource({
    profileService: new ProfileServiceStub(profile()) as unknown as ProfileService,
    dietService: new DietPlanService(undefined, new EmptyConfirmedMealStore()),
    confirmedMealsFor: () => new EmptyConfirmedMealStore(),
    ownerRepositoryForContext: () => ownerRepositoryStub(),
    currentPlanFor: async () => ({ state: "CURRENT" as const, plan: plan([sessionToday]) }),
    now: () => NOW,
  });
  const snapshot = await source(request("2026-09-03"));
  const bundle = buildTodayBundle({ ...request("2026-09-03"), source: snapshot });
  assert.ok(bundle.decision.primaryAction);
  const primary = bundle.decision.primaryAction as DailyActionCandidate;
  assert.equal(primary.domain, "TRAINING");
});
