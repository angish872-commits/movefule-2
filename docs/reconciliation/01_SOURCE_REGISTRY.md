# Source Registry

This file records immutable comparison sources used to build the canonical MoveFuel-2 implementation.

| Source ID | Source | Location | Frozen revision | Role | Status |
|---|---|---|---|---|---|
| SRC-000 | MoveFuel-2 verified baseline | `Mufil-2/` | tree `6875fa95185b9c9e2c4424444fa6347e3065454a` | Current canonical baseline / main workspace | FROZEN BASELINE |
| SRC-001 | Mufil-1 | `sources/mufil-1/` | TBD | Historical/alternative implementation evidence | WAITING SOURCE |
| SRC-002 | Mufil-2 legacy snapshot, only if distinct from SRC-000 | `sources/mufil-2-legacy/` | TBD | Historical/alternative implementation evidence | WAITING SOURCE |
| SRC-003 | MoveFuel legacy source, if supplied separately | `sources/movefuel-legacy/` | TBD | Historical implementation evidence | WAITING SOURCE |
| SRC-004 | G/latest save | `sources/g-latest/` | archive SHA-256 TBD | Latest supplied implementation evidence | WAITING ZIP |

## Rules

1. A source is frozen before analysis.
2. Frozen source code is not edited to make it look better during comparison.
3. A source may be partial; partial status must be recorded.
4. Final code is written into the canonical MoveFuel-2 application after a reconciliation decision.
5. Every comparison record must cite exact source paths and revisions.
