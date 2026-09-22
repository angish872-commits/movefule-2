# ADR-001: USDA-First Nutrition Authority

- Status: ACCEPTED
- Date: 2026-08-06
- Decision owner: MoveFuel backend / nutrition-data engineering

## Context

Food calorie estimation from a single photo cannot derive calories on its
own. Recognizing "fried rice" does not determine energy, protein, fat or
micronutrients. Nutrients must come from a trustworthy, reviewable source.

## Decision

USDA FoodData Central (FDC) is the primary nutrient-data authority for
MoveFuel V1.

- The vision model identifies visible foods and possible portions; it never
  invents nutrient values.
- Nutrient values are resolved from FDC records (or reviewed MoveFuel
  recipes built from FDC ingredients) and scaled deterministically.

## Consequences

- All nutrient records carry FDC provenance (`fdcId`, `dataType`,
  source basis, release) so values are traceable.
- Where no suitable FDC record exists (e.g. many Nepali/South Asian mixed
  dishes), MoveFuel uses a reviewed recipe variant built from FDC
  ingredient records and labels it as a recipe estimate.
- A missing/unresolvable source must never silently fall back to generic
  values. It returns `NEEDS_USER_REVIEW` with reason
  `NUTRITION_SOURCE_NOT_RESOLVED`.

## Source-priority policy

| Situation                        | First source        | Fallback              |
|----------------------------------|---------------------|-----------------------|
| Raw or minimally processed food  | Foundation Foods    | SR Legacy             |
| Common prepared/household meal   | FNDDS               | Curated recipe        |
| Packaged food with barcode       | Branded Foods       | Manual label entry    |
| Historical generic food          | SR Legacy           | Foundation/FNDDS      |
| Research-specific food           | Experimental Foods  | Do not auto-use       |
| Nepali dish not represented      | Curated USDA recipe | Needs user review     |

Detailed policy: `reports/SOURCE_RANKING_POLICY.md`.
