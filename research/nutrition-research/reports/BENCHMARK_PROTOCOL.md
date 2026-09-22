# MoveFuel — Benchmark Protocol

Status: DRAFT
Last updated: 2026-08-06

## Purpose

A benchmark protocol is required before any accuracy claim is made. No
accuracy percentage may be advertised until `BENCHMARK_RESULTS.md` exists.

## Dataset scope

Start with 20–30 foods across:

- simple foods
- piece-based foods
- mixed dishes
- liquids
- packaged foods
- Nepali/South Asian foods
- high-oil dishes
- visually similar dishes
- difficult images

## Per-sample ground truth

For each sample record:

- ground-truth food
- weighed grams
- pieces
- complete ingredients
- oil/ghee/sauce
- raw and cooked weights
- preparation
- plate/bowl dimensions
- image angles
- lighting
- reference object
- reference nutrition calculation
- reviewer
- collection date

## Ethics

Never place private user images in the benchmark without explicit research
consent.

## Metrics

- image-quality rejection accuracy
- detection precision/recall
- segmentation IoU
- top-1 identity accuracy / top-3 candidate recall
- USDA-record resolution accuracy
- portion mean absolute error (g) and median absolute % error
- calorie/protein/carb/fat absolute and % error
- range coverage, confidence calibration, clarification improvement
- structured-schema validity, latency, provider cost
- user correction rate, unresolved-source rate

Report separately by food type (simple / mixed / packaged / liquid /
Nepali-South Asian / clear / difficult).

## Warning

Classification accuracy is NOT calorie accuracy. Never present the two as
equivalent.
