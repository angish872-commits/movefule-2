import assert from "node:assert/strict";
import test from "node:test";
import { reliabilityTierOf } from "../../nutrition/portion/portionEvidence.ts";

test("direct and declared mass outrank behavioral and visual priors", () => {
  assert.ok(reliabilityTierOf("MANUAL_GRAMS") < reliabilityTierOf("PREVIOUS_CONFIRMED_PORTION"));
  assert.ok(reliabilityTierOf("PACKAGE_LABEL") < reliabilityTierOf("VISUAL_MODEL_PORTION_PRIOR"));
  assert.ok(reliabilityTierOf("CALIBRATED_VOLUME") < reliabilityTierOf("SEGMENTATION_AREA"));
});
