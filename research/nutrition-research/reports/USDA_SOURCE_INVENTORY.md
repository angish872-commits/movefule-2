# MoveFuel — USDA Source Inventory

Release: **FoodData_Central_csv_2026-04-30**
Downloaded: 2026-08-06 · SHA-256: `bbc7ef6796d837f9facf83c92184a28a54f1ef962de62f80d1b00f6d518c3762`
Size: 481,510,693 bytes (compressed)

## Foods by data type (from `food.csv`)

| Data type            | Foods   | Has energy kcal |
|----------------------|---------|-----------------|
| branded_food         | 1,999,950 | yes |
| sub_sample_food      | 75,055     | (research) |
| sr_legacy_food       | 7,793      | yes |
| market_acquistion    | 7,577      | (research) |
| survey_fndds_food    | 5,432      | yes |
| sample_food          | 4,079      | (research) |
| agricultural_acquisition | 810   | (research) |
| foundation_food      | 469        | yes |
| experimental_food    | 114        | research-only |
| **Total**            | **2,101,279** | |

## Extension tables

| Table | Rows imported |
|---|---|
| foundation_food (Foundation Foods metadata) | 395 |
| survey_fndds_food (FNDDS metadata) | 5,432 |
| sr_legacy_food (SR Legacy metadata) | 7,793 |
| experimental_food (Experimental metadata) | 114 |

## Nutrients

- 477 nutrient definitions imported.
- 27,195,013 food-nutrient rows imported.
- Energy nutrient id: `1008` (KCAL); Atwater variants `2047`/`2048` also present.

## Notes

- `foundation_food` count differs between `food.csv` (469) and the
  extension table (395) because the extension only carries records with
  additional metadata; `food.csv` is the master food list.
- Sub-sample/market/agricultural acquisition and sample foods are research
  records; they are NOT used as consumer defaults per source-ranking policy.
