# MoveFuel Database Workspace

- `azure-sql/001_movefuel_core_81.sql`: canonical online Azure SQL baseline, exactly 81 tables.
- `sqlite/001_movefuel_phone_offline_32.sql`: phone offline/cache/outbox target, 32 tables.
- `sqlite/002_movefuel_wear_offline_4.sql`: Wear OS durability target, 4 tables.
- `architecture/`: manifests, relationship CSV, ERD, full-product expansion map.
- `training/`: 141-table training evidence/platform inventory and connection map.

Rules: server SQL is canonical; SQLite is local/cache/pending execution state; UNKNOWN != 0; planned != actual; AI evidence is not canonical until domain validation/confirmation.
