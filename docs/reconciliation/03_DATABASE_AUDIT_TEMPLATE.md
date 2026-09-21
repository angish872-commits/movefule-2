# Database Reconciliation Template

Use one row for every source table/resource definition across the 81 core, 29 draft additions, 15 food/barcode, 141 training platform, 32 Android SQLite, 4 Wear SQLite, and any tables discovered in additional source snapshots.

## Required columns

| Column | Meaning |
|---|---|
| source_id | Frozen source revision identifier |
| source_system | Core / food / training / Android / Wear / other |
| source_table | Original table/resource name |
| source_domain | Original domain |
| proposed_entity | Logical business entity represented |
| owner_domain | Canonical MoveFuel owner |
| authority_class | A1 private canonical / A2 shared reference / A3 derived / A4 local / A5 audit / F future |
| disposition | KEEP_CANONICAL / REFERENCE_ONLY / MERGE_INTO_CANONICAL / DERIVED_PROJECTION / LOCAL_CACHE / AUDIT_HISTORY / FUTURE_SCOPE / REMOVE_DUPLICATE |
| canonical_target | Final canonical table/entity or projection |
| private_or_shared | Data boundary |
| server_or_local | Persistence boundary |
| version_key | Revision/version linkage |
| source_key | Provenance linkage |
| duplicate_conflicts | Conflicting tables/entities |
| migration_action | Keep, merge, transform, delete, cache-only, etc. |
| rationale | Why the decision is correct |
| status | Proposed / reviewed / locked |
| notes | Additional constraints |

## Core rules

- One canonical owner for every durable business entity.
- UNKNOWN is never silently converted to zero.
- Shared knowledge must not become a second private-user authority.
- Android Room and Wear stores are local/offline layers, not competing server truth.
- Derived state such as Today/readiness/report projections must be reproducible from canonical facts plus versioned formulas/algorithms/policies.
- The Training 141 schema must not be merged wholesale into private runtime.
- Draft additions do not become production merely because a SQL file exists.
