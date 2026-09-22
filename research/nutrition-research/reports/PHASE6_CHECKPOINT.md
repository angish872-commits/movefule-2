# MoveFuel — Phase 6 Checkpoint

Status: COMPLETE
Date: 2026-08-06

Phase 6 delivered the mock-first, model-independent food-image estimation
pipeline on top of the verified Phase-5 USDA foundation.

## Phase-6 files

### Source (`backend/src/nutrition/`)
- `qualityAssessment.ts` — `MetadataOnlyQualityAssessor`, `MockPixelQualityAssessor` (PIXEL_MODEL stays mocked), issue codes, `retryRecommendationFor`.
- `segmentationAdapter.ts` — `NormalizedBBox`, `validateNormalizedBBox` (x+width<=1 invariant), `validateSegmentationAnalysis`.
- `candidateProviderAdapter.ts` — candidate contracts; `validateCandidateGenerationResult` rejects nutrient keys; `MAX_CANDIDATES_PER_REGION = 3`.
- `portionEvidence.ts` — 16 evidence types, versioned reliability tier policy, `validateEvidenceRecord`.
- `portionEstimator.ts` — `PortionEstimator.estimate`, min/central/max gram range, versioned confidence (`PORTION_ESTIMATOR_VERSION`).
- `clarification.ts` — `ClarificationEngine`, 12 question templates, deduplication, cap with guaranteed MANUAL_ENTRY.
- `mockSegmentationAdapter.ts` — FNV-1a deterministic regions, maskless mode, never invents identity.
- `mockCandidateProvider.ts` — fixture-driven, max-3 guard, UNKNOWN for empty regions.
- `imageEstimatePipeline.ts` — orchestration, 8 result states, `applyCorrection` without vision, idempotency on requestId.

### Tests (`backend/src/tests/nutrition/`)
- `quality-assessment.test.ts` (11), `segmentation-adapter.test.ts` (10), `candidate-provider.test.ts` (9),
  `portion-estimator.test.ts` (15), `clarification.test.ts` (9), `image-estimate-pipeline.test.ts` (14),
  `schema-validation.test.ts` (10).

### Schemas (`nutrition-research/schemas/`)
- `image-quality`, `food-region`, `food-candidate`, `portion-evidence`, `portion-estimate`,
  `clarification-question`, `image-estimate-result` (7 schemas; `confirmed` required `false`).

### Reports (`nutrition-research/reports/`)
- `IMAGE_PIPELINE_CONTRACT.md`, `PORTION_ESTIMATION_POLICY.md`, `CLARIFICATION_POLICY.md`,
  `PHASE6_IMAGE_PIPELINE_COMPLETION_REPORT.md`.

## Contracts and result states

- Segmentation: `SEGMENTATION_POLICY_VERSION = 1`; regions have normalized bboxes and
  `segmentationConfidence` (never identity confidence); no nutrients.
- Candidates: `MAX_CANDIDATES_PER_REGION = 3`; provider confidence is separate from final confidence.
- Portion: evidence tiers 1–7; best tier drives the range; uncalibrated geometry can never be HIGH.
- Clarification: capped at 4 questions per generation; MANUAL_ENTRY never dropped when portion INSUFFICIENT.
- Pipeline result states: `COMPLETED_NEEDS_CONFIRMATION`, `NEEDS_CLARIFICATION`, `NEEDS_USER_REVIEW`,
  `NUTRITION_SOURCE_NOT_RESOLVED`, `PORTION_INSUFFICIENT`, `IMAGE_RETAKE_REQUIRED`, `PROVIDER_UNAVAILABLE`,
  plus `FAILED`. `IMAGE_ESTIMATE_SCHEMA_VERSION = 1`, `IMAGE_ESTIMATE_CONFIDENCE_POLICY_VERSION = 1`.

## Verification results

- Backend tests: **235 passed / 0 failed** (157 Phase-5 + 78 Phase-6).
- Python tests: **10 passed / 0 failed**.
- TypeScript checks: clean (tsc bundled with global vercel) on production modules, test files, and the re-export index.
- Secret scan: clean (no API keys/secrets in source, tests, schemas, or reports).
- Whitespace/tab validation: clean.
- Determinism: mock segmentation deterministic; 500-seed sweep against the bbox contract: 0 failures.

## SHA-256 manifest (Phase-6 source, tests, schemas, reports)

The 4.3 GB USDA catalogue and raw archives are intentionally excluded.

```
0fc5d1f88fe8c3d9e0650303020710a25f1cc00ed039eb21afc7b58a3bdd708b  backend/src/nutrition/qualityAssessment.ts
df52ca0e2c678a80855f159fe941ab8feb99f9ce7137ab1abccdbf06095fa92d  backend/src/nutrition/segmentationAdapter.ts
4fc02be90629a459925c05f62501acfd82bdb9850abb5f659d6a458d9b61a880  backend/src/nutrition/candidateProviderAdapter.ts
67845ddfb068f650a2288ec8d103a9394004545bf699a16343d3125fcd241002  backend/src/nutrition/portionEvidence.ts
2b64694e8bd8a97951b5f0bfbae712aee298a113b06871bfe820cf3f64337f3c  backend/src/nutrition/portionEstimator.ts
60b6b715aa60cff59a5fb6a6271606b55c6d86ea9d364374091c449bc18e4eb7  backend/src/nutrition/clarification.ts
f1277a1e5bfd2e836cacf120f635798879f267868330d8acde9a427dc6e380fc  backend/src/nutrition/mockSegmentationAdapter.ts
f0bf123b6c8adc462bd1ab7bf019980b9e24766b31ddb566f1ff97a09606e60b  backend/src/nutrition/mockCandidateProvider.ts
3f0fe970547acf3a033da1b84bda19d5fb2ba599c337b2744c7e0899943d6cdf  backend/src/nutrition/imageEstimatePipeline.ts
28d7c1f38b3fe2484d8bf0ef4790a1030dd29e28f4aeb95534f37a6021ebda71  backend/src/tests/nutrition/quality-assessment.test.ts
f95e742018eb1eb7240440ccff8b89c46b08696bf86280251b9bf68462da6fee  backend/src/tests/nutrition/segmentation-adapter.test.ts
de786a51996a5bf964fd3fc1680aa1c5244e173fff09e463215654c89e5f25f9  backend/src/tests/nutrition/candidate-provider.test.ts
7c116429241cb5b83cd1204eee36c773685465d29ac02a2ca27253bef45b55ba  backend/src/tests/nutrition/portion-estimator.test.ts
e16369d48ecd8215d5e6f4aa4812174cd6d3029b7500da3f5d1e63f568ced568  backend/src/tests/nutrition/clarification.test.ts
fbc199b88294da73b6cdb6b3b188f3f567c81eb81fc31ca3badd74af2f87b5db  backend/src/tests/nutrition/image-estimate-pipeline.test.ts
03499ea94d80c8660a38d5e683ba45dc8095f17754e95332640c6cfaa98837df  backend/src/tests/nutrition/schema-validation.test.ts
43560da67a9b4b175abd1d4fad47c17281c332cb9be96a9dd5889e5ff8e6d0c5  nutrition-research/schemas/image-quality.schema.json
7cbee24c64cd1714d1de33b765f5b5e614e66b28d6af989b2511366c772e3e2a  nutrition-research/schemas/food-region.schema.json
0bbca6badc9f9fed07c6638f8e375ff02a22db0022fcb7e4b3afd01c1e73f19e  nutrition-research/schemas/food-candidate.schema.json
5c400ff4f23ecaea0e90f04958655435a68471f4fd53e8c86217d70a04cda83d  nutrition-research/schemas/portion-evidence.schema.json
6abe317977cbf1744de2dab3c73512c5cbcd09a91c74ef96f5f164569d686b9e  nutrition-research/schemas/portion-estimate.schema.json
216aae8de2d7de59129f3f9ab2cefa1dc25e6dde9d45a8eba04d1e548d38471f  nutrition-research/schemas/clarification-question.schema.json
86eda055a0fb796e1d5e930bee2eecd0a3d06d2d4f6670647caeac47063ae435  nutrition-research/schemas/image-estimate-result.schema.json
cf5471b5adb512a31d848b6b2786ac9417f4710296895b3b1bc8ecd1c8b3aaef  nutrition-research/reports/IMAGE_PIPELINE_CONTRACT.md
e31ead12316ad8593d268e731c86258c84ca8769c09ecd97fb2dba46fa80c152  nutrition-research/reports/PORTION_ESTIMATION_POLICY.md
3db518132f6fef442affc3de82a0c2faa3b9c6f160be0116bbb523e88e26bf7b  nutrition-research/reports/CLARIFICATION_POLICY.md
3dafd110c9a227a983b03389a5cddab03d8054f2676eb34f55153cb302d34fb9  nutrition-research/reports/PHASE6_IMAGE_PIPELINE_COMPLETION_REPORT.md
```

## Unverified scientific assumptions (Phase 6)

These are versioned placeholders, not measurements, and must be calibrated
against weighed-food data before any production claim:

- Default plate reference: diameter 26 cm, depth 2 cm, food coverage fraction 0.5.
- Density assumption 1 g/ml for volume→mass conversion.
- Mixed-dish hidden fat uncertainty factor 0.15.
- Piece-based keyword heuristic (`isPieceBasedName`).
- Quality gates (min 320x320 px, max 8000x8000 px, max 20 MB) are policy, not validated facts.
- No claim that bounding-box area or pixel area reflects physical food amount.
- No production accuracy claim of any kind; pixel/model outputs remain MOCKED.
