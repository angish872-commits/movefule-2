import assert from "node:assert/strict";
import test from "node:test";
import { ClarificationEngine, type ClarificationContext } from "../../nutrition/confidence/clarification.ts";
import type { PortionEstimate } from "../../nutrition/portion/portionEstimator.ts";
import type { RegionFoodCandidate } from "../../nutrition/vision/candidateProviderAdapter.ts";

function candidate(name: string, confidence: number): RegionFoodCandidate {
  return {
    name,
    searchTerms: [name.toLowerCase()],
    foodType: "PREPARED",
    preparationCandidates: [],
    providerConfidence: confidence,
    modelProviderVersion: "0.1.0",
    uncertaintyNotes: [],
  };
}

function portion(confidence: PortionEstimate["confidence"]): PortionEstimate {
  return {
    minimumGrams: 0,
    centralGrams: 0,
    maximumGrams: 0,
    confidence,
    evidenceUsed: [],
    evidenceRejected: [],
    assumptions: [],
    uncertainties: [],
    estimatorVersion: "1.0.0",
    requiresClarification: confidence === "INSUFFICIENT",
    requiresUserConfirmation: true,
  };
}

function context(overrides: Partial<ClarificationContext>): ClarificationContext {
  return {
    itemId: "item-1",
    itemType: "PREPARED",
    candidates: [candidate("Dumplings, steamed", 0.9)],
    portion: portion("HIGH"),
    evidenceTypes: [],
    pieceBased: false,
    answeredQuestionIds: [],
    ...overrides,
  };
}

test("piece-count question is asked for dumplings", () => {
  const engine = new ClarificationEngine();
  const questions = engine.generate(context({ pieceBased: true, candidates: [candidate("Dumplings, steamed", 0.9)] }));
  assert.ok(questions.some((question) => question.questionId === "PIECE_COUNT"));
});

test("oil/ghee question is asked for a mixed dish", () => {
  const engine = new ClarificationEngine();
  const questions = engine.generate(context({ itemType: "MIXED_DISH" }));
  assert.ok(questions.some((question) => question.questionId === "ADDED_OIL_GHEE_BUTTER"));
});

test("container question is asked for a liquid", () => {
  const engine = new ClarificationEngine();
  const questions = engine.generate(context({ itemType: "LIQUID" }));
  assert.ok(questions.some((question) => question.questionId === "BOWL_OR_CUP_SIZE"));
});

test("candidate-selection question is asked for ambiguous identity", () => {
  const engine = new ClarificationEngine();
  const questions = engine.generate(
    context({ candidates: [candidate("Chicken momo", 0.55), candidate("Buff momo", 0.52)] }),
  );
  assert.ok(questions.some((question) => question.questionId === "CANDIDATE_SELECTION"));
});

test("no duplicate question is generated", () => {
  const engine = new ClarificationEngine();
  const first = engine.generate(context({ pieceBased: true, itemType: "MIXED_DISH" }));
  const ids = first.map((question) => question.questionId);
  assert.equal(new Set(ids).size, ids.length);
  const second = engine.generate(context({ pieceBased: true, itemType: "MIXED_DISH", answeredQuestionIds: ids }));
  for (const question of second) {
    assert.ok(!ids.includes(question.questionId), "answered questions must not be repeated");
  }
});

test("a question answered previously is skipped with its fallback documented", () => {
  const engine = new ClarificationEngine();
  const questions = engine.generate(context({ itemType: "MIXED_DISH" }));
  const oilQuestion = questions.find((question) => question.questionId === "ADDED_OIL_GHEE_BUTTER");
  assert.ok(oilQuestion);
  assert.equal(oilQuestion!.optional, true);
  assert.ok(oilQuestion!.fallbackIfSkipped.length > 0);
  const second = engine.generate(context({ itemType: "MIXED_DISH", answeredQuestionIds: ["ADDED_OIL_GHEE_BUTTER"] }));
  assert.ok(!second.some((question) => question.questionId === "ADDED_OIL_GHEE_BUTTER"));
});

test("manual-entry fallback is offered when the portion is INSUFFICIENT", () => {
  const engine = new ClarificationEngine();
  const questions = engine.generate(context({ portion: portion("INSUFFICIENT") }));
  assert.ok(questions.some((question) => question.questionId === "MANUAL_ENTRY"));
  const manualEntry = questions.find((question) => question.questionId === "MANUAL_ENTRY");
  assert.equal(manualEntry!.responseType, "MANUAL_ENTRY");
});

test("no unnecessary questions when evidence is strong", () => {
  const engine = new ClarificationEngine();
  const questions = engine.generate(
    context({
      itemType: "BASIC",
      candidates: [candidate("Steamed rice", 0.95)],
      portion: portion("HIGH"),
      evidenceTypes: ["MANUAL_GRAMS"],
    }),
  );
  assert.equal(questions.length, 0);
});

test("geometry-only evidence asks for a plate size reference", () => {
  const engine = new ClarificationEngine();
  const questions = engine.generate(context({ evidenceTypes: ["SEGMENTATION_AREA"], portion: portion("LOW") }));
  assert.ok(questions.some((question) => question.questionId === "PLATE_SIZE"));
});
