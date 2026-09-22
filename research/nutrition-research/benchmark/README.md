# MoveFuel — Weighed-Food Benchmark (Phase 7)

This directory holds the controlled-evaluation package for the food-image
pipeline. It is deliberately model-independent: no provider is selected here,
no weights are downloaded, and no API credits are spent.

## Files

- `benchmark-sample.schema.json` — draft-07 schema for one benchmark sample.
- `benchmark-manifest.schema.json` — draft-07 schema for a benchmark manifest
  (the planned set of samples).
- `benchmark-result.schema.json` — draft-07 schema for a comparison result
  (`BenchmarkResult` from the backend evaluator).
- `benchmark-sample.template.json` — skeleton for a new sample (all
  measurements `null`/`AWAITING_COLLECTION`; no fabricated values).
- `benchmark-manifest.template.json` — skeleton manifest with the planned
  categories and counts.
- `benchmark-samples.template.csv` — flat template for tabular capture.
- `benchmark-plan.json` — the planned 30-sample benchmark (all
  `AWAITING_COLLECTION`).

## Rules

- Image paths are references only (`ref://` / `pending://`); image bytes are
  never embedded or logged.
- Samples stay `AWAITING_COLLECTION` until weighed photos and measurements
  exist; do not invent benchmark measurements.
- A sample is only eligible for evaluation when `reviewStatus` is `REVIEWED`
  and `privacyConsent` is `CONSENTED`; everything else is excluded by the
  evaluator.
- Corrections are recorded without overwriting original ground truth.

## Backend

Schemas correspond to the TypeScript contracts in
`services/backend/src/nutrition/benchmarkContracts.ts`. The evaluator and harness live
in `services/backend/src/nutrition/benchmarkEvaluator.ts` and
`providerComparison.ts`; metrics in `benchmarkMetrics.ts`; the registry in
`providerRegistry.ts`.
