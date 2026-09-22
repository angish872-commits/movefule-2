from pathlib import Path
import csv

from movefuel_fdc.calorie_validation import CaloriePredictionRow, evaluate_calorie_file, summarize_calorie_predictions


def test_calorie_summary_separates_15pct_central_screen_from_interval_coverage():
    rows = [
        CaloriePredictionRow("a", "simple", 80, 100, 120, 110),   # central passes, interval covers
        CaloriePredictionRow("b", "simple", 80, 100, 130, 125),   # central fails (>15%), interval covers
        CaloriePredictionRow("c", "mixed", 100, 120, 140, 150),   # central fails, interval misses
    ]
    out = summarize_calorie_predictions(rows)
    assert out["sample_count"] == 3
    assert round(out["central_within_15_rate"], 6) == round(1 / 3, 6)
    assert round(out["interval_coverage"], 6) == round(2 / 3, 6)


def test_calorie_acceptance_gate(tmp_path: Path):
    path = tmp_path / "predictions.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["sample_id", "category", "predicted_min_kcal", "predicted_central_kcal", "predicted_max_kcal", "actual_kcal"])
        for i in range(100):
            writer.writerow([f"s{i}", "mixed", 85, 100, 115, 100])
    result = evaluate_calorie_file(path, output_json=tmp_path / "report.json")
    assert result["acceptance_gate"]["passed"] is True
    assert result["summary"]["central_within_15_rate"] == 1.0
    assert result["summary"]["interval_coverage"] == 1.0
