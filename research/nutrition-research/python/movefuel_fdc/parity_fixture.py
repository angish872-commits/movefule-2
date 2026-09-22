"""Generate the cross-language recipe parity fixture.

The fixture holds the ingredient nutrient rows (per-100g amounts) plus the
recipe definition, and the expected per-100g outputs computed by THIS
implementation (Python, the canonical reference). The TypeScript recipe
resolver test reads the same file and must reproduce the numbers.

Usage:  python3 -m movefuel_fdc.parity_fixture
"""

from __future__ import annotations

import json
import sqlite3
import tempfile
from pathlib import Path

from movefuel_fdc.recipe_builder import Recipe, RecipeCalculator, RecipeIngredient

FIXTURE_PATH = Path(__file__).resolve().parent.parent.parent / "schemas" / "recipe-parity.fixture.json"

# fdc_id -> [(nutrient_id, per100g_amount)]
INGREDIENTS = {
    2646170: [(1008, 120.0), (1003, 22.5), (1005, 0.0), (1004, 3.5), (1079, 0.0), (1093, 74.0)],
    789890: [(1008, 364.0), (1003, 10.3), (1005, 76.3), (1004, 0.98), (1079, 2.7), (1093, 2.0)],
    790646: [(1008, 40.0), (1003, 1.1), (1005, 9.34), (1004, 0.1), (1079, 1.7), (1093, 4.0)],
    172337: [(1008, 884.0), (1003, 0.0), (1005, 0.0), (1004, 100.0), (1079, 0.0), (1093, 0.0)],
}

RECIPE = {
    "recipeId": "recipe-parity-fixture-v0",
    "name": "Parity fixture",
    "ingredients": [
        {"fdcId": 2646170, "name": "chicken breast, raw", "rawGrams": 400.0},
        {"fdcId": 789890, "name": "wheat flour, all-purpose", "rawGrams": 300.0},
        {"fdcId": 790646, "name": "onions, yellow, raw", "rawGrams": 80.0},
        {"fdcId": 172337, "name": "oil, mustard", "rawGrams": 15.0},
    ],
    "addedWaterGrams": 30.0,
    "addedOilGheeGrams": 15.0,
    "finalCookedWeightGrams": 700.0,
    "servings": 8,
    "minimumVariantMultiplier": 0.85,
    "maximumVariantMultiplier": 1.2,
}

NUTRIENT_LABELS = {
    1008: "energyKcal",
    1003: "proteinG",
    1005: "carbG",
    1004: "fatG",
    1079: "fiberG",
    1093: "sodiumMg",
}


def build_db() -> str:
    handle, path = tempfile.mkstemp(suffix=".sqlite")
    import os

    os.close(handle)
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE fdc_food_nutrient (id INTEGER PRIMARY KEY, fdc_id INTEGER, nutrient_id INTEGER, amount REAL)"
    )
    rows = []
    for fdc_id, nutrients in INGREDIENTS.items():
        for nutrient_id, amount in nutrients:
            rows.append((len(rows) + 1, fdc_id, nutrient_id, amount))
    conn.executemany("INSERT INTO fdc_food_nutrient VALUES (?,?,?,?)", rows)
    conn.commit()
    conn.close()
    return path


def main() -> None:
    db_path = build_db()
    calc = RecipeCalculator(Path(db_path))
    recipe = Recipe(
        recipe_id=RECIPE["recipeId"],
        name=RECIPE["name"],
        ingredients=[RecipeIngredient(fdc_id=i["fdcId"], name=i["name"], raw_grams=i["rawGrams"]) for i in RECIPE["ingredients"]],
        added_water_grams=RECIPE["addedWaterGrams"],
        added_oil_ghee_grams=RECIPE["addedOilGheeGrams"],
        final_cooked_weight_grams=RECIPE["finalCookedWeightGrams"],
        servings=RECIPE["servings"],
        minimum_variant_multiplier=RECIPE["minimumVariantMultiplier"],
        maximum_variant_multiplier=RECIPE["maximumVariantMultiplier"],
    )
    per_100g = calc.calculate_per_100g(recipe)
    calc.close()

    expected = {NUTRIENT_LABELS[nid]: per_100g[nid] for nid in per_100g if nid in NUTRIENT_LABELS}

    fixture = {
        "description": "Cross-language parity fixture for the regional recipe resolver. Expected per-100g values were computed by the Python reference implementation.",
        "ingredients": INGREDIENTS,
        "recipe": RECIPE,
        "expectedPer100g": expected,
    }
    FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE_PATH.write_text(json.dumps(fixture, indent=2, sort_keys=True) + "\n")
    print(f"wrote {FIXTURE_PATH}")
    print(json.dumps(expected, indent=2))


if __name__ == "__main__":
    main()
