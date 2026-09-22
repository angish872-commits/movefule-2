"""Load a USDA FDC bulk bundle into the SQLite catalogue.

Streams each CSV from the zip into its target table, normalizing food
descriptions and indexing aliases for search.
"""

from __future__ import annotations

import re
import sqlite3
import time
from pathlib import Path

from .catalogue_schema import schema_sql
from .csv_importer import ImportRow, ImportSummary, iter_csv_rows, load_table_names

FDC_TABLE_MAP: dict[str, str] = {
    "food": "fdc_food",
    "food_nutrient": "fdc_food_nutrient",
    "nutrient": "fdc_nutrient_definition",
    "food_portion": "fdc_food_portion",
    "measure_unit": "fdc_measure_unit",
    "food_category": "fdc_food_category",
    "branded_food": "fdc_branded_metadata",
    "foundation_food": "fdc_source_metadata",
    "survey_fndds_food": "fdc_source_metadata",
    "sr_legacy_food": "fdc_source_metadata",
    "experimental_food": "fdc_source_metadata",
}

WORD_RE = re.compile(r"[^a-z0-9]+")


def normalize_name(value: str) -> str:
    return WORD_RE.sub(" ", value.strip().lower()).strip()


def _parse_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_int(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def build_catalogue(zip_path: Path, db_path: Path, release: str) -> ImportSummary:
    """Import a bulk bundle into the catalogue database.

    Returns an ImportSummary describing rows imported/rejected per table.
    """
    zip_path = Path(zip_path)
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    names = load_table_names(zip_path, f"FoodData_Central_csv_{release}")
    prefix = f"FoodData_Central_csv_{release}"

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executescript(schema_sql())
        now = int(time.time())
        summary = ImportSummary(release=release)

        for table in names:
            if table not in FDC_TABLE_MAP:
                summary.tables[table] = 0
                continue
            target = FDC_TABLE_MAP[table]
            seen = 0
            imported = 0
            errors = 0
            batch: list[tuple] = []
            columns: list[str] | None = None

            for raw, index in iter_csv_rows(zip_path, prefix, table):
                seen += 1
                try:
                    converted = _convert_row(table, raw, release)
                except (TypeError, ValueError) as exc:
                    summary.errors.append(ImportRow(table=table, row_index=index, error=str(exc), row=dict(raw)))
                    errors += 1
                    continue

                if columns is None:
                    columns = list(converted.keys())
                batch.append(tuple(converted.get(c) for c in columns))
                imported += 1
                if len(batch) >= 5000:
                    _insert_batch(conn, target, columns, batch, table)
                    batch = []

            if batch:
                _insert_batch(conn, target, columns, batch, table)

            summary.tables[table] = imported
            summary.rejected += errors
            conn.execute(
                "INSERT INTO fdc_import_log (release, table_name, rows_seen, rows_imported, rows_rejected, imported_at_epoch) "
                "VALUES (?,?,?,?,?,?)",
                (release, table, seen, imported, errors, now),
            )
            conn.commit()

        return summary
    finally:
        conn.close()


def _insert_batch(conn: sqlite3.Connection, target: str, columns: list[str], batch: list[tuple], table: str) -> None:
    if not columns:
        return
    placeholders = ",".join("?" * len(columns))
    col_sql = ",".join(f'"{c}"' for c in columns)
    sql = f'INSERT INTO "{target}" ({col_sql}) VALUES ({placeholders})'
    try:
        conn.executemany(sql, batch)
    except sqlite3.IntegrityError:
        # Fall back row-by-row, quarantining failures.
        for row in batch:
            try:
                conn.execute(sql, row)
            except sqlite3.IntegrityError:
                conn.execute(
                    "INSERT OR IGNORE INTO fdc_import_error (release, table_name, row_index, message, row_json) "
                    "VALUES (?,?,?,?,?)",
                    ("unknown", table, -1, "integrity", None),
                )


def _convert_row(table: str, raw: dict, release: str) -> dict:
    """Convert a raw CSV row dict into column values for the target table."""
    if table == "food":
        return {
            "fdc_id": int(raw["fdc_id"]),
            "data_type": raw["data_type"],
            "description": raw["description"],
            "normalized_name": normalize_name(raw["description"]),
            "food_category_id": raw.get("food_category_id"),
            "publication_date": raw.get("publication_date"),
            "release": release,
        }
    if table == "food_nutrient":
        return {
            "id": int(raw["id"]),
            "fdc_id": int(raw["fdc_id"]),
            "nutrient_id": int(raw["nutrient_id"]),
            "amount": _parse_float(raw.get("amount")),
            "min": _parse_float(raw.get("min")),
            "max": _parse_float(raw.get("max")),
            "median": _parse_float(raw.get("median")),
            "derivation_id": raw.get("derivation_id"),
            "data_points": raw.get("data_points"),
            "release": release,
            "source_basis": "100g" if raw.get("amount") not in (None, "") else None,
        }
    if table == "nutrient":
        return {
            "nutrient_id": int(raw["id"]),
            "name": raw["name"],
            "unit_name": raw.get("unit_name"),
            "nutrient_nbr": raw.get("nutrient_nbr"),
            "rank": raw.get("rank"),
        }
    if table == "food_portion":
        return {
            "id": int(raw["id"]),
            "fdc_id": int(raw["fdc_id"]),
            "seq_num": raw.get("seq_num"),
            "amount": _parse_float(raw.get("amount")),
            "measure_unit_id": raw.get("measure_unit_id"),
            "portion_description": raw.get("portion_description"),
            "modifier": raw.get("modifier"),
            "gram_weight": _parse_float(raw.get("gram_weight")),
            "data_points": raw.get("data_points"),
            "footnote": raw.get("footnote"),
        }
    if table == "measure_unit":
        return {
            "id": int(raw["id"]),
            "name": raw["name"],
            "abbreviation": raw.get("abbreviation"),
        }
    if table == "food_category":
        return {
            "id": int(raw["id"]),
            "code": raw.get("code"),
            "description": raw.get("description"),
        }
    if table == "branded_food":
        return {
            "fdc_id": int(raw["fdc_id"]),
            "brand_owner": raw.get("brand_owner"),
            "brand_name": raw.get("brand_name"),
            "gtin_upc": raw.get("gtin_upc"),
            "ingredients": raw.get("ingredients"),
            "serving_size": _parse_float(raw.get("serving_size")),
            "serving_size_unit": raw.get("serving_size_unit"),
            "household_serving_fulltext": raw.get("household_serving_fulltext"),
            "modified_date": raw.get("modified_date"),
        }
    if table in ("foundation_food", "survey_fndds_food", "sr_legacy_food", "experimental_food"):
        source_name = {
            "foundation_food": "Foundation Foods",
            "survey_fndds_food": "FNDDS",
            "sr_legacy_food": "SR Legacy",
            "experimental_food": "Experimental Foods",
        }[table]
        return {
            "fdc_id": int(raw["fdc_id"]),
            "data_type": table,
            "source_name": source_name,
            "source_detail": raw.get("footnote", ""),
        }
    return raw
