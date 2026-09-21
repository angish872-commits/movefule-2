# SRC-000 — Verified MoveFuel-2 Baseline Inventory

Status: COMPLETE FOR PRE-ZIP GATE

- Source ID: `SRC-000`
- Path: `Mufil-2/`
- Verified tree SHA: `6875fa95185b9c9e2c4424444fa6347e3065454a`
- Total files: **459**
- Total blob bytes: **1457906**
- Kotlin files: **428**
- Domain screen Kotlin files: **400**
- Master dashboard Kotlin files: **4**
- Other Kotlin files: **24**
- SQL files: **5**
- Test files discovered by conventional path/name: **0**

The non-screen/master Kotlin files are application shell, shared UI components, design tokens, development UI, and navigation. This frozen tree does not contain a dedicated domain/data/backend algorithm package.

SRC-000 proves the current UI/database baseline: 400 one-screen-per-file domain Compose screens, four master dashboards, shared Compose infrastructure, SQL/SQLite source definitions, Training inventory, and UI audits. It does **not** prove that the 167 algorithms are implemented in this baseline.

The historical Notion algorithm registry points to legacy paths such as `services/backend/src/...`. Those paths must be checked against the older source snapshots after they are supplied.

The imported UI audit also says the current UI is a large prototype rather than a finished product: many controls are presentation-only, product-semantic navigation is incomplete, permissions are not implemented, and backend write contracts are not wired.

Do not rewrite or delete SRC-000 before the historical snapshots arrive. It remains the stable comparison baseline.
