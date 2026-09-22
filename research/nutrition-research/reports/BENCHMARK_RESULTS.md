# MoveFuel — Benchmark Results

Status: NOT YET COLLECTED
Last updated: 2026-08-06

No accuracy percentage is advertised until this report is populated.

## Prerequisites

- [ ] Weighed-food benchmark dataset collected (20–30 foods) per
      `BENCHMARK_PROTOCOL.md`.
- [ ] Portion estimator + source resolver validated on the dataset.
- [ ] Confirmed-basis nutrient calculation checked against weighed grams.

## Planned benchmark foods (Nepali/South Asian priority)

- steamed chicken momo, buff momo, vegetable momo, momo achar
- plain cooked rice, dal, tarkari, dal bhat
- chicken curry, goat curry, chow mein, thukpa
- sel roti, roti, aloo achar, biryani, mixed thali

## Metrics (to be reported)

Detection precision/recall, segmentation IoU, top-1/top-3 identity,
USDA-resolution accuracy, portion MAE (g) and median % error,
calorie/protein/carb/fat error, range coverage, confidence calibration,
user correction rate, unresolved-source rate — reported separately by food
type and image difficulty.
