# MoveFuel — USDA Import QA Report

Release: **FoodData_Central_csv_2026-04-30**
Generated: 2026-08-06

## Totals

| Metric | Value |
|---|---|
| Rows seen | 35,459,070 |
| Rows imported | 35,458,797 |
| Rows rejected | 273 |
| Duplicate fdc_ids | 0 |
| Foods with negative nutrient amounts | 10 |
| Foods missing energy kcal | 225,580 (mostly branded without kcal) |
| Portions without gram weight | 0 |
| Foods indexed (FTS5) | 2,101,279 |

## Per-table import log

| Table | Seen | Imported | Rejected |
|---|---|---|---|
| food | 2,101,279 | 2,101,279 | 0 |
| food_nutrient | 27,195,013 | 27,195,013 | 0 |
| food_portion | 47,446 | 47,173 | 273 |
| branded_food | 1,999,950 | 1,999,950 | 0 |
| food_category | 28 | 28 | 0 |
| foundation_food | 395 | 395 | 0 |
| nutrient | 477 | 477 | 0 |
| sr_legacy_food | 7,793 | 7,793 | 0 |
| survey_fndds_food | 5,432 | 5,432 | 0 |

## Rejected rows

273 rows in `food_portion` were rejected. Root cause to be confirmed by
reading the quarantined error rows; likely malformed/duplicate row keys.
They are quarantined in `fdc_import_error` — never silently dropped.

## Determinism

The catalogue is rebuildable deterministically from the checksummed raw
archive (`SHA256SUMS.txt` + `manifest.json`). Re-running `import` is
idempotent (release-keyed).
