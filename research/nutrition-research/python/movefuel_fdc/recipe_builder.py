"""Regional recipe engine.

Builds reviewed/UNREVIEWED recipe estimates from USDA ingredient records
when no complete USDA dish is available (e.g. Nepali/South Asian dishes).
No recipe becomes VERIFIED until a human reviews ingredients, quantities,
cooked yield, oil/ghee, final weight and portion definition.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from dataclasses import asdict, dataclass, field
from pathlib import Path

CORE_NUTRIENTS = [1008, 1003, 1005, 1004, 1079, 1093, 606, 291, 269, 307, 306, 301, 303, 401, 601, 255]


@dataclass
class RecipeIngredient:
    fdc_id: int
    name: str
    raw_grams: float
    notes: str = ""


@dataclass
class Recipe:
    recipe_id: str
    name: str
    aliases: list[str] = field(default_factory=list)
    region_tags: list[str] = field(default_factory=list)
    ingredients: list[RecipeIngredient] = field(default_factory=list)
    cooking_method: str = ""
    added_water_grams: float = 0.0
    added_oil_ghee_grams: float = 0.0
    final_cooked_weight_grams: float | None = None
    servings: int = 1
    reviewer_status: str = "UNREVIEWED_RECIPE_ESTIMATE"
    evidence: str = ""
    minimum_variant_multiplier: float = 0.85
    maximum_variant_multiplier: float = 1.2
    effective_date: str = ""
    nutrient_calculation_version: int = 1

    def checksum(self) -> str:
        payload = {
            "name": self.name,
            "ingredients": [asdict(i) for i in self.ingredients],
            "method": self.cooking_method,
            "water": self.added_water_grams,
            "oil": self.added_oil_ghee_grams,
            "final_weight": self.final_cooked_weight_grams,
            "servings": self.servings,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


class RecipeCalculator:
    """Calculates recipe nutrients per 100g from ingredient nutrient data."""

    def __init__(self, db_path: Path):
        self.conn = sqlite3.connect(str(db_path))

    def close(self) -> None:
        self.conn.close()

    def _ingredient_nutrients(self, fdc_id: int) -> dict[int, float]:
        rows = self.conn.execute(
            "SELECT nutrient_id, amount FROM fdc_food_nutrient WHERE fdc_id=? AND nutrient_id IN ({})".format(
                ",".join("?" * len(CORE_NUTRIENTS))
            ),
            [fdc_id, *CORE_NUTRIENTS],
        ).fetchall()
        return {nutrient_id: float(amount or 0.0) for nutrient_id, amount in rows}

    def calculate_per_100g(self, recipe: Recipe) -> dict[str, float]:
        """Aggregate raw ingredient nutrients, then divide by final weight
        or total raw weight when final weight is unknown."""
        total_weight = sum(i.raw_grams for i in recipe.ingredients) + recipe.added_water_grams
        total_nutrients: dict[int, float] = {}
        for ingredient in recipe.ingredients:
            per = self._ingredient_nutrients(ingredient.fdc_id)
            for nutrient_id, amount_per_100 in per.items():
                total_nutrients[nutrient_id] = total_nutrients.get(nutrient_id, 0.0) + amount_per_100 * ingredient.raw_grams / 100.0

        base = recipe.final_cooked_weight_grams or total_weight
        if base <= 0:
            return {}
        per_100g = {nutrient_id: amount / base * 100.0 for nutrient_id, amount in total_nutrients.items()}
        return per_100g

    def to_estimate(self, recipe: Recipe) -> dict:
        per_100g = self.calculate_per_100g(recipe)
        return {
            "recipeId": recipe.recipe_id,
            "name": recipe.name,
            "aliases": recipe.aliases,
            "regionTags": recipe.region_tags,
            "status": recipe.reviewer_status,
            "checksum": recipe.checksum(),
            "servings": recipe.servings,
            "finalCookedWeightGrams": recipe.final_cooked_weight_grams,
            "per100g": per_100g,
            "minimumVariantMultiplier": recipe.minimum_variant_multiplier,
            "maximumVariantMultiplier": recipe.maximum_variant_multiplier,
            "nutrientCalculationVersion": recipe.nutrient_calculation_version,
            "evidence": recipe.evidence,
        }


def example_chicken_momo_recipe() -> Recipe:
    """Initial benchmark candidate: steamed chicken momo.

    UNREVIEWED — requires human review of ingredient quantities, cooked
    yield, filling ratio and final weight before production use.
    """
    return Recipe(
        recipe_id="recipe-momo-steamed-chicken-v0",
        name="Steamed chicken momo",
        aliases=["momo", "chicken momo", "steamed dumpling"],
        region_tags=["Nepal", "South Asia"],
        ingredients=[
            RecipeIngredient(fdc_id=2646170, name="chicken breast, boneless, skinless, raw", raw_grams=400.0),
            RecipeIngredient(fdc_id=789890, name="wheat flour, all-purpose", raw_grams=300.0),
            RecipeIngredient(fdc_id=790646, name="onions, yellow, raw", raw_grams=80.0),
            RecipeIngredient(fdc_id=1104647, name="garlic, raw", raw_grams=10.0),
            RecipeIngredient(fdc_id=169231, name="ginger root, raw", raw_grams=10.0),
        ],
        cooking_method="steamed",
        added_water_grams=30.0,
        added_oil_ghee_grams=0.0,
        final_cooked_weight_grams=700.0,
        servings=8,
        reviewer_status="UNREVIEWED_RECIPE_ESTIMATE",
        evidence="Initial benchmark candidate. Requires human review of ingredients, quantities, cooked yield and filling ratio.",
        effective_date="2026-08-06",
    )


def example_dal_bhat_recipe() -> Recipe:
    """Second benchmark candidate: dal bhat (rice + lentil dal + tarkari).

    UNREVIEWED — requires human review of the dal:rice ratio, vegetable
    portion, oil/ghee amount, final cooked weight and portion definition.
    Uses cooked-lentil and cooked-rice USDA records so the per-100g profile
    reflects the prepared ingredients used in a typical Nepali meal.
    """
    return Recipe(
        recipe_id="recipe-dal-bhat-v0",
        name="Dal bhat (rice, lentil dal and tarkari)",
        aliases=["dal bhat", "daal bhat", "bhat-dal"],
        region_tags=["Nepal", "South Asia"],
        ingredients=[
            RecipeIngredient(fdc_id=168878, name="rice, white, long-grain, enriched, cooked", raw_grams=350.0),
            RecipeIngredient(fdc_id=172421, name="lentils, mature seeds, cooked, boiled, without salt", raw_grams=200.0),
            RecipeIngredient(fdc_id=170457, name="tomatoes, red, ripe, raw", raw_grams=60.0),
            RecipeIngredient(fdc_id=168462, name="spinach, raw", raw_grams=50.0),
            RecipeIngredient(fdc_id=790646, name="onions, yellow, raw", raw_grams=40.0),
            RecipeIngredient(fdc_id=1104647, name="garlic, raw", raw_grams=10.0),
            RecipeIngredient(fdc_id=169231, name="ginger root, raw", raw_grams=5.0),
            RecipeIngredient(fdc_id=172231, name="spices, turmeric, ground", raw_grams=2.0),
            RecipeIngredient(fdc_id=170923, name="spices, cumin seed", raw_grams=2.0),
            RecipeIngredient(fdc_id=172337, name="oil, mustard", raw_grams=15.0),
        ],
        cooking_method="boiled/steamed with tempered tarkari",
        added_water_grams=0.0,
        added_oil_ghee_grams=15.0,
        final_cooked_weight_grams=700.0,
        servings=2,
        reviewer_status="UNREVIEWED_RECIPE_ESTIMATE",
        evidence="Initial benchmark candidate. Requires human review of dal:rice ratio, tarkari portion, oil amount, final weight and portion size.",
        effective_date="2026-08-06",
    )
