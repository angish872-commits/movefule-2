# MoveFuel — USDA Source Ranking Policy

Status: DRAFT (config versioned in code)
Last updated: 2026-08-06

## Data types

USDA FoodData Central exposes five data types with different purposes and
update schedules. They are not interchangeable.

| Data type          | Purpose                                              | Update cadence     |
|--------------------|------------------------------------------------------|--------------------|
| Foundation Foods   | Analytical data + metadata for basic foods           | Periodic           |
| FNDDS              | Survey foods: nutrients + household portion weights  | Tied to NHANES     |
| Branded Foods      | Manufacturer label data                              | Frequent           |
| SR Legacy          | Historical generic foods (frozen)                    | No longer updated  |
| Experimental Foods | Research-specific values                             | Research-only      |

## Priority resolution (V1)

1. Barcode/GTIN match → Branded Foods.
2. Raw or minimally processed ingredient → Foundation Foods, then SR Legacy.
3. Common prepared food or household portion → FNDDS, then reviewed recipe.
4. Historical generic food → SR Legacy where no better current record.
5. Nepali/South Asian mixed dish → exact FNDDS match when suitable;
   otherwise reviewed MoveFuel recipe built from USDA ingredient records.

## Ranking factors (configurable, versioned)

- lexical/semantic match
- barcode match
- data-type suitability
- preparation match
- food-category match
- portion-data availability
- nutrient completeness
- source recency
- reviewed MoveFuel alias
- user-confirmed prior choice

Weights are configuration, not scientific facts, and must be benchmarked.

## Missing source

If no acceptable source resolves, return:

```json
{
  "status": "NEEDS_USER_REVIEW",
  "reason": "NUTRITION_SOURCE_NOT_RESOLVED"
}
```

Never silently use generic calories.
