# Architecture — MoveFuel 2

**Skill:** mapping-architecture
**Status:** complete
**Date:** 2026-09-22
**Scope:** canonical Android app (deep) + reference backend (summary)

---

## 1. System Context

MoveFuel 2 is a **reconciliation monorepo** with three coexisting layers:

```
┌─────────────────────────────────────────────────────────────────┐
│ CANONICAL (what this repo is building)                          │
│   Mufil-2/  — Android Kotlin/Compose UI shell, 0.1-ui-prototype │
│   database/ — SQL blueprints (not yet wired to app)             │
├─────────────────────────────────────────────────────────────────┤
│ REFERENCE (inputs, frozen for comparison)                       │
│   imports/movefule_1/ — Node 22 + TS backend on Appwrite,       │
│                         training algorithms, contracts          │
│   imports/mufil2/     — 21+ ordered patches that reconstruct    │
│                         the canonical baseline (used by CI)     │
│   sources/            — frozen zip snapshot                     │
├─────────────────────────────────────────────────────────────────┤
│ GOVERNANCE (control plane)                                      │
│   docs/, ui/ registries, qa/ evidence, tools/ scripts           │
└─────────────────────────────────────────────────────────────────┘
```

**No runtime link exists yet between the canonical app and either the backend or the databases.** The app is a self-contained UI shell; the backend is a separate reference implementation. This is the single most important architectural fact in the repo.

---

## 2. Canonical App — Layer Map (actual, import-verified)

```
MainActivity (entry, sets theme)
  └─ MoveFuelApp()                      11 lines — creates NavController only
       └─ MoveFuelNavGraph()            637 lines — THE ORCHESTRATION HUB
            ├─ observes: CanonicalStateStore (DataStore flow) ─┐
            ├─ observes: TrainStateStore (facade over same)    │  state layer
            ├─ navigate lambda: guards + state transitions     │
            ├─ LaunchedEffect(route): onboarding/TRS/WRK hooks │
            ├─ CompositionLocalProvider(LocalMoveFuelBack)     │
            └─ NavHost: 404 composable routes                  │
                 ├─ 4 master dashboards (receive state)        │
                 └─ 400 domain screens                          │
                      ├─ 397 take only `onNavigate`            │  presentation
                      └─ 3 take `onNavigate` + `state`         │
                           (FNO_001, TRN_001, WRK_032)         │
                 each screen wraps content in MFScreenFrame    │
                      └─ resolves shell / nav / flow actions   │
                         from MoveFuelUiArchitecture registry  │
```

### Package responsibilities (verified)

| Package | Files | Actual role |
|---|---|---|
| `ui/` (MoveFuelApp.kt) | 1 | Composition root (trivial) |
| `ui/navigation/` | 3 | **Everything**: routes enum (404), NavHost (404 routes), orchestration logic, UI architecture registry (shells, primary destinations, 380 flow-action entries), back-handling CompositionLocal |
| `ui/state/` | 4 | Canonical state model + DataStore persistence + pure transitions + selectors (`toTodayUiState`) |
| `ui/design/` | 6 | Design tokens: colors, typography, spacing, radius, motion, theme |
| `ui/components/` | 14 | `MF*` component library: ScreenFrame, BottomNav, Button, Card, MetricRing, TrendGraph, Skeleton, Blocks, PremiumBackground, etc. |
| `ui/master/` | 4 | Today / Fuel / Train / Progress dashboards (the only state-consuming UI) |
| `ui/screens/` | 400 | 22 families, one screen per file, template-driven |
| `ui/dev/` | 1 | MotionLab (internal demo screen) |

### Screen families (400 total)

auth 12 · onb 18 · tod 12 · cam 18 · bar 16 · fno 18 · fpl 24 · fsh 16 · rcp 36 · trs 20 · trn 24 · wrk 32 · sor 10 · rdy 10 · exr 16 · cal 18 · prg 30 · pro 18 · dev 12 · bil 8 · war 12 · sys 20

---

## 3. Cross-Cutting Concerns (where they actually live)

| Concern | Location | Mechanism |
|---|---|---|
| State persistence | `CanonicalStateStore` (singleton `object`) | DataStore Preferences, **two** stores: `movefuel_canonical_state` + legacy `movefuel_ui_state` (migrated once via `ensureInitialized`) |
| State distribution | `MoveFuelNavGraph` | Single `collectAsState` at top; passed down as params; screens are otherwise stateless |
| Navigation guards | `MoveFuelNavGraph.navigate` lambda | Train gating (`trainEntryRoute()`), onboarding completion, plan activation gating (`activatePlan` refuses fake refs) |
| Lifecycle side effects | `LaunchedEffect(currentRoutePath)` | Route-driven writes: ONB step persist, TRS 2–19 setup-incomplete, TRS_020 plan preview, WRK_001 begin workout |
| Flow semantics | `MoveFuelUiArchitecture.semanticFlowActions` (380 entries) + per-screen fallbacks | Primary/secondary action resolution inside `MFScreenFrame` |
| Shell/layout policy | `moveFuelShellFor(screenId)` | MAIN / FOCUSED / STATE / WEAR — derived from screen ID prefix+number |
| Back handling | `LocalMoveFuelBack` CompositionLocal | Provided once in NavGraph; consumed by `MFScreenFrame` |
| Theming | `MoveFuelTheme` + design tokens | Only global wrapper |

**Auth is absent by design** — AUTH_* screens are visual stubs; no auth mechanism, no token, no session exists in the app. Auth logic lives only in the reference backend (Appwrite session provider).

---

## 4. Coupling Points & Layer Findings

1. **`MoveFuelNavGraph` is the real architecture center (god module).** 637 lines holding routing + 404 registrations + all business rules + all state transitions + all lifecycle hooks. Every behavior change flows through it. Directory names say "navigation"; the import/behavior reality says "orchestrator + domain rules".
2. **Tight coupling between navigation layer and state layer.** The navigate lambda directly calls `CanonicalStateStore` write methods for domain rules (food confirmation, workout set recording, sync pending). There is no use-case/service layer between UI navigation and persistence.
3. **Duplicated transition logic.** `CanonicalStateTransitions` (pure, unit-tested) and `CanonicalStateStore` (DataStore, untested inline) implement the same transitions independently. Only the pure copy is tested; the shipped copy is a re-implementation. Divergence risk is real (e.g., `commitWorkoutSummary` store logic counts a commit after `SummaryPending` even when starting from `Idle`+`SummaryPending` sequences differently than the pure version).
4. **Registry duplication of flow knowledge.** Flow actions exist twice: inline in each screen call (`primaryRoute = …`) and in the `semanticFlowActions` registry (380 entries). Resolution rule: registry overrides inline. 20 screens have no registry entry (inline only). Two sources of truth for navigation semantics.
5. **`MFScreenFrame` is a second, hidden policy layer.** It resolves actions and shell, renders bottom nav conditionally, and applies entry animation — making every screen's look/feel/flow depend on two files (screen + Frame) plus the registry.
6. **UI-only "Wear" flow.** 12 `WAR_*` screens render inside the phone app (no Gradle Wear module, no Wear data layer). Shell classification exists, runtime does not.
7. **Legacy state migration embedded in primary store.** `CanonicalStateStore.ensureInitialized` reads the legacy `movefuel_ui_state` DataStore — two-store dependency carried in the canonical path.
8. **Unused compile-time abstractions?** `MoveFuelPrimaryDestination` (MAIN nav mapping) is defined per family; verify actual consumption in dead-code pass.

### Verified layer-direction summary

- `screens → navigation (routes, registry types)` — allowed, one-way.
- `master → state` — only dashboards consume state directly.
- `navigation → state` — **both directions of policy**: navigation mutates state (writes) and displays it (reads).
- `components → design` and `components → navigation` (types) — one-way.
- No reverse imports from state/design into screens. **No import cycles observed at package level.**

---

## 5. Reference Backend — Architecture Summary (`imports/movefule_1/services/backend`)

```
server.ts (bootstrap + config validation + auth mode selection)
  └─ createMoveFuelServer (http/local-server.ts)
       ├─ http/request-handler.ts → 19 route modules
       │    calendar · canonical-sync · device-command · device · diet ·
       │    experience · health · insight · meal-library · meal ·
       │    packaged-food · privacy · profile-account · report · sync ·
       │    training · (+ helpers: meal-route-support, requestSupport)
       ├─ domain/ — invalidation-boundary.ts, sync-store.ts
       └─ 16 feature modules: appwrite, billing, calendar, device,
            diet-intelligence, foundation (session/appwrite clients),
            health, meal, notification, nutrition, privacy, progress,
            report, training…
```

- **Runtime:** raw `node:http` server (no framework), Node ≥ 22.6, native TS type-stripping.
- **Auth:** `MOVEFUEL_AUTH_MODE` = `local-test` (default non-prod) or `appwrite` (requires endpoint+project, fails closed if missing).
- **Data:** Appwrite (database id `movefuel_mvp`) + sync domain (`sync-store`, `invalidation-boundary`).
- **Contracts:** codegen script with `--check` gate wired into `npm run verify`.
- **Deployment:** Appwrite Functions; private config through env-file templates in `infra/deployment/`.

This backend is a **complete, test-covered reference implementation** (~150 test files) for the product domain the canonical app will eventually need. It is currently disconnected from `Mufil-2/`.

---

## 6. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| Auth completely absent in canonical app | **MEDIUM** | 12 AUTH screens are stubs; no session/token handling exists in `Mufil-2/`. Compile-time only — no exposure today, but any future API wiring must not assume auth exists client-side. |
| No authorization layer anywhere in app | MEDIUM | All state writes are local; when sync lands (backend has `invalidation-boundary`, `privacy` modules), client must not be trusted as policy owner. |
| Backend auth fails closed for `appwrite` mode | INFO (positive) | `server.ts` throws if endpoint/project missing when authMode=appwrite. |
| Placeholder-value scrubbing in backend config | INFO (positive) | `configuredValue()` strips `REPLACE_*`/`PLACEHOLDER` values rather than accepting them. |
| Local-test auth mode reachable by config | LOW | `MOVEFUEL_AUTH_MODE=local-test` is the non-production default; ensure production env files never inherit it (deployment preflight exists — verify in provenance pass). |
| Secrets reachable from presentation layer | NONE observed | App has no secrets module; backend reads env only at bootstrap. |

---

## 7. Trigger Signals (downstream routing)

| Signal | Confidence | Routes to |
|---|---|---|
| Generated/patch-reconstructed code mixed with hand-written (patches + verified SHA) | HIGH | `trace-codebase-provenance` (already planned) |
| Hidden/parallel module trees not referenced from canonical entry points (`imports/`, `sources/`) | HIGH | `classify-repo-artifacts` (already planned) |
| God module (NavGraph) centralizes policy; unclear boundaries between navigation vs domain | MEDIUM | `tracing-dependencies` (already planned) |
| Duplicated transition implementations (pure vs store) | MEDIUM | `analyzing-code-quality`, `simulate-behavior` (divergence scenario) |
| Registry vs inline flow-action duplication | MEDIUM | `extract-tool-graph` (flow graph), `detecting-dead-code` |

## 8. Output Contract

- File: `docs/analysis/architecture.md`
- State: `mapping-architecture: complete`
- Next: Track A — `tracing-dependencies`
