"""Additive multi-source knowledge-base schema for Step 1.

This schema lives next to the FDC catalogue in the same SQLite database.
It stores provenance, density, benchmark metadata and regional-reference
metadata without duplicating the entire USDA food catalogue.
"""

from __future__ import annotations

SQL = r"""
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS kb_source (
    source_id       TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    publisher       TEXT NOT NULL,
    role            TEXT NOT NULL,
    authority_tier  INTEGER NOT NULL,
    region          TEXT NOT NULL,
    landing_page    TEXT NOT NULL,
    licence         TEXT NOT NULL,
    licence_url     TEXT NOT NULL,
    commercial_use  TEXT NOT NULL,
    attribution     TEXT NOT NULL,
    status          TEXT NOT NULL,
    notes           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kb_artifact (
    artifact_id         TEXT PRIMARY KEY,
    source_id           TEXT NOT NULL,
    version             TEXT NOT NULL,
    kind                TEXT NOT NULL,
    url                 TEXT NOT NULL,
    filename            TEXT NOT NULL,
    approx_bytes        INTEGER,
    transport           TEXT NOT NULL,
    import_mode         TEXT NOT NULL,
    required_for_step1  INTEGER NOT NULL DEFAULT 0,
    local_path          TEXT,
    actual_bytes        INTEGER,
    sha256              TEXT,
    etag                TEXT,
    last_modified       TEXT,
    acquired_at_epoch   INTEGER,
    acquisition_status  TEXT NOT NULL DEFAULT 'REGISTERED',
    notes               TEXT NOT NULL,
    FOREIGN KEY(source_id) REFERENCES kb_source(source_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_artifact_source ON kb_artifact(source_id);
CREATE INDEX IF NOT EXISTS idx_kb_artifact_status ON kb_artifact(acquisition_status);

CREATE TABLE IF NOT EXISTS kb_ingestion_run (
    run_id              TEXT PRIMARY KEY,
    source_id           TEXT NOT NULL,
    artifact_id         TEXT,
    importer_version    TEXT NOT NULL,
    started_at_epoch    INTEGER NOT NULL,
    finished_at_epoch   INTEGER,
    status              TEXT NOT NULL,
    rows_seen           INTEGER NOT NULL DEFAULT 0,
    rows_imported       INTEGER NOT NULL DEFAULT 0,
    rows_rejected       INTEGER NOT NULL DEFAULT 0,
    source_sha256       TEXT,
    message             TEXT,
    FOREIGN KEY(source_id) REFERENCES kb_source(source_id),
    FOREIGN KEY(artifact_id) REFERENCES kb_artifact(artifact_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_ingestion_source ON kb_ingestion_run(source_id, started_at_epoch);

CREATE TABLE IF NOT EXISTS kb_quarantine (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id              TEXT NOT NULL,
    source_id           TEXT NOT NULL,
    row_number          INTEGER,
    reason_code         TEXT NOT NULL,
    reason_detail       TEXT,
    raw_json            TEXT,
    created_at_epoch    INTEGER NOT NULL,
    FOREIGN KEY(run_id) REFERENCES kb_ingestion_run(run_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_quarantine_run ON kb_quarantine(run_id);

CREATE TABLE IF NOT EXISTS kb_density_record (
    density_id              TEXT PRIMARY KEY,
    source_id               TEXT NOT NULL,
    source_version          TEXT NOT NULL,
    source_row_id           TEXT NOT NULL,
    food_name               TEXT NOT NULL,
    normalized_food_name    TEXT NOT NULL,
    preparation             TEXT,
    physical_form           TEXT,
    density_central_g_ml    REAL NOT NULL,
    density_min_g_ml        REAL,
    density_max_g_ml        REAL,
    region                  TEXT,
    evidence_quality        TEXT NOT NULL,
    source_reference        TEXT,
    source_notes            TEXT,
    raw_json                TEXT NOT NULL,
    active                  INTEGER NOT NULL DEFAULT 1,
    imported_at_epoch       INTEGER NOT NULL,
    UNIQUE(source_id, source_version, source_row_id),
    FOREIGN KEY(source_id) REFERENCES kb_source(source_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_density_norm ON kb_density_record(normalized_food_name);
CREATE INDEX IF NOT EXISTS idx_kb_density_food_prep ON kb_density_record(normalized_food_name, preparation);

CREATE TABLE IF NOT EXISTS kb_food_alias (
    alias_id             INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_key        TEXT NOT NULL,
    alias                TEXT NOT NULL,
    normalized_alias     TEXT NOT NULL,
    language             TEXT,
    region               TEXT,
    source_id            TEXT NOT NULL,
    confidence           REAL NOT NULL DEFAULT 1.0,
    reviewed             INTEGER NOT NULL DEFAULT 0,
    UNIQUE(canonical_key, normalized_alias, source_id),
    FOREIGN KEY(source_id) REFERENCES kb_source(source_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_alias_lookup ON kb_food_alias(normalized_alias);

CREATE TABLE IF NOT EXISTS kb_regional_reference (
    reference_id         TEXT PRIMARY KEY,
    source_id            TEXT NOT NULL,
    title                TEXT NOT NULL,
    region               TEXT NOT NULL,
    year                 INTEGER,
    landing_page         TEXT NOT NULL,
    authority_status     TEXT NOT NULL,
    rights_status        TEXT NOT NULL,
    machine_imported     INTEGER NOT NULL DEFAULT 0,
    review_notes         TEXT NOT NULL,
    FOREIGN KEY(source_id) REFERENCES kb_source(source_id)
);

CREATE TABLE IF NOT EXISTS kb_benchmark_dish (
    dish_id              TEXT PRIMARY KEY,
    source_id            TEXT NOT NULL,
    split                 TEXT,
    total_calories_kcal  REAL,
    total_mass_g          REAL,
    total_fat_g           REAL,
    total_carb_g          REAL,
    total_protein_g       REAL,
    ingredient_count      INTEGER,
    source_file           TEXT NOT NULL,
    imported_at_epoch     INTEGER NOT NULL,
    FOREIGN KEY(source_id) REFERENCES kb_source(source_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_benchmark_split ON kb_benchmark_dish(split);

CREATE TABLE IF NOT EXISTS kb_benchmark_ingredient (
    dish_id              TEXT NOT NULL,
    ingredient_ordinal   INTEGER NOT NULL,
    ingredient_id        TEXT,
    ingredient_name      TEXT NOT NULL,
    grams                REAL,
    calories_kcal        REAL,
    fat_g                REAL,
    carb_g               REAL,
    protein_g            REAL,
    source_id            TEXT NOT NULL,
    PRIMARY KEY(dish_id, ingredient_ordinal),
    FOREIGN KEY(dish_id) REFERENCES kb_benchmark_dish(dish_id),
    FOREIGN KEY(source_id) REFERENCES kb_source(source_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_benchmark_ingr_name ON kb_benchmark_ingredient(ingredient_name);

CREATE TABLE IF NOT EXISTS kb_nutrition5k_ingredient_catalog (
    ingredient_id       TEXT PRIMARY KEY,
    ingredient_name     TEXT NOT NULL,
    normalized_name     TEXT NOT NULL,
    calories_per_g      REAL,
    fat_g_per_g         REAL,
    carb_g_per_g        REAL,
    protein_g_per_g     REAL,
    source_id           TEXT NOT NULL,
    raw_json            TEXT NOT NULL,
    FOREIGN KEY(source_id) REFERENCES kb_source(source_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_n5k_ingr_norm ON kb_nutrition5k_ingredient_catalog(normalized_name);

CREATE TABLE IF NOT EXISTS kb_build_state (
    key                 TEXT PRIMARY KEY,
    value               TEXT NOT NULL,
    updated_at_epoch    INTEGER NOT NULL
);
"""


def knowledge_schema_sql() -> str:
    return SQL
