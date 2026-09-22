"""FAO/INFOODS density importer with provenance-preserving heuristics.

The official spreadsheet has changed formatting over time. Instead of
hard-coding one column position, the importer detects a header row and maps
recognized column labels. Unmappable or unsafe rows are quarantined.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import sqlite3
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from openpyxl import load_workbook

from .knowledge_schema import knowledge_schema_sql
from .importer import normalize_name


@dataclass(frozen=True)
class DensityImportResult:
    run_id: str
    rows_seen: int
    rows_imported: int
    rows_rejected: int
    sheet: str


HEADER_ALIASES = {
    "food_name": ("food name", "food", "name of food", "food description", "food item"),
    "density": ("density", "density g/ml", "density (g/ml)", "density g per ml", "g/ml", "g per ml"),
    "preparation": ("preparation", "state", "processing", "cooking method", "food state"),
    "reference": ("reference", "source", "bibliographic reference", "references"),
    "notes": ("notes", "remarks", "comment", "comments"),
    "region": ("country", "region", "country/region"),
}


def _clean_header(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _header_map(row: Iterable[object]) -> dict[str, int]:
    values = [_clean_header(value) for value in row]
    mapping: dict[str, int] = {}
    for canonical, aliases in HEADER_ALIASES.items():
        for index, value in enumerate(values):
            if value in aliases or any(alias in value for alias in aliases if len(alias) >= 6):
                mapping.setdefault(canonical, index)
                break
    return mapping


def _find_header(ws) -> tuple[int, dict[str, int]]:
    for row_index, row in enumerate(ws.iter_rows(min_row=1, max_row=min(ws.max_row, 80), values_only=True), start=1):
        mapping = _header_map(row)
        if "food_name" in mapping and "density" in mapping:
            return row_index, mapping
    raise ValueError(f"no recognizable food+density header found in sheet {ws.title}")


def _parse_density(value: object) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        numeric = float(value)
    else:
        text = str(value).strip().replace(",", ".")
        # Prefer a single explicit numeric value. If the source cell contains
        # a range, the first number is central only when no better structure is
        # available; the raw cell is still preserved for audit.
        match = re.search(r"(?<!\d)(\d+(?:\.\d+)?)", text)
        if not match:
            return None
        numeric = float(match.group(1))
    if not math.isfinite(numeric) or numeric <= 0 or numeric > 5.0:
        return None
    return numeric


def _density_id(source_version: str, source_row_id: str, food_name: str, density: float) -> str:
    digest = hashlib.sha256(f"{source_version}|{source_row_id}|{food_name}|{density:.8f}".encode()).hexdigest()[:24]
    return f"fao-density-{digest}"


def import_density_xlsx(
    xlsx_path: Path,
    db_path: Path,
    *,
    source_version: str = "2.0-2012",
    source_id: str = "fao_infoods_density_v2",
) -> DensityImportResult:
    xlsx_path = Path(xlsx_path)
    if not xlsx_path.exists():
        raise FileNotFoundError(xlsx_path)
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    workbook = load_workbook(xlsx_path, read_only=True, data_only=True)
    selected = None
    header_row = None
    mapping = None
    for ws in workbook.worksheets:
        try:
            candidate_header, candidate_map = _find_header(ws)
        except ValueError:
            continue
        selected = ws
        header_row = candidate_header
        mapping = candidate_map
        break
    if selected is None or header_row is None or mapping is None:
        workbook.close()
        raise ValueError("no sheet contains a recognizable food/density table")

    run_id = f"density-{uuid.uuid4().hex}"
    now = int(time.time())
    seen = imported = rejected = 0
    conn = sqlite3.connect(str(db_path))
    try:
        conn.executescript(knowledge_schema_sql())
        conn.execute(
            "INSERT INTO kb_ingestion_run(run_id,source_id,artifact_id,importer_version,started_at_epoch,status) VALUES(?,?,?,?,?,?)",
            (run_id, source_id, "fao_density_v2_xlsx", "density-importer-v1", now, "RUNNING"),
        )
        for row_index, row in enumerate(
            selected.iter_rows(min_row=header_row + 1, values_only=True), start=header_row + 1
        ):
            if not any(value not in (None, "") for value in row):
                continue
            seen += 1
            def field(name: str) -> object | None:
                idx = mapping.get(name)
                return row[idx] if idx is not None and idx < len(row) else None

            food_name = str(field("food_name") or "").strip()
            density_raw = field("density")
            density = _parse_density(density_raw)
            raw = {f"c{idx+1}": value for idx, value in enumerate(row) if value not in (None, "")}
            if not food_name or density is None:
                rejected += 1
                conn.execute(
                    "INSERT INTO kb_quarantine(run_id,source_id,row_number,reason_code,reason_detail,raw_json,created_at_epoch) VALUES(?,?,?,?,?,?,?)",
                    (
                        run_id,
                        source_id,
                        row_index,
                        "INVALID_DENSITY_ROW",
                        f"food={food_name!r} density={density_raw!r}",
                        json.dumps(raw, ensure_ascii=False, default=str),
                        now,
                    ),
                )
                continue
            source_row_id = f"{selected.title}:{row_index}"
            record_id = _density_id(source_version, source_row_id, food_name, density)
            preparation = str(field("preparation") or "").strip() or None
            region = str(field("region") or "").strip() or None
            source_reference = str(field("reference") or "").strip() or None
            notes = str(field("notes") or "").strip() or None
            conn.execute(
                """
                INSERT OR REPLACE INTO kb_density_record(
                  density_id,source_id,source_version,source_row_id,food_name,normalized_food_name,
                  preparation,physical_form,density_central_g_ml,density_min_g_ml,density_max_g_ml,
                  region,evidence_quality,source_reference,source_notes,raw_json,active,imported_at_epoch
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    record_id,
                    source_id,
                    source_version,
                    source_row_id,
                    food_name,
                    normalize_name(food_name),
                    preparation,
                    None,
                    density,
                    None,
                    None,
                    region,
                    "SOURCE_REPORTED",
                    source_reference,
                    notes,
                    json.dumps(raw, ensure_ascii=False, default=str),
                    1,
                    now,
                ),
            )
            imported += 1
        conn.execute(
            "UPDATE kb_ingestion_run SET finished_at_epoch=?,status=?,rows_seen=?,rows_imported=?,rows_rejected=? WHERE run_id=?",
            (int(time.time()), "COMPLETED", seen, imported, rejected, run_id),
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
        workbook.close()
    return DensityImportResult(run_id, seen, imported, rejected, selected.title)
