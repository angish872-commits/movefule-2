import csv
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[4]


def test_blind_runtime_executor_replay_is_end_to_end_and_truth_free(tmp_path: Path):
    image = tmp_path / "meal.png"
    rng = np.random.default_rng(42)
    pixels = rng.integers(35, 220, size=(480, 640, 3), dtype=np.uint8)
    assert cv2.imwrite(str(image), pixels)
    checksum = hashlib.sha256(image.read_bytes()).hexdigest()

    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps({
        "schema": "movefuel-blind-inference-manifest-v1",
        "sample_count": 1,
        "samples": [{
            "sample_id": "sample-1", "category": "simple_food", "image_path": str(image),
            "mime_type": "image/png", "width_px": 640, "height_px": 480,
            "checksum": checksum, "dataset": "synthetic-contract", "dish_id": None,
        }],
    }))

    scene_dir = tmp_path / "scenes"; scene_dir.mkdir()
    (scene_dir / "sample-1.json").write_text(json.dumps({
        "schema": "movefuel-safe-scene-v6-1",
        "sample_id": "sample-1",
        "provider": "safe-replay",
        "provider_version": "safe-replay-v1",
        "latency_ms": 1,
        "warnings": [],
        "regions": [{
            "regionId": "region-1",
            "bbox": {"x": 0.2, "y": 0.2, "width": 0.6, "height": 0.6},
            "maskPolygon": [[0.2,0.2],[0.8,0.2],[0.8,0.8],[0.2,0.8]],
            "segmentationConfidence": 0.95,
            "overlapState": "NONE",
            "warnings": [],
            "candidates": [{
                "name": "rice cooked", "searchTerms": ["rice cooked"], "foodType": "BASIC",
                "preparationCandidates": [{"label": "cooked", "confidence": 0.95}],
                "providerConfidence": 0.95, "uncertaintyNotes": [],
            }],
        }],
    }))

    db = tmp_path / "fdc.sqlite"
    conn = sqlite3.connect(db)
    conn.executescript("""
      CREATE TABLE fdc_food(fdc_id INTEGER PRIMARY KEY, data_type TEXT, description TEXT, normalized_name TEXT, publication_date TEXT);
      CREATE TABLE fdc_food_nutrient(fdc_id INTEGER, nutrient_id INTEGER, amount REAL);
      CREATE TABLE fdc_food_portion(fdc_id INTEGER, gram_weight REAL);
      CREATE TABLE fdc_branded_metadata(fdc_id INTEGER, gtin_upc TEXT, brand_owner TEXT);
      INSERT INTO fdc_food VALUES(1,'Foundation','Rice, white, long-grain, cooked','rice white long grain cooked','2026-04-30');
      INSERT INTO fdc_food_nutrient VALUES(1,1008,130.0);
      INSERT INTO fdc_food_nutrient VALUES(1,1003,2.7);
      INSERT INTO fdc_food_nutrient VALUES(1,1005,28.2);
      INSERT INTO fdc_food_nutrient VALUES(1,1004,0.3);
      INSERT INTO fdc_food_nutrient VALUES(1,1079,0.4);
      INSERT INTO fdc_food_nutrient VALUES(1,1093,1.0);
      INSERT INTO fdc_food_portion VALUES(1,158.0);
    """)
    conn.commit(); conn.close()

    snapshot = tmp_path / "snapshot.json"
    snapshot.write_text(json.dumps({
        "format": "movefuel-food-kb-snapshot-v1",
        "density_records": [{
            "density_id": "fdc-1-density", "source_id": "usda_fdc", "source_version": "2026-04-30",
            "food_name": "rice white long grain cooked", "normalized_food_name": "rice white long grain cooked",
            "preparation": "cooked", "physical_form": "prepared", "density_central_g_ml": 0.80,
            "density_min_g_ml": 0.72, "density_max_g_ml": 0.88, "evidence_quality": "DERIVED",
            "source_reference": "FoodData Central fdcId 1 volumetric household portion weights",
        }],
    }))

    sidecars = tmp_path / "sidecars"; sidecars.mkdir()
    (sidecars / "sample-1.json").write_text(json.dumps({
        "schema": "movefuel-depth-scale-sidecar-v1", "sampleId": "sample-1", "regions": [{
            "status": "COMPLETED", "provider": "synthetic-physical-fixture", "providerVersion": "1",
            "regionId": "region-1", "method": "KNOWN_REFERENCE_GEOMETRY",
            "scale": {"calibrationId": "scale-1", "sourceId": "known-grid", "sourceRevision": "1",
                      "minimumCmPerPixel": 0.095, "centralCmPerPixel": 0.10, "maximumCmPerPixel": 0.105,
                      "quality": "MEASURED"},
            "heightSamples": [{"pixelArea": 10000, "minimumHeightCm": 1.8, "centralHeightCm": 2.0,
                               "maximumHeightCm": 2.2, "confidence": 0.95}],
            "validCoverageFraction": 1.0, "supportPlaneConfidence": 0.95, "warnings": []
        }]
    }))

    output = tmp_path / "pred.csv"; diag = tmp_path / "diag.json"
    proc = subprocess.run([
        "node", "--experimental-strip-types", "scripts/run-blind-algorithm.ts",
        "--manifest", str(manifest), "--output", str(output), "--diagnostics", str(diag),
        "--scene-dir", str(scene_dir), "--knowledge-db", str(db), "--knowledge-snapshot", str(snapshot),
            "--depth-sidecar-dir", str(sidecars), "--reuse-scenes", "--python-bin", sys.executable,
    ], cwd=REPO_ROOT / "services" / "backend", text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    assert proc.returncode == 0, proc.stderr + proc.stdout
    rows = list(csv.DictReader(output.open()))
    assert len(rows) == 1
    assert float(rows[0]["predicted_central_g"]) > 0
    assert float(rows[0]["predicted_central_kcal"]) > 0
    header = set(rows[0])
    assert not any(x.startswith(("actual_", "true_", "ground_truth")) for x in header)
    d = json.loads(diag.read_text())
    assert d["prediction_count"] == 1
    assert d["ground_truth_fields_used"] == []
    assert d["nutrition_backend"] == "bulk_usda_catalogue"
