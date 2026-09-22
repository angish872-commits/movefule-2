"""Build a leak-resistant Nutrition5k blind inference/truth set from official files.

Unlike the tiny internet-corpus pilot, this module can cover every locally
available *official test-split* overhead RGB-D dish.  Ground truth and inference
manifests are written separately.  The inference manifest never contains food
labels, ingredient names, mass, calories, or macronutrients.
"""
from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path
from typing import Any

from .nutrition5k_importer import _dish_rows, _load_splits

SCHEMA = "movefuel-blind-inference-manifest-v1"


def _find(root: Path, filename: str) -> list[Path]:
    return sorted(root.rglob(filename))


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def _png_dimensions(path: Path) -> tuple[int, int] | None:
    # Avoid adding Pillow as a required data-pipeline dependency. PNG stores
    # width/height in the fixed IHDR header at bytes 16..24.
    try:
        header = path.read_bytes()[:24]
        if len(header) >= 24 and header[:8] == b"\x89PNG\r\n\x1a\n":
            return int.from_bytes(header[16:20], "big"), int.from_bytes(header[20:24], "big")
    except OSError:
        return None
    return None


def _image_for(overhead_root: Path, dish_id: str) -> Path | None:
    d = overhead_root / dish_id
    for name in ("rgb.png", "rgb.jpg", "rgb.jpeg"):
        p = d / name
        if p.exists() and p.is_file():
            return p
    return None


def _mime(path: Path) -> str:
    suffix = path.suffix.lower()
    return "image/png" if suffix == ".png" else "image/webp" if suffix == ".webp" else "image/jpeg"


def build_official_test_blind_set(
    root: Path,
    truth_json: Path,
    inference_manifest_json: Path,
    prediction_template_csv: Path,
    *,
    limit: int | None = None,
) -> dict[str, Any]:
    root = Path(root)
    overhead = root / "imagery" / "realsense_overhead"
    if not overhead.exists():
        raise FileNotFoundError(f"Nutrition5k overhead RGB-D root missing: {overhead}")
    splits = _load_splits(root)
    if not splits:
        raise FileNotFoundError("Nutrition5k official split files not found")
    test_ids = {dish for dish, split in splits.items() if split == "test"}
    if not test_ids:
        raise ValueError("Nutrition5k official test split is empty")

    records: dict[str, dict[str, Any]] = {}
    for filename in ("dish_metadata_cafe1.csv", "dish_metadata_cafe2.csv"):
        for p in _find(root, filename):
            for _row_no, record, error, _raw in _dish_rows(p):
                if error or record is None:
                    continue
                dish_id = str(record["dish_id"])
                if dish_id in test_ids:
                    records[dish_id] = record
            break

    selected: list[tuple[str, dict[str, Any], Path]] = []
    for dish_id in sorted(test_ids):
        record = records.get(dish_id)
        if not record:
            continue
        mass = record.get("total_mass")
        kcal = record.get("total_calories")
        if mass is None or kcal is None or float(mass) <= 0 or float(kcal) < 0:
            continue
        image = _image_for(overhead, dish_id)
        if not image:
            continue
        selected.append((dish_id, record, image))
        if limit is not None and limit > 0 and len(selected) >= limit:
            break

    truth_rows: list[dict[str, Any]] = []
    inference_rows: list[dict[str, Any]] = []
    for dish_id, record, image in selected:
        dims = _png_dimensions(image)
        width, height = dims if dims else (640, 480)  # official overhead RGB is normally PNG; metadata fallback only.
        sid = f"n5k-{dish_id}"
        truth_rows.append({
            "sample_id": sid,
            "source_dataset": "Nutrition5k",
            "source_split": "test",
            "category": "mixed_cafeteria_plate",
            "actual_mass_g": float(record["total_mass"]),
            "actual_calories_kcal": float(record["total_calories"]),
            "actual_protein_g": float(record["total_protein"]) if record.get("total_protein") is not None else None,
            "actual_carb_g": float(record["total_carb"]) if record.get("total_carb") is not None else None,
            "actual_fat_g": float(record["total_fat"]) if record.get("total_fat") is not None else None,
        })
        inference_rows.append({
            "sample_id": sid,
            "category": "mixed_cafeteria_plate",
            "image_path": str(image.resolve()),
            "mime_type": _mime(image),
            "width_px": width,
            "height_px": height,
            "checksum": _sha256(image),
            "dataset": "Nutrition5k",
            "dish_id": dish_id,
        })

    truth_doc = {
        "dataset": "Nutrition5k official held-out test split",
        "sample_count": len(truth_rows),
        "selection_rule": "official test split + locally present overhead RGB-D + positive mass + nonnegative calories",
        "samples": truth_rows,
    }
    inference_doc = {
        "schema": SCHEMA,
        "sample_count": len(inference_rows),
        "samples": inference_rows,
    }
    truth_json.parent.mkdir(parents=True, exist_ok=True)
    inference_manifest_json.parent.mkdir(parents=True, exist_ok=True)
    prediction_template_csv.parent.mkdir(parents=True, exist_ok=True)
    truth_json.write_text(json.dumps(truth_doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    inference_manifest_json.write_text(json.dumps(inference_doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    fields = [
        "sample_id", "category",
        "predicted_min_g", "predicted_central_g", "predicted_max_g",
        "predicted_min_kcal", "predicted_central_kcal", "predicted_max_kcal",
        "predicted_min_protein_g", "predicted_central_protein_g", "predicted_max_protein_g",
        "predicted_min_carb_g", "predicted_central_carb_g", "predicted_max_carb_g",
        "predicted_min_fat_g", "predicted_central_fat_g", "predicted_max_fat_g",
        "prediction_state", "algorithm_version", "model_version",
    ]
    with prediction_template_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in inference_rows:
            writer.writerow({"sample_id": row["sample_id"], "category": row["category"], "prediction_state": "PENDING_LIVE_ALGORITHM_RUN"})

    return {
        "sample_count": len(truth_rows),
        "official_test_split_ids": len(test_ids),
        "metadata_test_records": len(records),
        "overhead_images_selected": len(selected),
        "truth": str(truth_json),
        "inference_manifest": str(inference_manifest_json),
        "prediction_template": str(prediction_template_csv),
    }
