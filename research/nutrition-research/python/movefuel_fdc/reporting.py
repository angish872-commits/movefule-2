"""Generate QA and inventory reports from the imported catalogue."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import sqlite3


def generate_qa_report(db_path: Path, raw_manifest: Path, out: Path) -> dict:
    conn = sqlite3.connect(str(db_path))
    manifest = json.loads(raw_manifest.read_text()) if raw_manifest.exists() else []
    try:
        rows = conn.execute("SELECT * FROM fdc_import_log ORDER BY id").fetchall()
        columns = [d[0] for d in conn.execute("SELECT * FROM fdc_import_log").description]
        logs = [dict(zip(columns, row)) for row in rows]
        total_seen = sum(int(log["rows_seen"]) for log in logs)
        total_imported = sum(int(log["rows_imported"]) for log in logs)
        total_rejected = sum(int(log["rows_rejected"]) for log in logs)
    finally:
        conn.close()

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "manifest": manifest,
        "importLogs": logs,
        "totals": {
            "rowsSeen": total_seen,
            "rowsImported": total_imported,
            "rowsRejected": total_rejected,
        },
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def generate_source_inventory(db_path: Path, out: Path) -> dict:
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(
            "SELECT data_type, count(*) AS foods, "
            "sum(CASE WHEN EXISTS (SELECT 1 FROM fdc_food_nutrient n WHERE n.fdc_id=fdc_food.fdc_id AND n.nutrient_id IN (1008,2047,2048)) THEN 1 ELSE 0 END) AS with_energy "
            "FROM fdc_food GROUP BY data_type ORDER BY 2 DESC"
        ).fetchall()
        inventory = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "dataTypes": [dict(zip(["dataType", "foods", "withEnergy"], row)) for row in rows],
        }
    finally:
        conn.close()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(inventory, indent=2, sort_keys=True) + "\n")
    return inventory
