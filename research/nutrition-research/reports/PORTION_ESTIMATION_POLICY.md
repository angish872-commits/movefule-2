# MoveFuel — Portion Estimation Policy

Status: DRAFT (config versioned in code, Phase 6)
Last updated: 2026-08-06

A single ordinary photo cannot determine exact grams. This policy defines how
the deterministic `PortionEstimator` turns evidence into a
minimum/central/maximum gram range with a versioned confidence.

## Evidence types and reliability

| Tier | Reliability | Evidence types |
|---|---|---|
| 1 | Confirmed manual grams / package label | MANUAL_GRAMS, PACKAGE_LABEL |
| 2 | Reviewed serving / verified piece weight | BARCODE_SERVING, PIECE_COUNT |
| 3 | Calibrated physical reference | KNOWN_PLATE_DIAMETER, KNOWN_BOWL_VOLUME, REFERENCE_CARD |
| 4 | Multi-view / depth evidence; reviewed recipe serving | SECOND_IMAGE, SIDE_IMAGE, DEVICE_DEPTH, RECIPE_SERVING |
| 5 | Previous user-confirmed portion | PREVIOUS_CONFIRMED_PORTION, USER_SELECTED_SERVING |
| 6 | Uncalibrated geometry | SEGMENTATION_AREA, BOUNDING_BOX_AREA |
| 7 | No scale reference | NO_SCALE_REFERENCE |

The ranking lives in `DEFAULT_PORTION_EVIDENCE_POLICY` (version 1) and is
configuration, not scientific fact. It must be benchmarked before production
use.

## Estimation rules

- `minimum <= central <= maximum`; grams are never negative.
- The best tier (lowest number) drives the estimate; strictly weaker evidence
  is recorded as `evidenceRejected` (superseded).
- Exact grams (HIGH) require high-quality direct evidence (manual grams or a
  confirmed package label).
- Uncalibrated segmentation cannot independently produce HIGH confidence; it
  produces LOW with a broad, clearly-flagged range and asks for a scale
  reference.
- No scale reference produces INSUFFICIENT (grams are not invented).
- Mixed dishes widen the range for hidden oil/ghee/sauce uncertainty
  (factor 0.15, versioned).
- Liquids require container/volume evidence (KNOWN_BOWL_VOLUME or manual
  grams/package label); otherwise INSUFFICIENT.
- Piece-based foods request a piece count; a count without a verified piece
  weight cannot be converted to grams.
- Packaged foods prefer package-label/barcode-serving evidence.
- No generic portion fallback is presented as fact.

## Confidence mapping

| Best tier | Confidence |
|---|---|
| 1 | HIGH |
| 2 | HIGH (MEDIUM if ESTIMATED/UNVERIFIED) |
| 3 | MEDIUM |
| 4 | MEDIUM |
| 5 | MEDIUM |
| 6 | LOW |
| 7 / none | INSUFFICIENT |

Caps: mixed dish -> at most MEDIUM; liquid without container -> INSUFFICIENT;
geometry-only -> LOW.

## Assumptions

Geometric conversions (plate diameter, bowl volume, default plate reference)
use versioned placeholder assumptions (e.g. plate depth 2 cm, density 1 g/ml,
default plate diameter 26 cm, food coverage fraction 0.5). These are flagged
in `assumptions` and `uncertainties` and are NOT measurements. They must be
replaced by calibrated, benchmarked values before any production claim.

## Requirements flags

- `requiresClarification`: true when more information would materially tighten
  the range (piece count, container, package label, plate reference, or any
  INSUFFICIENT result).
- `requiresUserConfirmation`: true unless the evidence is a direct, confirmed
  measurement; the pipeline itself never auto-confirms a meal.
