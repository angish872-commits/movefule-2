# ADR-004: Model and Licence Boundary

- Status: ACCEPTED
- Date: 2026-08-06

## Context

GitHub food/calorie-estimation repositories are useful learning references
but none is a complete MoveFuel algorithm. Several (YOLO-based) depend on
Ultralytics, which is AGPL-3.0; commercial deployments may require an
Enterprise licence. Public GitHub visibility does not grant commercial
reuse rights.

## Decision

- Do not copy existing GitHub calorie-estimation repositories, weights or
  datasets into MoveFuel until their licences are documented and approved.
- Build model-independent adapter interfaces for image analysis
  (`vision/*`): image validation, quality assessment, segmentation,
  candidate generation. Nothing is bound to a single provider.
- Create a `mockProvider` that is deterministic and free, used for tests
  and CI.
- The vision layer returns food candidates and portion evidence only; it
  never returns nutrient values.

## Consequences

- Model providers are swappable behind interfaces; swap does not touch the
  nutrition, calculation, or confirmation layers.
- A licence audit is a required deliverable before any third-party weights
  or code are integrated: `reports/MODEL_LICENSE_AUDIT.md`.
- AGPL/Enterprise considerations are explicitly recorded before adopting
  Ultralytics or any fork.

## Approved ordering

Build the nutrition-data foundation and deterministic calculation engine
before experimenting with image segmentation/models.
