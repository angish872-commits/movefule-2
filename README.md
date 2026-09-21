# MoveFuel-2

MoveFuel-2 is the canonical integration repository for the next MoveFuel system.

## Current role

- `Mufil-2/` is the current main application workspace and verified baseline.
- The verified imported `Mufil-2` tree SHA is `6875fa95185b9c9e2c4424444fa6347e3065454a`.
- It contains the 400 domain Compose screens, the four master dashboards, SQL/database assets, audits, and related architecture material imported from the verified source snapshot.
- `sources/` is reserved for frozen source snapshots that are used for comparison only. Source snapshots must not silently become production code.
- `docs/reconciliation/` contains the forensic comparison plan and decision records.

## Branch strategy

- `main`: stable repository line. Do not use for experimental reconciliation.
- `bootstrap/movefuel-2-foundation`: verified imported foundation.
- `audit/full-code-reconciliation`: current comparison/reconciliation branch.
- `integration/canonical-build`: create only after the reconciliation gate is complete.
- Feature branches should branch from the current canonical integration line after the architecture is locked.

## Non-negotiable rule

Do not select code because it is newer or because it has a familiar filename. Compare behavior, correctness, safety, authority, tests, offline behavior, versioning, and dependencies first.

See `docs/reconciliation/00_REPOSITORY_AND_RECONCILIATION_PLAN.md`.
