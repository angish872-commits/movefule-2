import assert from "node:assert/strict";
import test from "node:test";
import { validateItems, totalsForItems } from "../../meal/nutrition.ts";
import {
  DEFAULT_PORTION_EVIDENCE_POLICY,
  authorityClassOf,
  validateCanonicalEvidenceRecord,
  validateEvidenceRecord,
} from "../../nutrition/portion/portionEvidence.ts";
import { assertTrustedNutritionSnapshot, isTrustedNutrientSource } from "../../meal/canonical-food.ts";

test("missing optional nutrients stay unknown while exact zero remains zero", () => {
  const [unknown] = validateItems([{
    itemId: "unknown",
    displayName: "Food",
    portionGrams: 100,
    energyKcal: 100,
    proteinGrams: 10,
  }]);
  assert.equal(unknown!.carbGrams, null);
  assert.equal(unknown!.fatGrams, null);
  assert.equal(unknown!.fiberGrams, null);
  const unknownTotals = totalsForItems([unknown!]);
  assert.deepEqual(unknownTotals.unknownNutrients, ["CARBOHYDRATE", "FAT", "FIBER"]);

  const [zero] = validateItems([{
    itemId: "zero",
    displayName: "Food",
    portionGrams: 100,
    energyKcal: 100,
    proteinGrams: 10,
    carbGrams: 0,
    fatGrams: 0,
    fiberGrams: 0,
  }]);
  assert.equal(zero!.carbGrams, 0);
  assert.equal(zero!.fatGrams, 0);
  assert.equal(zero!.fiberGrams, 0);
  assert.equal(totalsForItems([zero!]).unknownNutrients, undefined);
});

test("unknown nutrient marks aggregate incomplete instead of pretending known zero", () => {
  const items = validateItems([
    { itemId: "known", displayName: "Known", portionGrams: 50, energyKcal: 50, proteinGrams: 5, carbGrams: 5, fatGrams: 2, fiberGrams: 1 },
    { itemId: "unknown", displayName: "Unknown", portionGrams: 50, energyKcal: 40, proteinGrams: 4, carbGrams: null, fatGrams: 1, fiberGrams: 0 },
  ]);
  const totals = totalsForItems(items);
  assert.equal(totals.energyKcal, 90);
  assert.equal(totals.carbGrams, 5);
  assert.deepEqual(totals.unknownNutrients, ["CARBOHYDRATE"]);
  assert.equal(totals.fatGrams, 3);
  assert.equal(totals.fiberGrams, 1);
});

test("canonical persisted portion evidence requires provenance and matching authority class", () => {
  const legacy = {
    evidenceType: "MANUAL_GRAMS",
    suppliedValue: 120,
    unit: "g",
    source: "user",
    reliabilityTier: DEFAULT_PORTION_EVIDENCE_POLICY.tier.MANUAL_GRAMS,
    collectedAt: "2026-08-30T00:00:00.000Z",
    assumptions: [],
    validationState: "CONFIRMED",
  } as const;
  assert.deepEqual(validateEvidenceRecord(legacy), []);
  assert.ok(validateCanonicalEvidenceRecord(legacy).includes("provenance_required"));

  const canonical = {
    ...legacy,
    provenance: {
      schemaVersion: 1,
      evidenceId: "ev-1",
      mealItemId: "item-1",
      authorityClass: authorityClassOf("MANUAL_GRAMS"),
      confidence: "HIGH",
      limitations: [],
    },
  } as const;
  assert.deepEqual(validateCanonicalEvidenceRecord(canonical), []);
});

test("visual priors are never classified as physical/direct authority", () => {
  assert.equal(authorityClassOf("VISUAL_MODEL_PORTION_PRIOR"), "VISUAL_PRIOR");
  assert.equal(authorityClassOf("SEGMENTATION_AREA"), "UNSCALED_CONTEXT");
  assert.equal(authorityClassOf("MANUAL_GRAMS"), "DIRECT");
});

test("AI/model sources cannot become canonical nutrition snapshot authority", () => {
  assert.equal(isTrustedNutrientSource("USDA_FDC"), true);
  assert.equal(isTrustedNutrientSource("OPEN_FOOD_FACTS"), true);
  assert.equal(isTrustedNutrientSource("GEMINI_AI"), false);
  assert.throws(() => assertTrustedNutritionSnapshot({
    schemaVersion: 1,
    snapshotId: "snap-ai",
    sourceType: "GEMINI_AI",
    sourceReference: "candidate-1",
    sourceRevision: "model-x",
    portionGrams: 100,
    nutrients: { energyKcal: 100, proteinGrams: 5 },
    dataQuality: "LOW",
    limitations: [],
    createdAt: "2026-08-30T00:00:00.000Z",
  }), /not permitted as canonical nutrient authority/);
});
