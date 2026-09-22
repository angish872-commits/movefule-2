# MoveFuel — Phase 7 Provider Comparison & Benchmark Completion Report

Status: COMPLETE (mock-first, model-independent; no provider selected)
Date: 2026-08-06

## 1. Exact files created or modified

Created (`backend/src/nutrition/`):
- `benchmarkContracts.ts` — shared contracts: `ProviderDescriptor`, `SampleInputView`,
  `ProviderPrediction`, `ProviderRunRecord`, `ComparisonRun`, `BenchmarkSample`,
  `PipelinePrediction`, gate helper `providerCanBeEnabled`.
- `providerRegistry.ts` — `ProviderRegistry` (register/get/list/enable/disable),
  duplicate-ID and gate enforcement, `mockDescriptor`.
- `providerComparison.ts` — `ProviderComparisonHarness` (identical sample set,
  isolation, raw-output preservation, retries/failures, deterministic replay),
  `buildSampleInputView` (ground truth stripped).
- `benchmarkMetrics.ts` — versioned metric functions with NOT_MEASURABLE semantics.
- `benchmarkEvaluator.ts` — `BenchmarkEvaluator` producing per-provider category
  scores and a decision matrix.
- Modified `index.ts` — re-exports the five Phase-7 modules.
- Modified `mockSegmentationAdapter.ts` — latency now deterministic (removed
  `Date.now()`), fixing a determinism contract violation found during testing.

Created (`backend/src/tests/nutrition/`):
- `benchmark-metrics.test.ts`, `provider-registry.test.ts`,
  `provider-comparison.test.ts`, `benchmark-schemas.test.ts`.

Created (`nutrition-research/benchmark/`):
- `README.md`, `benchmark-sample.schema.json`, `benchmark-manifest.schema.json`,
  `benchmark-result.schema.json`, `benchmark-sample.template.json`,
  `benchmark-manifest.template.json`, `benchmark-samples.template.csv`,
  `benchmark-plan.json` (30 planned samples).

Created/updated (`nutrition-research/reports/`):
- Created: `PHASE6_CHECKPOINT.md` (SHA-256 manifest + unverified assumptions),
  `PROVIDER_PRIVACY_AUDIT.md`, `WEIGHED_FOOD_BENCHMARK_PROTOCOL.md`,
  `PROVIDER_EVALUATION_MATRIX.md`, `PHASE7_PROVIDER_COMPARISON_COMPLETION_REPORT.md`.
- Updated: `MODEL_LICENSE_AUDIT.md` (provider licence gates section).

## 2. Provider-registry status

`ProviderRegistry` enforces: blank/duplicate providerId rejection; a provider
cannot register as enabled nor be enabled while any licence/privacy gate is
UNKNOWN or the licence is REJECTED (`providerCanBeEnabled`). Only the built-in
MOCK providers (`mockDescriptor`) are registered and enabled. No real provider
is registered; all candidate descriptors remain placeholders with UNKNOWN gates.

## 3. Benchmark schemas/templates created

- Schemas: `benchmark-sample`, `benchmark-manifest`, `benchmark-result` (draft-07).
- Templates: sample, manifest, CSV.
- `benchmark-plan.json`: valid manifest of 30 samples, all `AWAITING_COLLECTION`,
  `privacyConsent PENDING`, image paths are `pending://` references only.

## 4. Planned sample categories and counts

- BASIC 6 (rice, boiled egg, banana, apple, bread, chicken breast)
- PIECE_BASED 3 (steamed momo, fried momo, dumplings)
- MIXED 7 (dal bhat, tarkari, chicken curry, vegetable curry, chow mein, biryani, thukpa)
- LIQUID 5 (dal, soup, milk, yogurt, smoothie)
- PACKAGED 3 (barcode food, packaged snack, packaged drink)
- HARD_CASE 6 (overlapping foods, hidden sauce, high-glare container, low-light,
  partially obstructed plate, visually similar candidates)

Total: 30.

## 5. Metrics implemented

Quality: accept/reject, retake-required correctness. Segmentation: region
precision, recall, mean IoU, missed-food rate, duplicate-region rate. Identity:
top-1, top-3, unknown-food handling, food-type accuracy. Source resolution:
correct/unresolved/incorrect rate. Portion: gram MAE, median AE, MAPE (valid
denominators only), interval coverage, central bias, piece-count error. Nutrition:
calorie/protein/carb/fat/fiber/sodium absolute and percentage error. Interaction:
clarification count, unnecessary-question rate, correction rate, manual-entry
rate. Operational: schema-valid rate, malformed rate, failure rate, latency
median/p95, cost per image and per confirmed meal. Missing ground truth yields
NOT_MEASURABLE, never zero.

## 6. Tests run and pass/fail counts

- Backend: **272 passed / 0 failed** (235 Phase-6 + 37 Phase-7).
- Python: 10 passed / 0 failed (unchanged).
- Phase-7 test coverage: provider registration, duplicate-ID rejection, disabled
  rejection, unknown-licence gate, deterministic replay, NOT_MEASURABLE on
  missing ground truth, top-1/top-3, IoU, MAE/MAPE, zero-denominator, interval
  coverage, malformed output, failed call, latency/cost aggregation, sample and
  privacy-consent exclusion, identical sample set, no cross-provider leakage,
  result serialization round-trip.
- Deterministic repeatability: full suite green twice; harness replay fingerprint
  stable.

## 7. Schema validation result

`benchmark-schemas.test.ts` loads all three benchmark schemas, validates all 30
plan samples against `benchmark-sample.schema.json`, validates the plan manifest
(including category counts), and validates a full `BenchmarkResult` against
`benchmark-result.schema.json` — 0 errors.

## 8. Licence/privacy gates

No provider may be enabled with UNKNOWN licence, commercial-use, data-retention,
training-use, or region status (code-enforced). `MODEL_LICENSE_AUDIT.md` updated
with the gate matrix; `PROVIDER_PRIVACY_AUDIT.md` created with structured
UNKNOWN placeholders (image retention, training use, opt-out, deletion, regions,
commercial use, transfer transparency). No terms were browsed or invented.

## 9. Secret scan result

Clean — no API keys, tokens, or secrets in Phase-7 source, tests, schemas,
templates, or reports.

## 10. Features still mocked

- All pixel/model quality, segmentation, and candidate outputs.
- No real provider in the registry; the harness runs MOCK adapters only.
- Quality accept/reject and retake metrics stay NOT_MEASURABLE until real
  pixel-quality ground truth is collected.

## 11. Data still awaiting collection

All 30 planned samples are `AWAITING_COLLECTION` (weighed raw/cooked/portion
grams, plate/container measures, piece counts, photos, labels, region ground
truth, source mapping, consent). No benchmark accuracy claim is made until real
weighed samples exist.

## 12. Next bounded action

Collect a first batch of weighed samples (protocol: `WEIGHED_FOOD_BENCHMARK_PROTOCOL.md`),
then run the harness against the MOCK providers to exercise end-to-end metric
reporting before any real provider is registered.
