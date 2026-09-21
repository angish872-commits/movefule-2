# Algorithm Reconciliation Record Template

Use one record for each canonical algorithm.

## Identity

- Canonical algorithm ID:
- Canonical name:
- Domain:
- Priority:
- Registry status:

## Source implementations

| Source | Path(s) | Status | Notes |
|---|---|---|---|
| SRC-000 current MoveFuel-2 | | MISSING/PARTIAL/COMPLETE/DUPLICATE | |
| SRC-001 Mufil-1 | | | |
| SRC-002 Mufil-2 legacy | | | |
| SRC-003 MoveFuel legacy | | | |
| SRC-004 G/latest | | | |

## Behavioral contract

- Purpose:
- Inputs:
- Input units:
- Optional inputs:
- Missing/UNKNOWN behavior:
- Outputs:
- Output units/ranges:
- Side effects:
- Database reads:
- Database writes:
- Formula dependencies:
- Policy dependencies:
- Other algorithm dependencies:
- Offline behavior:
- Sync implications:
- AI/Jev dependency:
- Decision trace requirements:

## Comparison

For every implementation record:

- correct behavior
- incorrect behavior
- useful logic to preserve
- duplicated logic
- embedded formulas that should move to Formula Registry
- authority violations
- unsafe fallback behavior
- edge cases
- performance concerns
- test coverage
- reproducibility/versioning
- observability

## Decision

Choose exactly one primary disposition:

- KEEP
- KEEP_AND_IMPROVE
- MERGE
- REWRITE
- REMOVE_DUPLICATE
- MISSING_IMPLEMENT
- FUTURE

### Canonical design

- Chosen/reused logic:
- Logic removed:
- Required improvements:
- Canonical implementation path:
- Formula versions:
- Algorithm version:
- Policy version:
- Migration notes:

## Required tests

- deterministic unit tests:
- boundary tests:
- missing-data tests:
- safety/policy tests:
- regression tests from source implementations:
- integration tests:
- offline/sync tests:
- property/invariant tests where appropriate:

## Completion gate

- [ ] data authority resolved
- [ ] formulas resolved
- [ ] algorithm implemented
- [ ] safety/policy implemented
- [ ] version/decision trace implemented
- [ ] tests pass
- [ ] API/use case connected
- [ ] offline/sync behavior tested
- [ ] UI dependency mapped
