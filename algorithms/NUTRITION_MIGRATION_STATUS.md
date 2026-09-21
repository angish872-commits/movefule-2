# MoveFuel-2 Nutrition Formula Migration Status

## Imported from old MoveFuel

The following formula/behavior is now present in the canonical algorithm branch:

- Universal nutrient scaling:
  `calculated = sourceAmount * selectedFoodGrams / sourceBasisGrams`
- kcal / g / mg / ug nutrient units
- Missing nutrient != zero
- Safe mass/volume/count/serving/package basis model
- No blind ml -> g conversion
- Density-gated volume <-> mass conversion
- Old production nutrient mappings:
  Energy, Protein, Carbohydrate, Fat, Fiber, Sodium
- Old research mappings:
  Saturated fat, Total sugars, Potassium, Calcium, Iron, Vitamin C,
  Cholesterol, Water
- Full nutrient-vector output instead of a fixed five-field macro object
- Daily aggregation with per-nutrient coverage
- Versionable RDA / AI / EAR / UL / AMDR reference contracts
- Adequacy/reference evaluation refuses percentage claims when coverage is
  below the caller-supplied minimum threshold

## Deliberately not invented

The old repository did not establish reviewed production mappings for:

- Vitamin A RAE
- Vitamin D
- Vitamin E
- Vitamin K
- B1 / B2 / B3 / B5 / B6 / B7 / B9 / B12
- Magnesium
- Phosphorus
- Zinc
- Copper
- Manganese
- Selenium
- Iodine
- Choline

Those canonical nutrient IDs exist in MoveFuel-2 but their provider mappings are
marked `REQUIRES_REVIEW` until verified source mappings are added.

No RDA/AI/EAR/UL values are hard-coded yet. The reference engine is implemented,
but the reviewed/versioned reference dataset remains a separate data task.

## Canonical responsibility split

1. Food Nutrient Engine: what trusted nutrients were consumed?
2. Nutrient Reference Engine: what reference values apply to the profile?
3. Daily Aggregator: what known intake is recorded and how complete is it?
4. UI: display the canonical results; never recalculate nutrition targets.

## Next nutrition migrations

- Reviewed full USDA provider mapping for the pending nutrient IDs
- OpenFoodFacts expanded micronutrient adapter
- Versioned nutrient reference dataset
- Nutrition-label extraction -> canonical nutrient IDs
- Recipe calculator migration onto the full nutrient vector
- Target-engine migration for adult calorie/macronutrient targets
- Automated parity tests against the old MoveFuel calculator and fixtures
