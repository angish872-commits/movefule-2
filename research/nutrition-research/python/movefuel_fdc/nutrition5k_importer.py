"""Nutrition5k metadata importer for mass/calorie benchmark ground truth."""

from __future__ import annotations

import csv
import json
import re
import sqlite3
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from .importer import normalize_name
from .knowledge_schema import knowledge_schema_sql


@dataclass(frozen=True)
class Nutrition5kImportResult:
    run_id: str
    dishes: int
    ingredients: int
    rejected: int
    split_rows: int


def _float(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _int(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def _find(root: Path, filename: str) -> Path | None:
    hits = list(root.rglob(filename))
    return hits[0] if hits else None


def _load_splits(root: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in root.rglob("*.txt"):
        name = path.name.lower()
        split = "train" if "train" in name else "test" if "test" in name else "validation" if "val" in name else None
        if not split:
            continue
        for line in path.read_text(errors="replace").splitlines():
            dish_id = line.strip().split()[0] if line.strip() else ""
            if dish_id.startswith("dish_"):
                result[dish_id] = split
    return result


def _import_ingredient_catalog(conn: sqlite3.Connection, path: Path, source_id: str) -> int:
    imported = 0
    with path.open(newline="", encoding="utf-8-sig", errors="replace") as handle:
        reader = csv.reader(handle)
        for row in reader:
            if not row or row[0].lower().startswith("ingredient") or row[0].lower() in {"id", "ingredient_id"}:
                continue
            if len(row) < 2:
                continue
            ingredient_id = row[0].strip()
            name = row[1].strip()
            if not ingredient_id or not name:
                continue
            numeric = [_float(value.strip()) for value in row[2:6]]
            # Nutrition5k documentation specifies per-gram nutritional values;
            # preserve column positions and raw row for audit rather than
            # inventing missing fields.
            cal, fat, carb, protein = (numeric + [None, None, None, None])[:4]
            conn.execute(
                """
                INSERT OR REPLACE INTO kb_nutrition5k_ingredient_catalog(
                  ingredient_id,ingredient_name,normalized_name,calories_per_g,fat_g_per_g,
                  carb_g_per_g,protein_g_per_g,source_id,raw_json
                ) VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    ingredient_id,
                    name,
                    normalize_name(name),
                    cal,
                    fat,
                    carb,
                    protein,
                    source_id,
                    json.dumps(row, ensure_ascii=False),
                ),
            )
            imported += 1
    return imported


def _dish_rows(path: Path):
    """Yield Nutrition5k dish records from variable-width CSV rows.

    Official format: first 7 fields are dish totals, then ingredient groups of
    7 fields: id, name, grams, calories, fat, carb, protein.
    """
    with path.open(newline="", encoding="utf-8-sig", errors="replace") as handle:
        reader = csv.reader(handle)
        for row_number, row in enumerate(reader, start=1):
            if not row or not row[0].strip().startswith("dish_"):
                continue
            if len(row) < 7:
                yield row_number, None, "too_few_columns", row
                continue
            num_ingrs = _int(row[6])
            if num_ingrs is None or num_ingrs < 0:
                yield row_number, None, "invalid_ingredient_count", row
                continue
            ingredients = []
            base = 7
            for idx in range(num_ingrs):
                start = base + idx * 7
                group = row[start:start + 7]
                if len(group) < 7:
                    break
                ingredients.append({
                    "ingredient_id": group[0].strip() or None,
                    "ingredient_name": group[1].strip(),
                    "grams": _float(group[2]),
                    "calories": _float(group[3]),
                    "fat": _float(group[4]),
                    "carb": _float(group[5]),
                    "protein": _float(group[6]),
                })
            record = {
                "dish_id": row[0].strip(),
                "total_calories": _float(row[1]),
                "total_mass": _float(row[2]),
                "total_fat": _float(row[3]),
                "total_carb": _float(row[4]),
                "total_protein": _float(row[5]),
                "num_ingrs": num_ingrs,
                "ingredients": ingredients,
            }
            yield row_number, record, None, row


def import_nutrition5k_metadata(root: Path, db_path: Path, *, source_id: str = "nutrition5k") -> Nutrition5kImportResult:
    root = Path(root)
    if not root.exists():
        raise FileNotFoundError(root)
    dish_files = [p for name in ("dish_metadata_cafe1.csv", "dish_metadata_cafe2.csv") if (p := _find(root, name))]
    ingredient_file = _find(root, "ingredient_metadata.csv")
    if not dish_files or ingredient_file is None:
        raise FileNotFoundError("Nutrition5k metadata files not found under root")
    splits = _load_splits(root)

    run_id = f"nutrition5k-{uuid.uuid4().hex}"
    now = int(time.time())
    dishes = ingredient_rows = rejected = 0
    conn = sqlite3.connect(str(db_path))
    try:
        conn.executescript(knowledge_schema_sql())
        conn.execute(
            "INSERT INTO kb_ingestion_run(run_id,source_id,artifact_id,importer_version,started_at_epoch,status) VALUES(?,?,?,?,?,?)",
            (run_id, source_id, "nutrition5k_metadata", "nutrition5k-importer-v1", now, "RUNNING"),
        )
        ingredient_rows = _import_ingredient_catalog(conn, ingredient_file, source_id)
        for path in dish_files:
            for row_number, record, error, raw in _dish_rows(path):
                if error or record is None:
                    rejected += 1
                    conn.execute(
                        "INSERT INTO kb_quarantine(run_id,source_id,row_number,reason_code,reason_detail,raw_json,created_at_epoch) VALUES(?,?,?,?,?,?,?)",
                        (run_id, source_id, row_number, "INVALID_NUTRITION5K_DISH", error, json.dumps(raw), now),
                    )
                    continue
                conn.execute(
                    """
                    INSERT OR REPLACE INTO kb_benchmark_dish(
                      dish_id,source_id,split,total_calories_kcal,total_mass_g,total_fat_g,total_carb_g,
                      total_protein_g,ingredient_count,source_file,imported_at_epoch
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        record["dish_id"], source_id, splits.get(record["dish_id"]), record["total_calories"],
                        record["total_mass"], record["total_fat"], record["total_carb"], record["total_protein"],
                        record["num_ingrs"], path.name, now,
                    ),
                )
                conn.execute("DELETE FROM kb_benchmark_ingredient WHERE dish_id=?", (record["dish_id"],))
                for ordinal, ingredient in enumerate(record["ingredients"], start=1):
                    conn.execute(
                        """
                        INSERT INTO kb_benchmark_ingredient(
                          dish_id,ingredient_ordinal,ingredient_id,ingredient_name,grams,calories_kcal,
                          fat_g,carb_g,protein_g,source_id
                        ) VALUES(?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            record["dish_id"], ordinal, ingredient["ingredient_id"], ingredient["ingredient_name"],
                            ingredient["grams"], ingredient["calories"], ingredient["fat"], ingredient["carb"],
                            ingredient["protein"], source_id,
                        ),
                    )
                dishes += 1
        conn.execute(
            "UPDATE kb_ingestion_run SET finished_at_epoch=?,status=?,rows_seen=?,rows_imported=?,rows_rejected=? WHERE run_id=?",
            (int(time.time()), "COMPLETED", dishes + rejected, dishes, rejected, run_id),
        )
        conn.commit()
    except Exception as exc:
        conn.execute(
            "UPDATE kb_ingestion_run SET finished_at_epoch=?,status=?,message=? WHERE run_id=?",
            (int(time.time()), "FAILED", str(exc), run_id),
        )
        conn.commit()
        raise
    finally:
        conn.close()
    return Nutrition5kImportResult(run_id, dishes, ingredient_rows, rejected, len(splits))
