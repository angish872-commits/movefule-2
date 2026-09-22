import assert from "node:assert/strict";
import test from "node:test";
import type { NutritionState, TargetState } from "../../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import {
  createRecommendationCandidate,
  evaluateTargetEligibility,
  normalizeNutritionProfile,
  rankEligibleCandidates,
  validateCandidate,
  type CandidateRuntimeMetadata,
  type RecommendationFeedbackSignal,
} from "../../diet-intelligence/index.ts";

const NOW = new Date("2026-09-01T09:30:00.000Z");
const USER = "wave4-user";

function profile(value: Record<string, unknown> = {}, revision = 3, userId = USER) {
  return normalizeNutritionProfile({
    userId,
    profileRevision: revision,
    preferenceRevision: revision,
    updatedAt: NOW.toISOString(),
    countryCode: "NP",
    unitSystem: "METRIC",
    valueJson: JSON.stringify(value),
  });
}

function adultTarget(userId = USER, revision = 4): TargetState {
  return evaluateTargetEligibility({
    userId,
    dateOfBirth: "2000-01-01",
    goal: "GENERAL_WELLNESS",
    effectiveDate: "2026-09-01",
    requestedRevision: revision,
    manualEnergyKcal: 2200,
    manualProteinG: 110,
    calculatedEnergyKcal: null,
    calculatedProteinG: null,
    calculatedSupported: false,
    now: NOW,
  }).targetState;
}

function youthTarget(goal = "GENERAL_WELLNESS"): TargetState {
  return evaluateTargetEligibility({
    userId: USER,
    dateOfBirth: "2011-01-01",
    goal,
    effectiveDate: "2026-09-01",
    requestedRevision: 4,
    manualEnergyKcal: null,
    manualProteinG: null,
    calculatedEnergyKcal: 2200,
    calculatedProteinG: 100,
    calculatedSupported: true,
    now: NOW,
  }).targetState;
}

function state(overrides: Partial<NutritionState> = {}): NutritionState {
  return Object.freeze({
    schemaVersion: 1,
    stateId: `nutrition-state:${USER}:2026-09-01`,
    userId: USER,
    localDate: "2026-09-01",
    targetRevision: 4,
    profileRevision: 3,
    confirmedMealRevisionHash: "meal-hash-wave4",
    dataQuality: Object.freeze({
      schemaVersion: 1,
      overall: "HIGH",
      completeness: 1,
      freshness: "FRESH",
      missingCodes: Object.freeze([]),
      limitationCodes: Object.freeze([]),
      sourceRevisionHash: "source-hash-wave4",
    }),
    totals: { recorded: { energyKcal: 1200, proteinG: 60 } },
    revision: 7,
    generatedAt: NOW.toISOString(),
    ...overrides,
  });
}

function sparseState(): NutritionState {
  return state({
    dataQuality: Object.freeze({
      schemaVersion: 1,
      overall: "LOW",
      completeness: 0.35,
      freshness: "FRESH",
      missingCodes: Object.freeze(["PARTIAL_DAY", "NUTRIENT_UNKNOWN:CARBOHYDRATE", "NUTRIENT_UNKNOWN:FAT", "NUTRIENT_UNKNOWN:FIBER"]),
      limitationCodes: Object.freeze(["RECORDED_INTAKE_MAY_BE_INCOMPLETE"]),
      sourceRevisionHash: "source-hash-sparse",
    }),
    totals: { recorded: { energyKcal: 900, proteinG: 35 } },
  });
}

function metadata(id: string, overrides: Partial<CandidateRuntimeMetadata> = {}): CandidateRuntimeMetadata {
  return Object.freeze({
    semanticKey: `nutrition:wave4:${id}`,
    category: "NEXT_MEAL",
    sourceObjectId: `reviewed:${id}`,
    sourceRevision: "1",
    foodCodes: Object.freeze(["BASE_FOOD"]),
    allergenCodes: Object.freeze([]),
    blockedDietaryPatternCodes: Object.freeze([]),
    blockedReligiousRestrictionCodes: Object.freeze([]),
    requiresEligibleTarget: false,
    requiresEvidence: false,
    minimumDataQuality: "UNKNOWN",
    dependencyHash: "dependency-wave4",
    rankingFeatures: Object.freeze({
      relevance: 0.95,
      nutritionalGap: 0.95,
      mealTiming: 0.9,
      preference: 1,
      feasibility: 0.9,
      confidence: 0.95,
    }),
    displayTitle: "Wave 4 benchmark option",
    displayBody: "Deterministic Nutrition hardening fixture.",
    deepLink: { route: "fuel" },
    ...overrides,
  });
}

function candidate(id: string, overrides: Partial<CandidateRuntimeMetadata> = {}, evidenceRefs: readonly { entityType: string; entityId: string; revision: number }[] = []) {
  return createRecommendationCandidate({
    userId: USER,
    candidateId: `candidate:${id}`,
    recommendationType: "NEXT_MEAL",
    targetRevision: 4,
    profileRevision: 3,
    stateRevision: 7,
    reasonCodes: ["WAVE4_HARDENING_BENCHMARK"],
    evidenceRefs,
    validFrom: "2026-09-01T08:00:00.000Z",
    expiresAt: "2026-09-01T12:00:00.000Z",
    metadata: metadata(id, overrides),
  });
}

function validate(input: {
  id: string;
  profileValue?: Record<string, unknown>;
  profileRevision?: number;
  metadata?: Partial<CandidateRuntimeMetadata>;
  nutritionState?: NutritionState;
  targetState?: TargetState | null;
  evidenceRefs?: readonly { entityType: string; entityId: string; revision: number }[];
}) {
  const normalized = profile(input.profileValue ?? {}, input.profileRevision ?? 3);
  const bundle = candidate(input.id, input.metadata, input.evidenceRefs ?? []);
  return validateCandidate({
    candidate: bundle.candidate,
    metadata: bundle.metadata,
    profile: normalized.profile,
    hardConstraints: normalized.hardConstraints,
    state: input.nutritionState ?? state(),
    targetState: input.targetState === undefined ? adultTarget() : input.targetState,
    now: NOW,
    evidenceExists: () => true,
    currentDependencyHash: "dependency-wave4",
  });
}

const FAMILY = [
  "ALLERGEN",
  "DIETARY",
  "RELIGIOUS",
  "INTOLERANCE",
  "EXCLUSION",
  "YOUTH",
  "UNKNOWN_TARGET",
  "STALE_TARGET",
  "FOREIGN_TARGET",
  "STALE_PROFILE",
  "PARTIAL_EVIDENCE",
  "SPARSE_DATA",
  "PERSONALIZATION_RESURRECTION",
  "NEW_RESTRICTION_AFTER_ACCEPTANCE",
  "DETERMINISM",
  "SAFE_CONTROL",
] as const;

type Family = typeof FAMILY[number];
const CASES = Object.freeze(FAMILY.flatMap((family) => Array.from({ length: 50 }, (_, variant) => Object.freeze({ family, variant, id: `${family}:${variant + 1}` }))));

function acceptedFeedback(semanticKey: string, count = 1): readonly RecommendationFeedbackSignal[] {
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
    userId: USER,
    semanticKey,
    action: "ACCEPTED" as const,
    occurredAt: new Date(NOW.getTime() - index * 86_400_000).toISOString(),
  })));
}

function expectBlocked(result: ReturnType<typeof validate>, expectedReason: string, id: string) {
  assert.equal(result.valid, false, id);
  assert.equal(result.candidate.status, "BLOCKED", id);
  assert.ok(result.candidate.reasonCodes.includes(expectedReason), `${id}: missing ${expectedReason}`);
}

test("Wave 4 Nutrition hardening benchmark contains exactly 800 deterministic structured scenarios", () => {
  assert.equal(CASES.length, 800);
  assert.equal(new Set(CASES.map((entry) => entry.id)).size, 800);
});

test("Wave 4 target policy fails closed for youth, partial manual targets, and unsupported calculated targets", () => {
  const youth = youthTarget("rapid weight loss");
  assert.notEqual(youth.eligibilityDecision, "ELIGIBLE");
  assert.equal(youth.targetValues.energyKcal, null);
  assert.equal(youth.targetValues.proteinG, null);

  const partialManual = evaluateTargetEligibility({
    userId: USER,
    dateOfBirth: "2000-01-01",
    goal: "GENERAL_WELLNESS",
    effectiveDate: "2026-09-01",
    requestedRevision: 4,
    manualEnergyKcal: 2000,
    manualProteinG: null,
    calculatedEnergyKcal: 2100,
    calculatedProteinG: 100,
    calculatedSupported: true,
    now: NOW,
  });
  assert.equal(partialManual.targetState.eligibilityDecision, "UNKNOWN");
  assert.equal(partialManual.targetState.targetValues.proteinG, null);
  assert.equal(partialManual.canPersist, false);

  const unsupportedCalculated = evaluateTargetEligibility({
    userId: USER,
    dateOfBirth: "2000-01-01",
    goal: "GENERAL_WELLNESS",
    effectiveDate: "2026-09-01",
    requestedRevision: 4,
    manualEnergyKcal: null,
    manualProteinG: null,
    calculatedEnergyKcal: null,
    calculatedProteinG: null,
    calculatedSupported: false,
    now: NOW,
  });
  assert.equal(unsupportedCalculated.targetState.eligibilityDecision, "UNKNOWN");
  assert.equal(unsupportedCalculated.canPersist, false);
});

test("800 Wave 4 scenarios achieve perfect hard-safety blocking with zero personalization resurrection", () => {
  let unsafeCases = 0;
  let unsafeBlocked = 0;
  let resurrectionAttempts = 0;
  let resurrected = 0;
  let reasonChecks = 0;
  let reasonCorrect = 0;
  let abstentionCases = 0;
  let abstained = 0;
  let deterministicCases = 0;
  let deterministicStable = 0;
  let safeControls = 0;
  let safeControlsValid = 0;

  for (const scenario of CASES) {
    let result: ReturnType<typeof validate>;
    let expectedReason: string | null = null;
    let unsafe = true;
    let abstention = false;

    switch (scenario.family) {
      case "ALLERGEN": {
        const code = `ALLERGEN_${scenario.variant}`;
        expectedReason = `ALLERGEN_BLOCKED:${code}`;
        result = validate({ id: scenario.id, profileValue: { allergenCodes: [code] }, metadata: { allergenCodes: [code] } });
        break;
      }
      case "DIETARY": {
        const code = `PATTERN_${scenario.variant}`;
        expectedReason = `DIETARY_PATTERN_BLOCKED:${code}`;
        result = validate({ id: scenario.id, profileValue: { dietaryPatternCodes: [code] }, metadata: { blockedDietaryPatternCodes: [code] } });
        break;
      }
      case "RELIGIOUS": {
        const code = `RELIGIOUS_${scenario.variant}`;
        expectedReason = `DECLARED_RELIGIOUS_RESTRICTION_BLOCKED:${code}`;
        result = validate({ id: scenario.id, profileValue: { religiousRestrictionCodes: [code] }, metadata: { blockedReligiousRestrictionCodes: [code] } });
        break;
      }
      case "INTOLERANCE": {
        const code = `INTOLERANCE_FOOD_${scenario.variant}`;
        expectedReason = `INTOLERANCE_BLOCKED:${code}`;
        result = validate({ id: scenario.id, profileValue: { intoleranceCodes: [code] }, metadata: { foodCodes: [code] } });
        break;
      }
      case "EXCLUSION": {
        const code = `EXCLUDED_FOOD_${scenario.variant}`;
        expectedReason = `FOOD_EXCLUSION_BLOCKED:${code}`;
        result = validate({ id: scenario.id, profileValue: { exclusionCodes: [code] }, metadata: { foodCodes: [code] } });
        break;
      }
      case "YOUTH": {
        expectedReason = "ELIGIBLE_TARGET_REQUIRED";
        abstention = true;
        result = validate({ id: scenario.id, metadata: { requiresEligibleTarget: true }, targetState: youthTarget(scenario.variant % 2 === 0 ? "GENERAL_WELLNESS" : "rapid weight loss") });
        break;
      }
      case "UNKNOWN_TARGET": {
        expectedReason = "ELIGIBLE_TARGET_REQUIRED";
        abstention = true;
        result = validate({ id: scenario.id, metadata: { requiresEligibleTarget: true }, targetState: null });
        break;
      }
      case "STALE_TARGET": {
        expectedReason = "TARGET_STATE_REVISION_BLOCKED";
        abstention = true;
        result = validate({ id: scenario.id, metadata: { requiresEligibleTarget: true }, targetState: adultTarget(USER, 3) });
        break;
      }
      case "FOREIGN_TARGET": {
        expectedReason = "TARGET_STATE_USER_BLOCKED";
        abstention = true;
        result = validate({ id: scenario.id, metadata: { requiresEligibleTarget: true }, targetState: adultTarget(`foreign-${scenario.variant}`, 4) });
        break;
      }
      case "STALE_PROFILE": {
        expectedReason = "PROFILE_REVISION_BLOCKED";
        abstention = true;
        result = validate({ id: scenario.id, profileRevision: 2 });
        break;
      }
      case "PARTIAL_EVIDENCE": {
        expectedReason = "REQUIRED_EVIDENCE_MISSING";
        abstention = true;
        result = validate({ id: scenario.id, metadata: { requiresEvidence: true } });
        break;
      }
      case "SPARSE_DATA": {
        expectedReason = "INSUFFICIENT_NUTRITION_DATA_QUALITY";
        abstention = true;
        result = validate({ id: scenario.id, nutritionState: sparseState(), metadata: { minimumDataQuality: "MEDIUM", rankingFeatures: { relevance: 0.9, nutritionalGap: null, mealTiming: 0.8, preference: 1, feasibility: 0.8, confidence: null } } });
        break;
      }
      case "PERSONALIZATION_RESURRECTION": {
        const code = `LIKED_UNSAFE_${scenario.variant}`;
        expectedReason = `ALLERGEN_BLOCKED:${code}`;
        result = validate({ id: scenario.id, profileValue: { allergenCodes: [code] }, metadata: { allergenCodes: [code], rankingFeatures: { relevance: 1, nutritionalGap: 1, mealTiming: 1, preference: 1, feasibility: 1, confidence: 1 } } });
        break;
      }
      case "NEW_RESTRICTION_AFTER_ACCEPTANCE": {
        const code = `NEW_RESTRICTION_${scenario.variant}`;
        expectedReason = `FOOD_EXCLUSION_BLOCKED:${code}`;
        result = validate({ id: scenario.id, profileValue: { exclusionCodes: [code] }, metadata: { foodCodes: [code] } });
        break;
      }
      case "DETERMINISM": {
        unsafe = false;
        result = validate({ id: scenario.id });
        assert.equal(result.valid, true, scenario.id);
        const context = { userId: USER, now: NOW, feedback: acceptedFeedback(result.metadata.semanticKey, 3), recentSemanticKeys: [], recentCategories: [] } as const;
        const first = rankEligibleCandidates([result], context);
        const second = rankEligibleCandidates([result], context);
        deterministicCases += 1;
        if (JSON.stringify(first) === JSON.stringify(second)) deterministicStable += 1;
        continue;
      }
      case "SAFE_CONTROL": {
        unsafe = false;
        result = validate({ id: scenario.id, metadata: { requiresEligibleTarget: true }, targetState: adultTarget() });
        safeControls += 1;
        if (result.valid && result.candidate.status === "ELIGIBLE") safeControlsValid += 1;
        continue;
      }
    }

    if (unsafe) {
      unsafeCases += 1;
      if (!result.valid && result.candidate.status === "BLOCKED") unsafeBlocked += 1;
      assert.ok(expectedReason, scenario.id);
      reasonChecks += 1;
      if (result.candidate.reasonCodes.includes(expectedReason!)) reasonCorrect += 1;
      expectBlocked(result, expectedReason!, scenario.id);

      const feedback = acceptedFeedback(result.metadata.semanticKey, 20);
      resurrectionAttempts += 1;
      const ranked = rankEligibleCandidates([result], { userId: USER, now: NOW, feedback, recentSemanticKeys: [], recentCategories: [] });
      if (ranked.length > 0) resurrected += 1;
      assert.equal(ranked.length, 0, `${scenario.id}: blocked candidate resurrected by personalization`);
    }
    if (abstention) {
      abstentionCases += 1;
      if (!result.valid) abstained += 1;
    }
  }

  const hardSafetyPrecision = unsafeCases === 0 ? 1 : unsafeBlocked / unsafeCases;
  const resurrectionRate = resurrectionAttempts === 0 ? 0 : resurrected / resurrectionAttempts;
  const reasonCorrectness = reasonChecks === 0 ? 1 : reasonCorrect / reasonChecks;
  const abstentionRate = abstentionCases === 0 ? 1 : abstained / abstentionCases;
  const deterministicStability = deterministicCases === 0 ? 1 : deterministicStable / deterministicCases;

  assert.equal(unsafeCases, 700);
  assert.equal(hardSafetyPrecision, 1);
  assert.equal(resurrectionRate, 0);
  assert.equal(reasonCorrectness, 1);
  assert.equal(abstentionRate, 1);
  assert.equal(deterministicStability, 1);
  assert.equal(safeControls, 50);
  assert.equal(safeControlsValid, 50);
});
