import csv, json
from pathlib import Path
import pytest
from movefuel_fdc.blind_acceptance import evaluate_blind_predictions, load_predictions


def truth(path: Path, n=100):
    path.write_text(json.dumps({"samples":[{"sample_id":f"s{i}","actual_mass_g":100,"actual_calories_kcal":200,"actual_protein_g":20,"actual_carb_g":25,"actual_fat_g":5} for i in range(n)]}))


def preds(path: Path, n=100):
    fields=["sample_id","category","predicted_min_g","predicted_central_g","predicted_max_g","predicted_min_kcal","predicted_central_kcal","predicted_max_kcal","predicted_min_protein_g","predicted_central_protein_g","predicted_max_protein_g"]
    with path.open('w',newline='',encoding='utf-8') as h:
        w=csv.DictWriter(h,fieldnames=fields);w.writeheader()
        for i in range(n):w.writerow({"sample_id":f"s{i}","category":"mixed","predicted_min_g":90,"predicted_central_g":100,"predicted_max_g":110,"predicted_min_kcal":180,"predicted_central_kcal":200,"predicted_max_kcal":220,"predicted_min_protein_g":18,"predicted_central_protein_g":20,"predicted_max_protein_g":22})


def test_blind_acceptance_separates_truth_from_predictions(tmp_path: Path):
    p=tmp_path/'p.csv';t=tmp_path/'t.json';preds(p);truth(t)
    out=evaluate_blind_predictions(p,t)
    assert out['acceptance_gate']['passed'] is True
    assert out['metrics']['calorie']['central_within_15_rate']==1
    assert out['metrics']['protein']['central_within_15_rate']==1


def test_prediction_file_rejects_truth_columns(tmp_path: Path):
    p=tmp_path/'p.csv'
    p.write_text('sample_id,predicted_min_g,predicted_central_g,predicted_max_g,predicted_min_kcal,predicted_central_kcal,predicted_max_kcal,actual_kcal\ns,1,2,3,4,5,6,5\n')
    with pytest.raises(ValueError, match='forbidden ground-truth'):
        load_predictions(p)


def test_blind_acceptance_penalizes_low_prediction_coverage_even_if_predicted_rows_are_perfect(tmp_path: Path):
    p=tmp_path/'p.csv';t=tmp_path/'t.json';preds(p,100);truth(t,200)
    out=evaluate_blind_predictions(p,t,minimum_samples=100,minimum_prediction_coverage=.80)
    assert out['prediction_coverage']==.5
    assert out['acceptance_gate']['prediction_coverage_passed'] is False
    assert out['acceptance_gate']['passed'] is False
