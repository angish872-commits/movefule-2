# MoveFuel — Image Pipeline Contract

Status: DRAFT (mock-first, Phase 6)
Last updated: 2026-08-06

This document describes the Phase-6 model-independent contracts for the
food-image estimation pipeline. It deliberately separates image quality,
segmentation, candidate generation, portion evidence, portion estimation,
clarification and final orchestration. Nothing in this pipeline claims real
image recognition or calorie accuracy.

## Layering

```
ImageEstimatePipeline (orchestration)
  ├── ImageQualityAssessor / PixelQualityAssessor   qualityAssessment.ts
  ├── SegmentationAdapter                          segmentationAdapter.ts
  ├── CandidateProvider                            candidateProviderAdapter.ts
  ├── PortionEstimator                             portionEstimator.ts
  ├── ClarificationEngine                          clarification.ts
  └── resolveFood -> existing USDA/recipe resolver
```

The nutrition and confirmation layers are untouched. This pipeline never
creates a confirmed meal; only the existing explicit confirmation service
persists a confirmed meal and updates daily totals.

## Contracts

| Contract | Module | Output |
|---|---|---|
| ImageQualityResult | qualityAssessment.ts | state, issueCodes, message, retry, fallback, evidenceSource, analyserVersion, validationMode |
| SegmentationAnalysis | segmentationAdapter.ts | provider, status, regions, latency, warnings |
| CandidateGenerationResult | candidateProviderAdapter.ts | up to 3 candidates per region, status |
| PortionEvidenceRecord | portionEvidence.ts | evidenceType, value, unit, source, reliabilityTier, collectedAt, assumptions, validationState |
| PortionEstimate | portionEstimator.ts | min/central/max grams, confidence, evidence, assumptions, uncertainties, estimatorVersion |
| ImageClarificationQuestion | clarification.ts | questionId, reason, affectedUncertainty, infoGain, responseType, optional, fallback, nextState |
| ImageEstimateResult | imageEstimatePipeline.ts | state, items, imageQuality, confirmed:false, ownerUserId |

## Image-quality states

ACCEPTABLE, REVIEW_RECOMMENDED, RETAKE_REQUIRED, INVALID_IMAGE, UNSUPPORTED.

- Metadata-only validation is always labelled `METADATA_ONLY`.
- Pixel/model validation uses a separate `PixelQualityAssessor` and remains
  MOCKED until a real implementation is verified. It is labelled
  `PIXEL_MODEL`.
- No pixel-level finding (blur, exposure, glare, occlusion) is ever reported
  by a metadata-only result.

## Segmentation rules

- Bounding boxes are weaker evidence than masks.
- Pixel area is not physical food area.
- Segmentation confidence is not food-identity confidence.
- A missing region must never create an invented food.
- Segmentation output never carries nutrient values.

## Candidate rules

- Provider confidence is not final system confidence.
- The provider never supplies authoritative calories or nutrients.
- Unknown output remains UNKNOWN/UNCLEAR rather than guessing.
- Candidate names are resolved through the existing USDA/recipe resolver.

## Orchestration states

COMPLETED_NEEDS_CONFIRMATION, NEEDS_CLARIFICATION, NEEDS_USER_REVIEW,
NUTRITION_SOURCE_NOT_RESOLVED, PORTION_INSUFFICIENT, IMAGE_RETAKE_REQUIRED,
PROVIDER_UNAVAILABLE, INVALID_REQUEST.

## Confidence model

The pipeline returns a component `EstimateConfidenceReport` per item:

- imageQuality, segmentation, identity, portionEvidence, preparationCertainty,
  nutritionSourceMatch, recipeReviewStatus, overall, cappedBy.

A weak critical component caps the overall confidence:
- strong identity + no portion scale cannot be HIGH;
- exact label serving + barcode match may be HIGH;
- unreviewed regional recipe cannot be presented as verified;
- an unresolved nutrient source returns NEEDS_USER_REVIEW.

The final confidence policy is versioned
(`IMAGE_ESTIMATE_CONFIDENCE_POLICY_VERSION = 1`).

## Security and privacy

- No real image-provider API key and no USDA key are required or stored.
- Temporary image references are used instead of raw image bytes in logs.
- Full user images and private health/profile data are never logged with
  provider responses.
- Provider errors are sanitized (`provider_error:<name>`, never internals).
- Image retention remains configurable; model-improvement use requires
  separate consent.

## Versioning

- Quality policy: `IMAGE_QUALITY_POLICY_VERSION = 1`
- Segmentation policy: `SEGMENTATION_POLICY_VERSION = 1`
- Candidate policy: `CANDIDATE_POLICY_VERSION = 1`
- Portion evidence policy: `PORTION_EVIDENCE_POLICY_VERSION = 1`
- Portion estimator: `PORTION_ESTIMATOR_VERSION = "1.0.0"`
- Clarification policy: `CLARIFICATION_POLICY_VERSION = 1`
- Confidence policy: `IMAGE_ESTIMATE_CONFIDENCE_POLICY_VERSION = 1`
- Schema version: `IMAGE_ESTIMATE_SCHEMA_VERSION = 1`

## Explicit non-claims

- No real image recognition, calorie accuracy, production readiness or
  provider verification is claimed in this phase.
- The next step is a controlled provider comparison and weighed-food
  benchmark design — not immediate production integration.
