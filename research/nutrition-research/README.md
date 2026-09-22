# MoveFuel Nutrition Research & Estimation Foundation

MoveFuel V1 food-estimation research and implementation foundation using
USDA FoodData Central as the primary nutrient-data authority.

## Status

PROTOTYPE — no production, medical or clinical accuracy is claimed.
See `reports/PRODUCTION_GAPS.md` for what is required before production.

## Principles

1. USDA or another approved source provides nutrient values. The vision
   model is not the nutrient authority.
2. Never silently use generic nutrient fallbacks.
3. Never present a food-photo result as an exact physical measurement.
4. Portion output always includes minimum / central / maximum grams,
   confidence, evidence and uncertainties.
5. Only explicit user confirmation creates a permanent meal and changes
   daily totals.
6. Corrections recalculate deterministically without calling the paid
   image model again.
7. USDA API keys and provider secrets are backend-only environment
   variables.

## Structure

```
nutrition-research/
  ADR/                    Architecture decision records
  data/raw/usda/          Unmodified USDA bulk downloads (checksummed)
  data/staging/           Raw-to-normalized staging artifacts
  data/processed/         Normalized catalogue
  data/benchmark/         Benchmark fixtures (weighed foods)
  data/reports/           Generated import/QA reports
  python/movefuel_fdc/    Python: USDA download, ETL, normalization, benchmark
  ../../services/backend/src/nutrition/  TypeScript: search, resolution, calculation
  ../../services/backend/src/vision/     TypeScript: model-independent vision adapters
  schemas/                JSON Schemas for output contracts
  reports/                Written policies and audit reports
```

## Getting started

Python (downloads, ETL, catalogue, benchmarking):

```bash
python3 -m pip install -e nutrition-research/python
python3 -m movefuel_fdc.cli manifest
python3 -m movefuel_fdc.cli download
python3 -m movefuel_fdc.cli import --catalogue data/processed/fdc.sqlite
```

Backend (TypeScript, Node >= 22.6):

```bash
cd backend
npm test
npm start
```

The USDA API key is read from the environment variable `USDA_FDC_API_KEY`
only. It is never placed in source code, Android files, logs, reports or
Git history.

## Attribution

USDA FoodData Central data are public-domain (CC0). USDA requests
attribution; permission is not required. See `reports/USDA_ATTRIBUTION.md`.
