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

## Target engine migration

The old MoveFuel calorie/macronutrient target architecture is now migrated into
`algorithms/src/profileTargets/targetEngine.ts`.

Implemented:

- separate NASEM 2023 EER maintenance layer
- separate MoveFuel goal-policy layer
- explicit activity normalization with bounded training-frequency fallback
- age-18 equation path retained from the old engine
- automatic calorie/macro targets blocked for users under 18
- energy planning/uncertainty range using the larger of 15% or equation RMSE
- weight-based protein target with old 1.2-1.6 g/kg planning band
- 30% starting fat-energy allocation
- residual carbohydrate allocation
- 14 g / 1000 kcal fiber policy
- adult AMDR validation reason codes
- user-confirmation requirement
- separate EER, target-policy, macro-policy and fiber-policy versions

The scientific EER formula and MoveFuel goal policy remain separate. Changing
the product goal adjustment does not change the recorded EER formula version.

## Target parity tests

`algorithms/tests/profileTargets/targetEngine.parity.test.ts` now covers:

- independent NASEM coefficient parity for both supported energy-equation categories
- all four activity categories
- age-18 and adult paths
- maintain / gain / lose / performance goal behavior
- protein rounding and range
- fat, carbohydrate and fiber math
- energy uncertainty/RMSE range
- explicit activity priority
- valid training-frequency fallback
- malformed activity/training input safe-default behavior
- missing age / height / weight / energy category HOLD behavior
- intentional MoveFuel-2 youth-safety divergence

Tests are explicitly labeled `FORMULA_PARITY` versus
`INTENTIONAL_MOVEFUEL_2_CHANGE` where behavior is intentionally stricter.

## Version registry

`algorithms/src/core/versions.ts` now defines independent versions for:

- nutrient scaler
- EER formula
- target policy
- macro policy
- fiber policy
- weight-trend algorithm
- nutrient-reference schema
- adequacy policy
- coverage policy

There is no single global algorithm version.

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
4. Target Engine: what adult calorie/macronutrient starting targets are produced?
5. UI: display the canonical results; never recalculate nutrition targets.

## Next algorithm-only nutrition work

- standalone coverage policy module + tests
- full adequacy analyzer + tests
- weight-trend recalibration extracted to its own pure module + parity tests
- reference-engine edge-case tests
- closed-loop nutrient integration fixtures
- reviewed full USDA provider mapping for pending nutrient IDs
- OpenFoodFacts expanded micronutrient adapter
- versioned nutrient-reference dataset
- nutrition-label extraction -> canonical nutrient IDs
- recipe calculator migration onto the full nutrient vector

Database models, HTTP routes, Appwrite/Azure work and UI remain outside this
phase.
