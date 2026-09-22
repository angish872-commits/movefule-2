# Code Quality — MoveFuel 2

**Skill:** analyzing-code-quality
**Status:** complete
**Date:** 2026-09-22
**Scope:** canonical app (deep) + reference backend (indicators)

---

## 1. Quality Score Assessment

| Dimension | App (`Mufil-2/`) | Backend (reference) |
|---|---|---|
| Structure & consistency | **A** — rigid conventions (one screen per file, `XXX_NNN`, `MF*` components, shell classes) | **B+** — clear module boundaries, but broad `http/` surface |
| Test coverage indicators | **F** — 1 test file (92 lines) for 435 source files | **A** — 169 test files for 198 source files (~0.85:1) |
| Complexity distribution | **B** — 4 large policy/data files; 400 screens avg 66 lines | **B+** — largest service 650 lines, all under 7× the average |
| Error handling | **C** — zero try/catch, 1 `runCatching`, DataStore suspend writes unguarded | **B+** — typed error contract (`ContractError` + domain errors), normalized 500s |
| Documentation hygiene | **A** — 0 TODO/FIXME/HACK in both codebases; comments explain intent (null vs zero, gating) | **A** — 0 TODO/FIXME; contract docs |
| Duplication | **C** — transition logic duplicated; flow actions duplicated (registry vs inline) | **B** — some route-helper duplication risk (not verified in depth) |
| Overall | **B−** (shell impeccable, middle debt) | **A−** |

---

## 2. Hotspots — Churn × Complexity (bug-factory candidates)

| File | Churn (last 100 commits) | Size | Risk |
|---|---:|---:|---|
| `MoveFuelNavGraph.kt` | 3 | 637 lines | **HIGH** — every behavior change edits the 54-line `navigate` lambda + route hooks; churn hits the most complex file |
| `MFScreenFrame.kt` | 3 | 138 lines | **HIGH** — 400 screens' layout/nav pass through it; small but maximally shared |
| `MFBlocks.kt` | 3 | 441 lines | MEDIUM — component library churn affects many screens visually |
| `TodayMasterDashboard.kt` | 3 | 239 lines | MEDIUM — state presentation churns with every state change |
| `TrainMasterDashboard.kt` | 3 | 132 lines | MEDIUM |
| `FuelMasterDashboard.kt` | 3 | 104 lines | MEDIUM |
| `ProgressMasterDashboard.kt` | **4 (highest)** | 84 lines | MEDIUM — most-churned code file in repo |
| `WRK_032_WorkoutSummary.kt`, `TRS_020_PlanPreview.kt`, `FNO_010/012`, `PRG_017/020`, `DEV_001`, `CAL_001` | 3 each | ~66 avg | LOW-MEDIUM — exactly the screens with real state wiring (only 3 screens take state; lifecycle hooks cluster here) |

Pattern: **churn concentrates on state-boundary files** (dashboards, NavGraph, the 3 stateful screens) — consistent with an app mid-migration from static prototype to canonical state wiring.

---

## 3. Anti-Pattern Findings

### 3.1 God module / policy hub — `MoveFuelNavGraph` (HIGH)
637 lines holding: routing table (404 routes), all navigation guards, all state transitions, lifecycle hooks, back-stack policy. The 54-line `navigate` lambda exceeds the 50-line long-method threshold and nests `when` → conditions → nested `when`. Every new rule compounds here.

### 3.2 Long method — `navigate` lambda (MEDIUM)
Lines 115–168: 8 separate guard branches + popBackStack reuse logic + route substitution. Extracting a `MoveFuelNavigationPolicy` class would isolate testable rules.

### 3.3 Duplicated logic — transitions implemented twice (MEDIUM)
`CanonicalStateTransitions` (pure, tested) vs `CanonicalStateStore` (DataStore, shipped, untested). Same 9 transitions, two implementations; divergence risk documented in dead-code.md.

### 3.4 Duplicated flow definition — registry vs inline (MEDIUM)
380 registry entries (`semanticFlowActions`) override per-screen inline `primaryRoute`/`secondaryRoute` params. Precedence rule is simple (`override ?: fallback`) but knowledge lives in two places; 20 screens (all SYS_*) are inline-only.

### 3.5 Feature envy — navigation knows screen semantics (MEDIUM)
`navigate` hardcodes domain choreography by screen ID: `CAM_017 → FoodDraftSource.Camera`, `BAR_011 → Barcode`, `RCP_014 → Recipe`, `FNO_011 → Search`, `WRK_012→WRK_013` records a set, `WRK_032→master` commits summary, `DEV_007/009` mark sync pending. This business logic belongs in a domain/use-case layer, not the nav graph.

### 3.6 Stringly-typed contracts (MEDIUM)
Route paths, screen IDs, DataStore keys, sentinel `"pending-engine"`, route-name parsing (`substringAfter("TRS_").toIntOrNull()`) — all string-based. Typed helpers exist partially (`MoveFuelRoute` enum) but parsing paths/names is fragile.

### 3.7 Missing error handling on persistence (MEDIUM)
Zero try/catch in app; all DataStore writes are fire-and-forget from `scope.launch` in NavGraph. A disk/IO failure surfaces as an unhandled coroutine exception (crash) with no state-recovery path.

### 3.8 Two-store legacy dependency (LOW)
Canonical reads legacy `movefuel_ui_state` on init. Intentional but keeps a second persistence contract alive.

### 3.9 No TODO/FIXME debt markers (INFO — positive)
Zero markers in both codebases. Combined with the reconciliation docs, debt is tracked externally (docs/) rather than in code comments.

---

## 4. Error-Handling Consistency

| Area | Finding |
|---|---|
| App DataStore I/O | No guards; suspend + `scope.launch` fire-and-forget |
| App route parsing | 1 defensive `runCatching` (`valueOf`) — good but only one |
| App unknown-state fallbacks | Strong — every persisted enum string falls back to a safe default (`NotConfigured`, `Unknown`, `Idle`) |
| Backend dispatch | Typed errors → status mapping; unknown → normalized `internal_error`, message hidden |
| Backend domain | Contract errors (`Consent`, `Profile`, `AccountLifecycle`) give structured 400s |
| Backend external providers | Enabled by env presence; disabled paths reject cleanly (webhook stub) |

---

## 5. Accuracy Findings (correctness hazards)

1. **Double-commit window in `commitWorkoutSummary`**: store logic transitions `InProgress→SummaryPending`, then `SummaryPending→Idle+increment` in the same edit — but if state was already `Idle`, the second `if` cannot fire, so repeated summary exits do NOT double-count (safe). However the pure-model version guards differently; the two definitions must be reconciled (see 3.3).
2. **Food confirmation source tracking**: `confirmFood(context, null, source)` is called with `null` name on return-to-FNO_001; `lastConfirmedFood` is removed (not blanked) — consistent with null-vs-empty discipline.
3. **Onboarding completion condition**: completion fires only when leaving ONB_018 to `MASTER_TODAY`/`TOD_001` — not on back-navigation, verified in guard order.

---

## 6. Quality Gradient

```
EDGE (screens, components, design tokens)   → polished, standardized, consistent  [high quality]
MIDDLE (NavGraph, state store, registry)    → policy accumulation, duplication    [debt zone]
REFERENCE (backend)                         → tested, typed, dependency-free      [high quality]
GOVERNANCE (docs/, registries, CI)          → strict, machine-checked             [high quality]
```

The debt sits exactly where the skill predicts: in the middle orchestration layer. Because CI enforces structural counts but not semantics, regressions can only be caught by the single transition test.

---

## 7. Priority Recommendations

| # | Recommendation | Effort | Impact |
|---|---|---|---|
| 1 | Make `CanonicalStateStore` use `CanonicalStateTransitions` (single implementation) and add tests for store writes | S | Kills the only tested-vs-shipped divergence |
| 2 | Extract navigation policy from `NavGraph.navigate` into a testable function/class | M | Turns the highest-churn×complexity file into data + delegation |
| 3 | Add unit tests for gating rules (`trainEntryRoute`, `activatePlan`, food confirmation chain) | M | These are security/correctness gates with zero test coverage |
| 4 | Single source of truth for flow actions (generate registry from screens or vice versa) | M | Removes dual-maintenance hazard |
| 5 | Add error handling/reporting around DataStore writes | S | Prevents silent state loss/crash |
| 6 | Remove stale comment + dead `markActive` (see dead-code.md) | S | Restores trust in gate documentation |

## 8. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| High churn on state-boundary files (dashboards, NavGraph) | MEDIUM | Gating logic (train activation, food confirmation) lives in the highest-churn file — unstable security-adjacent posture |
| Zero automated tests on gating logic | MEDIUM | `activatePlan` refusal of `pending-engine`, onboarding completion condition, workout commit sequencing — untested |
| No churn on any auth/credential files | INFO (positive) | No auth code exists to destabilize in the app; backend auth is centralized and stable |
| No missing error handling in financial calculations | INFO | No payment math in app; billing endpoints are stubs/fail-closed |
| Complexity in data handling (backend image pipeline 650 lines) | LOW | Nutrition estimation is the most complex backend module; tested (nutrition tests are the largest suite), but remains the highest-risk domain for injection/数值 errors — flag for gates review |

## 9. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| High-churn + complex file (NavGraph) | MEDIUM | refactoring priority; `simulate-behavior` scenario target |
| Generated artifacts with markers (contracts) | HIGH | `trace-codebase-provenance` (already planned) |
| Build-time structural enforcement (CI counts, patch application) | HIGH | `analyze-build-pipeline` (already planned) |
| No build-time code injection found | LOW | no escalation |

## 10. Output Contract

- File: `docs/analysis/code-quality.md`
- State: `analyzing-code-quality: complete`
- Next: Track A summary + signal aggregation → Track B Phase 1
