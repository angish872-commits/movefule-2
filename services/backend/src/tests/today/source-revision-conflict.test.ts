import assert from "node:assert/strict";
import test from "node:test";
import type { DailyActionCandidate, TodayCandidateInput } from "../../today/contracts.ts";
import { decideToday } from "../../today/decision-orchestrator.ts";

const NOW = "2026-09-01T04:00:00.000Z";

function candidate(
  candidateId: string,
  deepLink: DailyActionCandidate["deepLink"],
  overrides: Partial<DailyActionCandidate> = {},
): DailyActionCandidate {
  return {
    schemaVersion: 1,
    candidateId,
    semanticActionKey: "training:session-42:start",
    userId: "user-a",
    domain: "TRAINING",
    type: "START_WORKOUT",
    blockingState: "NON_BLOCKING",
    reasonCodes: ["CANONICAL_TRAINING_SESSION"],
    sourceObjectId: "session-42",
    sourceRevision: "7",
    validFrom: "2026-09-01T03:00:00.000Z",
    expiresAt: "2026-09-01T05:00:00.000Z",
    requiresNetwork: false,
    deepLink,
    ...overrides,
  };
}

function wrapped(value: DailyActionCandidate, overrides: Partial<TodayCandidateInput> = {}): TodayCandidateInput {
  return {
    candidate: value,
    domainValidity: "VALID",
    dependencyState: "SATISFIED",
    freshness: "FRESH",
    continuity: "NONE",
    ...overrides,
  };
}

function decide(candidates: readonly TodayCandidateInput[]) {
  return decideToday({
    userId: "user-a",
    localDate: "2026-09-01",
    timezone: "Asia/Kathmandu",
    candidates,
    networkAvailable: true,
    now: NOW,
  });
}

function rejectionReasons(result: ReturnType<typeof decide>, candidateId?: string): string[] {
  return result.rejections
    .filter((entry) => !candidateId || (entry as { candidateId?: string }).candidateId === candidateId)
    .map((entry) => (entry as { reasonCode?: string }).reasonCode ?? "")
    .filter(Boolean);
}

test("same semantic action and source revision with conflicting payload fails closed", () => {
  const result = decide([
    wrapped(candidate("candidate-a", { destination: "training/session", sessionId: "session-42", plannedSets: 3 })),
    wrapped(candidate("candidate-b", { destination: "training/session", sessionId: "session-42", plannedSets: 5 })),
  ]);

  assert.equal(result.primaryAction, null);
  assert.deepEqual(result.secondaryActions, []);
  assert.equal(rejectionReasons(result).filter((reason) => reason === "SOURCE_REVISION_CONFLICT").length, 2);
});

test("same-revision conflicting payload fails closed even when one representation is stale", () => {
  const result = decide([
    wrapped(candidate("fresh", { destination: "training/session", sessionId: "session-42", plannedSets: 3 })),
    wrapped(
      candidate("stale-conflict", { destination: "training/session", sessionId: "session-42", plannedSets: 5 }),
      { freshness: "STALE" },
    ),
  ]);

  assert.equal(result.primaryAction, null);
  assert.deepEqual(rejectionReasons(result, "fresh"), ["SOURCE_REVISION_CONFLICT"]);
  assert.deepEqual(rejectionReasons(result, "stale-conflict"), ["SOURCE_REVISION_CONFLICT"]);
});

test("same-revision conflicting payload fails closed even when one representation is safety blocked", () => {
  const result = decide([
    wrapped(candidate("eligible", { destination: "training/session", sessionId: "session-42", plannedSets: 3 })),
    wrapped(
      candidate("blocked-conflict", { destination: "training/session", sessionId: "session-42", plannedSets: 5 }),
      { domainValidity: "BLOCKED" },
    ),
  ]);

  assert.equal(result.primaryAction, null);
  assert.deepEqual(rejectionReasons(result, "eligible"), ["SOURCE_REVISION_CONFLICT"]);
  assert.deepEqual(rejectionReasons(result, "blocked-conflict"), ["SOURCE_REVISION_CONFLICT"]);
});

test("foreign owner cannot poison authenticated owner's source revision", () => {
  const owner = wrapped(candidate("owner", { destination: "training/session", sessionId: "session-42", plannedSets: 3 }));
  const foreign = wrapped(candidate(
    "foreign",
    { destination: "training/session", sessionId: "session-42", plannedSets: 99 },
    { userId: "user-b" },
  ));
  const result = decide([owner, foreign]);

  assert.equal(result.primaryAction?.candidateId, "owner");
  assert.ok(!rejectionReasons(result, "owner").includes("SOURCE_REVISION_CONFLICT"));
  assert.deepEqual(rejectionReasons(result, "foreign"), ["CROSS_USER_CANDIDATE"]);
});

test("same-revision identical duplicates still collapse normally", () => {
  const sharedDeepLink = { destination: "training/session", sessionId: "session-42", plannedSets: 3 };
  const result = decide([
    wrapped(candidate("candidate-a", sharedDeepLink)),
    wrapped(candidate("candidate-b", sharedDeepLink)),
  ]);

  assert.ok(result.primaryAction);
  assert.equal(result.secondaryActions.length, 0);
  assert.ok(rejectionReasons(result).includes("SEMANTIC_DUPLICATE"));
  assert.ok(!rejectionReasons(result).includes("SOURCE_REVISION_CONFLICT"));
});
