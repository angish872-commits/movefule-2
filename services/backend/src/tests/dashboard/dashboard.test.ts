import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardEnvelope } from "../../dashboard/dashboard.ts";
import type { ConfirmedMeal } from "../../meal/contracts.ts";
import type { ProfileResult } from "../../foundation/profile.ts";
import type { DailyDecisionEnvelope } from "../../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

const profile = (confirmed = true): ProfileResult => ({
  userId: "user-a",
  source: "local_fixture",
  profile: { displayName: "ANN", timeZone: "Asia/Kathmandu", trainingFrequency: "4" },
  onboarding: {},
  preferences: {},
  goal: { goalType: "gain" },
  target: confirmed ? { energyKcal: 2400, proteinG: 150, movementTarget: 30, userConfirmed: true, formulaVersion: "target-engine-v1" } : null,
});

const meal: ConfirmedMeal = {
  mealId: "meal-1", userId: "user-a", localDate: "2026-08-07", mealType: "lunch", status: "CONFIRMED", currentRevision: 1,
  sourceDraftId: "draft-1", items: [], totals: { energyKcal: 800, proteinGrams: 45, carbGrams: 90, fatGrams: 25, fiberGrams: 9 },
  confirmedAtEpochMillis: Date.parse("2026-08-07T06:00:00Z"), createdAtEpochMillis: 1, updatedAtEpochMillis: 1,
};

const decision: DailyDecisionEnvelope = {
  schemaVersion: 1,
  decisionId: "decision-1",
  userId: "user-a",
  localDate: "2026-08-07",
  timezone: "Asia/Kathmandu",
  primaryAction: {
    schemaVersion: 1,
    candidateId: "nutrition-1",
    semanticActionKey: "nutrition:next-meal:1",
    userId: "user-a",
    domain: "NUTRITION",
    type: "NEXT_MEAL",
    blockingState: "NON_BLOCKING",
    reasonCodes: ["VALID_NUTRITION_ACTION"],
    sourceObjectId: "recommendation-1",
    sourceRevision: "3",
    validFrom: "2026-08-07T00:00:00.000Z",
    expiresAt: "2026-08-08T00:00:00.000Z",
    requiresNetwork: false,
    deepLink: { destination: "fuel" },
  },
  secondaryActions: [],
  rejections: [],
  inputRevisionHash: "hash-1",
  orchestratorPolicyVersion: "test",
  rankingVersion: "test",
  generatedAt: "2026-08-07T06:00:00.000Z",
  expiresAt: "2026-08-08T00:00:00.000Z",
};

test("dashboard uses profile name, reviewed targets and confirmed meal totals", () => {
  const result = buildDashboardEnvelope({ localDate: "2026-08-07", profile: profile(), meals: [meal], health: [], workouts: [], decision, nowEpochMillis: 10 });
  assert.equal(result.user.displayName, "ANN");
  assert.equal(result.targets?.energyKcal, 2400);
  assert.equal(result.actual.energyKcal, 800);
  assert.equal(result.remaining?.proteinGrams, 105);
  assert.equal(result.nextAction?.candidateId, "nutrition-1");
});

test("dashboard never invents generic targets or a local action when canonical state is unavailable", () => {
  const result = buildDashboardEnvelope({ localDate: "2026-08-07", profile: profile(false), meals: [], health: [], workouts: [] });
  assert.equal(result.targets, null);
  assert.equal(result.remaining, null);
  assert.equal(result.nextAction, null);
});

test("dashboard preserves an absent movement target as unknown instead of inventing 30 minutes", () => {
  const profileResult = profile(true);
  profileResult.target = { ...profileResult.target!, movementTarget: null };
  const dashboard = buildDashboardEnvelope({
    localDate: "2026-08-29",
    profile: profileResult,
    meals: [],
    health: [],
    workouts: [],
  });
  assert.equal(dashboard.targets?.movementMinutes, null);
});

test("dashboard rejects a cross-user canonical decision", () => {
  const foreign = { ...decision, userId: "user-b", primaryAction: decision.primaryAction ? { ...decision.primaryAction, userId: "user-b" } : null };
  const result = buildDashboardEnvelope({ localDate: "2026-08-07", profile: profile(), meals: [meal], health: [], workouts: [], decision: foreign });
  assert.equal(result.nextAction, null);
});
