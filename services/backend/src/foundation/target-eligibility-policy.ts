import type {
  EligibilityDecision,
  TargetState,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import { ageInYears, parseGoalCategory } from "./target-engine.ts";

export const TARGET_POLICY_VERSION = "movefuel-nutrition-target-policy-2026-08-v1";

export type TargetEligibilityRequest = {
  userId: string;
  dateOfBirth?: string;
  goal?: string;
  effectiveDate: string;
  requestedRevision: number;
  manualEnergyKcal: number | null;
  manualProteinG: number | null;
  calculatedEnergyKcal: number | null;
  calculatedProteinG: number | null;
  calculatedSupported: boolean;
  now?: Date;
};

export type NormalizedTargetEligibilityRequest = Readonly<TargetEligibilityRequest>;

export type TargetEligibilityOutcome = {
  readonly targetState: TargetState;
  readonly canPersist: boolean;
  readonly energyKcal: number | null;
  readonly proteinG: number | null;
};

export interface TargetEligibilityPolicy {
  evaluate(request: TargetEligibilityRequest): TargetEligibilityOutcome;
}

function nullableNumber(value: number | null): number | null {
  return value === null ? null : Number(value);
}

export function normalizeTargetEligibilityRequest(request: TargetEligibilityRequest): NormalizedTargetEligibilityRequest {
  return Object.freeze({
    userId: request.userId.trim(),
    ...(request.dateOfBirth === undefined ? {} : { dateOfBirth: request.dateOfBirth.trim() }),
    ...(request.goal === undefined ? {} : { goal: request.goal.trim() }),
    effectiveDate: request.effectiveDate.trim(),
    requestedRevision: Math.max(1, Math.trunc(request.requestedRevision)),
    manualEnergyKcal: nullableNumber(request.manualEnergyKcal),
    manualProteinG: nullableNumber(request.manualProteinG),
    calculatedEnergyKcal: nullableNumber(request.calculatedEnergyKcal),
    calculatedProteinG: nullableNumber(request.calculatedProteinG),
    calculatedSupported: request.calculatedSupported === true,
    ...(request.now ? { now: new Date(request.now.getTime()) } : {}),
  });
}

function targetStateId(userId: string, effectiveDate: string, revision: number): string {
  return `target-state:${userId}:${effectiveDate}:${revision}`;
}

function restrictiveGoal(goal?: string): boolean {
  const raw = (goal ?? "").trim().toLowerCase();
  return parseGoalCategory(goal) === "lose" || /fast|meal\s*skip|rapid/.test(raw);
}

function decision(
  request: NormalizedTargetEligibilityRequest,
  eligibilityDecision: EligibilityDecision,
  reasonCodes: readonly string[],
  populationClass: string,
  energyKcal: number | null,
  proteinG: number | null,
  manualEntry: boolean,
): TargetEligibilityOutcome {
  const targetState: TargetState = Object.freeze({
    schemaVersion: 1,
    targetStateId: targetStateId(request.userId, request.effectiveDate, request.requestedRevision),
    userId: request.userId,
    revision: request.requestedRevision,
    effectiveDate: request.effectiveDate,
    source: manualEntry ? "USER_CONFIRMED" : "CALCULATED_USER_CONFIRMED",
    manualEntry,
    eligibilityDecision,
    eligibilityReasonCodes: Object.freeze([...reasonCodes]),
    policyVersion: TARGET_POLICY_VERSION,
    populationClass,
    targetValues: Object.freeze({ energyKcal, proteinG }),
    createdAt: (request.now ?? new Date()).toISOString(),
  });
  return Object.freeze({
    targetState,
    canPersist: eligibilityDecision === "ELIGIBLE" && energyKcal !== null && proteinG !== null,
    energyKcal,
    proteinG,
  });
}

function evaluateNormalized(request: NormalizedTargetEligibilityRequest): TargetEligibilityOutcome {
  if (!request.userId) throw new Error("TARGET_USER_REQUIRED");
  const manualEntry = request.manualEnergyKcal !== null || request.manualProteinG !== null;
  // A partial manual request stays partial. Missing manual components are not
  // silently backfilled from calculated values or converted to zero.
  const energyKcal = manualEntry ? request.manualEnergyKcal : request.calculatedEnergyKcal;
  const proteinG = manualEntry ? request.manualProteinG : request.calculatedProteinG;
  const age = ageInYears(request.dateOfBirth, request.now ?? new Date());

  if (age === null) {
    return decision(request, "UNKNOWN", ["TARGET_AGE_UNKNOWN"], "UNKNOWN", energyKcal, proteinG, manualEntry);
  }
  if (age < 18) {
    const reasons = restrictiveGoal(request.goal)
      ? ["YOUTH_RESTRICTIVE_GOAL_BLOCKED", "YOUTH_GENERAL_GUIDANCE_ONLY"]
      : ["YOUTH_PERSONAL_TARGET_REQUIRES_REVIEW", "YOUTH_GENERAL_GUIDANCE_ONLY"];
    return decision(request, restrictiveGoal(request.goal) || manualEntry ? "INELIGIBLE" : "REQUIRES_REVIEW", reasons, "YOUTH", null, null, manualEntry);
  }
  if (restrictiveGoal(request.goal) && /fast|meal\s*skip|rapid/i.test(request.goal ?? "")) {
    return decision(request, "INELIGIBLE", ["RESTRICTIVE_GOAL_NOT_SUPPORTED"], "ADULT", energyKcal, proteinG, manualEntry);
  }
  if (!manualEntry && !request.calculatedSupported) {
    return decision(request, "UNKNOWN", ["TARGET_CALCULATION_INPUTS_INCOMPLETE"], "ADULT", energyKcal, proteinG, manualEntry);
  }
  if (energyKcal === null || proteinG === null) {
    return decision(request, "UNKNOWN", ["TARGET_VALUES_INCOMPLETE"], "ADULT", energyKcal, proteinG, manualEntry);
  }
  if (!Number.isFinite(energyKcal) || !Number.isFinite(proteinG) || energyKcal <= 0 || proteinG <= 0) {
    return decision(request, "INELIGIBLE", ["TARGET_VALUES_INVALID"], "ADULT", energyKcal, proteinG, manualEntry);
  }
  if (manualEntry && energyKcal < 1_000) {
    return decision(request, "REQUIRES_REVIEW", ["MANUAL_ENERGY_TARGET_REQUIRES_REVIEW"], "ADULT", energyKcal, proteinG, manualEntry);
  }
  return decision(request, "ELIGIBLE", [manualEntry ? "MANUAL_TARGET_POLICY_PASS" : "CALCULATED_TARGET_POLICY_PASS"], "ADULT", energyKcal, proteinG, manualEntry);
}

export const canonicalTargetEligibilityPolicy: TargetEligibilityPolicy = Object.freeze({
  evaluate(request: TargetEligibilityRequest): TargetEligibilityOutcome {
    return evaluateNormalized(normalizeTargetEligibilityRequest(request));
  },
});

/** Compatibility function backed by the single canonical policy authority. */
export function evaluateTargetEligibility(request: TargetEligibilityRequest): TargetEligibilityOutcome {
  return canonicalTargetEligibilityPolicy.evaluate(request);
}
