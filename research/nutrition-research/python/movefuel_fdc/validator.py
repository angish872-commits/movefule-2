"""Validation helpers for imported catalogue data."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from .catalogue_schema import schema_sql


def validate_catalogue(db_path: Path) -> dict:
    """Return a validation report dict with counts and issue tallies."""
    conn = sqlite3.connect(str(db_path))
    try:
        conn.executescript(schema_sql())
        report: dict = {}

        def scalar(sql: str, params: tuple = ()) -> object:
            row = conn.execute(sql, params).fetchone()
            return row[0] if row else None

        report["food_count"] = int(scalar("SELECT count(*) FROM fdc_food") or 0)
        report["nutrient_rows"] = int(scalar("SELECT count(*) FROM fdc_food_nutrient") or 0)
        report["portion_rows"] = int(scalar("SELECT count(*) FROM fdc_food_portion") or 0)
        try:
            report["measure_unit_rows"] = int(scalar("SELECT count(*) FROM fdc_measure_unit") or 0)
        except sqlite3.OperationalError:
            report["measure_unit_rows"] = 0
        report["nutrient_definitions"] = int(scalar("SELECT count(*) FROM fdc_nutrient_definition") or 0)

        by_type = conn.execute(
            "SELECT data_type, count(*) FROM fdc_food GROUP BY data_type ORDER BY 2 DESC"
        ).fetchall()
        report["food_by_type"] = {t: c for t, c in by_type}

        report["foods_missing_energy"] = int(
            scalar(
                "SELECT count(*) FROM fdc_food f WHERE NOT EXISTS "
                "(SELECT 1 FROM fdc_food_nutrient n WHERE n.fdc_id=f.fdc_id AND n.nutrient_id IN (1008,2047,2048))"
            )
            or 0
        )
        report["negative_amounts"] = int(
            scalar("SELECT count(*) FROM fdc_food_nutrient WHERE amount < 0") or 0
        )
        report["portions_without_gram_weight"] = int(
            scalar("SELECT count(*) FROM fdc_food_portion WHERE gram_weight IS NULL") or 0
        )
        report["duplicate_food_ids"] = int(
            scalar("SELECT count(*) FROM (SELECT fdc_id FROM fdc_food GROUP BY fdc_id HAVING count(*)>1)")
            or 0
        )
        return report
    finally:
        conn.close()
