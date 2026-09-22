"""Tests for the recipe engine."""

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from movefuel_fdc.recipe_builder import (
    Recipe,
    RecipeCalculator,
    RecipeIngredient,
    example_chicken_momo_recipe,
    example_dal_bhat_recipe,
)

FIXTURE_PATH = Path(__file__).resolve().parent.parent.parent / "schemas" / "recipe-parity.fixture.json"


def make_db(db_path: Path) -> None:
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE fdc_food_nutrient (id INTEGER PRIMARY KEY, fdc_id INTEGER, nutrient_id INTEGER, amount REAL)"
    )
    # Two ingredients: chicken (per 100g) and flour.
    rows = [
        (1, 2646170, 1008, 120.0),  # chicken energy
        (2, 2646170, 1003, 22.5),   # chicken protein
        (3, 789890, 1008, 364.0),   # flour energy
        (4, 789890, 1003, 10.3),    # flour protein
    ]
    conn.executemany("INSERT INTO fdc_food_nutrient VALUES (?,?,?,?)", rows)
    conn.commit()
    conn.close()


class RecipeCalculatorTests(unittest.TestCase):
    def test_per_100g_aggregation_and_checksum(self):
        with tempfile.TemporaryDirectory() as td:
            db = Path(td) / "recipe.sqlite"
            make_db(db)
            calc = RecipeCalculator(db)
            recipe = Recipe(
                recipe_id="r1",
                name="Test",
                ingredients=[
                    RecipeIngredient(fdc_id=2646170, name="chicken", raw_grams=100.0),
                    RecipeIngredient(fdc_id=789890, name="flour", raw_grams=100.0),
                ],
                final_cooked_weight_grams=180.0,
                servings=2,
            )
            per_100g = calc.calculate_per_100g(recipe)
            # chicken 120 + flour 364 = 484 kcal total / 180 * 100 = 268.9
            self.assertAlmostEqual(per_100g[1008], 268.8888888, places=3)
            self.assertEqual(len(recipe.checksum()), 64)
            calc.close()

    def test_example_momo_recipe_is_unreviewed_and_has_ingredients(self):
        recipe = example_chicken_momo_recipe()
        self.assertEqual(recipe.reviewer_status, "UNREVIEWED_RECIPE_ESTIMATE")
        self.assertGreaterEqual(len(recipe.ingredients), 4)
        self.assertEqual(recipe.region_tags, ["Nepal", "South Asia"])

    def test_example_dal_bhat_recipe_uses_prepared_usda_records(self):
        recipe = example_dal_bhat_recipe()
        self.assertEqual(recipe.reviewer_status, "UNREVIEWED_RECIPE_ESTIMATE")
        self.assertEqual(recipe.region_tags, ["Nepal", "South Asia"])
        self.assertEqual(recipe.servings, 2)
        self.assertGreaterEqual(len(recipe.ingredients), 8)
        # Uses cooked rice + cooked lentils as the base.
        ids = {i.fdc_id for i in recipe.ingredients}
        self.assertIn(168878, ids)  # rice, white, long-grain, cooked
        self.assertIn(172421, ids)  # lentils, cooked, boiled, without salt
        self.assertEqual(len(recipe.checksum()), 64)

    def test_parity_fixture_matches_reference_outputs(self):
        """The Python reference must still reproduce the committed parity fixture."""
        fixture = json.loads(FIXTURE_PATH.read_text())
        with tempfile.TemporaryDirectory() as td:
            db_path = Path(td) / "parity.sqlite"
            conn = sqlite3.connect(str(db_path))
            conn.execute(
                "CREATE TABLE fdc_food_nutrient (id INTEGER PRIMARY KEY, fdc_id INTEGER, nutrient_id INTEGER, amount REAL)"
            )
            rows = []
            for fdc_id, nutrients in fixture["ingredients"].items():
                for nutrient_id, amount in nutrients:
                    rows.append((len(rows) + 1, int(fdc_id), nutrient_id, amount))
            conn.executemany("INSERT INTO fdc_food_nutrient VALUES (?,?,?,?)", rows)
            conn.commit()
            conn.close()

            recipe_spec = fixture["recipe"]
            calc = RecipeCalculator(db_path)
            recipe = Recipe(
                recipe_id=recipe_spec["recipeId"],
                name=recipe_spec["name"],
                ingredients=[
                    RecipeIngredient(fdc_id=i["fdcId"], name=i["name"], raw_grams=i["rawGrams"])
                    for i in recipe_spec["ingredients"]
                ],
                added_water_grams=recipe_spec["addedWaterGrams"],
                added_oil_ghee_grams=recipe_spec["addedOilGheeGrams"],
                final_cooked_weight_grams=recipe_spec["finalCookedWeightGrams"],
                servings=recipe_spec["servings"],
                minimum_variant_multiplier=recipe_spec["minimumVariantMultiplier"],
                maximum_variant_multiplier=recipe_spec["maximumVariantMultiplier"],
            )
            per_100g = calc.calculate_per_100g(recipe)
            calc.close()

        labels = {1008: "energyKcal", 1003: "proteinG", 1005: "carbG", 1004: "fatG", 1079: "fiberG", 1093: "sodiumMg"}
        expected = fixture["expectedPer100g"]
        self.assertEqual(len(per_100g), len(expected))
        for nutrient_id, label in labels.items():
            self.assertIn(label, expected)
            self.assertEqual(per_100g[nutrient_id], expected[label], f"parity mismatch on {label}")

    def test_parity_fixture_oil_weight_exclusion(self):
        """added_oil_ghee_grams must not inflate the total-weight fallback."""
        with tempfile.TemporaryDirectory() as td:
            db_path = Path(td) / "oil.sqlite"
            conn = sqlite3.connect(str(db_path))
            conn.execute(
                "CREATE TABLE fdc_food_nutrient (id INTEGER PRIMARY KEY, fdc_id INTEGER, nutrient_id INTEGER, amount REAL)"
            )
            conn.execute("INSERT INTO fdc_food_nutrient VALUES (1, 789890, 1008, 364.0)")
            conn.commit()
            conn.close()

            calc = RecipeCalculator(db_path)
            recipe = Recipe(
                recipe_id="oil-check",
                name="Oil check",
                ingredients=[RecipeIngredient(fdc_id=789890, name="flour", raw_grams=100.0)],
                added_water_grams=0.0,
                added_oil_ghee_grams=50.0,
                final_cooked_weight_grams=None,
                servings=1,
            )
            per_100g = calc.calculate_per_100g(recipe)
            calc.close()
        # Fallback weight = 100g (flour) + 0 water. Oil (50g) is excluded from weight.
        # 364 kcal total / 100 * 100 = 364 per 100g (not 364/150*100 = 242.67).
        self.assertEqual(per_100g[1008], 364.0)
        self.assertEqual(len(recipe.checksum()), 64)


if __name__ == "__main__":
    unittest.main()
