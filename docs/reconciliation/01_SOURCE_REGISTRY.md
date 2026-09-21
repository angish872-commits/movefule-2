# Source Registry

This file records immutable comparison sources used to build the canonical MoveFuel-2 implementation.

| Source ID | Source | Location / reference | Frozen revision | Role | Status |
|---|---|---|---|---|---|
| SRC-000 | MoveFuel-2 verified baseline | `Mufil-2/` | tree `6875fa95185b9c9e2c4424444fa6347e3065454a` | Current canonical baseline / main workspace | FROZEN BASELINE |
| SRC-001 | `angish872-commits/movefule_1` full historical snapshot | manifest: `SRC001_MOVEFULE1_FILE_MANIFEST.csv` | commit `699bf3d6bda7949d3d10bf320fa0ecfbf495016c`, tree `3b5be260c545a3bbde4fe48f87ac31594750f524` | Newer historical implementation evidence, including backend/training algorithm code | FROZEN REFERENCE |
| SRC-002 | Older historical ZIP that predates SRC-001 | `sources/older-historical/` after upload | archive SHA-256 TBD | Older implementation to compare against SRC-001 | WAITING ZIP |
| SRC-003 | Additional MoveFuel historical snapshot, if supplied | `sources/movefuel-legacy/` | TBD | Additional implementation evidence | OPTIONAL / WAITING |
| SRC-004 | G/latest save, if supplied separately | `sources/g-latest/` | archive SHA-256 TBD | Latest supplied implementation evidence | WAITING ZIP |

## Rules

1. Freeze every source before semantic analysis.
2. Never edit a frozen source to improve it during comparison.
3. A source may be partial; partial status must be recorded.
4. Cross-repository sources may initially be represented by an exact immutable commit plus a complete file manifest. Canonical code is not copied merely to make the source local.
5. Final code is written into the canonical MoveFuel-2 application only after a reconciliation decision.
6. Every algorithm comparison cites exact source paths and revisions.
7. Newer source does not automatically win.
