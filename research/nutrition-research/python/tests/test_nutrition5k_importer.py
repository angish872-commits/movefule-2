import csv
import sqlite3
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from movefuel_fdc.knowledge_base import initialize_knowledge_base
from movefuel_fdc.nutrition5k_importer import import_nutrition5k_metadata


class Nutrition5kImporterTests(unittest.TestCase):
    def test_imports_variable_width_dish_rows_and_split(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / "nutrition5k"
            meta = root / "metadata"
            splits = root / "dish_ids" / "splits"
            meta.mkdir(parents=True)
            splits.mkdir(parents=True)
            (splits / "rgb_train_ids.txt").write_text("dish_0000000001\n")

            with (meta / "ingredient_metadata.csv").open("w", newline="") as handle:
                writer = csv.writer(handle)
                writer.writerow(["ingredient_id", "ingredient_name", "calories_per_g", "fat_per_g", "carb_per_g", "protein_per_g"])
                writer.writerow(["ingr_0000000001", "white rice", "1.30", "0.003", "0.28", "0.027"])
                writer.writerow(["ingr_0000000002", "chicken", "1.65", "0.036", "0", "0.31"])

            row = [
                "dish_0000000001", "460", "300", "8", "44", "55", "2",
                "ingr_0000000001", "white rice", "180", "234", "0.5", "50", "5",
                "ingr_0000000002", "chicken", "120", "198", "4.3", "0", "37",
            ]
            with (meta / "dish_metadata_cafe1.csv").open("w", newline="") as handle:
                csv.writer(handle).writerow(row)
            with (meta / "dish_metadata_cafe2.csv").open("w", newline="") as handle:
                csv.writer(handle).writerow([
                    "dish_0000000002", "100", "100", "1", "20", "2", "1",
                    "ingr_0000000001", "white rice", "100", "130", "0.3", "28", "2.7",
                ])

            db = Path(td) / "kb.sqlite"
            initialize_knowledge_base(db)
            result = import_nutrition5k_metadata(root, db)
            self.assertEqual(result.dishes, 2)
            self.assertEqual(result.ingredients, 2)
            self.assertGreaterEqual(result.split_rows, 1)
            self.assertEqual(result.rejected, 0)

            conn = sqlite3.connect(db)
            try:
                split = conn.execute("SELECT split FROM kb_benchmark_dish WHERE dish_id='dish_0000000001'").fetchone()[0]
                ingredient_rows = conn.execute("SELECT count(*) FROM kb_benchmark_ingredient").fetchone()[0]
            finally:
                conn.close()
            self.assertEqual(split, "train")
            self.assertEqual(ingredient_rows, 3)


if __name__ == "__main__":
    unittest.main()
