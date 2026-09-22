# MoveFuel — Provider Evaluation Matrix

Status: DRAFT (structure defined; no real providers evaluated)
Date: 2026-08-06

Phase 7 deliberately produces no single winner score. Averaging unrelated
metrics into one number hides trade-offs (a fast provider is not automatically
accurate; a cheap provider is not automatically compliant). Instead the
evaluator emits **category scores** and a **decision matrix** per provider.

## Category scores

| Category | Metric source | NOT_MEASURABLE when |
|---|---|---|
| quality | accept/reject + retake correctness | pixel-quality ground truth absent |
| segmentation | region precision, recall, mean IoU, missed-food, duplicate-region | no ground-truth regions |
| identity | top-1, top-3, unknown handling, food-type accuracy | no ground-truth food names |
| source resolution | correct/unresolved/incorrect source rate | no ground-truth source |
| portion | gram MAE, medAE, MAPE, interval coverage, bias, piece error | no served-weight ground truth |
| nutrition | calorie/protein/carb/fat/fiber/sodium errors | no nutrient ground truth or prediction |
| interaction | clarification count, unnecessary rate, correction rate, manual-entry rate | no interaction ground truth |
| operational | schema-valid, malformed, failure, latency, cost | no runs / no cost data |

## Decision matrix

Per provider, the evaluator emits rows such as:

| Criterion | Value | Evidence |
|---|---|---|
| adapter_type | SEGMENTATION / CANDIDATE / COMBINED | registry descriptor |
| deployment_type | LOCAL / SERVER / CLOUD_API / MOCK | registry descriptor |
| licence_status | APPROVED / REVIEW_REQUIRED / REJECTED / UNKNOWN | registry descriptor |
| enabled | yes / no | registry gate |
| evidence_status | BENCHMARKED / PARTIAL / UNVERIFIED / UNKNOWN | registry descriptor |
| top1_accuracy | 0..1 or NOT_MEASURABLE | benchmark run |

## Comparison rules (enforced by the harness)

- Identical sample set for every provider.
- Identical preprocessing where applicable.
- Raw provider outputs preserved verbatim.
- Normalization only through documented adapters.
- Segmentation confidence never mixed with identity confidence.
- Provider confidence never mixed with final confidence.
- Retries and failures recorded.
- Provider/model version recorded.
- Deterministic replay supported (`replayKey`).
- No provider sees another provider's output.
- User confirmation is never used as hidden ground truth in the same run.

## How a decision is made (not in this phase)

1. Confirm the provider passes licence and privacy gates (registry).
2. Read category scores per provider on the identical sample set.
3. Weight categories by product priority (e.g. identity and portion before
   latency) and compare rows in the decision matrix.
4. Require real weighed samples before any accuracy comparison is credible.
5. Record the decision and rationale; never claim a winner from this phase.
