"""Step-1 knowledge-base bootstrap, validation, lookup and reporting."""

from __future__ import annotations

import json
import sqlite3
import time
from dataclasses import asdict
from pathlib import Path

from .knowledge_schema import knowledge_schema_sql
from .source_registry import ARTIFACTS, SOURCES, NEPAL_1994, NEPAL_2012, NEPAL_2017
from .importer import normalize_name


REGIONAL_REFERENCES = (
    ("nepal-2017", NEPAL_2017, 2017),
    ("nepal-2012", NEPAL_2012, 2012),
    ("nepal-1994", NEPAL_1994, 1994),
)


def initialize_knowledge_base(db_path: Path) -> None:
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    try:
        conn.executescript(knowledge_schema_sql())
        for source in SOURCES:
            conn.execute(
                """
                INSERT OR REPLACE INTO kb_source(
                  source_id,title,publisher,role,authority_tier,region,landing_page,licence,licence_url,
                  commercial_use,attribution,status,notes
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    source.source_id, source.title, source.publisher, source.role, source.authority_tier,
                    source.region, source.landing_page, source.licence, source.licence_url,
                    source.commercial_use, source.attribution, source.status, source.notes,
                ),
            )
        for artifact in ARTIFACTS:
            conn.execute(
                """
                INSERT INTO kb_artifact(
                  artifact_id,source_id,version,kind,url,filename,approx_bytes,transport,import_mode,
                  required_for_step1,notes
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(artifact_id) DO UPDATE SET
                  source_id=excluded.source_id,version=excluded.version,kind=excluded.kind,url=excluded.url,
                  filename=excluded.filename,approx_bytes=excluded.approx_bytes,transport=excluded.transport,
                  import_mode=excluded.import_mode,required_for_step1=excluded.required_for_step1,notes=excluded.notes
                """,
                (
                    artifact.artifact_id, artifact.source_id, artifact.version, artifact.kind, artifact.url,
                    artifact.filename, artifact.approx_bytes, artifact.transport, artifact.import_mode,
                    int(artifact.required_for_step1), artifact.notes,
                ),
            )
        for reference_id, source, year in REGIONAL_REFERENCES:
            conn.execute(
                """
                INSERT OR REPLACE INTO kb_regional_reference(
                  reference_id,source_id,title,region,year,landing_page,authority_status,rights_status,
                  machine_imported,review_notes
                ) VALUES(?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    reference_id, source.source_id, source.title, source.region, year, source.landing_page,
                    "REFERENCE_ONLY", source.commercial_use, 0, source.notes,
                ),
            )
        conn.execute(
            "INSERT OR REPLACE INTO kb_build_state(key,value,updated_at_epoch) VALUES(?,?,?)",
            ("schema_version", "step1-v1", int(time.time())),
        )
        conn.commit()
    finally:
        conn.close()


def record_acquired_artifact(db_path: Path, record: dict) -> None:
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            UPDATE kb_artifact SET local_path=?,actual_bytes=?,sha256=?,etag=?,last_modified=?,
              acquired_at_epoch=?,acquisition_status='ACQUIRED'
            WHERE artifact_id=?
            """,
            (
                record.get("local_path"), record.get("bytes"), record.get("sha256"), record.get("etag"),
                record.get("last_modified"), record.get("acquired_at_epoch"), record["artifact_id"],
            ),
        )
        conn.commit()
    finally:
        conn.close()


def search_density(db_path: Path, food_name: str, preparation: str | None = None, limit: int = 10) -> list[dict]:
    query = normalize_name(food_name)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT density_id,food_name,normalized_food_name,preparation,density_central_g_ml,
                   density_min_g_ml,density_max_g_ml,region,evidence_quality,source_reference,source_version
            FROM kb_density_record
            WHERE active=1 AND (normalized_food_name=? OR normalized_food_name LIKE ? OR ? LIKE '%' || normalized_food_name || '%')
            ORDER BY CASE WHEN normalized_food_name=? THEN 0 ELSE 1 END,
                     CASE WHEN ? IS NOT NULL AND lower(coalesce(preparation,'')) LIKE '%' || lower(?) || '%' THEN 0 ELSE 1 END,
                     density_id
            LIMIT ?
            """,
            (query, f"%{query}%", query, query, preparation, preparation, max(1, min(100, limit))),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def validate_step1(db_path: Path) -> dict:
    initialize_knowledge_base(db_path)
    conn = sqlite3.connect(str(db_path))
    try:
        scalar = lambda sql: conn.execute(sql).fetchone()[0]
        source_count = int(scalar("SELECT count(*) FROM kb_source"))
        required_artifacts = int(scalar("SELECT count(*) FROM kb_artifact WHERE required_for_step1=1"))
        acquired_required = int(scalar("SELECT count(*) FROM kb_artifact WHERE required_for_step1=1 AND acquisition_status='ACQUIRED'"))
        density_count = int(scalar("SELECT count(*) FROM kb_density_record"))
        benchmark_dishes = int(scalar("SELECT count(*) FROM kb_benchmark_dish"))
        benchmark_ingredients = int(scalar("SELECT count(*) FROM kb_benchmark_ingredient"))
        quarantine = int(scalar("SELECT count(*) FROM kb_quarantine"))
        regional_hold = int(scalar("SELECT count(*) FROM kb_regional_reference WHERE rights_status LIKE 'hold%'"))
        fdc_food_count = 0
        try:
            fdc_food_count = int(scalar("SELECT count(*) FROM fdc_food"))
        except sqlite3.OperationalError:
            pass
        return {
            "schema": "step1-v1",
            "source_count": source_count,
            "required_artifacts": required_artifacts,
            "required_artifacts_acquired": acquired_required,
            "usda_food_count": fdc_food_count,
            "density_records": density_count,
            "nutrition5k_dishes": benchmark_dishes,
            "nutrition5k_ingredient_rows": benchmark_ingredients,
            "quarantined_rows": quarantine,
            "regional_references_held_for_rights_review": regional_hold,
            "internet_sync_complete": acquired_required == required_artifacts,
            "knowledge_import_complete": fdc_food_count > 0 and density_count > 0 and benchmark_dishes > 0,
        }
    finally:
        conn.close()


def export_snapshot(db_path: Path, output: Path) -> dict:
    """Export a compact, backend-safe knowledge snapshot.

    It intentionally does not duplicate millions of USDA rows; USDA remains in
    the normalized catalogue/API layer. The snapshot contains source policy,
    density records and benchmark inventory used by the algorithm.
    """
    initialize_knowledge_base(db_path)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        sources = [dict(r) for r in conn.execute("SELECT * FROM kb_source ORDER BY authority_tier,source_id")]
        density = [dict(r) for r in conn.execute(
            "SELECT density_id,source_id,source_version,food_name,normalized_food_name,preparation,physical_form,density_central_g_ml,density_min_g_ml,density_max_g_ml,region,evidence_quality,source_reference FROM kb_density_record WHERE active=1 ORDER BY normalized_food_name,density_id"
        )]
        inventory = validate_step1(db_path)
        payload = {
            "format": "movefuel-food-kb-snapshot-v1",
            "generated_at_epoch": int(time.time()),
            "sources": sources,
            "density_records": density,
            "inventory": inventory,
        }
    finally:
        conn.close()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n")
    return payload
