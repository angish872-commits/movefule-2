"""Ground-truth benchmark and empirical interval calibration for MoveFuel Algorithm v3."""
from __future__ import annotations

from dataclasses import asdict, dataclass
import csv
import json
import math
from pathlib import Path
from statistics import mean, median
from typing import Iterable


@dataclass(frozen=True)
class PredictionRow:
    sample_id: str
    category: str
    predicted_min_g: float
    predicted_central_g: float
    predicted_max_g: float
    actual_g: float
    predicted_calories: float | None = None
    actual_calories: float | None = None


@dataclass(frozen=True)
class CalibrationProfile:
    profile_id: str
    scope_key: str
    algorithm_version: str
    target_coverage: float
    lower_multiplier: float
    median_multiplier: float
    upper_multiplier: float
    sample_count: int
    benchmark_version: str


def _f(value: str | None) -> float | None:
    if value is None or value.strip() == "":
        return None
    x = float(value)
    if not math.isfinite(x):
        raise ValueError("non-finite numeric value")
    return x


def load_prediction_csv(path: Path) -> list[PredictionRow]:
    rows: list[PredictionRow] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        required = {"sample_id", "category", "predicted_min_g", "predicted_central_g", "predicted_max_g", "actual_g"}
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError(f"missing required columns: {sorted(required)}")
        for raw in reader:
            row = PredictionRow(
                sample_id=(raw.get("sample_id") or "").strip(),
                category=(raw.get("category") or "global").strip() or "global",
                predicted_min_g=float(raw["predicted_min_g"]),
                predicted_central_g=float(raw["predicted_central_g"]),
                predicted_max_g=float(raw["predicted_max_g"]),
                actual_g=float(raw["actual_g"]),
                predicted_calories=_f(raw.get("predicted_calories")),
                actual_calories=_f(raw.get("actual_calories")),
            )
            if not row.sample_id:
                raise ValueError("blank sample_id")
            if row.actual_g < 0 or row.predicted_min_g < 0 or row.predicted_central_g < 0 or row.predicted_max_g < 0:
                raise ValueError(f"negative mass: {row.sample_id}")
            if not (row.predicted_min_g <= row.predicted_central_g <= row.predicted_max_g):
                raise ValueError(f"unordered interval: {row.sample_id}")
            rows.append(row)
    return rows


def _quantile(values: list[float], p: float) -> float:
    if not values:
        raise ValueError("quantile requires data")
    values = sorted(values)
    idx = max(0.0, min(1.0, p)) * (len(values) - 1)
    lo, hi = math.floor(idx), math.ceil(idx)
    if lo == hi:
        return values[lo]
    w = idx - lo
    return values[lo] * (1 - w) + values[hi] * w


def summarize(rows: Iterable[PredictionRow]) -> dict:
    rows = list(rows)
    gram_errors = [abs(r.predicted_central_g - r.actual_g) for r in rows]
    gram_pct = [abs(r.predicted_central_g - r.actual_g) / r.actual_g for r in rows if r.actual_g > 0]
    coverage = [1.0 if r.predicted_min_g <= r.actual_g <= r.predicted_max_g else 0.0 for r in rows]
    cal_errors = [abs(r.predicted_calories - r.actual_calories) for r in rows if r.predicted_calories is not None and r.actual_calories is not None]
    category: dict[str, list[float]] = {}
    for r, covered in zip(rows, coverage, strict=True):
        category.setdefault(r.category, []).append(covered)
    return {
        "sample_count": len(rows),
        "gram_mae": mean(gram_errors) if gram_errors else None,
        "gram_median_absolute_error": median(gram_errors) if gram_errors else None,
        "gram_mape": mean(gram_pct) if gram_pct else None,
        "interval_coverage": mean(coverage) if coverage else None,
        "calorie_mae": mean(cal_errors) if cal_errors else None,
        "category_interval_coverage": {k: mean(v) for k, v in sorted(category.items())},
    }


def fit_profiles(
    rows: Iterable[PredictionRow],
    *,
    algorithm_version: str = "2.0.0",
    benchmark_version: str = "portion-benchmark-v1",
    target_coverage: float = 0.90,
    minimum_samples: int = 30,
) -> list[CalibrationProfile]:
    if not 0.5 < target_coverage < 1:
        raise ValueError("target_coverage must be between 0.5 and 1")
    groups: dict[str, list[PredictionRow]] = {}
    for row in rows:
        groups.setdefault(row.category, []).append(row)
    profiles: list[CalibrationProfile] = []
    alpha = 1 - target_coverage
    for category, group in sorted(groups.items()):
        ratios = sorted(r.actual_g / r.predicted_central_g for r in group if r.predicted_central_g > 0 and r.actual_g >= 0)
        if len(ratios) < minimum_samples:
            continue
        profiles.append(CalibrationProfile(
            profile_id=f"portion:{category}:{algorithm_version}",
            scope_key=category,
            algorithm_version=algorithm_version,
            target_coverage=target_coverage,
            lower_multiplier=_quantile(ratios, alpha / 2),
            median_multiplier=_quantile(ratios, 0.5),
            upper_multiplier=_quantile(ratios, 1 - alpha / 2),
            sample_count=len(ratios),
            benchmark_version=benchmark_version,
        ))
    return profiles


def evaluate_file(
    csv_path: Path,
    *,
    output_json: Path | None = None,
    profiles_json: Path | None = None,
    minimum_samples: int = 100,
    minimum_interval_coverage: float = 0.85,
    maximum_gram_mape: float = 0.35,
) -> dict:
    rows = load_prediction_csv(csv_path)
    summary = summarize(rows)
    profiles = fit_profiles(rows)
    passed = (
        summary["sample_count"] >= minimum_samples
        and summary["interval_coverage"] is not None
        and summary["interval_coverage"] >= minimum_interval_coverage
        and summary["gram_mape"] is not None
        and summary["gram_mape"] <= maximum_gram_mape
    )
    payload = {
        "benchmark_version": "portion-benchmark-v1",
        "summary": summary,
        "acceptance_gate": {
            "minimum_samples": minimum_samples,
            "minimum_interval_coverage": minimum_interval_coverage,
            "maximum_gram_mape": maximum_gram_mape,
            "passed": passed,
        },
        "calibration_profiles": [asdict(profile) for profile in profiles],
    }
    if output_json:
        output_json.parent.mkdir(parents=True, exist_ok=True)
        output_json.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if profiles_json:
        profiles_json.parent.mkdir(parents=True, exist_ok=True)
        profiles_json.write_text(json.dumps(payload["calibration_profiles"], indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return payload
