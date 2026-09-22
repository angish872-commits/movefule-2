import csv
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
import sys

from openpyxl import Workbook

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from movefuel_fdc.step1_pipeline import build_step1


def make_usda_bundle(zip_path: Path):
    prefix = "FoodData_Central_csv_2026-04-30"
    def csv_bytes(header, rows):
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(header)
        writer.writerows(rows)
        return out.getvalue().encode()
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr(f"{prefix}/food.csv", csv_bytes(
            ["fdc_id","data_type","description","food_category_id","publication_date"],
            [["9001","foundation_food","Rice, white, cooked","1","2026-01-01"]]
        ))
        zf.writestr(f"{prefix}/nutrient.csv", csv_bytes(
            ["id","name","unit_name","nutrient_nbr","rank"], [["1008","Energy","KCAL","208","1"]]
        ))
        zf.writestr(f"{prefix}/food_nutrient.csv", csv_bytes(
            ["id","fdc_id","nutrient_id","amount","data_points","derivation_id"], [["1","9001","1008","130","",""]]
        ))
        zf.writestr(f"{prefix}/food_portion.csv", csv_bytes(
            ["id","fdc_id","seq_num","amount","measure_unit_id","portion_description","modifier","gram_weight"],
            [["1","9001","1","1","1","cup","","158"]]
        ))
        zf.writestr(f"{prefix}/food_category.csv", csv_bytes(["id","code","description"], [["1","1","Grains"]]))
        zf.writestr(f"{prefix}/foundation_food.csv", csv_bytes(["fdc_id","NDB_number","footnote"], [["9001","1",""]]))


def make_density(path: Path):
    wb = Workbook()
    ws = wb.active
    ws.append(["Food name", "Preparation", "Density (g/ml)", "Reference"])
    ws.append(["Rice, white", "cooked", 0.81, "fixture"])
    wb.save(path)


def make_n5k(root: Path):
    meta = root / "metadata"
    split = root / "dish_ids" / "splits"
    meta.mkdir(parents=True)
    split.mkdir(parents=True)
    (split / "train_ids.txt").write_text("dish_1\n")
    with (meta / "ingredient_metadata.csv").open("w", newline="") as h:
        csv.writer(h).writerows([["ingredient_id","ingredient_name","calories_per_g","fat","carb","protein"], ["ingr_1","rice","1.3","0","0.28","0.03"]])
    with (meta / "dish_metadata_cafe1.csv").open("w", newline="") as h:
        csv.writer(h).writerow(["dish_1","130","100","0","28","3","1","ingr_1","rice","100","130","0","28","3"])
    with (meta / "dish_metadata_cafe2.csv").open("w", newline="") as h:
        csv.writer(h).writerow(["dish_2","65","50","0","14","1.5","1","ingr_1","rice","50","65","0","14","1.5"])


class Step1BuildTests(unittest.TestCase):
    def test_end_to_end_offline_fixture_build(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            usda = root / "usda.zip"
            density = root / "density.xlsx"
            n5k = root / "nutrition5k"
            db = root / "kb.sqlite"
            snap = root / "snapshot.json"
            make_usda_bundle(usda)
            make_density(density)
            make_n5k(n5k)
            result = build_step1(db_path=db, usda_zip=usda, fao_density_xlsx=density, nutrition5k_root=n5k, snapshot_path=snap)
            self.assertTrue(result["validation"]["knowledge_import_complete"])
            self.assertEqual(result["validation"]["usda_food_count"], 1)
            self.assertEqual(result["validation"]["density_records"], 1)
            self.assertEqual(result["validation"]["nutrition5k_dishes"], 2)
            self.assertTrue(snap.exists())
            payload = json.loads(snap.read_text())
            self.assertEqual(payload["format"], "movefuel-food-kb-snapshot-v1")
            self.assertEqual(len(payload["density_records"]), 1)


if __name__ == "__main__":
    unittest.main()
