# Dead Code — MoveFuel 2

**Skill:** detecting-dead-code
**Status:** complete
**Date:** 2026-09-22
**Scope:** canonical app (deep), repo-level orphans (summary); reference imports excluded by design

---

## 1. Summary

| Category | Count | Verdict |
|---|---|---|
| Orphaned files (never referenced) | 1 | `ui/dev/MotionLab.kt` — safe to remove or register |
| Test-only production symbols | 1 | `CanonicalStateTransitions` — refactor or re-purpose |
| Dead public APIs | 2 | `TrainStateStore.markActive`, `TrainStateStore.reset` |
| Stale comments describing dead code as live | 1 | NavGraph line 172 ("remains the audited activation boundary") |
| Screens unregistered in NavGraph | 0 | All 400 registered; 404 composables total |
| Components with zero consumers | 0 | All 29 component functions have ≥1 real usage |
| Unused runtime/CI assets | 0 | Root `tools/`, `Mufil-2/tools`, audit CSVs all consumed (CI or manual) |

**Zombie-code check:** Kotlin has no reflection/classloading/dynamic dispatch in this app; verified no `Class.forName`, no plugin loading, no dynamic imports. Static findings are trustworthy (unlike JS/Python targets). Android `@Preview` functions are tooling-only but intentionally present — not counted as dead.

---

## 2. Detailed Findings

### 2.1 `ui/dev/MotionLab.kt` — orphaned file (HIGH — safe to remove)

| Field | Value |
|---|---|
| Path | `Mufil-2/app/src/main/java/com/movefuel/mufil2/ui/dev/MotionLab.kt` |
| References | 0 (NavGraph: 0, registry: 0, other code: 0) |
| Age | Present since snapshot import (`3ffbb28 chore: import verified Mufil-2 source snapshot`) |
| Archaeology | Never wired into routing or registry. Likely a design-time motion reference screen. |
| Recommendation | Remove, or register as a debug-only route if it's a useful motion reference. |
| Security | None — pure UI demo. |

### 2.2 `CanonicalStateTransitions` — test-only production symbol (MEDIUM)

| Field | Value |
|---|---|
| Path | `ui/state/CanonicalStateTransitions.kt` (66 lines) |
| Production consumers | **0** — `CanonicalStateStore` re-implements each transition inline against DataStore |
| Test consumers | `CanonicalStateTransitionsTest.kt` (the only unit test in the app) |
| Age | Added with canonical integration (`1d66712`), same commit as the store rework |
| Archaeology | Created as the "pure domain transitions" model, but the runtime path was never refactored to use it. Classic half-finished refactor: the tested code is not the shipped code. |
| Recommendation | **Refactor** `CanonicalStateStore` writes to apply `CanonicalStateTransitions` (making the tests meaningful), or delete the pure object and write tests against the store. Do not leave as-is. |
| Security | Logical divergence risk: tested semantics ≠ shipped semantics for food confirmation and workout commit transitions. |

### 2.3 `TrainStateStore` dead APIs (HIGH — safe to remove)

| API | References | Notes |
|---|---|---|
| `markActive(context)` | 0 real calls (1 stale comment in `MoveFuelNavGraph.kt:172`) | Delegates to `CanonicalStateStore.activatePlan` — which is called directly instead. The comment claims "remains the audited activation boundary" — **stale**, misleading for security review. |
| `reset(context)` | 0 references anywhere (incl. tests) | Unused facade method. |

| Field | Value |
|---|---|
| Recommendation | Delete both, and delete/update the stale comment. |
| Security | The real activation boundary is `CanonicalStateStore.activatePlan` (refuses `pending-engine`), verified live in NavGraph. No gate was removed — only a comment lies about an unused method. |

### 2.4 Registry coverage gap — 20 SYS_* screens (LOW, by design)

20 `SYS_*` screens (SYS_001–020) have no `semanticFlowActions` entry; they resolve primary/secondary actions from inline `MFScreenFrame` params. Not dead — fallback path is exercised. No registry entry points at a nonexistent screen (reverse check: 0 orphans).

### 2.5 Keep-for-compat (do NOT remove)

| Item | Why it stays |
|---|---|
| Legacy DataStore `movefuel_ui_state` read in `ensureInitialized` | One-way migration from pre-canonical installs; writer already gone. Mature for removal only after migration window closes. |
| `Mufil-2/audit/*.csv` duplicates of `ui/audit/*.csv` | CI (`apply-mufil2-import.yml`) copies and byte-compares them intentionally. |
| `imports/`, `sources/` trees | Frozen comparison inputs; "dead" only to the app runtime, alive to reconciliation governance. |
| `qa/runtime/**` (25 MB dumps/screenshots) | Verification evidence, not code. |
| Android `@Preview` composables | Dev/tooling affordances; intentionally unconsumed at runtime. |
| `Mufil-2/tools/ui_closed_loop_audit.py` | Executed by CI on every Mufil-2 push. |

### 2.6 Build-flag / platform-conditional code

- None found in the app. `debugImplementation("androidx.compose.ui:ui-tooling")` is the only build-variant-specific dependency (standard).
- No `if (Build.VERSION)` dead branches in screens (not fully audited screen-by-screen; sampled screens show none).

---

## 3. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| Stale "audited activation boundary" comment on a dead method | MEDIUM | Documentation-of-record for a security-critical gate is wrong. A reviewer following the comment would audit the wrong function. Fix: remove `markActive` + comment; document `activatePlan` as the boundary. |
| Test-only transition logic vs shipped logic | MEDIUM | The only automated safety net validates a copy of the logic, not the runtime implementation. Transition bugs in `CanonicalStateStore` (e.g., double-commit on summary) could ship green. |
| No dead auth/validation/logging found | INFO (positive) | No removed security controls detected in dead code; nothing resembling a dormant bypass found. |
| Orphaned `MotionLab` | INFO | No concern; pure UI. |

## 4. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| Dead code is small and benign in this build — no feature-flag graveyard | LOW | no escalation; `map-feature-gates` will focus on runtime gates, not dead flags |
| Half-finished refactor pattern (pure vs store) | MEDIUM | `analyzing-code-quality`, `simulate-behavior` (divergence scenarios) |
| Snapshot-imported orphan (MotionLab) | LOW | `trace-codebase-provenance` confirms it arrived with the verified SHA |

## 5. Output Contract

- File: `docs/analysis/dead-code.md`
- State: `detecting-dead-code: complete`
- Next: Track A — `inventorying-api-surface`
