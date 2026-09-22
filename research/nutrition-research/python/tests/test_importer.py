"""Integration tests for the FDC bundle importer using a tiny synthetic bundle."""

import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from movefuel_fdc.importer import build_catalogue
from movefuel_fdc.search_index import rebuild_search_index, search


def make_bundle(zip_path: Path, prefix: str) -> None:
    def csv_bytes(header: list[str], rows: list[list[str]]) -> bytes:
        out = io.StringIO()
        out.write(",".join(header) + "\n")
        for row in rows:
            out.write(",".join(f'"{c}"' for c in row) + "\n")
        return out.getvalue().encode("utf-8")

    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr(
            f"{prefix}/food.csv",
            csv_bytes(
                ["fdc_id", "data_type", "description", "food_category_id", "publication_date"],
                [
                    ["999001", "foundation_food", "Rice, white, cooked", "12", "2023-01-01"],
                    ["999002", "branded_food", "Branded Fried Rice", "12", "2026-01-01"],
                ],
            ),
        )
        zf.writestr(
            f"{prefix}/nutrient.csv",
            csv_bytes(
                ["id", "name", "unit_name", "nutrient_nbr", "rank"],
                [["1008", "Energy", "KCAL", "208", "1"]],
            ),
        )
        zf.writestr(
            f"{prefix}/food_nutrient.csv",
            csv_bytes(
                ["id", "fdc_id", "nutrient_id", "amount", "data_points", "derivation_id"],
                [
                    ["1", "999001", "1008", "130", "", ""],
                    ["2", "999002", "1008", "174", "", ""],
                ],
            ),
        )
        zf.writestr(
            f"{prefix}/food_portion.csv",
            csv_bytes(
                ["id", "fdc_id", "seq_num", "amount", "measure_unit_id", "portion_description", "modifier", "gram_weight"],
                [["1", "999001", "1", "1", "9999", "cup", "serving", "158"]],
            ),
        )
        zf.writestr(
            f"{prefix}/food_category.csv",
            csv_bytes(["id", "code", "description"], [["12", "1234", "Grains and Pasta"]]),
        )
        zf.writestr(
            f"{prefix}/foundation_food.csv",
            csv_bytes(["fdc_id", "NDB_number", "footnote"], [["999001", "12345", ""]]),
        )
        zf.writestr(
            f"{prefix}/branded_food.csv",
            csv_bytes(
                ["fdc_id", "brand_owner", "brand_name", "gtin_upc", "ingredients", "serving_size", "serving_size_unit"],
                [["999002", "Brand X", "Fried Rice", "0000000000001", "rice, oil", "1", "cup"]],
            ),
        )


class ImporterIntegrationTests(unittest.TestCase):
    def test_import_and_search(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            zip_path = root / "bundle.zip"
            prefix = "FoodData_Central_csv_2026-04-30"
            make_bundle(zip_path, prefix)
            db = root / "fdc.sqlite"

            summary = build_catalogue(zip_path, db, "2026-04-30")
            self.assertGreaterEqual(summary.tables.get("food", 0), 2)
            self.assertGreaterEqual(summary.tables.get("food_nutrient", 0), 2)
            self.assertEqual(summary.rejected, 0)

            indexed = rebuild_search_index(db)
            self.assertGreaterEqual(indexed, 2)

            results = search(db, "rice", limit=10)
            self.assertGreaterEqual(len(results), 2)
            ids = {r["fdc_id"] for r in results}
            self.assertEqual(ids, {999001, 999002})


if __name__ == "__main__":
    unittest.main()
