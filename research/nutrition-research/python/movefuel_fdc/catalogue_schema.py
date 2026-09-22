"""SQLite catalogue schema for MoveFuel nutrition data.

Development uses SQLite with FTS5 for search. A PostgreSQL-compatible
schema is provided separately for production; Appwrite stores only
records actually used by confirmed meals.
"""

from __future__ import annotations

SQL = r"""
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS fdc_release (
    release          TEXT PRIMARY KEY,
    source_url       TEXT NOT NULL,
    file_size_bytes  INTEGER NOT NULL,
    sha256           TEXT NOT NULL,
    downloaded_at_epoch INTEGER NOT NULL,
    imported_at_epoch   INTEGER
);

CREATE TABLE IF NOT EXISTS fdc_import_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    release           TEXT NOT NULL,
    table_name        TEXT NOT NULL,
    rows_seen         INTEGER NOT NULL,
    rows_imported     INTEGER NOT NULL,
    rows_rejected     INTEGER NOT NULL,
    imported_at_epoch INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fdc_import_error (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    release       TEXT NOT NULL,
    table_name    TEXT NOT NULL,
    row_index     INTEGER NOT NULL,
    message       TEXT NOT NULL,
    row_json      TEXT
);

CREATE TABLE IF NOT EXISTS fdc_food (
    fdc_id          INTEGER PRIMARY KEY,
    data_type       TEXT NOT NULL,
    description     TEXT NOT NULL,
    normalized_name TEXT,
    food_category_id TEXT,
    publication_date TEXT,
    release         TEXT NOT NULL,
    checksum        TEXT
);
CREATE INDEX IF NOT EXISTS idx_fdc_food_data_type ON fdc_food(data_type);
CREATE INDEX IF NOT EXISTS idx_fdc_food_category ON fdc_food(food_category_id);
CREATE INDEX IF NOT EXISTS idx_fdc_food_norm ON fdc_food(normalized_name);

CREATE TABLE IF NOT EXISTS fdc_food_alias (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    fdc_id   INTEGER NOT NULL,
    alias    TEXT NOT NULL,
    kind     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fdc_alias ON fdc_food_alias(alias);

CREATE TABLE IF NOT EXISTS fdc_nutrient_definition (
    nutrient_id INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    unit_name   TEXT,
    nutrient_nbr TEXT,
    rank        TEXT
);

CREATE TABLE IF NOT EXISTS fdc_food_nutrient (
    id          INTEGER PRIMARY KEY,
    fdc_id      INTEGER NOT NULL,
    nutrient_id INTEGER NOT NULL,
    amount      REAL,
    min         REAL,
    max         REAL,
    median      REAL,
    derivation_id TEXT,
    data_points  TEXT,
    release     TEXT NOT NULL,
    source_basis TEXT
);
CREATE INDEX IF NOT EXISTS idx_fdc_food_nutrient_food ON fdc_food_nutrient(fdc_id);
CREATE INDEX IF NOT EXISTS idx_fdc_food_nutrient_nut ON fdc_food_nutrient(nutrient_id);

CREATE TABLE IF NOT EXISTS fdc_food_portion (
    id                 INTEGER PRIMARY KEY,
    fdc_id             INTEGER NOT NULL,
    seq_num            TEXT,
    amount             REAL,
    measure_unit_id    TEXT,
    portion_description TEXT,
    modifier           TEXT,
    gram_weight        REAL,
    data_points        TEXT,
    footnote           TEXT
);
CREATE INDEX IF NOT EXISTS idx_fdc_portion_food ON fdc_food_portion(fdc_id);

CREATE TABLE IF NOT EXISTS fdc_measure_unit (
    id           INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    abbreviation TEXT
);
CREATE INDEX IF NOT EXISTS idx_fdc_measure_unit_name ON fdc_measure_unit(name);

CREATE TABLE IF NOT EXISTS fdc_branded_metadata (
    fdc_id            INTEGER PRIMARY KEY,
    brand_owner       TEXT,
    brand_name        TEXT,
    gtin_upc          TEXT,
    ingredients       TEXT,
    serving_size      REAL,
    serving_size_unit TEXT,
    household_serving_fulltext TEXT,
    modified_date     TEXT
);
CREATE INDEX IF NOT EXISTS idx_fdc_branded_gtin ON fdc_branded_metadata(gtin_upc);

CREATE TABLE IF NOT EXISTS fdc_source_metadata (
    fdc_id          INTEGER PRIMARY KEY,
    data_type       TEXT NOT NULL,
    source_name     TEXT,
    source_detail   TEXT
);

CREATE TABLE IF NOT EXISTS fdc_food_category (
    id          INTEGER PRIMARY KEY,
    code        TEXT,
    description TEXT
);

-- FTS5 search index over food descriptions and aliases.
CREATE VIRTUAL TABLE IF NOT EXISTS fdc_food_fts USING fts5(
    fdc_id UNINDEXED,
    description,
    normalized_name,
    alias
);
"""


def schema_sql() -> str:
    return SQL
