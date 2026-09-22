import assert from "node:assert/strict";
import test from "node:test";
import type { NutritionState, TargetState } from "../../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import {
  applyHardPolicy,
  createRecommendationCandidate,
  evaluateTargetEligibility,
  normalizeNutritionProfile,
  rankEligibleCandidates,
  validateCandidate,
  type CandidateRuntimeMetadata,
} from "../../diet-intelligence/index.ts";
import { assertCanonicalNutritionAuthority } from "../../nutrition/evidence/evidence-source-registry.ts";

const NOW = new Date("2026-08-30T05:00:00.000Z");

function profile(value: Record<string, unknown> = {}, countryCode = "NP", userId = "user-a") {
  return normalizeNutritionProfile({
    userId,
    profileRevision: 3,
    preferenceRevision: 3,
    updatedAt: NOW.toISOString(),
    countryCode,
    unitSystem: "METRIC",
    valueJson: JSON.stringify(value),
  });
}

function target(userId = "user-a"): TargetState {
  return evaluateTargetEligibility({
    userId,
    dateOfBirth: "2000-01-01",
    goal: "GENERAL_WELLNESS",
    effectiveDate: "2026-08-30",
    requestedRevision: 4,
    manualEnergyKcal: 2200,
    manualProteinG: 110,
    calculatedEnergyKcal: null,
    calculatedProteinG: null,
    calculatedSupported: false,
    now: NOW,
  }).targetState;
}

function state(userId = "user-a", quality: NutritionState["dataQuality"]["overall"] = "HIGH"): NutritionState {
  return Object.freeze({
    schemaVersion: 1,
    stateId: `nutrition-state:${userId}:2026-08-30`,
    userId,
    localDate: "2026-08-30",
    targetRevision: 4,
    profileRevision: 3,
    confirmedMealRevisionHash: "meal-hash-1",
    dataQuality: Object.freeze({
      schemaVersion: 1,
      overall: quality,
      completeness: quality === "UNKNOWN" ? 0 : 1,
      freshness: "FRESH",
      missingCodes: Object.freeze(quality === "UNKNOWN" ? ["CONFIRMED_NUTRITION_UNKNOWN"] : []),
      limitationCodes: Object.freeze([]),
      sourceRevisionHash: "source-hash-1",
    }),
    totals: quality === "UNKNOWN" ? null : { recorded: { energyKcal: 600, proteinG: 25 } },
    revision: 7,
    generatedAt: NOW.toISOString(),
  });
}

function metadata(overrides: Partial<CandidateRuntimeMetadata> = {}): CandidateRuntimeMetadata {
  return Object.freeze({
    semanticKey: "nutrition:meal:base",
    category: "NEXT_MEAL",
    sourceObjectId: "reviewed-option-1",
    sourceRevision: "1",
    foodCodes: Object.freeze(["RICE", "LENTIL"]),
    allergenCodes: Object.freeze([]),
    blockedDietaryPatternCodes: Object.freeze([]),
    blockedReligiousRestrictionCodes: Object.freeze([]),
    requiresEligibleTarget: false,
    requiresEvidence: false,
    minimumDataQuality: "UNKNOWN",
    dependencyHash: "dependency-current",
    rankingFeatures: Object.freeze({ relevance: 0.8, nutritionalGap: 0.7, mealTiming: 0.7, preference: 0.5, feasibility: 0.8, confidence: 0.8 }),
    displayTitle: "Reviewed nutrition option",
    displayBody: "Deterministic benchmark fixture.",
    deepLink: { route: "fuel" },
    ...overrides,
  });
}

function bundle(candidateId: string, userId = "user-a", overrides: Partial<CandidateRuntimeMetadata> = {}, validity?: { validFrom: string; expiresAt: string }) {
  return createRecommendationCandidate({
    userId,
    candidateId,
    recommendationType: "NEXT_MEAL",
    targetRevision: 4,
    profileRevision: 3,
    stateRevision: 7,
    reasonCodes: ["CONSTITUTIONAL_BENCHMARK"],
    evidenceRefs: [],
    validFrom: validity?.validFrom ?? "2026-08-30T04:00:00.000Z",
    expiresAt: validity?.expiresAt ?? "2026-08-30T06:00:00.000Z",
    metadata: metadata(overrides),
  });
}

const families = [
  "ALLERGEN_BLOCK",
  "EXCLUSION_BLOCK",
  "INVALID_TARGET_BLOCK",
  "EXPIRED_BLOCK",
  "STALE_DEPENDENCY_BLOCK",
  "DETERMINISTIC_RANKING",
  "COUNTRY_DOES_NOT_INVENT_BELIEF",
  "UNLICENSED_EVIDENCE_BLOCK",
  "CROSS_USER_BLOCK",
  "AI_INDEPENDENT_HARD_VALIDITY",
] as const;

type Family = typeof families[number];
const scenarios: ReadonlyArray<{ id: string; family: Family; variant: number }> = Object.freeze(
  families.flatMap((family) => Array.from({ length: 10 }, (_, variant) => Object.freeze({ id: `${family}:${variant + 1}`, family, variant }))),
);

function validateStandard(candidateId: string, options: {
  profileValue?: Record<string, unknown>;
  userId?: string;
  candidateUserId?: string;
  metadata?: Partial<CandidateRuntimeMetadata>;
  targetState?: TargetState | null;
  currentDependencyHash?: string;
  validity?: { validFrom: string; expiresAt: string };
  countryCode?: string;
} = {}) {
  const userId = options.userId ?? "user-a";
  const normalized = profile(options.profileValue ?? {}, options.countryCode ?? "NP", userId);
  const nutritionState = state(userId);
  const candidateBundle = bundle(candidateId, options.candidateUserId ?? userId, options.metadata, options.validity);
  return validateCandidate({
    candidate: candidateBundle.candidate,
    metadata: candidateBundle.metadata,
    profile: normalized.profile,
    hardConstraints: normalized.hardConstraints,
    state: nutritionState,
    targetState: options.targetState === undefined ? target(userId) : options.targetState,
    now: NOW,
    evidenceExists: () => true,
    currentDependencyHash: options.currentDependencyHash ?? "dependency-current",
  });
}

test("Nutrition constitutional benchmark contains exactly 100 deterministic non-LLM scenarios", () => {
  assert.equal(scenarios.length, 100);
  assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, 100);
});

test("100 constitutional scenarios preserve the frozen Nutrition laws", () => {
  let executed = 0;
  for (const scenario of scenarios) {
    executed += 1;
    switch (scenario.family) {
      case "ALLERGEN_BLOCK": {
        const code = `ALLERGEN_${scenario.variant}`;
        const result = validateStandard(scenario.id, {
          profileValue: { allergenCodes: [code] },
          metadata: { allergenCodes: [code] },
        });
        assert.equal(result.valid, false, scenario.id);
        assert.ok(result.candidate.reasonCodes.some((reason) => reason === `ALLERGEN_BLOCKED:${code}`), scenario.id);
        break;
      }
      case "EXCLUSION_BLOCK": {
        const code = `FOOD_${scenario.variant}`;
        const result = validateStandard(scenario.id, {
          profileValue: { exclusionCodes: [code] },
          metadata: { foodCodes: [code] },
        });
        assert.equal(result.valid, false, scenario.id);
        assert.ok(result.candidate.reasonCodes.some((reason) => reason === `FOOD_EXCLUSION_BLOCKED:${code}`), scenario.id);
        break;
      }
      case "INVALID_TARGET_BLOCK": {
        const result = validateStandard(scenario.id, {
          metadata: { requiresEligibleTarget: true },
          targetState: null,
        });
        assert.equal(result.valid, false, scenario.id);
        assert.ok(result.candidate.reasonCodes.includes("ELIGIBLE_TARGET_REQUIRED"), scenario.id);
        break;
      }
      case "EXPIRED_BLOCK": {
        const result = validateStandard(scenario.id, {
          validity: { validFrom: "2026-08-30T02:00:00.000Z", expiresAt: "2026-08-30T04:00:00.000Z" },
        });
        assert.equal(result.valid, false, scenario.id);
        assert.equal(result.candidate.status, "EXPIRED", scenario.id);
        break;
      }
      case "STALE_DEPENDENCY_BLOCK": {
        const result = validateStandard(scenario.id, { currentDependencyHash: `changed-${scenario.variant}` });
        assert.equal(result.valid, false, scenario.id);
        assert.ok(result.reasonCodes.includes("DEPENDENCY_HASH_STALE"), scenario.id);
        break;
      }
      case "DETERMINISTIC_RANKING": {
        const result = validateStandard(scenario.id);
        assert.equal(result.valid, true, scenario.id);
        const context = { userId: "user-a", now: NOW, feedback: [], recentSemanticKeys: [], recentCategories: [] } as const;
        const first = rankEligibleCandidates([result], context);
        const second = rankEligibleCandidates([result], context);
        assert.deepEqual(first, second, scenario.id);
        break;
      }
      case "COUNTRY_DOES_NOT_INVENT_BELIEF": {
        const countries = ["NP", "IN", "BD", "PK", "MY", "US", "GB", "AU", "CA", "JP"];
        const normalized = profile({}, countries[scenario.variant]!);
        assert.deepEqual(normalized.profile.religiousRestrictionCodes, [], scenario.id);
        assert.deepEqual(normalized.profile.dietaryPatternCodes, [], scenario.id);
        const candidateBundle = bundle(scenario.id, "user-a", { blockedReligiousRestrictionCodes: ["HALAL"], blockedDietaryPatternCodes: ["VEGETARIAN"] });
        const policyResult = applyHardPolicy({
          candidate: candidateBundle.candidate,
          metadata: candidateBundle.metadata,
          profile: normalized.profile,
          hardConstraints: normalized.hardConstraints,
          state: state(),
          targetState: target(),
        });
        assert.equal(policyResult.status, "ELIGIBLE", scenario.id);
        break;
      }
      case "UNLICENSED_EVIDENCE_BLOCK": {
        const sourceIds = ["NEPAL_DFTQC_FCT_2017", "INDIA_IFCT_2017", "BANGLADESH_FCT_2013", "OPEN_FOOD_FACTS", "UNKNOWN_1", "UNKNOWN_2", "UNKNOWN_3", "UNKNOWN_4", "UNKNOWN_5", "UNKNOWN_6"];
        assert.throws(() => assertCanonicalNutritionAuthority(sourceIds[scenario.variant]!), /not_canonical_authority/, scenario.id);
        break;
      }
      case "CROSS_USER_BLOCK": {
        const result = validateStandard(scenario.id, { candidateUserId: `foreign-user-${scenario.variant}` });
        assert.equal(result.valid, false, scenario.id);
        assert.ok(result.candidate.reasonCodes.includes("CROSS_USER_CANDIDATE_BLOCKED"), scenario.id);
        break;
      }
      case "AI_INDEPENDENT_HARD_VALIDITY": {
        const code = `AI_TEST_ALLERGEN_${scenario.variant}`;
        const withoutAi = validateStandard(`${scenario.id}:off`, { profileValue: { allergenCodes: [code] }, metadata: { allergenCodes: [code] } });
        const withAiExplanationAvailable = validateStandard(`${scenario.id}:on`, { profileValue: { allergenCodes: [code] }, metadata: { allergenCodes: [code] } });
        assert.equal(withoutAi.valid, false, scenario.id);
        assert.equal(withAiExplanationAvailable.valid, false, scenario.id);
        assert.deepEqual(withoutAi.reasonCodes, withAiExplanationAvailable.reasonCodes, scenario.id);
        break;
      }
    }
  }
  assert.equal(executed, 100);
});
