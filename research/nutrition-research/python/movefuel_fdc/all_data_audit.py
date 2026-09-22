"""Comprehensive data-quality audits for MoveFuel algorithm validation.

The functions in this module are intentionally *auditors*, not repairers.  They
measure source/data defects and quarantine-worthy conditions without silently
rewriting public ground truth.  A source can therefore be useful for benchmark
or reference work while still carrying warnings.
"""
from __future__ import annotations

import csv
import json
import math
import sqlite3
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Iterable

from .catalogue_schema import schema_sql
from .knowledge_schema import knowledge_schema_sql
from .nutrition5k_importer import _dish_rows


@dataclass(frozen=True)
class AuditGate:
    name: str
    status: str
    count: int
    detail: str


def _finite_positive(value: Any) -> bool:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return False
    return math.isfinite(v) and v > 0


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone() is not None


def _scalar(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> int:
    row = conn.execute(sql, params).fetchone()
    return int(row[0] if row and row[0] is not None else 0)


def audit_usda_catalogue(db_path: Path) -> dict[str, Any]:
    """Audit every imported USDA row without assuming energy must equal 4/4/9.

    FoodData Central may use specific/general Atwater factors and source-specific
    energy derivations, so macro-energy reconciliation is reported as a warning,
    never used as a destructive correction rule.
    """
    conn = sqlite3.connect(str(db_path))
    try:
        conn.executescript(schema_sql())
        food_count = _scalar(conn, "SELECT count(*) FROM fdc_food")
        nutrient_count = _scalar(conn, "SELECT count(*) FROM fdc_food_nutrient")
        portion_count = _scalar(conn, "SELECT count(*) FROM fdc_food_portion")
        issues = {
            "blank_food_descriptions": _scalar(conn, "SELECT count(*) FROM fdc_food WHERE trim(coalesce(description,''))=''"),
            "blank_data_types": _scalar(conn, "SELECT count(*) FROM fdc_food WHERE trim(coalesce(data_type,''))=''"),
            "negative_nutrient_amounts": _scalar(conn, "SELECT count(*) FROM fdc_food_nutrient WHERE amount < 0"),
            "nonfinite_nutrient_amounts": _scalar(conn, "SELECT count(*) FROM fdc_food_nutrient WHERE amount IS NOT NULL AND (amount != amount OR abs(amount) > 1.0e12)"),
            "orphan_food_nutrients": _scalar(conn, "SELECT count(*) FROM fdc_food_nutrient n LEFT JOIN fdc_food f ON f.fdc_id=n.fdc_id WHERE f.fdc_id IS NULL"),
            "orphan_nutrient_definitions": _scalar(conn, "SELECT count(*) FROM fdc_food_nutrient n LEFT JOIN fdc_nutrient_definition d ON d.nutrient_id=n.nutrient_id WHERE d.nutrient_id IS NULL"),
            "nonpositive_portion_gram_weights": _scalar(conn, "SELECT count(*) FROM fdc_food_portion WHERE gram_weight IS NOT NULL AND gram_weight <= 0"),
            "orphan_portions": _scalar(conn, "SELECT count(*) FROM fdc_food_portion p LEFT JOIN fdc_food f ON f.fdc_id=p.fdc_id WHERE f.fdc_id IS NULL"),
            "orphan_branded_metadata": _scalar(conn, "SELECT count(*) FROM fdc_branded_metadata b LEFT JOIN fdc_food f ON f.fdc_id=b.fdc_id WHERE f.fdc_id IS NULL"),
            "foods_missing_energy": _scalar(conn, "SELECT count(*) FROM fdc_food f WHERE NOT EXISTS (SELECT 1 FROM fdc_food_nutrient n WHERE n.fdc_id=f.fdc_id AND n.nutrient_id IN (1008,2047,2048) AND n.amount IS NOT NULL)"),
            "foods_missing_protein": _scalar(conn, "SELECT count(*) FROM fdc_food f WHERE NOT EXISTS (SELECT 1 FROM fdc_food_nutrient n WHERE n.fdc_id=f.fdc_id AND n.nutrient_id=1003 AND n.amount IS NOT NULL)"),
            "foods_missing_fat": _scalar(conn, "SELECT count(*) FROM fdc_food f WHERE NOT EXISTS (SELECT 1 FROM fdc_food_nutrient n WHERE n.fdc_id=f.fdc_id AND n.nutrient_id=1004 AND n.amount IS NOT NULL)"),
            "foods_missing_carbohydrate": _scalar(conn, "SELECT count(*) FROM fdc_food f WHERE NOT EXISTS (SELECT 1 FROM fdc_food_nutrient n WHERE n.fdc_id=f.fdc_id AND n.nutrient_id=1005 AND n.amount IS NOT NULL)"),
        }
        hard_issue_keys = [
            "blank_food_descriptions", "blank_data_types", "negative_nutrient_amounts",
            "nonfinite_nutrient_amounts", "orphan_food_nutrients", "orphan_nutrient_definitions",
            "nonpositive_portion_gram_weights", "orphan_portions", "orphan_branded_metadata",
        ]
        hard_issues = sum(issues[k] for k in hard_issue_keys)
        by_type = {str(k): int(v) for k, v in conn.execute("SELECT data_type,count(*) FROM fdc_food GROUP BY data_type ORDER BY 2 DESC")}
        return {
            "source": "USDA FoodData Central",
            "food_rows": food_count,
            "nutrient_rows": nutrient_count,
            "portion_rows": portion_count,
            "food_by_type": by_type,
            "issues": issues,
            "hard_issue_count": hard_issues,
            "status": "PASS" if food_count > 0 and hard_issues == 0 else ("BLOCKED_NO_DATA" if food_count == 0 else "FAIL"),
            "policy": "missing nutrient coverage is measured, not converted to zero; energy is not force-recomputed from 4/4/9",
        }
    finally:
        conn.close()


def audit_density_records(db_path: Path) -> dict[str, Any]:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(knowledge_schema_sql())
        rows = conn.execute("SELECT * FROM kb_density_record WHERE active=1").fetchall()
        invalid = 0
        outside_plausibility = 0
        interval_order = 0
        missing_source = 0
        groups: dict[tuple[str, str], list[float]] = {}
        for row in rows:
            c = row["density_central_g_ml"]
            lo = row["density_min_g_ml"]
            hi = row["density_max_g_ml"]
            if not _finite_positive(c):
                invalid += 1
                continue
            c = float(c)
            if c < 0.05 or c > 5.0:
                outside_plausibility += 1
            if lo is not None and (not _finite_positive(lo) or float(lo) > c):
                interval_order += 1
            if hi is not None and (not _finite_positive(hi) or float(hi) < c):
                interval_order += 1
            if not str(row["source_reference"] or "").strip():
                missing_source += 1
            key = (str(row["normalized_food_name"] or ""), str(row["preparation"] or "").lower())
            groups.setdefault(key, []).append(c)
        conflicting_groups = 0
        for values in groups.values():
            if len(values) < 2:
                continue
            lo, hi = min(values), max(values)
            if lo > 0 and (hi - lo) / lo > 0.25:
                conflicting_groups += 1
        hard = invalid + interval_order
        by_source = {str(k): int(v) for k, v in conn.execute("SELECT source_id,count(*) FROM kb_density_record WHERE active=1 GROUP BY source_id ORDER BY 2 DESC")}
        production_safe = int(conn.execute("SELECT count(*) FROM kb_density_record d JOIN kb_source s ON s.source_id=d.source_id WHERE d.active=1 AND s.commercial_use IN ('allowed','allowed_with_attribution') AND s.status IN ('approved','approved_for_benchmark')").fetchone()[0])
        return {
            "source": "versioned density evidence",
            "record_count": len(rows),
            "records_by_source": by_source,
            "production_rights_cleared_records": production_safe,
            "invalid_or_nonpositive": invalid,
            "outside_broad_plausibility_0_05_to_5_g_ml": outside_plausibility,
            "invalid_interval_order": interval_order,
            "missing_source_reference": missing_source,
            "conflicting_food_preparation_groups_gt_25pct": conflicting_groups,
            "hard_issue_count": hard,
            "status": "PASS" if rows and hard == 0 else ("BLOCKED_NO_DATA" if not rows else "FAIL"),
            "policy": "conflicts are retained as evidence/ranges; no universal 1.0 g/mL authority",
        }
    finally:
        conn.close()


def _nutrition5k_split_sets(root: Path) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {"train": set(), "test": set(), "validation": set()}
    for path in Path(root).rglob("*.txt"):
        name = path.name.lower()
        split = "train" if "train" in name else "test" if "test" in name else "validation" if "val" in name else None
        if not split:
            continue
        for line in path.read_text(errors="replace").splitlines():
            token = line.strip().split()[0] if line.strip() else ""
            if token.startswith("dish_"):
                out[split].add(token)
    return out


def audit_nutrition5k_files(root: Path) -> dict[str, Any]:
    root = Path(root)
    dish_files = [p for p in root.rglob("dish_metadata_cafe*.csv")]
    if not dish_files:
        return {"source": "Nutrition5k", "status": "BLOCKED_NO_DATA", "dish_rows": 0, "reason": "metadata files not present"}
    dish_ids: set[str] = set()
    duplicate_ids = malformed = blank_names = negative_values = ingredient_count_mismatch = 0
    mass_sum_mismatch = calorie_sum_mismatch = macro_sum_mismatch = 0
    plate_only = 0
    total_ingredients = 0
    for path in sorted(dish_files):
        for _rownum, record, error, _raw in _dish_rows(path):
            if error or record is None:
                malformed += 1
                continue
            dish_id = record["dish_id"]
            if dish_id in dish_ids:
                duplicate_ids += 1
            dish_ids.add(dish_id)
            ingredients = record["ingredients"]
            total_ingredients += len(ingredients)
            if len(ingredients) != int(record["num_ingrs"]):
                ingredient_count_mismatch += 1
            if int(record["num_ingrs"]) == 0 or (record["total_mass"] in (0, 0.0) and record["total_calories"] in (0, 0.0)):
                plate_only += 1
            if any(not str(i.get("ingredient_name") or "").strip() for i in ingredients):
                blank_names += 1
            numeric = [record.get(k) for k in ("total_calories", "total_mass", "total_fat", "total_carb", "total_protein")]
            for ingr in ingredients:
                numeric += [ingr.get(k) for k in ("grams", "calories", "fat", "carb", "protein")]
            if any(v is not None and (not math.isfinite(float(v)) or float(v) < 0) for v in numeric):
                negative_values += 1
            def _sum(key: str) -> float:
                return sum(float(i[key]) for i in ingredients if i.get(key) is not None)
            if record["total_mass"] is not None:
                truth = float(record["total_mass"]); observed = _sum("grams")
                if abs(observed-truth) > max(2.0, 0.02*max(truth, 1.0)):
                    mass_sum_mismatch += 1
            if record["total_calories"] is not None:
                truth = float(record["total_calories"]); observed = _sum("calories")
                if abs(observed-truth) > max(2.0, 0.01*max(truth, 1.0)):
                    calorie_sum_mismatch += 1
            for total_key, ingr_key in (("total_fat","fat"),("total_carb","carb"),("total_protein","protein")):
                if record[total_key] is not None:
                    truth = float(record[total_key]); observed = _sum(ingr_key)
                    if abs(observed-truth) > max(0.5, 0.02*max(truth, 1.0)):
                        macro_sum_mismatch += 1
                        break
    splits = _nutrition5k_split_sets(root)
    split_overlap = len((splits["train"] & splits["test"]) | (splits["train"] & splits["validation"]) | (splits["test"] & splits["validation"]))
    hard = malformed + duplicate_ids + ingredient_count_mismatch + negative_values + split_overlap
    return {
        "source": "Nutrition5k",
        "dish_rows": len(dish_ids),
        "ingredient_rows": total_ingredients,
        "malformed_rows": malformed,
        "duplicate_dish_ids": duplicate_ids,
        "blank_ingredient_name_dishes": blank_names,
        "negative_or_nonfinite_dishes": negative_values,
        "ingredient_count_mismatch_dishes": ingredient_count_mismatch,
        "ingredient_mass_sum_mismatch_dishes": mass_sum_mismatch,
        "ingredient_calorie_sum_mismatch_dishes": calorie_sum_mismatch,
        "ingredient_macro_sum_mismatch_dishes": macro_sum_mismatch,
        "plate_only_or_zero_dishes": plate_only,
        "split_counts": {k: len(v) for k, v in splits.items()},
        "split_overlap_dishes": split_overlap,
        "hard_issue_count": hard,
        "status": "PASS" if len(dish_ids) > 0 and hard == 0 else "FAIL",
        "policy": "known corpus anomalies are reported/quarantined; benchmark truth is never silently repaired",
    }


def audit_source_ledger(ledger_path: Path) -> dict[str, Any]:
    payload = json.loads(Path(ledger_path).read_text(encoding="utf-8"))
    required = {"source_id", "role", "publisher", "version_or_status", "landing_page", "validation_status", "commercial_use_status"}
    malformed = []
    blocked_authority = []
    for src in payload.get("sources", []):
        missing = sorted(k for k in required if not str(src.get(k, "")).strip())
        if missing:
            malformed.append({"source_id": src.get("source_id"), "missing": missing})
        if src.get("authoritative_runtime") and src.get("commercial_use_status") not in {"CLEARED", "API_SERVICE_TERMS"}:
            blocked_authority.append(src.get("source_id"))
    return {
        "ledger_version": payload.get("ledger_version"),
        "verified_at": payload.get("verified_at"),
        "source_count": len(payload.get("sources", [])),
        "malformed_sources": malformed,
        "runtime_authority_with_unresolved_rights": blocked_authority,
        "status": "PASS" if not malformed and not blocked_authority else "FAIL",
    }


def audit_all(db_path: Path, *, nutrition5k_root: Path | None = None, ledger_path: Path | None = None) -> dict[str, Any]:
    reports: dict[str, Any] = {
        "usda": audit_usda_catalogue(db_path),
        "density": audit_density_records(db_path),
    }
    if nutrition5k_root is not None:
        reports["nutrition5k"] = audit_nutrition5k_files(nutrition5k_root)
    if ledger_path is not None:
        reports["source_ledger"] = audit_source_ledger(ledger_path)
    statuses = [r.get("status") for r in reports.values()]
    return {
        "format": "movefuel-comprehensive-data-audit-v1",
        "reports": reports,
        "status": "PASS" if statuses and all(s == "PASS" for s in statuses) else "PARTIAL_OR_BLOCKED" if any(str(s).startswith("BLOCKED") for s in statuses) else "FAIL",
    }
