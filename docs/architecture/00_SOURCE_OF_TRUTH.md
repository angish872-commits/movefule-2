# MoveFuel-2 — Source of Truth and Bootstrap Inventory

Status: **BOOTSTRAP / ARCHITECTURE RECONCILIATION**

MoveFuel-2 is the clean integration line. Existing MoveFuel assets are inputs, not automatically canonical.

## Verified source snapshot

- Source repository: `angish872-commits/movefule_1`
- Source branch: `ui-test`
- Source commit: `699bf3d6bda7949d3d10bf320fa0ecfbf495016c`
- Source directory: `Mufil-2/`
- Source payload: 503 tree entries / 459 blobs / ~1.39 MiB
- Kotlin source files: 428
- One-screen-per-file domain Compose screens: **400**
- Screen registry rows: **404** = 400 domain screens + 4 master dashboards

### UI surface counts

| Family | Count |
|---|---:|
| Master dashboards | 4 |
| AUTH | 12 |
| ONB | 18 |
| TOD | 12 |
| CAM | 18 |
| BAR | 16 |
| FNO | 18 |
| FPL | 24 |
| FSH | 16 |
| RCP | 36 |
| TRS | 20 |
| TRN | 24 |
| WRK | 32 |
| SOR | 10 |
| RDY | 10 |
| EXR | 16 |
| CAL | 18 |
| PRG | 30 |
| PRO | 18 |
| DEV | 12 |
| BIL | 8 |
| WAR | 12 |
| SYS | 20 |

The four master dashboards remain Today, Fuel, Train and Progress.

## Imported database architecture assets

MoveFuel-2 currently preserves these inherited artifacts exactly as architecture inputs:

- `database/azure-sql/001_movefuel_core_81.sql` — 81-table canonical online relational baseline.
- `database/azure-sql/010_draft_full_product_additions_29.sql` — 29 proposed additions; **draft until authority/deduplication review**.
- `database/azure-sql/020_draft_food_barcode_catalog_15.sql` — 15-table shared food/barcode catalog draft.
- `database/sqlite/001_movefuel_phone_offline_32.sql` — 32-table Android offline blueprint.
- `database/sqlite/002_movefuel_wear_offline_4.sql` — 4-table Wear offline blueprint.
- `database/training/TRAINING_141_CONNECTION_MAP.md` — 141-table Training knowledge/evidence/platform map.
- `database/training/TRAINING_141_TABLE_INDEX.csv`
- `database/architecture/MOVEFUEL_81_TABLE_MANIFEST.csv`
- `database/architecture/MOVEFUEL_81_RELATIONSHIPS.csv`
- `database/architecture/MOVEFUEL_81_ERD.md`
- `database/architecture/FULL_PRODUCT_SCHEMA_EXPANSION.md`

## Imported UI contract assets

- `ui/SCREEN_REGISTRY_404.csv`
- `ui/audit/MOVEFUEL_400_SCREEN_CONTROL_AUDIT.csv`
- `ui/audit/MOVEFUEL_BUTTON_ACTION_CONTRACT.csv`
- `ui/audit/MOVEFUEL_CONTROL_AUDIT_SUMMARY.md`

These registries are the control-plane for UI integration. A screen is not considered implemented merely because it renders.

## Current Notion architecture sources

The bootstrap is reconciled against the current MoveFuel Notion architecture, especially:

1. MoveFuel — Master Builder Plan · Business → Architecture → Build
2. MoveFuel — P0 Foundation Architecture & Dependency Audit
3. MoveFuel — Complete UI/UX Product Map
4. 02 — Data, Permission & Authority Map
5. 07 — MoveFuel 167 Algorithm Engineering Specification
6. MoveFuel_1 — YouTube Recipe Import — Architecture Source of Truth
7. MoveFuel — Feature Connection Graph

## Non-negotiable rules

1. One canonical owner per durable business entity.
2. Knowledge/reference data must not compete with private runtime user state.
3. Raw observations remain distinct from derived results.
4. `UNKNOWN` is never silently converted to zero.
5. Formulas, algorithms and policies are versioned.
6. AI providers may propose evidence/candidates, but do not own final safety, grams, calories, macros or canonical transactions.
7. Wear OS owns offline execution and performed facts, not workout generation/progression.
8. Android Room/SQLite is an offline/pending projection, not independent server authority.
9. The 141-table Training platform is not merged wholesale into private MoveFuel runtime storage.
10. Draft 29-table and 15-table expansions are not production migrations until deduplication and ownership are approved.
11. Every feature must eventually prove: UI → State → Use Case → Algorithm/Policy → API → Canonical Entity → Database → Authorization → Test.
12. Historical decisions must remain reproducible through source revisions and formula/algorithm/policy versions.

## Physical persistence note

The inherited architecture currently contains both Appwrite-oriented production history and an Azure SQL/SQL Server relational design. MoveFuel-2 must separate **logical authority** from **physical database technology**. The authority map is locked first; final production placement is then chosen without creating duplicate owners.

## Next architecture gate

The next gate is the Master Data Authority / Deduplication Registry. Every overlapping table/entity is classified as:

- **KEEP_CANONICAL**
- **REFERENCE_ONLY**
- **MERGE_INTO_CANONICAL**
- **DERIVED_PROJECTION**
- **LOCAL_CACHE**
- **AUDIT_HISTORY**
- **FUTURE_SCOPE**
- **REMOVE_DUPLICATE**

No new formula, algorithm or API implementation should create a second durable owner before this gate is complete.
