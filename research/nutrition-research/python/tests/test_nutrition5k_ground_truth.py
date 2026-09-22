from pathlib import Path
import json

from movefuel_fdc.nutrition5k_ground_truth import build_ground_truth


def test_build_ground_truth_only_uses_measured_rows(tmp_path: Path):
    corpus = tmp_path / "corpus"
    (corpus / "samples").mkdir(parents=True)
    measured = {
        "stable_sample_id": "m1", "source_dataset": "Nutrition5k", "evidence_class": "MEASURED_DATASET",
        "local_image_path": "images/a.png",
        "available_ground_truth_fields": {"total_mass_g": 100, "total_calories_kcal": 200, "total_protein_g": 10, "total_carb_g": 20, "total_fat_g": 8},
    }
    identity = {"stable_sample_id": "i1", "evidence_class": "LABELLED_IDENTITY_ONLY", "available_ground_truth_fields": {}}
    (corpus / "samples" / "ic-001.json").write_text(json.dumps(measured), encoding="utf-8")
    (corpus / "samples" / "ic-002.json").write_text(json.dumps(identity), encoding="utf-8")
    payload = build_ground_truth(corpus, tmp_path / "gt.json", tmp_path / "template.csv", tmp_path / "inference.json")
    assert payload["sample_count"] == 1
    assert payload["samples"][0]["central_validation_band_15pct"] == {"minimum": 170.0, "maximum": 230.0}
    assert payload["samples"][0]["prediction_status"] == "PENDING_LIVE_ALGORITHM_RUN"


def test_inference_manifest_has_no_ground_truth_or_label_fields(tmp_path: Path):
    corpus = tmp_path / "corpus"; (corpus / "samples").mkdir(parents=True); (corpus / "images").mkdir()
    (corpus / "images" / "ic-001.png").write_bytes(b"png")
    (corpus / "samples" / "ic-001.json").write_text(json.dumps({
      "stable_sample_id":"ic-001","source_dataset":"Nutrition5k (Google Research)","original_identifier":"dish_1",
      "evidence_class":"MEASURED_DATASET","local_image_path":"images/ic-001.png","width":640,"height":480,"sha256":"abc",
      "food_label":"SECRET LABEL","available_ground_truth_fields":{"total_mass_g":100,"total_calories_kcal":200,"total_protein_g":10}
    }))
    build_ground_truth(corpus,tmp_path/"truth.json",tmp_path/"pred.csv",tmp_path/"inference.json")
    doc=json.loads((tmp_path/"inference.json").read_text())
    text=json.dumps(doc).lower()
    assert "actual_" not in text and "total_mass" not in text and "calories" not in text and "food_label" not in text and "ingredient" not in text


def test_local_rs_corpus_builds_separate_truth_and_inference(tmp_path: Path):
    corpus = tmp_path / "corpus"
    (corpus / "samples").mkdir(parents=True)
    (corpus / "images").mkdir()
    (corpus / "images" / "rs-001.png").write_bytes(b"png-bytes")
    (corpus / "samples" / "rs-001.json").write_text(json.dumps({
        "sampleId": "rs-001",
        "foodNames": ["SECRET FOOD"],
        "ingredients": [{"name": "SECRET FOOD", "rawWeightG": 100}],
        "portionServedWeightG": 100,
        "images": {"widthPx": 640, "heightPx": 480},
        "groundTruthSource": {"recipeId": "dish_1", "description": "Nutrition5k"},
        "groundTruthNutrients": {"energyKcal": 200, "proteinG": 10, "carbG": 20, "fatG": 8},
    }))
    payload = build_ground_truth(corpus, tmp_path / "truth.json", tmp_path / "pred.csv", tmp_path / "inference.json")
    assert payload["sample_count"] == 1
    assert payload["samples"][0]["actual_mass_g"] == 100
    inference = json.loads((tmp_path / "inference.json").read_text())
    assert inference["samples"][0]["dish_id"] == "dish_1"
    text = json.dumps(inference).lower()
    assert "secret food" not in text and "actual_" not in text and "calories" not in text and "ingredient" not in text
