"""FTS5 search index over the imported catalogue."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from .catalogue_schema import schema_sql


def rebuild_search_index(db_path: Path) -> int:
    """Rebuild fdc_food_fts from fdc_food. Returns number of rows indexed."""
    conn = sqlite3.connect(str(db_path))
    try:
        # Drop any legacy FTS table (e.g. contentless) and recreate.
        conn.execute("DROP TABLE IF EXISTS fdc_food_fts")
        conn.executescript(schema_sql())
        conn.execute(
            """
            INSERT INTO fdc_food_fts(fdc_id, description, normalized_name, alias)
            SELECT fdc_id, description, normalized_name, ''
            FROM fdc_food
            """
        )
        conn.commit()
        row = conn.execute("SELECT count(*) FROM fdc_food_fts").fetchone()
        return int(row[0]) if row else 0
    finally:
        conn.close()


def search(db_path: Path, query: str, limit: int = 20) -> list[dict]:
    """Search the catalogue. Returns list of dicts with fdc_id, description,
    data_type and a ranking snippet."""
    conn = sqlite3.connect(str(db_path))
    try:
        limit = max(1, min(100, limit))
        sql = """
            SELECT f.fdc_id, f.description, f.data_type, f.normalized_name
            FROM fdc_food_fts fts
            JOIN fdc_food f ON f.fdc_id = fts.fdc_id
            WHERE fdc_food_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        """
        rows = conn.execute(sql, (query, limit)).fetchall()
        return [
            {
                "fdc_id": r[0],
                "description": r[1],
                "data_type": r[2],
                "normalized_name": r[3],
            }
            for r in rows
        ]
    finally:
        conn.close()
