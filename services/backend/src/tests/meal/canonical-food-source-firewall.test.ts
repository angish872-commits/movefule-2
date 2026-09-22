import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedNutrientSource } from "../../meal/canonical-food.ts";

test("food source firewall accepts explicit trusted sources only", () => {
  for (const source of ["USDA_FDC", "MOVEFUEL_RECIPE", "OPEN_FOOD_FACTS", "PERSONAL_FOOD", "USER_REVIEWED_MANUAL", "USER_CORRECTION"]) {
    assert.equal(isTrustedNutrientSource(source), true, source);
  }
  for (const source of ["AI", "GEMINI", "VISION", "VISION_USDA_FDC", "LLM_RECIPE", "UNKNOWN", ""]) {
    assert.equal(isTrustedNutrientSource(source), false, source);
  }
});
