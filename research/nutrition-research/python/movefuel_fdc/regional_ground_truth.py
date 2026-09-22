"""Build a sealed launch-market ground-truth set without exposing answers to inference.

The user's capture worksheet may contain actual weights/nutrients.  This module
converts it into two separate artifacts:
  * a sealed JSON used only by the scorer after inference, and
  * a prediction-only CSV that contains no actual/true/ground-truth columns.

This mirrors the Nutrition5k blind-evaluation boundary and prevents accidental
answer leakage into the estimator.
"""
from __future__ import annotations

import csv
import json
import math
from pathlib import Path
from typing import Any

PREDICTION_FIELDS = [
    "sample_id", "category",
    "predicted_min_g", "predicted_central_g", "predicted_max_g",
    "predicted_min_kcal", "predicted_central_kcal", "predicted_max_kcal",
    "predicted_min_protein_g", "predicted_central_protein_g", "predicted_max_protein_g",
    "predicted_min_carb_g", "predicted_central_carb_g", "predicted_max_carb_g",
    "predicted_min_fat_g", "predicted_central_fat_g", "predicted_max_fat_g",
    "prediction_state", "algorithm_version", "model_version",
]


def _number(value: str | None, field: str, sample_id: str, *, required: bool) -> float | None:
    text = (value or "").strip()
    if not text:
        if required:
            raise ValueError(f"{sample_id}: missing {field}")
        return None
    try:
        out = float(text)
    except ValueError as exc:
        raise ValueError(f"{sample_id}: invalid {field}") from exc
    if not math.isfinite(out) or out < 0:
        raise ValueError(f"{sample_id}: {field} must be finite and non-negative")
    return out


def build_regional_ground_truth(input_csv: Path, output_json: Path, prediction_template_csv: Path) -> dict[str, Any]:
    with Path(input_csv).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fields = set(reader.fieldnames or [])
        required = {"sample_id", "actual_total_grams", "photo_path"}
        missing = sorted(required - fields)
        if missing:
            raise ValueError(f"launch-market capture file missing columns: {missing}")
        samples: list[dict[str, Any]] = []
        seen: set[str] = set()
        for raw in reader:
            sid = (raw.get("sample_id") or "").strip()
            if not sid:
                # Permit unused blank template rows, but never half-filled rows.
                if any((v or "").strip() for v in raw.values()):
                    raise ValueError("launch-market capture contains a non-empty row with blank sample_id")
                continue
            if sid in seen:
                raise ValueError(f"duplicate launch-market sample_id: {sid}")
            seen.add(sid)
            actual_g = _number(raw.get("actual_total_grams"), "actual_total_grams", sid, required=True)
            actual_kcal = _number(raw.get("actual_calories_kcal"), "actual_calories_kcal", sid, required=False)
            actual_protein = _number(raw.get("actual_protein_g"), "actual_protein_g", sid, required=False)
            actual_carb = _number(raw.get("actual_carb_g"), "actual_carb_g", sid, required=False)
            actual_fat = _number(raw.get("actual_fat_g"), "actual_fat_g", sid, required=False)
            image = (raw.get("photo_path") or "").strip()
            if not image:
                raise ValueError(f"{sid}: missing photo_path")
            category = (raw.get("food_name") or raw.get("category") or "launch_market_mixed_meal").strip() or "launch_market_mixed_meal"
            samples.append({
                "sample_id": sid,
                "source_dataset": "MoveFuel blinded launch-market weighed acceptance",
                "category": category,
                "actual_mass_g": actual_g,
                "actual_calories_kcal": actual_kcal,
                "actual_protein_g": actual_protein,
                "actual_carb_g": actual_carb,
                "actual_fat_g": actual_fat,
                "food_name": (raw.get("food_name") or "").strip(),
                "preparation": (raw.get("preparation") or "").strip(),
                "cuisine_region": (raw.get("cuisine_region") or "Unspecified launch market").strip(),
                "image_path": image,
                "plate_or_container": (raw.get("plate_or_container") or "").strip(),
                "known_dimension_cm": _number(raw.get("known_dimension_cm"), "known_dimension_cm", sid, required=False),
                "notes": (raw.get("notes") or "").strip(),
            })

    payload = {
        "format": "movefuel-regional-sealed-truth-v1",
        "sample_count": len(samples),
        "truth_boundary": "This file is scorer-only and must never be supplied to the inference process.",
        "samples": samples,
    }
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")

    prediction_template_csv.parent.mkdir(parents=True, exist_ok=True)
    with prediction_template_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=PREDICTION_FIELDS)
        writer.writeheader()
        for sample in samples:
            writer.writerow({
                "sample_id": sample["sample_id"],
                "category": sample["category"],
                "prediction_state": "PENDING_BLIND_ALGORITHM_RUN",
            })
    return payload
