# MoveFuel-2 Nutrition Formula Migration Status

## Verification state

Algorithm code and test suites in this document are **written and committed**.
The GitHub connector used for this migration does not provide a TypeScript
runtime or shell, so the newly added tests have **not been executed here**.

Do not describe these migrations as runtime-verified until CI or a local
TypeScript test runner executes them green.

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
- Versionable RDA / AI / EAR / UL / AMDR reference contracts

## Target engine migration

The old MoveFuel calorie/macronutrient target architecture is migrated into
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

Status: **migrated; parity tests written; CI/runtime execution pending**.

## Target parity tests

`algorithms/tests/profileTargets/targetEngine.parity.test.ts` covers:

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

Tests distinguish `FORMULA_PARITY` from
`INTENTIONAL_MOVEFUEL_2_CHANGE`.

## Coverage migration

`algorithms/src/nutrition/coverage.ts` now owns nutrient coverage policy.

Implemented:

- known / unknown / total relevant entry counts per nutrient
- coverage ratio
- COMPLETE / PARTIAL / NONE state
- KNOWN ZERO counts as known
- absent/null/non-finite nutrient values count as unknown
- coverage policy version
- no adequacy decisions inside coverage

`dailyNutrientAggregator.ts` delegates coverage calculation to this module
instead of owning coverage policy.

Tests:
`algorithms/tests/nutrition/coverage.test.ts`

Status: **migrated; tests written; CI/runtime execution pending**.

## Adequacy analyzer migration

`algorithms/src/nutrition/adequacy.ts` now owns the full nutrient assessment
flow.

Implemented:

- consumed nutrient known/unknown handling
- mandatory coverage guard before percentage calculation
- RDA-first primary reference selection with AI fallback
- EAR and AMDR retained as distinct reference records
- UL evaluated separately
- missing reference -> NO_REFERENCE
- insufficient coverage -> INCOMPLETE_DATA
- unknown intake -> UNKNOWN
- unit mismatch rejection
- mixed reference-version rejection
- adequacy-policy and reference-schema versions in output

Critical invariant:

`percentOfReference` is null whenever coverage is below policy. A partially
logged Vitamin C day is never presented as a precise adequacy percentage.

Tests:
`algorithms/tests/nutrition/adequacy.test.ts`

Status: **migrated; tests written; CI/runtime execution pending**.

## Weight-trend recalibration migration

`algorithms/src/profileTargets/weightTrend.ts` now owns later
evidence-based target recalibration proposals.

Implemented:

- minimum 7 valid observations
- minimum 14-day span requirement
- deterministic date normalization
- duplicate same-day values averaged
- invalid observations ignored
- out-of-order observations sorted
- least-squares slope in kg/day
- weekly percentage trend
- old goal bands retained
- only -100 / 0 / +100 kcal proposals
- proposal never auto-applies
- explicit confirmation always required
- independent weight-trend version

Tests:
`algorithms/tests/profileTargets/weightTrend.parity.test.ts`

Status: **migrated; tests written; CI/runtime execution pending**.

## Closed-loop nutrient algorithm test

`algorithms/tests/integration/nutrientClosedLoop.test.ts` covers the
algorithm-only chain:

`trusted food -> nutrient vector -> daily aggregate -> coverage -> reference -> adequacy`

Scenario A:
Vitamin C is known for all three food entries -> 3/3 coverage -> applicable
reference -> percentage assessment.

Scenario B:
Vitamin D is known for only one of three entries -> partial coverage ->
INCOMPLETE_DATA -> no percentage claim.

The Vitamin D test does not mark its pending provider mapping as verified.

Status: **integration test written; CI/runtime execution pending**.

## Version registry

`algorithms/src/core/versions.ts` defines independent versions for:

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
still marked `REQUIRES_REVIEW`.

## Still not migrated / not completed

- reviewed/versioned nutrient-reference dataset seeding
- reviewed full USDA mappings for pending micronutrients
- expanded OpenFoodFacts micronutrient mappings
- nutrition-label nutrient extractor
- full recipe calculator migration onto the full nutrient vector
- closed-loop database integration
- HTTP/API integration
- UI wiring
- Appwrite/Azure persistence

These remain outside the current algorithm-only phase.

## Canonical responsibility split

1. Food Nutrient Engine: what trusted nutrients were consumed?
2. Daily Aggregator: what known nutrient amounts are recorded?
3. Coverage Engine: how complete is each nutrient's logged evidence?
4. Nutrient Reference Engine: what reference records apply to the profile?
5. Adequacy Analyzer: what can safely be concluded from intake + coverage + references?
6. Target Engine: what adult starting calorie/macronutrient targets are produced?
7. Weight Trend Engine: what bounded later adjustment, if any, is proposed?
8. UI: display canonical outputs; never recalculate nutrition logic.

## Next algorithm-only work

- run all algorithm test suites in CI/local TypeScript runtime
- fix any parity/type failures before marking migration verified
- reference-engine edge-case hardening if CI exposes gaps
- reviewed full USDA provider mapping for pending nutrient IDs
- expanded OpenFoodFacts micronutrient adapter
- versioned nutrient-reference dataset
- nutrition-label extraction -> canonical nutrient IDs
- recipe calculator migration onto the full nutrient vector

Database models, HTTP routes, Appwrite/Azure work and UI remain outside this
phase.
