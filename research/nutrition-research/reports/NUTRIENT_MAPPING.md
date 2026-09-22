# MoveFuel — Nutrient Mapping Registry

Status: DRAFT
Last updated: 2026-08-06

## Scope

MoveFuel maps and preserves a core set of nutrients using **USDA nutrient
identifiers** (nutrient numbers), not only text names.

## Core nutrient set (V1)

Nutrient ids below are the **FDC nutrient numbers** actually imported from
`FoodData_Central_csv_2026-04-30` (verified against `fdc_nutrient_definition`).

| Nutrient                    | FDC nutrient id | Unit |
|-----------------------------|-----------------|------|
| Energy                      | 1008            | kcal |
| Energy (Atwater General)    | 2047            | kcal |
| Energy (Atwater Specific)   | 2048            | kcal |
| Protein                     | 1003            | g    |
| Carbohydrate, by difference | 1005            | g    |
| Total lipid (fat)           | 1004            | g    |
| Fiber, total dietary        | 1079            | g    |
| Sodium, Na                  | 1093            | mg   |
| Fatty acids, total saturated | 606            | g    |
| Sugars, total               | 269             | g    |
| Potassium, K                | 306             | mg   |
| Calcium, Ca                 | 301             | mg   |
| Iron, Fe                    | 303             | mg   |
| Vitamin C, total ascorbic acid | 401          | mg   |
| Cholesterol                 | 601             | mg   |
| Water                       | 255             | g    |

## Canonical energy selection

Energy is resolved from FDC id `1008` first; the Atwater variants (`2047` /
`2048`) are accepted as fallbacks when `1008` is absent. The first present
id in that order wins, deterministically.

## Rules

- Preserve the original nutrient amount, unit and source basis.
- Normalize per-100-g only when the basis conversion is valid.
- Missing nutrients are recorded as missing; never invented.
- Decimal-safe arithmetic; display rounding only at presentation boundary.
