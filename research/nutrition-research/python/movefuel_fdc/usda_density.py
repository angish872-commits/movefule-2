"""Derive commercially usable density evidence from USDA FDC household portions.

FoodData Central is CC0.  When FDC supplies a gram weight for a genuinely
volumetric household measure (cup, tablespoon, teaspoon, fluid ounce, mL, L),
that pair can be converted to g/mL.  Piece/slice/serving measures are never
reinterpreted as volume.

This is *derived* density evidence, not a laboratory density measurement.  The
record preserves the FDC id, release, measure rows, and derivation method so the
runtime and calibration system can treat it less strongly than measured data.
"""
from __future__ import annotations

import json
import math
import sqlite3
import statistics
import time
from pathlib import Path
from typing import Any

from .knowledge_base import initialize_knowledge_base
from .importer import normalize_name

DERIVATION_VERSION = "usda-fdc-household-volume-density-v1"

# USDA MAFCL household relationships: 1 cup = 16 tbsp = 48 tsp = 8 fl oz.
# 1 fl oz is represented as 29.57 mL for this derivation.
UNIT_ML: dict[str, float] = {
    "milliliter": 1.0, "milliliters": 1.0, "ml": 1.0,
    "liter": 1000.0, "liters": 1000.0, "l": 1000.0,
    "teaspoon": 29.57 / 6.0, "teaspoons": 29.57 / 6.0, "tsp": 29.57 / 6.0,
    "tablespoon": 29.57 / 2.0, "tablespoons": 29.57 / 2.0, "tbsp": 29.57 / 2.0,
    "cup": 29.57 * 8.0, "cups": 29.57 * 8.0,
    "fluid ounce": 29.57, "fluid ounces": 29.57, "fl oz": 29.57, "fl. oz.": 29.57,
    "pint": 29.57 * 16.0, "pints": 29.57 * 16.0,
    "quart": 29.57 * 32.0, "quarts": 29.57 * 32.0,
    "gallon": 29.57 * 128.0, "gallons": 29.57 * 128.0,
}


def _unit_ml(name: str | None, abbreviation: str | None) -> float | None:
    for raw in (name, abbreviation):
        key=(raw or "").strip().lower().replace("  ", " ")
        if key in UNIT_ML:
            return UNIT_ML[key]
    return None


def _quantile(values: list[float], q: float) -> float:
    values=sorted(values)
    if len(values)==1: return values[0]
    pos=(len(values)-1)*q; lo=int(math.floor(pos)); hi=int(math.ceil(pos))
    if lo==hi:return values[lo]
    return values[lo]*(hi-pos)+values[hi]*(pos-lo)


def derive_usda_portion_densities(db_path: Path, *, release: str | None = None) -> dict[str, Any]:
    initialize_knowledge_base(db_path)
    conn=sqlite3.connect(str(db_path)); conn.row_factory=sqlite3.Row
    try:
        # Older catalogues may predate measure_unit import. Fail visibly rather
        # than trying to guess the unit from piece/slice text.
        try:
            conn.execute("SELECT 1 FROM fdc_measure_unit LIMIT 1").fetchone()
        except sqlite3.OperationalError:
            return {"derivation_version":DERIVATION_VERSION,"status":"NO_MEASURE_UNIT_TABLE","foods_seen":0,"records_written":0,"portion_rows_used":0,"portion_rows_rejected":0}
        where="WHERE p.gram_weight IS NOT NULL AND p.gram_weight > 0 AND p.amount IS NOT NULL AND p.amount > 0"
        params: list[Any]=[]
        if release:
            where += " AND f.release=?"; params.append(release)
        rows=conn.execute(f"""
            SELECT p.id portion_id,p.fdc_id,p.amount,p.gram_weight,p.portion_description,p.modifier,
                   u.name measure_name,u.abbreviation measure_abbreviation,
                   f.description,f.normalized_name,f.release,f.data_type
            FROM fdc_food_portion p
            JOIN fdc_food f ON f.fdc_id=p.fdc_id
            LEFT JOIN fdc_measure_unit u ON CAST(u.id AS TEXT)=CAST(p.measure_unit_id AS TEXT)
            {where}
            ORDER BY p.fdc_id,p.id
        """,params).fetchall()
        grouped: dict[int,list[dict[str,Any]]]={}; rejected=0; used=0
        for r in rows:
            unit=_unit_ml(r["measure_name"],r["measure_abbreviation"])
            if unit is None:
                rejected+=1; continue
            volume=float(r["amount"])*unit
            density=float(r["gram_weight"])/volume if volume>0 else 0
            # Extremely broad structural guard only; values outside this band
            # are quarantined from runtime density derivation, not declared false.
            if not math.isfinite(density) or density < 0.02 or density > 3.0:
                rejected+=1; continue
            grouped.setdefault(int(r["fdc_id"]),[]).append({
                "portion_id":int(r["portion_id"]),"density":density,"volume_ml":volume,
                "gram_weight":float(r["gram_weight"]),"amount":float(r["amount"]),
                "measure_name":r["measure_name"],"measure_abbreviation":r["measure_abbreviation"],
                "portion_description":r["portion_description"],"modifier":r["modifier"],
                "description":r["description"],"normalized_name":r["normalized_name"],
                "release":r["release"],"data_type":r["data_type"],
            }); used+=1
        written=0
        for fdc_id, obs in grouped.items():
            vals=[o["density"] for o in obs]
            central=statistics.median(vals)
            low=_quantile(vals,0.10) if len(vals)>=3 else min(vals)
            high=_quantile(vals,0.90) if len(vals)>=3 else max(vals)
            first=obs[0]; source_version=str(first["release"])
            source_row_id=f"fdc:{fdc_id}:household-volume"
            density_id=f"usda-fdc-density-{fdc_id}-{source_version}"
            conn.execute("""
                INSERT INTO kb_density_record(
                  density_id,source_id,source_version,source_row_id,food_name,normalized_food_name,
                  preparation,physical_form,density_central_g_ml,density_min_g_ml,density_max_g_ml,
                  region,evidence_quality,source_reference,source_notes,raw_json,active,imported_at_epoch
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(source_id,source_version,source_row_id) DO UPDATE SET
                  density_id=excluded.density_id,food_name=excluded.food_name,normalized_food_name=excluded.normalized_food_name,
                  density_central_g_ml=excluded.density_central_g_ml,density_min_g_ml=excluded.density_min_g_ml,
                  density_max_g_ml=excluded.density_max_g_ml,evidence_quality=excluded.evidence_quality,
                  source_reference=excluded.source_reference,source_notes=excluded.source_notes,raw_json=excluded.raw_json,
                  active=1,imported_at_epoch=excluded.imported_at_epoch
            """,(
                density_id,"usda_fdc",source_version,source_row_id,first["description"],first["normalized_name"],
                "any","any",central,low,high,"US/global-reference","DERIVED",
                f"FoodData Central fdcId {fdc_id}",
                f"Derived from {len(obs)} FDC volumetric household portion gram-weight row(s) using {DERIVATION_VERSION}; not a laboratory density measurement.",
                json.dumps({"fdc_id":fdc_id,"derivation_version":DERIVATION_VERSION,"observations":obs},sort_keys=True),1,int(time.time()),
            )); written+=1
        conn.commit()
        return {"derivation_version":DERIVATION_VERSION,"status":"COMPLETED","foods_seen":len(grouped),"records_written":written,"portion_rows_used":used,"portion_rows_rejected":rejected}
    finally:
        conn.close()
