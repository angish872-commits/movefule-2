# MoveFuel-2 Repository and Reconciliation Plan

Status: ACTIVE
Branch: `audit/full-code-reconciliation`

## 1. Repository purpose

`movefule-2` is the canonical integration repository.

The current `Mufil-2/` directory remains the main application workspace. It is not replaced by a second hidden app directory.

Additional historical or experimental versions are imported under `sources/` as frozen evidence so that they can be compared without contaminating the canonical application.

## 2. Planned layout

```
movefule-2/
├── Mufil-2/                         # current main application workspace
├── database/                        # root architecture/import copies already present
├── ui/                              # root UI audit/index copies already present
├── docs/
│   ├── architecture/
│   └── reconciliation/
├── sources/
│   ├── README.md
│   ├── mufil-1/                     # add when source is available
│   ├── mufil-2-legacy/              # add only if a separate older snapshot is supplied
│   ├── movefuel-legacy/             # optional older source snapshot
│   └── g-latest/                    # add after the user supplies the G/latest ZIP
└── imports/                         # historical import machinery already present
```

Git does not preserve empty directories, so source directories are created only when a snapshot is actually imported.

## 3. Source freeze rule

Every imported source must record:

- source name
- repository/file origin
- branch/tag if applicable
- commit SHA or archive SHA-256
- import date
- original path
- whether it is complete or partial
- whether it is read-only comparison material

Never modify a frozen source snapshot in place. Improvements belong in the canonical `Mufil-2` implementation after a decision is approved.

## 4. Reconciliation order

1. Freeze all sources.
2. Produce file/module inventories.
3. Discover algorithms by behavior, not filename.
4. Map discovered implementations to the canonical 167-algorithm registry.
5. Compare formulas used by each implementation.
6. Compare table/database dependencies.
7. Compare safety/policy behavior.
8. Compare offline/sync behavior.
9. Compare tests and observable outputs.
10. Assign a disposition: KEEP, KEEP_AND_IMPROVE, MERGE, REWRITE, REMOVE_DUPLICATE, MISSING_IMPLEMENT, FUTURE.
11. Lock canonical formula and data authority.
12. Write or merge the chosen implementation into `Mufil-2`.
13. Add regression/unit/integration tests.
14. Connect the implementation to API/use cases and the 400 screens.
15. Create `integration/canonical-build` only after the reconciliation gate is satisfied.

## 5. Comparison dimensions for every algorithm

Each implementation must be reviewed for:

- purpose and actual behavior
- inputs/outputs and units
- deterministic vs AI-dependent behavior
- formula dependencies
- database reads/writes
- canonical authority violations
- missing/UNKNOWN semantics
- safety and policy gates
- youth-policy handling where applicable
- versioning and reproducibility
- idempotency and sync implications
- offline behavior
- performance and failure behavior
- test coverage
- observability/decision trace
- duplicate logic
- maintainability

## 6. Canonical execution architecture

```
raw/canonical facts
        ↓
versioned formulas
        ↓
versioned algorithms
        ↓
policy + safety gates
        ↓
use cases / API
        ↓
offline/sync projections
        ↓
Android / Wear UI
```

AI/Jev/LLM systems may propose candidates, rank bounded eligible candidates, or explain results. They do not become the authority for safety-critical decisions or canonical nutrition/training facts.

## 7. Database rule

The known 81 + 29 + 15 + 141 + 32 + 4 definitions are source definitions across different layers. They must not be treated as 302 production server tables.

Every source table will receive exactly one disposition:

- KEEP_CANONICAL
- REFERENCE_ONLY
- MERGE_INTO_CANONICAL
- DERIVED_PROJECTION
- LOCAL_CACHE
- AUDIT_HISTORY
- FUTURE_SCOPE
- REMOVE_DUPLICATE

## 8. Definition of feature completion

A feature is complete only when the applicable chain is complete:

```
Database ✓
Formula ✓
Algorithm ✓
Safety/Policy ✓
API/Use Case ✓
Offline/Sync ✓
UI ✓
Tests ✓
Evidence/Versioning ✓
Observability ✓
```

A rendered Compose screen or a standalone algorithm file is not sufficient.

## 9. G/latest ZIP gate

When the G/latest ZIP is supplied:

1. calculate and record its archive hash;
2. inventory its files;
3. import it as a frozen source snapshot;
4. do not overwrite `Mufil-2`;
5. include it in every relevant algorithm/formula/database comparison;
6. only then make final canonical implementation decisions.
