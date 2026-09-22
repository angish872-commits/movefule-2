import assert from "node:assert/strict";
import test from "node:test";
import type { PortionEstimate } from "../../nutrition/portion/portionEstimator.ts";
import { isServingPriorLearnablePortion } from "../../nutrition/service/liveImageEstimateService.ts";

function portion(evidenceUsed: PortionEstimate["evidenceUsed"], fusionMethod: NonNullable<PortionEstimate["fusionMethod"]>): PortionEstimate {
  return {
    minimumGrams: 90,
    centralGrams: 100,
    maximumGrams: 110,
    confidence: "HIGH",
    evidenceUsed,
    evidenceRejected: [],
    assumptions: [],
    uncertainties: [],
    estimatorVersion: "test",
    requiresClarification: false,
    requiresUserConfirmation: true,
    rangeCalibrated: false,
    calibrationProfileId: null,
    fusionMethod,
  };
}

test("serving-prior admission accepts qualified measured or declared evidence", () => {
  assert.equal(isServingPriorLearnablePortion(portion(["MANUAL_GRAMS"], "DIRECT_AUTHORITY")), true);
  assert.equal(isServingPriorLearnablePortion(portion(["PACKAGE_LABEL"], "DIRECT_AUTHORITY")), true);
  assert.equal(isServingPriorLearnablePortion(portion(["CALIBRATED_VOLUME"], "SINGLE_EVIDENCE")), true);
});

test("serving-prior admission rejects visual and behavioral self-training", () => {
  assert.equal(isServingPriorLearnablePortion(portion(["VISUAL_MODEL_PORTION_PRIOR"], "PRIOR_ONLY")), false);
  assert.equal(isServingPriorLearnablePortion(portion(["PREVIOUS_CONFIRMED_PORTION"], "PRIOR_ONLY")), false);
  assert.equal(isServingPriorLearnablePortion(portion(["USER_SELECTED_SERVING"], "PRIOR_ONLY")), false);
});

test("legacy explicit-gram corrections are admitted only when they carry direct-authority fusion", () => {
  assert.equal(isServingPriorLearnablePortion(portion(["USER_SELECTED_SERVING"], "DIRECT_AUTHORITY")), true);
});
