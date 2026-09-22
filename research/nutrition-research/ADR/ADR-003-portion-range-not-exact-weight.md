# ADR-003: Portion Range, Not Exact Weight

- Status: ACCEPTED
- Date: 2026-08-06

## Context

A single ordinary phone photo cannot reliably determine exact physical
grams for a portion. Pixel area is not real-world area without calibration
(known plate size, reference object, depth, or a second angle). Claiming an
exact weight would be false precision.

## Decision

MoveFuel never returns a single exact gram weight as ground truth.

Portion output always includes:

- `minimumGrams`
- `centralGrams`
- `maximumGrams`
- `confidence`
- `evidence` (what was used: piece count, plate/bowl size, reference
  object, side image, saved user portion, package label)
- `uncertainties`

## Consequences

- Nutrient calculations are run deterministically for minimum, central and
  maximum grams, producing three nutrient values per nutrient.
- The user can edit grams, piece count, serving and identity before
  confirming.
- Only explicit user confirmation commits a value to history/daily totals.
- Confidence components (identity, segmentation, portion evidence,
  preparation, source match, recipe review status, completeness) are
  combined with a versioned, benchmarked policy; one provider confidence is
  never exposed as total system confidence.

Confidence policy: `reports/` confidence model + `services/backend/src/nutrition/confidence.ts`.
