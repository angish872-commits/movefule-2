import assert from "node:assert/strict";
import test from "node:test";
import type { TodayCandidateInput } from "../../today/contracts.ts";
import type { DailyActionCandidate } from "../../today/contracts.ts";
import { decideToday } from "../../today/decision-orchestrator.ts";
import { projectTodayState, projectWatchToday } from "../../today/projection.ts";
import { emptyTodayDomainCandidateSets, orchestrateToday } from "../../today/runtime.ts";

const NOW = "2026-08-30T04:30:00.000Z";
const LATER = "2026-08-30T06:30:00.000Z";

function candidate(
  candidateId: string,
  domain: DailyActionCandidate["domain"],
  blockingState: DailyActionCandidate["blockingState"] = "NON_BLOCKING",
  overrides: Partial<DailyActionCandidate> = {},
): DailyActionCandidate {
  return {
    schemaVersion: 1,
    candidateId,
    semanticActionKey: `${domain.toLowerCase()}:${candidateId}`,
    userId: "user-a",
    domain,
    type: `${domain}_ACTION`,
    blockingState,
    reasonCodes: [`VALID_${domain}`],
    sourceObjectId: `source-${candidateId}`,
    sourceRevision: "1",
    validFrom: "2026-08-30T03:30:00.000Z",
    expiresAt: LATER,
    requiresNetwork: false,
    deepLink: { destination: domain.toLowerCase() },
    ...overrides,
  };
}

function wrapped(value: DailyActionCandidate, overrides: Partial<Omit<TodayCandidateInput, "candidate">> = {}): TodayCandidateInput {
  return {
    candidate: value,
    domainValidity: "VALID",
    dependencyState: "SATISFIED",
    freshness: "FRESH",
    continuity: "NONE",
    ...overrides,
  };
}

function decide(candidates: TodayCandidateInput[], extras: Partial<Parameters<typeof decideToday>[0]> = {}) {
  return decideToday({
    userId: "user-a",
    localDate: "2026-08-30",
    timezone: "Asia/Kathmandu",
    candidates,
    networkAvailable: true,
    now: NOW,
    ...extras,
  });
}

function rejectionReasons(result: ReturnType<typeof decideToday>): Set<string> {
  return new Set(result.rejections.map((entry) => (entry as { reasonCode: string }).reasonCode));
}

test("1. zero candidates produces a null primary and no filler", () => {
  const result = decide([]);
  assert.equal(result.primaryAction, null);
  assert.deepEqual(result.secondaryActions, []);
});

test("2. phone output is capped at three secondary actions", () => {
  const domains = ["SYSTEM", "DEVICE", "HEALTH", "FOOD", "NUTRITION", "CALENDAR", "TRAINING"] as const;
  const result = decide(domains.map((domain, index) => wrapped(candidate(`c-${index}`, domain))));
  assert.ok(result.primaryAction);
  assert.equal(result.secondaryActions.length, 3);
});

test("3. deterministic replay is independent of input ordering", () => {
  const inputs = [
    wrapped(candidate("nutrition", "NUTRITION")),
    wrapped(candidate("training", "TRAINING")),
    wrapped(candidate("calendar", "CALENDAR")),
  ];
  const first = decide(inputs);
  const second = decide([...inputs].reverse());
  assert.equal(first.decisionId, second.decisionId);
  assert.equal(first.inputRevisionHash, second.inputRevisionHash);
  assert.equal(first.primaryAction?.candidateId, second.primaryAction?.candidateId);
  assert.deepEqual(first.secondaryActions.map((item) => item.candidateId), second.secondaryActions.map((item) => item.candidateId));
});

test("4. semantic duplicates collapse deterministically", () => {
  const newer = candidate("newer", "NUTRITION", "NON_BLOCKING", { semanticActionKey: "nutrition:next-meal", sourceRevision: "2" });
  const older = candidate("older", "NUTRITION", "NON_BLOCKING", { semanticActionKey: "nutrition:next-meal", sourceRevision: "1" });
  const result = decide([wrapped(older), wrapped(newer)]);
  assert.equal(result.primaryAction?.candidateId, "newer");
  assert.ok(result.rejections.some((entry) => (entry as { reasonCode: string }).reasonCode === "SEMANTIC_DUPLICATE"));
});

test("5. expired candidates never appear", () => {
  const result = decide([
    wrapped(candidate("expired", "NUTRITION", "NON_BLOCKING", { expiresAt: NOW })),
    wrapped(candidate("safe", "FOOD")),
  ]);
  assert.equal(result.primaryAction?.candidateId, "safe");
  assert.ok(rejectionReasons(result).has("EXPIRED"));
});

test("6. stale inputs remain stale and cannot enter a fresh decision", () => {
  const result = decide([wrapped(candidate("stale", "FOOD"), { freshness: "STALE" })]);
  assert.equal(result.primaryAction, null);
  assert.ok(rejectionReasons(result).has("STALE_CANDIDATE"));
  const today = projectTodayState({ decision: result, revision: 4, syncState: "OFFLINE", freshness: "STALE", summaries: null });
  assert.equal(today.freshness, "STALE");
  assert.equal(today.primaryAction, null);
});

test("7. a valid active workout continuation outranks unrelated actions without prescription mutation", () => {
  const active = candidate("active-workout", "TRAINING", "NON_BLOCKING", {
    type: "CONTINUE_ACTIVE_WORKOUT",
    sourceObjectId: "session-77",
    sourceRevision: "9",
    deepLink: { destination: "training/session", sessionId: "session-77" },
  });
  const before = structuredClone(active);
  const result = decide([
    wrapped(candidate("device", "DEVICE", "BLOCKING")),
    wrapped(active, { continuity: "ACTIVE_WORKOUT" }),
  ]);
  assert.equal(result.primaryAction?.candidateId, "active-workout");
  assert.deepEqual(active, before);
});

test("8. unresolved meal review blocks only dependent Nutrition action", () => {
  const review = wrapped(candidate("meal-review", "FOOD", "BLOCKING", { type: "REVIEW_MEAL" }));
  const dependentNutrition = wrapped(candidate("nutrition-after-review", "NUTRITION"), { dependencyState: "UNSATISFIED" });
  const result = decide([dependentNutrition, review]);
  assert.equal(result.primaryAction?.candidateId, "meal-review");
  assert.ok(rejectionReasons(result).has("DEPENDENCY_UNSATISFIED"));
});

test("9. missing Training setup fails closed instead of inventing a session", () => {
  const training = wrapped(candidate("training-session", "TRAINING"), { dependencyState: "UNKNOWN" });
  const setup = wrapped(candidate("training-setup", "TRAINING", "BLOCKING", { type: "TRAINING_SETUP" }));
  const result = decide([training, setup]);
  assert.equal(result.primaryAction?.candidateId, "training-setup");
  assert.ok(rejectionReasons(result).has("DEPENDENCY_UNKNOWN"));
  assert.ok(![result.primaryAction, ...result.secondaryActions].some((item) => item?.candidateId === "training-session"));
});

test("10. Calendar conflict affects only candidates declaring that dependency", () => {
  const dependent = wrapped(candidate("dependent-training", "TRAINING"), { calendarDependencyKeys: ["calendar:slot-am"] });
  const unrelated = wrapped(candidate("nutrition", "NUTRITION"));
  const result = decide([dependent, unrelated], { calendarConflictKeys: ["calendar:slot-am"] });
  assert.equal(result.primaryAction?.candidateId, "nutrition");
  assert.ok(rejectionReasons(result).has("CALENDAR_CONFLICT"));
});

test("11. Nutrition hard-policy block remains blocked even with user intent", () => {
  const blocked = wrapped(candidate("blocked-nutrition", "NUTRITION", "BLOCKING"), { domainValidity: "BLOCKED" });
  const safe = wrapped(candidate("safe-food", "FOOD"));
  const result = decide([blocked, safe], { userIntentDomains: ["NUTRITION"] });
  assert.equal(result.primaryAction?.candidateId, "safe-food");
  assert.ok(rejectionReasons(result).has("DOMAIN_BLOCKED"));
});

test("12. Training STOP remains STOP and cannot be ranked back in", () => {
  const stopped = wrapped(candidate("training-stop", "TRAINING", "BLOCKING", { reasonCodes: ["TRAINING_STOP"] }), { domainValidity: "BLOCKED" });
  const nutrition = wrapped(candidate("nutrition", "NUTRITION"));
  const result = decide([stopped, nutrition], { userIntentDomains: ["TRAINING"] });
  assert.equal(result.primaryAction?.candidateId, "nutrition");
  assert.ok(rejectionReasons(result).has("DOMAIN_BLOCKED"));
});

test("13. Food context cannot mutate a Training prescription", () => {
  const training = candidate("training-plan-session", "TRAINING", "NON_BLOCKING", {
    reasonCodes: ["VALID_TRAINING_SESSION"],
    sourceObjectId: "plan-1",
    sourceRevision: "4",
    deepLink: { destination: "training/session", semanticSessionId: "session-1", sets: 4, reps: "6-8" },
  });
  const before = structuredClone(training);
  decide([wrapped(training), wrapped(candidate("food-more", "FOOD", "NON_BLOCKING", { reasonCodes: ["MORE_FOOD_RECORDED"] }))]);
  decide([wrapped(training), wrapped(candidate("food-under", "FOOD", "NON_BLOCKING", { reasonCodes: ["UNDER_FUEL_CONTEXT"] }))]);
  assert.deepEqual(training, before);
});

test("14. undeclared AI suggestions cannot alter deterministic ranking", () => {
  const inputs = [wrapped(candidate("nutrition", "NUTRITION")), wrapped(candidate("training", "TRAINING"))];
  const baseline = decide(inputs);
  const withAiSuggestion = decideToday({
    userId: "user-a",
    localDate: "2026-08-30",
    timezone: "Asia/Kathmandu",
    candidates: inputs,
    networkAvailable: true,
    now: NOW,
    aiSuggestedPrimaryCandidateId: "training",
    aiScoreOverrides: { training: 1_000_000 },
  } as Parameters<typeof decideToday>[0] & { aiSuggestedPrimaryCandidateId: string; aiScoreOverrides: unknown });
  assert.equal(withAiSuggestion.decisionId, baseline.decisionId);
  assert.equal(withAiSuggestion.primaryAction?.candidateId, baseline.primaryAction?.candidateId);
});

test("15. UNKNOWN remains UNKNOWN and fails closed", () => {
  const result = decide([
    wrapped(candidate("unknown-domain", "NUTRITION"), { domainValidity: "UNKNOWN" }),
    wrapped(candidate("unknown-dependency", "TRAINING"), { dependencyState: "UNKNOWN" }),
    wrapped(candidate("unknown-freshness", "HEALTH"), { freshness: "UNKNOWN" }),
  ]);
  assert.equal(result.primaryAction, null);
  const reasons = rejectionReasons(result);
  assert.ok(reasons.has("DOMAIN_VALIDITY_UNKNOWN"));
  assert.ok(reasons.has("DEPENDENCY_UNKNOWN"));
  assert.ok(reasons.has("FRESHNESS_UNKNOWN"));
});

test("16. domain aggregation cannot manufacture a fake filler action", () => {
  const result = orchestrateToday({
    userId: "user-a",
    localDate: "2026-08-30",
    timezone: "Asia/Kathmandu",
    domains: emptyTodayDomainCandidateSets(),
    networkAvailable: true,
    now: NOW,
  });
  assert.equal(result.primaryAction, null);
  assert.deepEqual(result.secondaryActions, []);
  assert.equal(result.rejections.length, 0);
});

test("17. cross-user candidates are rejected", () => {
  const result = decide([wrapped(candidate("foreign", "SYSTEM", "BLOCKING", { userId: "user-b" }))]);
  assert.equal(result.primaryAction, null);
  assert.ok(rejectionReasons(result).has("CROSS_USER_CANDIDATE"));
});

test("conflicting valid actions compete deterministically without changing domain content", () => {
  const calendar = candidate("calendar", "CALENDAR");
  const training = candidate("training", "TRAINING");
  const result = decide([
    wrapped(training, { conflictKey: "slot:morning" }),
    wrapped(calendar, { conflictKey: "slot:morning" }),
  ]);
  assert.equal(result.primaryAction?.candidateId, "calendar");
  assert.ok(rejectionReasons(result).has("CONFLICT_LOST"));
});

test("TodayState and WatchTodayProjection preserve the canonical ranking", () => {
  const decision = decide([
    wrapped(candidate("food", "FOOD")),
    wrapped(candidate("nutrition", "NUTRITION")),
    wrapped(candidate("training", "TRAINING")),
  ]);
  const today = projectTodayState({ decision, revision: 7, syncState: "SYNCED", freshness: "FRESH", summaries: null });
  const watch = projectWatchToday({ today, generatedAt: NOW, activeWorkout: { sessionId: "session-active" } });
  assert.equal(today.primaryAction?.candidateId, decision.primaryAction?.candidateId);
  assert.deepEqual(today.secondaryActions.map((item) => item.candidateId), decision.secondaryActions.map((item) => item.candidateId));
  assert.equal(watch.primaryAction?.candidateId, today.primaryAction?.candidateId);
  assert.equal(watch.secondaryAction?.candidateId, today.secondaryActions[0]?.candidateId ?? null);
  assert.deepEqual(watch.activeWorkout, { sessionId: "session-active" });
  assert.equal(watch.sourceTodayRevision, 7);
});
