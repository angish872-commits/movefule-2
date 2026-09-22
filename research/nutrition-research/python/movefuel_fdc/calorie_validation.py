"""Calorie-range validation utilities for MoveFuel Algorithm V4.

The product owner asked to use a ±15% central-error screen while also keeping
MoveFuel's evidence-dependent displayed interval.  These are deliberately two
separate metrics:

* central_within_15_rate: was the best estimate within 15% of ground truth?
* interval_coverage: did the app's displayed min/max interval contain truth?

The first is an engineering acceptance screen; it is NOT used as a universal
uncertainty interval because mixed/poorly measured foods need wider ranges.
"""
from __future__ import annotations

from dataclasses import dataclass
import csv
import json
import math
from pathlib import Path
from statistics import mean, median
from typing import Iterable


@dataclass(frozen=True)
class CaloriePredictionRow:
    sample_id: str
    category: str
    predicted_min_kcal: float
    predicted_central_kcal: float
    predicted_max_kcal: float
    actual_kcal: float


def _finite_nonnegative(value: str, *, field: str, sample_id: str) -> float:
    number = float(value)
    if not math.isfinite(number) or number < 0:
        raise ValueError(f"{sample_id}: {field} must be finite and non-negative")
    return number


def load_calorie_prediction_csv(path: Path) -> list[CaloriePredictionRow]:
    rows: list[CaloriePredictionRow] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        required = {
            "sample_id", "category", "predicted_min_kcal",
            "predicted_central_kcal", "predicted_max_kcal", "actual_kcal",
        }
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError(f"missing required columns: {sorted(required)}")
        for raw in reader:
            sample_id = (raw.get("sample_id") or "").strip()
            if not sample_id:
                raise ValueError("blank sample_id")
            row = CaloriePredictionRow(
                sample_id=sample_id,
                category=(raw.get("category") or "global").strip() or "global",
                predicted_min_kcal=_finite_nonnegative(raw["predicted_min_kcal"], field="predicted_min_kcal", sample_id=sample_id),
                predicted_central_kcal=_finite_nonnegative(raw["predicted_central_kcal"], field="predicted_central_kcal", sample_id=sample_id),
                predicted_max_kcal=_finite_nonnegative(raw["predicted_max_kcal"], field="predicted_max_kcal", sample_id=sample_id),
                actual_kcal=_finite_nonnegative(raw["actual_kcal"], field="actual_kcal", sample_id=sample_id),
            )
            if not (row.predicted_min_kcal <= row.predicted_central_kcal <= row.predicted_max_kcal):
                raise ValueError(f"{sample_id}: unordered calorie interval")
            rows.append(row)
    return rows


def summarize_calorie_predictions(rows: Iterable[CaloriePredictionRow], *, central_tolerance: float = 0.15) -> dict:
    rows = list(rows)
    if not 0 < central_tolerance < 1:
        raise ValueError("central_tolerance must be between 0 and 1")

    abs_errors = [abs(r.predicted_central_kcal - r.actual_kcal) for r in rows]
    ape = [
        abs(r.predicted_central_kcal - r.actual_kcal) / r.actual_kcal
        for r in rows if r.actual_kcal > 0
    ]
    central_pass = [
        1.0 if abs(r.predicted_central_kcal - r.actual_kcal) <= r.actual_kcal * central_tolerance else 0.0
        for r in rows if r.actual_kcal > 0
    ]
    coverage = [
        1.0 if r.predicted_min_kcal <= r.actual_kcal <= r.predicted_max_kcal else 0.0
        for r in rows
    ]
    relative_width = [
        (r.predicted_max_kcal - r.predicted_min_kcal) / r.actual_kcal
        for r in rows if r.actual_kcal > 0
    ]

    by_category: dict[str, list[CaloriePredictionRow]] = {}
    for row in rows:
        by_category.setdefault(row.category, []).append(row)

    category_summary = {}
    for category, group in sorted(by_category.items()):
        group_ape = [abs(r.predicted_central_kcal - r.actual_kcal) / r.actual_kcal for r in group if r.actual_kcal > 0]
        group_pass = [1.0 if abs(r.predicted_central_kcal-r.actual_kcal) <= r.actual_kcal*central_tolerance else 0.0 for r in group if r.actual_kcal > 0]
        group_cov = [1.0 if r.predicted_min_kcal <= r.actual_kcal <= r.predicted_max_kcal else 0.0 for r in group]
        category_summary[category] = {
            "sample_count": len(group),
            "mape": mean(group_ape) if group_ape else None,
            "central_within_15_rate": mean(group_pass) if group_pass else None,
            "interval_coverage": mean(group_cov) if group_cov else None,
        }

    return {
        "sample_count": len(rows),
        "calorie_mae": mean(abs_errors) if abs_errors else None,
        "calorie_median_absolute_error": median(abs_errors) if abs_errors else None,
        "calorie_mape": mean(ape) if ape else None,
        "central_tolerance": central_tolerance,
        "central_within_15_rate": mean(central_pass) if central_pass else None,
        "interval_coverage": mean(coverage) if coverage else None,
        "mean_relative_interval_width": mean(relative_width) if relative_width else None,
        "median_relative_interval_width": median(relative_width) if relative_width else None,
        "by_category": category_summary,
    }


def evaluate_calorie_file(
    csv_path: Path,
    *,
    output_json: Path | None = None,
    minimum_samples: int = 100,
    minimum_central_within_15_rate: float = 0.80,
    minimum_interval_coverage: float = 0.90,
    maximum_mean_relative_interval_width: float = 0.60,
) -> dict:
    rows = load_calorie_prediction_csv(csv_path)
    summary = summarize_calorie_predictions(rows)
    passed = (
        summary["sample_count"] >= minimum_samples
        and summary["central_within_15_rate"] is not None
        and summary["central_within_15_rate"] >= minimum_central_within_15_rate
        and summary["interval_coverage"] is not None
        and summary["interval_coverage"] >= minimum_interval_coverage
        and summary["mean_relative_interval_width"] is not None
        and summary["mean_relative_interval_width"] <= maximum_mean_relative_interval_width
    )
    payload = {
        "benchmark_version": "movefuel-calorie-validation-v4-1",
        "interpretation": {
            "central_within_15_rate": "engineering screen only; central estimate within ±15% of weighed calorie truth",
            "interval_coverage": "primary uncertainty check; actual calories fall inside app-displayed range",
            "warning": "Do not replace evidence-dependent ranges with a universal ±15% interval. Coverage is scored together with interval width so an unhelpfully huge range cannot game the benchmark.",
        },
        "summary": summary,
        "acceptance_gate": {
            "minimum_samples": minimum_samples,
            "minimum_central_within_15_rate": minimum_central_within_15_rate,
            "minimum_interval_coverage": minimum_interval_coverage,
            "maximum_mean_relative_interval_width": maximum_mean_relative_interval_width,
            "passed": passed,
        },
    }
    if output_json:
        output_json.parent.mkdir(parents=True, exist_ok=True)
        output_json.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return payload
