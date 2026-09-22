import type { DailyActionCandidate, DailyDecisionEnvelope } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { TodayCandidateInput, TodayDecisionInput } from "./contracts.ts";
import { decideToday } from "./decision-orchestrator.ts";

export type TodayDomainCandidateSets = {
  readonly food: readonly TodayCandidateInput[];
  readonly nutrition: readonly TodayCandidateInput[];
  readonly training: readonly TodayCandidateInput[];
  readonly calendar: readonly TodayCandidateInput[];
  readonly healthDevice: readonly TodayCandidateInput[];
  readonly missingInformation: readonly TodayCandidateInput[];
};

export type TodayRuntimeInput = Omit<TodayDecisionInput, "candidates"> & {
  readonly domains: TodayDomainCandidateSets;
};

const EMPTY: TodayDomainCandidateSets = Object.freeze({
  food: Object.freeze([]),
  nutrition: Object.freeze([]),
  training: Object.freeze([]),
  calendar: Object.freeze([]),
  healthDevice: Object.freeze([]),
  missingInformation: Object.freeze([]),
});

export function emptyTodayDomainCandidateSets(): TodayDomainCandidateSets {
  return EMPTY;
}

function assertGroup(
  name: keyof Omit<TodayDomainCandidateSets, "missingInformation">,
  entries: readonly TodayCandidateInput[],
  allowed: ReadonlySet<DailyActionCandidate["domain"]>,
): void {
  for (const entry of entries) {
    if (!allowed.has(entry.candidate.domain)) {
      throw new Error(`today_source_group_domain_mismatch:${name}:${entry.candidate.domain}`);
    }
  }
}

/**
 * Aggregates domain-owned candidates and context only. It does not invent Food,
 * Nutrition, Training, Calendar, Health, or device decisions. Missing source
 * output is represented by an empty array and therefore cannot create filler.
 */
export function orchestrateToday(input: TodayRuntimeInput): DailyDecisionEnvelope {
  assertGroup("food", input.domains.food, new Set(["FOOD"]));
  assertGroup("nutrition", input.domains.nutrition, new Set(["NUTRITION"]));
  assertGroup("training", input.domains.training, new Set(["TRAINING"]));
  assertGroup("calendar", input.domains.calendar, new Set(["CALENDAR"]));
  assertGroup("healthDevice", input.domains.healthDevice, new Set(["HEALTH", "DEVICE"]));

  const candidates = Object.freeze([
    ...input.domains.food,
    ...input.domains.nutrition,
    ...input.domains.training,
    ...input.domains.calendar,
    ...input.domains.healthDevice,
    ...input.domains.missingInformation,
  ]);

  return decideToday({
    userId: input.userId,
    localDate: input.localDate,
    timezone: input.timezone,
    candidates,
    networkAvailable: input.networkAvailable,
    now: input.now,
    ...(input.userIntentDomains ? { userIntentDomains: input.userIntentDomains } : {}),
    ...(input.calendarConflictKeys ? { calendarConflictKeys: input.calendarConflictKeys } : {}),
  });
}