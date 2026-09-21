# Source ZIP Import and Comparison Protocol

Use this protocol for every historical MoveFuel ZIP, including the older snapshot(s) and G/latest.

## Intake
1. Keep the original ZIP unchanged.
2. Compute SHA-256 for the archive.
3. Inspect the archive manifest before extraction.
4. Reject absolute paths or `..` path traversal.
5. Record archive size, file count, label, and source date if known.
6. Add the frozen snapshot to `01_SOURCE_REGISTRY.md`.

## Frozen import
Import each snapshot under `sources/` in its own directory. Never overwrite `Mufil-2/` during intake.

## Inventory
For each source record path, stable fingerprint/hash, size, language/type, module/domain, algorithm/formula candidate flag, test flag, and database/migration flag.

## Structural comparison
Compare files only in older, only in newer, identical files, changed files, likely renames/moves, database changes, tests added/removed, and algorithm/formula changes.

## Semantic algorithm comparison
Map implementations by behavior to the 167 canonical algorithm IDs. Compare:
- inputs, outputs, and units
- formulas
- boundary behavior
- UNKNOWN/missing handling
- deterministic versus AI authority
- safety/policy gates
- database reads/writes
- offline/sync behavior
- versioning/reproducibility
- tests
- observability
- duplicate logic
- maintainability

## Decision
Assign exactly one primary disposition:
`KEEP`, `KEEP_AND_IMPROVE`, `MERGE`, `REWRITE`, `REMOVE_DUPLICATE`, `MISSING_IMPLEMENT`, or `FUTURE`.

Newer does not automatically mean better.

## Canonical implementation
Only after comparison should the chosen/improved implementation be written into the canonical MoveFuel-2 code. Reusable formulas must be separated from algorithm orchestration, regression tests must preserve useful behavior from source versions, and database/API/offline/UI dependencies must be wired before an algorithm is marked complete.
