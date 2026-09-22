import type { DailyActionCandidate, DailyDecisionEnvelope, JsonValue } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import { sha256 } from "../domain/sync-store.ts";
import type { TodayCandidateInput, TodayDecisionInput, TodayRejection } from "./contracts.ts";

export const TODAY_ORCHESTRATOR_POLICY_VERSION = "movefuel-today-orchestrator-2026-08-v2";
export const TODAY_RANKING_VERSION = "movefuel-today-ranking-2026-08-v2";

const DOMAIN_WEIGHT: Readonly<Record<DailyActionCandidate["domain"], number>> = Object.freeze({
  SYSTEM: 80,
  DEVICE: 75,
  HEALTH: 70,
  FOOD: 65,
  NUTRITION: 60,
  CALENDAR: 55,
  TRAINING: 50,
  PROGRESS: 45,
});

const BLOCKING_WEIGHT: Readonly<Record<DailyActionCandidate["blockingState"], number>> = Object.freeze({
  BLOCKING: 300,
  INTERRUPTIVE: 200,
  NON_BLOCKING: 100,
});

const ACTIVE_WORKOUT_CONTINUITY_WEIGHT = 1_000;

function parseTime(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceRevisionOrder(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rankScore(input: TodayCandidateInput, intent: ReadonlySet<DailyActionCandidate["domain"]>): number {
  return (input.continuity === "ACTIVE_WORKOUT" ? ACTIVE_WORKOUT_CONTINUITY_WEIGHT : 0)
    + BLOCKING_WEIGHT[input.candidate.blockingState]
    + DOMAIN_WEIGHT[input.candidate.domain]
    + (intent.has(input.candidate.domain) ? 25 : 0);
}

function compareRank(
  left: TodayCandidateInput,
  right: TodayCandidateInput,
  intent: ReadonlySet<DailyActionCandidate["domain"]>,
): number {
  const scoreDifference = rankScore(right, intent) - rankScore(left, intent);
  if (scoreDifference !== 0) return scoreDifference;
  const semantic = left.candidate.semanticActionKey.localeCompare(right.candidate.semanticActionKey);
  if (semantic !== 0) return semantic;
  const leftRevision = sourceRevisionOrder(left.candidate.sourceRevision);
  const rightRevision = sourceRevisionOrder(right.candidate.sourceRevision);
  if (leftRevision !== null && rightRevision !== null && leftRevision !== rightRevision) return rightRevision - leftRevision;
  const revision = right.candidate.sourceRevision.localeCompare(left.candidate.sourceRevision);
  if (revision !== 0) return revision;
  return left.candidate.candidateId.localeCompare(right.candidate.candidateId);
}

function reject(rejections: TodayRejection[], candidateId: string, reasonCode: TodayRejection["reasonCode"]): void {
  rejections.push(Object.freeze({ candidateId, reasonCode }));
}

function hasCalendarConflict(input: TodayCandidateInput, request: TodayDecisionInput): boolean {
  const conflicts = new Set((request.calendarConflictKeys ?? []).map((value) => value.trim()).filter(Boolean));
  if (conflicts.size === 0) return false;
  return (input.calendarDependencyKeys ?? []).some((key) => conflicts.has(key.trim()));
}

function baseValidity(input: TodayCandidateInput, request: TodayDecisionInput, rejections: TodayRejection[]): boolean {
  const candidate = input.candidate;
  if (candidate.userId !== request.userId) {
    reject(rejections, candidate.candidateId, "CROSS_USER_CANDIDATE");
    return false;
  }
  if (input.domainValidity === "BLOCKED") {
    reject(rejections, candidate.candidateId, "DOMAIN_BLOCKED");
    return false;
  }
  if (input.domainValidity === "UNKNOWN") {
    reject(rejections, candidate.candidateId, "DOMAIN_VALIDITY_UNKNOWN");
    return false;
  }
  if (input.dependencyState === "UNSATISFIED") {
    reject(rejections, candidate.candidateId, "DEPENDENCY_UNSATISFIED");
    return false;
  }
  if (input.dependencyState === "UNKNOWN") {
    reject(rejections, candidate.candidateId, "DEPENDENCY_UNKNOWN");
    return false;
  }
  if (input.freshness === "STALE") {
    reject(rejections, candidate.candidateId, "STALE_CANDIDATE");
    return false;
  }
  if (input.freshness === "PARTIAL") {
    reject(rejections, candidate.candidateId, "PARTIAL_CANDIDATE");
    return false;
  }
  if (input.freshness === "UNKNOWN") {
    reject(rejections, candidate.candidateId, "FRESHNESS_UNKNOWN");
    return false;
  }
  if (input.freshness === "OFFLINE_CACHED") {
    reject(rejections, candidate.candidateId, "OFFLINE_CACHED_CANDIDATE");
    return false;
  }
  if (hasCalendarConflict(input, request)) {
    reject(rejections, candidate.candidateId, "CALENDAR_CONFLICT");
    return false;
  }
  if (input.continuity === "ACTIVE_WORKOUT" && candidate.domain !== "TRAINING") {
    reject(rejections, candidate.candidateId, "INVALID_CONTINUITY_DOMAIN");
    return false;
  }
  if (!candidate.sourceObjectId.trim() || !candidate.sourceRevision.trim() || !candidate.semanticActionKey.trim()) {
    reject(rejections, candidate.candidateId, "MISSING_PROVENANCE");
    return false;
  }
  const now = parseTime(request.now);
  const validFrom = parseTime(candidate.validFrom);
  const expiresAt = parseTime(candidate.expiresAt);
  if (now === null || validFrom === null || expiresAt === null || expiresAt <= validFrom) {
    reject(rejections, candidate.candidateId, "INVALID_VALIDITY_WINDOW");
    return false;
  }
  if (validFrom > now) {
    reject(rejections, candidate.candidateId, "NOT_YET_VALID");
    return false;
  }
  if (expiresAt <= now) {
    reject(rejections, candidate.candidateId, "EXPIRED");
    return false;
  }
  if (candidate.requiresNetwork && !request.networkAvailable) {
    reject(rejections, candidate.candidateId, "NETWORK_REQUIRED");
    return false;
  }
  return true;
}

function candidateRevisionKey(candidate: DailyActionCandidate): string {
  return `${candidate.userId}\u0000${candidate.semanticActionKey}\u0000${candidate.sourceObjectId}\u0000${candidate.sourceRevision}`;
}

function candidateRevisionPayloadHash(candidate: DailyActionCandidate): string {
  return sha256({
    semanticActionKey: candidate.semanticActionKey,
    userId: candidate.userId,
    domain: candidate.domain,
    type: candidate.type,
    blockingState: candidate.blockingState,
    reasonCodes: [...candidate.reasonCodes].sort(),
    sourceObjectId: candidate.sourceObjectId,
    sourceRevision: candidate.sourceRevision,
    validFrom: candidate.validFrom,
    expiresAt: candidate.expiresAt,
    requiresNetwork: candidate.requiresNetwork,
    deepLink: candidate.deepLink,
  });
}

/**
 * Detect source-integrity conflicts before eligibility filtering. A stale,
 * blocked, or otherwise inadmissible representation must not hide a conflicting
 * payload for the same authenticated owner's semantic source revision. Foreign
 * owners are deliberately excluded so they cannot poison the owner's valid
 * action; they are still rejected independently by baseValidity().
 */
function rejectConflictingSourceRevisions(
  candidates: readonly TodayCandidateInput[],
  expectedUserId: string,
  rejections: TodayRejection[],
): TodayCandidateInput[] {
  const groups = new Map<string, TodayCandidateInput[]>();
  for (const entry of candidates) {
    if (entry.candidate.userId !== expectedUserId) continue;
    const key = candidateRevisionKey(entry.candidate);
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  const conflictedCandidateIds = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const hashes = new Set(group.map((entry) => candidateRevisionPayloadHash(entry.candidate)));
    if (hashes.size < 2) continue;
    for (const entry of group) {
      conflictedCandidateIds.add(entry.candidate.candidateId);
      reject(rejections, entry.candidate.candidateId, "SOURCE_REVISION_CONFLICT");
    }
  }
  return candidates.filter((entry) => !conflictedCandidateIds.has(entry.candidate.candidateId));
}

function inputHash(request: TodayDecisionInput): string {
  const normalized = [...request.candidates]
    .map((entry) => ({
      schemaVersion: entry.candidate.schemaVersion,
      candidateId: entry.candidate.candidateId,
      semanticActionKey: entry.candidate.semanticActionKey,
      userId: entry.candidate.userId,
      domain: entry.candidate.domain,
      type: entry.candidate.type,
      blockingState: entry.candidate.blockingState,
      sourceObjectId: entry.candidate.sourceObjectId,
      sourceRevision: entry.candidate.sourceRevision,
      validFrom: entry.candidate.validFrom,
      expiresAt: entry.candidate.expiresAt,
      requiresNetwork: entry.candidate.requiresNetwork,
      reasonCodes: [...entry.candidate.reasonCodes].sort(),
      deepLink: entry.candidate.deepLink,
      domainValidity: entry.domainValidity,
      dependencyState: entry.dependencyState,
      freshness: entry.freshness,
      conflictKey: entry.conflictKey ?? null,
      calendarDependencyKeys: [...(entry.calendarDependencyKeys ?? [])].sort(),
      continuity: entry.continuity ?? "NONE",
    }))
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  return sha256({
    userId: request.userId,
    localDate: request.localDate,
    timezone: request.timezone,
    now: request.now,
    networkAvailable: request.networkAvailable,
    userIntentDomains: [...(request.userIntentDomains ?? [])].sort(),
    calendarConflictKeys: [...(request.calendarConflictKeys ?? [])].sort(),
    candidates: normalized,
    policyVersion: TODAY_ORCHESTRATOR_POLICY_VERSION,
    rankingVersion: TODAY_RANKING_VERSION,
  });
}

/**
 * Cross-domain prioritization only. Domain engines remain authoritative for
 * candidate validity and content; this function can reject but never repair,
 * mutate, prescribe, or resurrect a blocked/unknown candidate. It has no AI
 * dependency and ignores undeclared runtime properties.
 */
export function decideToday(request: TodayDecisionInput): DailyDecisionEnvelope {
  const nowMs = parseTime(request.now);
  if (nowMs === null) throw new Error("today_invalid_now");
  const intent = new Set(request.userIntentDomains ?? []);
  const rejections: TodayRejection[] = [];
  const conflictFree = rejectConflictingSourceRevisions(request.candidates, request.userId, rejections);
  const eligible = conflictFree
    .filter((entry) => baseValidity(entry, request, rejections))
    .sort((left, right) => compareRank(left, right, intent));

  const deduplicated: TodayCandidateInput[] = [];
  const semanticKeys = new Set<string>();
  const conflictKeys = new Set<string>();
  for (const entry of eligible) {
    const candidate = entry.candidate;
    if (semanticKeys.has(candidate.semanticActionKey)) {
      reject(rejections, candidate.candidateId, "SEMANTIC_DUPLICATE");
      continue;
    }
    const conflictKey = entry.conflictKey?.trim() || null;
    if (conflictKey && conflictKeys.has(conflictKey)) {
      reject(rejections, candidate.candidateId, "CONFLICT_LOST");
      continue;
    }
    semanticKeys.add(candidate.semanticActionKey);
    if (conflictKey) conflictKeys.add(conflictKey);
    deduplicated.push(entry);
  }

  const primaryAction = deduplicated[0]?.candidate ?? null;
  const secondaryActions = deduplicated.slice(1, 4).map((entry) => entry.candidate);
  const selected = primaryAction ? [primaryAction, ...secondaryActions] : secondaryActions;
  const selectedExpiries = selected
    .map((candidate) => parseTime(candidate.expiresAt))
    .filter((value): value is number => value !== null);
  const expiresAt = new Date(selectedExpiries.length ? Math.min(...selectedExpiries) : nowMs + 15 * 60_000).toISOString();
  const inputRevisionHash = inputHash(request);
  const decisionId = `today-${sha256({ userId: request.userId, localDate: request.localDate, inputRevisionHash }).slice(0, 32)}`;
  const rejectionJson: JsonValue[] = rejections
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId) || left.reasonCode.localeCompare(right.reasonCode))
    .map((entry) => ({ candidateId: entry.candidateId, reasonCode: entry.reasonCode }));

  return Object.freeze({
    schemaVersion: 1,
    decisionId,
    userId: request.userId,
    localDate: request.localDate,
    timezone: request.timezone,
    primaryAction,
    secondaryActions: Object.freeze(secondaryActions),
    rejections: Object.freeze(rejectionJson),
    inputRevisionHash,
    orchestratorPolicyVersion: TODAY_ORCHESTRATOR_POLICY_VERSION,
    rankingVersion: TODAY_RANKING_VERSION,
    generatedAt: new Date(nowMs).toISOString(),
    expiresAt,
  });
}
