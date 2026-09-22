import csv
import json
from pathlib import Path

import pytest

from movefuel_fdc.blind_acceptance import evaluate_blind_predictions
from movefuel_fdc.regional_ground_truth import build_regional_ground_truth


def _write_capture(path: Path, n: int = 100) -> None:
    fields = [
        "sample_id","food_name","preparation","cuisine_region","actual_total_grams",
        "actual_calories_kcal","actual_protein_g","actual_carb_g","actual_fat_g",
        "photo_path","plate_or_container","known_dimension_cm","notes",
    ]
    with path.open("w", newline="", encoding="utf-8") as h:
        w=csv.DictWriter(h, fieldnames=fields); w.writeheader()
        for i in range(n):
            w.writerow({"sample_id":f"regional-{i:03d}","food_name":"dal bhat","preparation":"cooked",
                        "cuisine_region":"Nepal","actual_total_grams":"500","actual_calories_kcal":"650",
                        "actual_protein_g":"25","actual_carb_g":"105","actual_fat_g":"15",
                        "photo_path":f"images/{i}.jpg","plate_or_container":"plate","known_dimension_cm":"26"})


def test_regional_truth_is_sealed_and_prediction_template_has_no_truth(tmp_path: Path):
    capture=tmp_path/"capture.csv"; truth=tmp_path/"truth.json"; pred=tmp_path/"pred.csv"
    _write_capture(capture, 2)
    payload=build_regional_ground_truth(capture, truth, pred)
    assert payload["sample_count"] == 2
    header=next(csv.reader(pred.open(encoding="utf-8")))
    assert not any(x.startswith(("actual_","true_","ground_truth")) for x in header)
    doc=json.loads(truth.read_text())
    assert doc["samples"][0]["actual_mass_g"] == 500


def test_regional_perfect_predictions_pass_same_blind_gate(tmp_path: Path):
    capture=tmp_path/"capture.csv"; truth=tmp_path/"truth.json"; template=tmp_path/"template.csv"; pred=tmp_path/"pred.csv"
    _write_capture(capture, 100)
    build_regional_ground_truth(capture, truth, template)
    fields=next(csv.reader(template.open(encoding="utf-8")))
    with pred.open("w",newline="",encoding="utf-8") as h:
        w=csv.DictWriter(h,fieldnames=fields);w.writeheader()
        for i in range(100):
            w.writerow({"sample_id":f"regional-{i:03d}","category":"dal bhat",
                        "predicted_min_g":475,"predicted_central_g":500,"predicted_max_g":525,
                        "predicted_min_kcal":620,"predicted_central_kcal":650,"predicted_max_kcal":680,
                        "predicted_min_protein_g":23,"predicted_central_protein_g":25,"predicted_max_protein_g":27,
                        "predicted_min_carb_g":100,"predicted_central_carb_g":105,"predicted_max_carb_g":110,
                        "predicted_min_fat_g":14,"predicted_central_fat_g":15,"predicted_max_fat_g":16,
                        "prediction_state":"COMPLETED","algorithm_version":"v6","model_version":"test"})
    result=evaluate_blind_predictions(pred, truth)
    assert result["acceptance_gate"]["passed"] is True


def test_partial_nonempty_blank_id_rejected(tmp_path: Path):
    capture=tmp_path/"capture.csv"; truth=tmp_path/"truth.json"; pred=tmp_path/"pred.csv"
    capture.write_text("sample_id,actual_total_grams,photo_path,food_name\n,500,x.jpg,dal\n",encoding="utf-8")
    with pytest.raises(ValueError):
        build_regional_ground_truth(capture, truth, pred)
