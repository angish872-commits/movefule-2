# MoveFuel — USDA Attribution & Data Rights

## Status

USDA FoodData Central data are **public-domain (CC0)**. USDA requests
attribution; permission is not required to use, redistribute or modify.

## Attribution

When MoveFuel displays or redistributes FoodData Central-derived records,
it will include:

> Nutrition data from USDA FoodData Central (https://fdc.nal.usda.gov).
> These data are in the public domain.

## API usage

- The FDC API requires a data.gov key.
- Exposed keys will be deactivated by USDA — the key is backend-only
  (`USDA_FDC_API_KEY`).
- Default rate limit: 1,000 requests/hour per IP.
- `DEMO_KEY` is for prototyping only and never used in production.

## Bulk downloads

- Bulk CSV/JSON downloads require no API key.
- Complete CSV release (2026-04-30) ≈ 481 MB compressed.
- Raw archives are preserved unchanged with SHA-256 checksums.
