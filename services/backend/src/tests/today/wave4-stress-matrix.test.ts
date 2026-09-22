import assert from "node:assert/strict";
import test from "node:test";
import type { DailyActionCandidate, TodayCandidateInput, TodayDecisionInput } from "../../today/contracts.ts";
import { decideToday } from "../../today/decision-orchestrator.ts";

const NOW = "2026-09-01T10:00:00.000Z";

type DomainCase = {
  readonly name: string;
  readonly domain: DailyActionCandidate["domain"];
  readonly type: string;
};

const DOMAINS: readonly DomainCase[] = [
  { name: "food", domain: "FOOD", type: "CONFIRM_MEAL" },
  { name: "nutrition", domain: "NUTRITION", type: "CHOOSE_NEXT_MEAL" },
  { name: "training", domain: "TRAINING", type: "START_WORKOUT" },
  { name: "calendar", domain: "CALENDAR", type: "RESOLVE_CALENDAR_CONFLICT" },
  { name: "health-device", domain: "HEALTH", type: "RESTORE_PERMISSION" },
  { name: "missing-information", domain: "SYSTEM", type: "ANSWER_MISSING_INFORMATION" },
];

function candidate(definition: DomainCase, suffix: string): DailyActionCandidate {
  return {
    schemaVersion: 1,
    candidateId: `${definition.name}-${suffix}`,
    semanticActionKey: `${definition.name}:${suffix}`,
    userId: "user-a",
    domain: definition.domain,
    type: definition.type,
    blockingState: "NON_BLOCKING",
    reasonCodes: [`${definition.name.toUpperCase()}_VALID`],
    sourceObjectId: `${definition.name}-source-${suffix}`,
    sourceRevision: "1",
    validFrom: "2026-09-01T09:00:00.000Z",
    expiresAt: "2026-09-01T11:00:00.000Z",
    requiresNetwork: false,
    deepLink: { destination: definition.name, id: suffix },
  };
}

function entry(definition: DomainCase, suffix: string): TodayCandidateInput {
  return {
    candidate: candidate(definition, suffix),
    domainValidity: "VALID",
    dependencyState: "SATISFIED",
    freshness: "FRESH",
    continuity: "NONE",
  };
}

function decide(candidates: readonly TodayCandidateInput[], overrides: Partial<TodayDecisionInput> = {}) {
  return decideToday({
    userId: "user-a",
    localDate: "2026-09-01",
    timezone: "Asia/Kathmandu",
    candidates,
    networkAvailable: true,
    now: NOW,
    ...overrides,
  });
}

function reasonFor(result: ReturnType<typeof decide>, candidateId: string): string | undefined {
  return result.rejections
    .map((value) => value as { candidateId?: string; reasonCode?: string })
    .find((value) => value.candidateId === candidateId)?.reasonCode;
}

test("Wave-4 admission matrix rejects invalid candidates across every Today source class", () => {
  const fallbackDefinition: DomainCase = { name: "fallback-device", domain: "DEVICE", type: "CONNECT_DEVICE" };
  let cases = 0;

  for (const definition of DOMAINS) {
    const variants: readonly [string, (base: TodayCandidateInput) => TodayCandidateInput, string, Partial<TodayDecisionInput>?][] = [
      ["safety-blocked", (base) => ({ ...base, domainValidity: "BLOCKED" }), "DOMAIN_BLOCKED"],
      ["stale", (base) => ({ ...base, freshness: "STALE" }), "STALE_CANDIDATE"],
      ["partial", (base) => ({ ...base, freshness: "PARTIAL" }), "PARTIAL_CANDIDATE"],
      ["offline-cached", (base) => ({ ...base, freshness: "OFFLINE_CACHED" }), "OFFLINE_CACHED_CANDIDATE"],
      ["dependency-unknown", (base) => ({ ...base, dependencyState: "UNKNOWN" }), "DEPENDENCY_UNKNOWN"],
      ["expired", (base) => ({ ...base, candidate: { ...base.candidate, expiresAt: NOW } }), "EXPIRED"],
      ["wrong-owner", (base) => ({ ...base, candidate: { ...base.candidate, userId: "user-b" } }), "CROSS_USER_CANDIDATE"],
      ["network-unavailable", (base) => ({ ...base, candidate: { ...base.candidate, requiresNetwork: true } }), "NETWORK_REQUIRED", { networkAvailable: false }],
    ];

    for (const [variantName, mutate, expectedReason, requestOverrides] of variants) {
      const invalid = mutate(entry(definition, variantName));
      const fallback = entry(fallbackDefinition, `${definition.name}-${variantName}`);
      const result = decide([invalid, fallback], requestOverrides ?? {});

      assert.equal(result.primaryAction?.candidateId, fallback.candidate.candidateId, `${definition.name}/${variantName}`);
      assert.equal(reasonFor(result, invalid.candidate.candidateId), expectedReason, `${definition.name}/${variantName}`);
      assert.ok(![result.primaryAction, ...result.secondaryActions].some(
        (selected) => selected?.candidateId === invalid.candidate.candidateId,
      ));
      cases += 1;
    }
  }

  assert.equal(cases, 48);
});

test("Wave-4 pair matrix ranks only eligible cross-domain candidates deterministically", () => {
  let cases = 0;
  for (const leftDefinition of DOMAINS) {
    for (const rightDefinition of DOMAINS) {
      const left = entry(leftDefinition, `pair-left-${rightDefinition.name}`);
      const right = entry(rightDefinition, `pair-right-${leftDefinition.name}`);
      const first = decide([left, right]);
      const second = decide([right, left]);

      assert.ok(first.primaryAction);
      assert.ok(second.primaryAction);
      assert.equal(first.primaryAction?.candidateId, second.primaryAction?.candidateId);
      assert.deepEqual(
        first.secondaryActions.map((value) => value.candidateId),
        second.secondaryActions.map((value) => value.candidateId),
      );
      assert.equal(first.inputRevisionHash, second.inputRevisionHash);
      assert.equal(first.decisionId, second.decisionId);
      cases += 1;
    }
  }
  assert.equal(cases, 36);
});

test("blocking safety candidate cannot be resurrected by intent or rank weight", () => {
  const blockedSystem = entry(
    { name: "blocked-system", domain: "SYSTEM", type: "ANSWER_MISSING_INFORMATION" },
    "unsafe",
  );
  const safeTraining = entry({ name: "safe-training", domain: "TRAINING", type: "START_WORKOUT" }, "safe");
  const result = decide(
    [{ ...blockedSystem, domainValidity: "BLOCKED", candidate: { ...blockedSystem.candidate, blockingState: "BLOCKING" } }, safeTraining],
    { userIntentDomains: ["SYSTEM"] },
  );

  assert.equal(result.primaryAction?.candidateId, safeTraining.candidate.candidateId);
  assert.equal(reasonFor(result, blockedSystem.candidate.candidateId), "DOMAIN_BLOCKED");
});

test("Calendar conflict invalidates only explicitly dependent candidate", () => {
  const training = { ...entry(DOMAINS[2], "calendar-dependent"), calendarDependencyKeys: ["slot-1"] };
  const nutrition = { ...entry(DOMAINS[1], "calendar-independent"), calendarDependencyKeys: ["slot-2"] };
  const result = decide([training, nutrition], { calendarConflictKeys: ["slot-1"] });

  assert.equal(result.primaryAction?.candidateId, nutrition.candidate.candidateId);
  assert.equal(reasonFor(result, training.candidate.candidateId), "CALENDAR_CONFLICT");
});

test("no eligible candidate produces a true empty Today decision", () => {
  const invalid = DOMAINS.map((definition, index) => ({
    ...entry(definition, `empty-${index}`),
    freshness: "STALE" as const,
  }));
  const result = decide(invalid);

  assert.equal(result.primaryAction, null);
  assert.deepEqual(result.secondaryActions, []);
  assert.equal(result.rejections.length, DOMAINS.length);
});
