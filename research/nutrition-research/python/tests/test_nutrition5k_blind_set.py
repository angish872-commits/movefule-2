import csv
import json
from pathlib import Path

from movefuel_fdc.nutrition5k_blind_set import build_official_test_blind_set


def _png(path: Path, width=2, height=3):
    # Tiny synthetic PNG header is sufficient because builder only needs metadata/hash.
    data = b"\x89PNG\r\n\x1a\n" + b"\x00"*8 + width.to_bytes(4,"big") + height.to_bytes(4,"big") + b"payload"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def test_build_official_test_blind_set_separates_truth_from_inference(tmp_path: Path):
    root = tmp_path / "nutrition5k"
    (root / "dish_ids" / "splits").mkdir(parents=True)
    (root / "metadata").mkdir(parents=True)
    (root / "dish_ids" / "splits" / "rgb_test_ids.txt").write_text("dish_1\ndish_2\n")
    # Official variable-width dish rows: dish totals then num_ingrs (zero here).
    (root / "metadata" / "dish_metadata_cafe1.csv").write_text(
        "dish_1,200,150,5,20,10,0\n"
        "dish_2,300,250,8,30,20,0\n"
    )
    (root / "metadata" / "dish_metadata_cafe2.csv").write_text("")
    _png(root / "imagery" / "realsense_overhead" / "dish_1" / "rgb.png", 640, 480)
    _png(root / "imagery" / "realsense_overhead" / "dish_2" / "rgb.png", 320, 240)
    truth = tmp_path / "truth.json"
    manifest = tmp_path / "manifest.json"
    template = tmp_path / "pred.csv"
    result = build_official_test_blind_set(root, truth, manifest, template)
    assert result["sample_count"] == 2
    t = json.loads(truth.read_text())
    m = json.loads(manifest.read_text())
    assert t["samples"][0]["actual_calories_kcal"] == 200.0
    encoded = json.dumps(m).lower()
    for forbidden in ("actual_", "true_", "ground_truth", "ingredient", "calories_kcal", "mass_g"):
        assert forbidden not in encoded
    assert m["samples"][0]["width_px"] == 640
    header = next(csv.reader(template.open()))
    assert not any(x.startswith(("actual_", "true_", "ground_truth")) for x in header)
