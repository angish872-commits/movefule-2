from pathlib import Path
import csv

from movefuel_fdc.portion_benchmark import evaluate_file, fit_profiles, summarize, PredictionRow


def test_summary_and_profiles():
    rows = [
        PredictionRow(
            sample_id=f"s{i}", category="BASIC",
            predicted_min_g=90, predicted_central_g=100, predicted_max_g=110,
            actual_g=100 + (i % 5) - 2,
        )
        for i in range(40)
    ]
    summary = summarize(rows)
    assert summary["sample_count"] == 40
    assert summary["interval_coverage"] >= 0.9
    profiles = fit_profiles(rows, minimum_samples=30)
    assert len(profiles) == 1
    assert profiles[0].scope_key == "BASIC"


def test_evaluate_csv_writes_replayable_result(tmp_path: Path):
    csv_path = tmp_path / "predictions.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["sample_id", "category", "predicted_min_g", "predicted_central_g", "predicted_max_g", "actual_g", "predicted_calories", "actual_calories"])
        for i in range(35):
            writer.writerow([f"s{i}", "PREPARED", 90, 100, 110, 101, 200, 202])
    result = evaluate_file(csv_path, minimum_samples=30, maximum_gram_mape=0.05, output_json=tmp_path / "report.json")
    assert result["acceptance_gate"]["passed"] is True
    assert (tmp_path / "report.json").exists()
