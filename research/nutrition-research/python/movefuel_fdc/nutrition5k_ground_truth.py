"""Build a replayable calorie ground-truth set from locally licensed Nutrition5k samples."""
from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _local_measured_sample(corpus_root: Path, path: Path) -> tuple[dict, dict] | None:
    data = json.loads(path.read_text(encoding="utf-8"))
    sample_id = str(data.get("sampleId") or "").strip()
    nutrients = data.get("groundTruthNutrients") or {}
    mass = data.get("portionServedWeightG")
    kcal = nutrients.get("energyKcal")
    image = corpus_root / "images" / f"{sample_id}.png"
    if not sample_id or mass is None or kcal is None or not image.is_file():
        return None
    width = int((data.get("images") or {}).get("widthPx") or 0)
    height = int((data.get("images") or {}).get("heightPx") or 0)
    source = data.get("groundTruthSource") or {}
    truth = {
        "sample_id": sample_id,
        "source_dataset": source.get("description") or "Nutrition5k",
        "category": "mixed_cafeteria_plate",
        "actual_mass_g": float(mass),
        "actual_calories_kcal": float(kcal),
        "actual_protein_g": float(nutrients["proteinG"]) if nutrients.get("proteinG") is not None else None,
        "actual_carb_g": float(nutrients["carbG"]) if nutrients.get("carbG") is not None else None,
        "actual_fat_g": float(nutrients["fatG"]) if nutrients.get("fatG") is not None else None,
        "central_validation_band_15pct": {
            "minimum": round(float(kcal) * 0.85, 2),
            "maximum": round(float(kcal) * 1.15, 2),
        },
        "prediction_status": "PENDING_LIVE_ALGORITHM_RUN",
        "image_path": str(image.resolve()),
    }
    inference = {
        "sample_id": sample_id,
        "category": "mixed_cafeteria_plate",
        "image_path": str(image.resolve()),
        "mime_type": "image/png",
        "width_px": width,
        "height_px": height,
        "checksum": _sha256(image),
        "dataset": "Nutrition5k",
        "dish_id": source.get("recipeId"),
    }
    return truth, inference


def build_ground_truth(corpus_root: Path, output_json: Path, prediction_template_csv: Path, inference_manifest_json: Path | None = None) -> dict:
    samples_dir = corpus_root / "samples"
    rows = []
    inference_rows = []
    for path in sorted(samples_dir.glob("ic-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("evidence_class") != "MEASURED_DATASET":
            continue
        gt = data.get("available_ground_truth_fields") or {}
        kcal = gt.get("total_calories_kcal")
        mass = gt.get("total_mass_g")
        if kcal is None or mass is None:
            continue
        kcal = float(kcal)
        rows.append({
            "sample_id": data["stable_sample_id"],
            "source_dataset": data.get("source_dataset"),
            "category": "mixed_cafeteria_plate",
            "actual_mass_g": float(mass),
            "actual_calories_kcal": kcal,
            "actual_protein_g": float(gt.get("total_protein_g")) if gt.get("total_protein_g") is not None else None,
            "actual_carb_g": float(gt.get("total_carb_g")) if gt.get("total_carb_g") is not None else None,
            "actual_fat_g": float(gt.get("total_fat_g")) if gt.get("total_fat_g") is not None else None,
            "central_validation_band_15pct": {
                "minimum": round(kcal * 0.85, 2),
                "maximum": round(kcal * 1.15, 2),
            },
            "prediction_status": "PENDING_LIVE_ALGORITHM_RUN",
            "image_path": str(corpus_root / data["local_image_path"]),
        })
        image_path = corpus_root / data["local_image_path"]
        suffix = image_path.suffix.lower()
        inference_rows.append({
            "sample_id": data["stable_sample_id"],
            "category": "mixed_cafeteria_plate",
            "image_path": str(image_path),
            "mime_type": "image/png" if suffix == ".png" else "image/webp" if suffix == ".webp" else "image/jpeg",
            "width_px": int(data.get("width") or 0),
            "height_px": int(data.get("height") or 0),
            "checksum": data.get("sha256"),
            "dataset": "Nutrition5k",
            "dish_id": data.get("original_identifier"),
        })

    # The larger local benchmark uses the canonical benchmark-sample schema
    # instead of the smaller internet-corpus wrapper. Preserve the same strict
    # truth/inference separation while admitting those measured rs-* records.
    for path in sorted(samples_dir.glob("rs-*.json")):
        parsed = _local_measured_sample(corpus_root, path)
        if parsed is None:
            continue
        truth, inference = parsed
        rows.append(truth)
        inference_rows.append(inference)

    payload = {
        "dataset": "MoveFuel Nutrition5k licensed measured pilot",
        "sample_count": len(rows),
        "purpose": "Ground truth for Algorithm V4 calorie/mass validation; ±15% is a central-error screen, not the app uncertainty model.",
        "samples": rows,
    }
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    prediction_template_csv.parent.mkdir(parents=True, exist_ok=True)
    # Leak-resistant template: actual mass/calorie/macro truth is deliberately
    # absent.  It is joined by the blind scorer only after predictions exist.
    with prediction_template_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "sample_id", "category",
            "predicted_min_g", "predicted_central_g", "predicted_max_g",
            "predicted_min_kcal", "predicted_central_kcal", "predicted_max_kcal",
            "predicted_min_protein_g", "predicted_central_protein_g", "predicted_max_protein_g",
            "predicted_min_carb_g", "predicted_central_carb_g", "predicted_max_carb_g",
            "predicted_min_fat_g", "predicted_central_fat_g", "predicted_max_fat_g",
            "prediction_state", "algorithm_version", "model_version",
        ])
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "sample_id": row["sample_id"], "category": row["category"],
                "prediction_state": "PENDING_LIVE_ALGORITHM_RUN",
            })
    if inference_manifest_json is not None:
        inference_manifest_json.parent.mkdir(parents=True, exist_ok=True)
        # Deliberately contains no food labels, ingredient names, true grams, calories, or macros.
        inference_manifest_json.write_text(json.dumps({
            "schema": "movefuel-blind-inference-manifest-v1",
            "sample_count": len(inference_rows),
            "samples": inference_rows,
        }, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return payload
