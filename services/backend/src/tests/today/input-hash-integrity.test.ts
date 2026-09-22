import assert from "node:assert/strict";
import test from "node:test";
import type { DailyActionCandidate, TodayCandidateInput, TodayDecisionInput } from "../../today/contracts.ts";
import { decideToday } from "../../today/decision-orchestrator.ts";

const NOW = "2026-09-01T04:00:00.000Z";

function makeCandidate(overrides: Partial<DailyActionCandidate> = {}): DailyActionCandidate {
  return {
    schemaVersion: 1,
    candidateId: "candidate-1",
    semanticActionKey: "nutrition:next-meal",
    userId: "user-a",
    domain: "NUTRITION",
    type: "CHOOSE_NEXT_MEAL",
    blockingState: "NON_BLOCKING",
    reasonCodes: ["VALID_NUTRITION_ACTION"],
    sourceObjectId: "recommendation-1",
    sourceRevision: "5",
    validFrom: "2026-09-01T03:00:00.000Z",
    expiresAt: "2026-09-01T05:00:00.000Z",
    requiresNetwork: false,
    deepLink: { destination: "fuel/recommendation", recommendationId: "recommendation-1" },
    ...overrides,
  };
}

function makeInput(
  candidateOverrides: Partial<DailyActionCandidate> = {},
  entryOverrides: Partial<TodayCandidateInput> = {},
  requestOverrides: Partial<TodayDecisionInput> = {},
): TodayDecisionInput {
  const entry: TodayCandidateInput = {
    candidate: makeCandidate(candidateOverrides),
    domainValidity: "VALID",
    dependencyState: "SATISFIED",
    freshness: "FRESH",
    continuity: "NONE",
    calendarDependencyKeys: ["calendar:workout-slot"],
    ...entryOverrides,
  };
  return {
    userId: "user-a",
    localDate: "2026-09-01",
    timezone: "Asia/Kathmandu",
    candidates: [entry],
    userIntentDomains: ["NUTRITION"],
    calendarConflictKeys: [],
    networkAvailable: true,
    now: NOW,
    ...requestOverrides,
  };
}

function assertHashChanges(label: string, mutated: TodayDecisionInput): void {
  const baseline = decideToday(makeInput());
  const changed = decideToday(mutated);
  assert.notEqual(changed.inputRevisionHash, baseline.inputRevisionHash, `${label}: inputRevisionHash`);
  assert.notEqual(changed.decisionId, baseline.decisionId, `${label}: decisionId`);
}

test("decision hash changes for every candidate-level decision input", () => {
  const cases: readonly [string, TodayDecisionInput][] = [
    ["schema version", makeInput({ schemaVersion: 2 })],
    ["candidate id", makeInput({ candidateId: "candidate-2" })],
    ["semantic action", makeInput({ semanticActionKey: "nutrition:other-meal" })],
    ["owner", makeInput({ userId: "user-b" })],
    ["domain/ranking score", makeInput({ domain: "FOOD" })],
    ["action type", makeInput({ type: "VIEW_NUTRITION_OPTION" })],
    ["blocking state/ranking score", makeInput({ blockingState: "BLOCKING" })],
    ["reason code", makeInput({ reasonCodes: ["DIFFERENT_REASON"] })],
    ["source object", makeInput({ sourceObjectId: "recommendation-2" })],
    ["source revision", makeInput({ sourceRevision: "6" })],
    ["valid from", makeInput({ validFrom: "2026-09-01T03:30:00.000Z" })],
    ["expiry", makeInput({ expiresAt: "2026-09-01T04:30:00.000Z" })],
    ["network requirement", makeInput({ requiresNetwork: true })],
    ["deep link", makeInput({ deepLink: { destination: "fuel/recommendation", recommendationId: "other" } })],
    ["domain validity", makeInput({}, { domainValidity: "BLOCKED" })],
    ["dependency state", makeInput({}, { dependencyState: "UNKNOWN" })],
    ["freshness", makeInput({}, { freshness: "STALE" })],
    ["conflict key", makeInput({}, { conflictKey: "exclusive:meal" })],
    ["calendar dependency", makeInput({}, { calendarDependencyKeys: ["calendar:different-slot"] })],
    ["continuity", makeInput({ domain: "TRAINING" }, { continuity: "ACTIVE_WORKOUT" })],
  ];

  for (const [label, input] of cases) assertHashChanges(label, input);
});

test("decision hash changes for every request-level decision input", () => {
  const cases: readonly [string, TodayDecisionInput][] = [
    ["request owner", makeInput({}, {}, { userId: "user-b" })],
    ["local date", makeInput({}, {}, { localDate: "2026-09-02" })],
    ["timezone", makeInput({}, {}, { timezone: "UTC" })],
    ["decision instant", makeInput({}, {}, { now: "2026-09-01T04:01:00.000Z" })],
    ["network availability", makeInput({}, {}, { networkAvailable: false })],
    ["ranking intent/score input", makeInput({}, {}, { userIntentDomains: ["TRAINING"] })],
    ["calendar conflict set", makeInput({}, {}, { calendarConflictKeys: ["calendar:workout-slot"] })],
  ];

  for (const [label, input] of cases) assertHashChanges(label, input);
});

test("decision instant hash changes even before it changes eligibility", () => {
  const first = decideToday(makeInput());
  const second = decideToday(makeInput({}, {}, { now: "2026-09-01T04:00:01.000Z" }));
  assert.equal(first.primaryAction?.candidateId, second.primaryAction?.candidateId);
  assert.notEqual(first.inputRevisionHash, second.inputRevisionHash);
});

test("decision instant can change eligibility and cannot reuse the same hash", () => {
  const beforeExpiry = decideToday(makeInput({}, {}, { now: "2026-09-01T04:59:59.000Z" }));
  const atExpiry = decideToday(makeInput({}, {}, { now: "2026-09-01T05:00:00.000Z" }));
  assert.equal(beforeExpiry.primaryAction?.candidateId, "candidate-1");
  assert.equal(atExpiry.primaryAction, null);
  assert.notEqual(beforeExpiry.inputRevisionHash, atExpiry.inputRevisionHash);
});
