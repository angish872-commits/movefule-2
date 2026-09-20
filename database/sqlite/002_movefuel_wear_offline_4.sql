-- MoveFuel Wear OS Room/SQLite blueprint
PRAGMA foreign_keys=ON;
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS wear_downloaded_workout (
 local_execution_id TEXT PRIMARY KEY,
 account_key TEXT NOT NULL,
 plan_id TEXT NOT NULL,
 source_projection_revision INTEGER NOT NULL,
 projection_json TEXT NOT NULL,
 approved_substitutions_json TEXT NOT NULL,
 state TEXT NOT NULL,
 next_client_sequence INTEGER NOT NULL,
 rest_ends_at INTEGER,
 canonical_session_id TEXT,
 canonical_revision INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wear_workout_operation (
 operation_id TEXT PRIMARY KEY,
 local_execution_id TEXT NOT NULL,
 client_sequence INTEGER NOT NULL,
 event_type TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 expected_canonical_revision INTEGER,
 sync_state TEXT NOT NULL,
 canonical_revision INTEGER,
 canonical_event_id TEXT,
 occurred_at INTEGER NOT NULL,
 acknowledged_at INTEGER,
 UNIQUE(local_execution_id,client_sequence),
 UNIQUE(local_execution_id,idempotency_key),
 FOREIGN KEY(local_execution_id) REFERENCES wear_downloaded_workout(local_execution_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wear_readiness_cache (
 account_key TEXT PRIMARY KEY,
 source_revision TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 freshness TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wear_progress_glance_cache (
 account_key TEXT NOT NULL,
 metric_key TEXT NOT NULL,
 source_revision TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(account_key,metric_key)
);

CREATE INDEX IF NOT EXISTS ix_wear_operation_sync ON wear_workout_operation(sync_state,occurred_at);
