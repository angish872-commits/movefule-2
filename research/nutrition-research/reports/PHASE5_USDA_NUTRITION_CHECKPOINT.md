# MoveFuel — Phase 5 USDA Nutrition Checkpoint

Status: CHECKPOINT (immutable record of the state before Phase 6)
Last updated: 2026-08-06

This checkpoint records the verified state of the USDA nutrition foundation
before the Phase-6 mock-first image estimation pipeline begins. It does not
claim production readiness, real image recognition, or calorie accuracy.

## Downloaded USDA release

- Release: **FoodData_Central_csv_2026-04-30**
- Archive filename: `FoodData_Central_csv_2026-04-30.zip`
- SHA-256: `bbc7ef6796d837f9facf83c92184a28a54f1ef962de62f80d1b00f6d518c3762`
- Source: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_csv_2026-04-30.zip
- Archive location: `nutrition-research/data/raw/usda/`
- Manifest + checksum: `nutrition-research/data/raw/usda/manifest.json`, `SHA256SUMS.txt`

## Imported record counts

| Table | Imported | Rejected |
|---|---|---|
| food | 2,101,279 | 0 |
| food_nutrient | 27,195,013 | 0 |
| food_portion | 47,173 | 273 (quarantined, never silently dropped) |
| branded_food | 1,999,950 | 0 |
| food_category | 28 | 0 |
| foundation_food | 395 | 0 |
| nutrient | 477 | 0 |
| sr_legacy_food | 7,793 | 0 |
| survey_fndds_food | 5,432 | 0 |

- Foods indexed in FTS5: 2,101,279
- Foods missing energy kcal: 225,580 (mostly branded without kcal)

## SQLite catalogue location

`nutrition-research/data/processed/fdc.sqlite`

The catalogue is rebuildable deterministically from the checksummed raw
archive. Re-import is idempotent (release-keyed). The raw/processed data
directory (~4.3 GB) is deliberately excluded from any code archive.

## Nutrient IDs currently supported (canonical core profile)

| Nutrient | FDC nutrient IDs |
|---|---|
| energyKcal | 1008, 2047, 2048 |
| proteinG | 1003 |
| carbG | 1005 |
| fatG | 1004 |
| fiberG | 1079 |
| sodiumMg | 1093 |

These are the only canonical ids treated as the core profile in
`backend/src/nutrition/nutrientNormalizer.ts` and the Python importer.

## TypeScript / Python parity result

- Cross-language recipe parity fixture:
  `nutrition-research/schemas/recipe-parity.fixture.json`
- TypeScript resolver (`recipeResolver.ts`) reproduces Python reference
  per-100g values **exactly** for the chicken-momo and dal-bhat fixtures.
- Test: `backend/src/tests/nutrition/recipe-resolver.test.ts`
  ("TypeScript/Python parity: resolver reproduces Python per-100g exactly").

## Test counts

| Suite | Pass | Fail |
|---|---|---|
| Backend (all, `npm test`) | 157 | 0 |
| Python (`unittest` discover) | 10 | 0 |

## Unresolved recipe-review status

- Regional (Nepali/South Asian) recipes are **unreviewed estimates**
  (`UNREVIEWED_RECIPE_ESTIMATE`), not verified.
- No recipe becomes VERIFIED until a human reviews ingredients, quantities,
  cooked yield, oil/ghee, final weight and portion definition. See
  `reports/REGIONAL_RECIPE_POLICY.md`.

## Features still mocked

- Vision/image analysis provider (segmentation, candidate generation):
  deterministic `MockVisionProvider` only.
- USDA FoodData Central API: no live key configured; HTTP client tests are
  mock-transport only.
- No generic nutrient fallback exists; unresolved sources return
  `NUTRITION_SOURCE_NOT_RESOLVED`.
- No real vision model integrated; no model weights downloaded.

## Files modified during Phase 5 (source, tests, schemas, reports)

Source:
- backend/src/nutrition/contracts.ts
- backend/src/nutrition/confidence.ts
- backend/src/nutrition/nutrientCalculator.ts
- backend/src/nutrition/nutrientNormalizer.ts
- backend/src/nutrition/foodResolver.ts
- backend/src/nutrition/recipeResolver.ts
- backend/src/nutrition/usdaClient.ts
- backend/src/nutrition/estimatePipeline.ts
- backend/src/nutrition/index.ts
- backend/src/vision/contracts.ts
- backend/src/vision/mockProvider.ts
- backend/src/vision/index.ts

Tests:
- backend/src/tests/nutrition/estimate-pipeline.test.ts
- backend/src/tests/nutrition/food-resolver.test.ts
- backend/src/tests/nutrition/nutrient-calculator.test.ts
- backend/src/tests/nutrition/recipe-resolver.test.ts
- backend/src/tests/nutrition/usda-client.test.ts

Schemas:
- nutrition-research/schemas/nutrition-estimate.schema.json
- nutrition-research/schemas/recipe-parity.fixture.json

Reports:
- nutrition-research/reports/BENCHMARK_PROTOCOL.md
- nutrition-research/reports/BENCHMARK_RESULTS.md
- nutrition-research/reports/MODEL_LICENSE_AUDIT.md
- nutrition-research/reports/NUTRIENT_MAPPING.md
- nutrition-research/reports/PRODUCTION_GAPS.md
- nutrition-research/reports/REGIONAL_RECIPE_POLICY.md
- nutrition-research/reports/SOURCE_RANKING_POLICY.md
- nutrition-research/reports/USDA_ATTRIBUTION.md
- nutrition-research/reports/USDA_IMPORT_QA.md
- nutrition-research/reports/USDA_SOURCE_INVENTORY.md

Python (parity + importer):
- nutrition-research/python/movefuel_fdc/recipe_builder.py
- nutrition-research/python/movefuel_fdc/parity_fixture.py
- nutrition-research/python/movefuel_fdc/catalogue_schema.py
- nutrition-research/python/movefuel_fdc/csv_importer.py
- nutrition-research/python/movefuel_fdc/importer.py
- nutrition-research/python/movefuel_fdc/release_manifest.py
- nutrition-research/python/movefuel_fdc/reporting.py
- nutrition-research/python/movefuel_fdc/search_index.py
- nutrition-research/python/movefuel_fdc/validator.py
- nutrition-research/python/tests/test_importer.py
- nutrition-research/python/tests/test_manifest.py
- nutrition-research/python/tests/test_recipe.py

A SHA-256 manifest for Phase-5 source, tests, schemas and reports is in
`nutrition-research/reports/PHASE5_SHA256_MANIFEST.txt`. The 4.3 GB
raw/processed data directory is excluded.

## Explicit non-claims

- No production, medical or clinical accuracy is claimed.
- Classification accuracy is not calorie accuracy.
- A single ordinary photo is not treated as exact physical measurement.
