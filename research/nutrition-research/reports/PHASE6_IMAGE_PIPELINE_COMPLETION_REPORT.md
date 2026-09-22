# MoveFuel — Phase 6 Image Pipeline Completion Report

Status: COMPLETE (mock-first, model-independent)
Date: 2026-08-06

Phase 6 delivers the food-image estimation pipeline on top of the verified
Phase-5 USDA foundation, entirely with deterministic mocks and versioned
policies. No vision model, no weights, no USDA key, no generic fallback.

## What was built

### Production modules (`backend/src/nutrition/`)

| Module | Responsibility |
|---|---|
| qualityAssessment.ts | `MetadataOnlyQualityAssessor` (metadata, `METADATA_ONLY`) and `MockPixelQualityAssessor` (`PIXEL_MODEL`, stays mocked); `QualityState`, issue codes, `retryRecommendationFor` |
| segmentationAdapter.ts | Provider-independent contracts; `validateNormalizedBBox` (x+width<=1 invariant), `validateSegmentationAnalysis`; no identity, no nutrients |
| candidateProviderAdapter.ts | Candidate contracts; `validateCandidateGenerationResult` rejects nutrient keys; `MAX_CANDIDATES_PER_REGION = 3` |
| portionEvidence.ts | 16 evidence types, versioned reliability tier policy, `validateEvidenceRecord` |
| portionEstimator.ts | `PortionEstimator.estimate`; min/central/max gram range, tiered confidence, version 1.0.0 |
| clarification.ts | `ClarificationEngine`, 12 question templates, deduplication, cap with guaranteed MANUAL_ENTRY |
| mockSegmentationAdapter.ts | FNV-1a deterministic regions; maskless mode; never invents identity |
| mockCandidateProvider.ts | Fixture-driven; max-3 guard; UNKNOWN for empty regions |
| imageEstimatePipeline.ts | Orchestration; 8 result states; `applyCorrection` (portion_grams / select_candidate / select_source, no vision); idempotency on requestId; `sanitizeProviderError` |

`backend/src/nutrition/index.ts` now re-exports all Phase-6 modules.

### Schemas (`nutrition-research/schemas/`)

image-quality, food-region, food-candidate, portion-evidence,
portion-estimate, clarification-question, image-estimate-result
(7 new; `confirmed` required `false`).

### Reports (`nutrition-research/reports/`)

IMAGE_PIPELINE_CONTRACT.md, PORTION_ESTIMATION_POLICY.md,
CLARIFICATION_POLICY.md, PHASE6_IMAGE_PIPELINE_COMPLETION_REPORT.md.

## Test results

- 7 new test files, 78 new tests (unit + custom minimal draft-07 schema
  validator): 235 pass / 0 fail across the full backend suite
  (157 Phase-5 + 78 Phase-6).
- Python research suite: 10/10 (unchanged).
- Type-check (tsc bundled with global vercel) on production modules, test
  files, and the re-export index: 0 errors.
- Deterministic repeatability: suite green twice; mock output byte-identical
  across adapter instances; 500-seed sweep of `validateSegmentationAnalysis`
  over mock deterministic regions: 0 contract failures.
- Secret scan and trailing-whitespace/tab validation: clean.

## Bugs found and fixed during verification

1. `mockSegmentationAdapter.ts` — signed `>>` on the unsigned FNV hash could
   emit negative bbox coordinates and out-of-range confidence. Fixed with
   unsigned `>>>` and bounds that guarantee x+width<=1 / y+height<=1; added a
   regression test sweeping 200 seeds against the contract.
2. `portionEstimator.ts` — filter type predicate failed to narrow grams; split
   the mapping/filter cleanly.
3. `portionEvidence.ts` — `includes` on a literal-union array; replaced with a
   type-guard predicate.
4. Name collision: Phase-5 `contracts.ts` and new `clarification.ts` both
   exported `ClarificationQuestion`. New type renamed to
   `ImageClarificationQuestion`.
5. Pre-existing `estimatePipeline.ts` — `PortionRange | null` passed where a
   non-null `PortionRange` was required; condition now narrows on
   `portionWithConfidence` (behavior-preserving).

## Non-claims

- No real object recognition or food-identity confidence from a model.
- No calorie or gram accuracy claims; all pixel/model outputs are MOCKED.
- No generic fallback presented as fact; unresolved sources require user
  review; unreviewed recipes are never "verified".
- Geometric conversions use versioned placeholder assumptions, never
  measurements.

## Next bounded action

Provider comparison harness + weighed-food benchmark design (still
mock-first, model-independent): compare candidate/segmentation adapters on a
fixed corpus and define the calibration procedure for the placeholder plate
assumptions before any production vision integration is considered.
