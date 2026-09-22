# MoveFuel — Regional Recipe Policy

Status: DRAFT
Last updated: 2026-08-06

## Problem

USDA alone does not provide a complete answer for every momo, dal bhat,
thali, curry or homemade recipe. For those foods MoveFuel must build a
reviewed recipe variant.

## Approach

For a dish with no suitable FDC record:

1. Define a reviewed recipe variant.
2. Map each ingredient to a USDA record (`fdcId`, data type).
3. Record raw ingredient weight (grams).
4. Apply reviewed cooking yield / retention rules where available.
5. Calculate total recipe nutrients deterministically.
6. Divide by cooked recipe weight or servings.
7. Ask about oil, ghee, sauce, meat filling and portion count.
8. Label the result `REVIEWED_RECIPE_ESTIMATE` (or
   `UNREVIEWED_RECIPE_ESTIMATE`).
9. Let the user correct and confirm.

## Recipe record fields

- recipe ID, regional/country tags, name and aliases
- ingredient list + FDC IDs + raw grams
- cooking method, added water, added oil/ghee/butter
- final cooked recipe weight, serving definitions
- nutrient-calculation version, reviewer status, evidence notes
- min/central/max recipe variant, effective date, checksum

## Verdict rule

No recipe becomes VERIFIED until a human reviews ingredients, quantities,
cooked yield, oil/ghee, final weight and portion definition.

## Initial benchmark candidates

steamed chicken momo, buff momo, vegetable momo, momo achar, plain cooked
rice, dal, tarkari, dal bhat, chicken curry, goat curry, chow mein,
thukpa, sel roti, roti, aloo achar, biryani, mixed thali.

These are initial benchmark candidates, not guaranteed production coverage.
