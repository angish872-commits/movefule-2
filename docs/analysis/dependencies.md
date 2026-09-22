# Dependencies — MoveFuel 2

**Skill:** tracing-dependencies
**Status:** complete
**Date:** 2026-09-22
**Method:** Kotlin import extraction (canonical app), TS import extraction (reference backend), env-var scan, lockfile check

---

## 1. Canonical App — Package Dependency Graph

```
                    ┌──────────────┐
   405 files ──────►│ ui.components│◄──────────────┐
                    └──────┬───────┘               │
                           │ (design, navigation)  │
   ┌──────────────┐        ▼                       │
   │  ui.design   │◄─── 420 files (no outgoing)    │
   └──────────────┘                                │
                                                   │
   ┌──────────────────┐   400 screens reference    │
   │ ui.navigation    │◄───── MoveFuelRoute ───────┘
   │ (Route, Registry,│
   │  NavGraph)       │──────────┐
   └──┬──────┬────────┘          │
      │      │                   ▼
      │      │            ┌────────────┐
      │      └───────────►│ ui.master  │ (only NavGraph imports master)
      │                   └─────┬──────┘
      ▼                         │
   ┌────────────┐◄──────────────┘
   │ ui.state   │─── 1 edge back: TodayUiState → MoveFuelRoute ──► ui.navigation
   └────────────┘
```

### Edge matrix (import statements counted)

| From ↓ / To → | design | components | navigation | state | master | screens |
|---|---:|---:|---:|---:|---:|---:|
| screens (400 files) | 779 | 427 | 400 | 9 | 0 | — |
| components (14 files) | 22 | — | 3 | 0 | 0 | 0 |
| navigation (3 files) | 1 | 0 | — | 6 | 4 | 22 (wildcard, 400 symbols) |
| state (4 files) | 0 | 0 | **1** | — | 0 | 0 |
| master (4 files) | 6 | 18 | 4 | 9 | — | 0 |
| design (6 files) | — | 0 | 0 | 0 | 0 | 0 |

### Fan-in / Instability (file-level)

| Package | Fan-in | Fan-out (pkgs) | Instability I | Classification |
|---|---:|---:|---:|---|
| `ui.design` | 420 | 0 | 0.00 | **Stable core** — pure leaf, safe to depend on |
| `ui.navigation` | 409 | 4 | 0.01 | **Stable core** — imported by everything (route types) |
| `ui.components` | 405 | 2 | 0.005 | **Stable core** — the shared UI kit |
| `ui.state` | 14 | 1 | 0.07 | Stable, small blast radius (14 consumers) |
| `ui.master` | 1 | 4 | 0.80 | Volatile — single consumer (NavGraph) |
| `ui.screens` | 22 (wildcard) | 4 | 0.95 | Volatile — leaf presentation |

### Circular Dependencies

| Cycle | Length | Severity | Evidence |
|---|---|---|---|
| `ui.state` ↔ `ui.navigation` | 2 | LOW (shallow) | `TodayUiState.kt:3` imports `navigation.MoveFuelRoute`; `MoveFuelNavGraph.kt:47-52` imports `ui.state.*` |

This is the only package-level cycle. Practically: `state` needs the route type to build `TodayNextActionUi`; `navigation` needs state for orchestration. **Break point suggestion:** move `MoveFuelRoute` into a neutral `ui/routes` (or `ui/model`) package, or keep it but acknowledge state is not route-agnostic.

### Centers of Gravity (de-facto god modules by fan-in)

| Module | Fan-in | Why it matters |
|---|---:|---|
| `MoveFuelRoute` (enum) | 400 screens + master + state | The **navigation vocabulary** — every screen, every registry entry, every deep link depends on it |
| `MFScreenFrame` | 400 screens (100%) | Every screen's layout, animation, nav resolution passes through this one composable; also consumes registry + CompositionLocal |
| `MoveFuelUiArchitecture.semanticFlowActions` | 1 consumer (MFScreenFrame) | 380 override entries; central flow control with a single chokepoint |
| `CanonicalStateStore` | 14 consumers + NavGraph | The only write boundary for persisted state |

**God-module metric check:** no single FILE qualifies by classic thresholds (fan-in>20 AND fan-out>10) except conceptually `MoveFuelNavGraph.kt` (637 lines, fan-out across 22 packages, but fan-in=1 — it is the composition root, not a shared utility). The **navigation package as a whole** is the true center: route vocabulary + flow registry + orchestration in one package.

### Dependency Clusters (hidden bounded contexts)

| Cluster | Members | Co-occurrence evidence |
|---|---|---|
| Train setup lifecycle | `trs` screens + `trainState`/`trainSetupStep` + NavGraph guards | TRAIN gating logic in navigate lambda + TRS 2–19 side effects + master dashboards reading trainState |
| Workout execution lifecycle | `wrk` screens + `workoutExecution`/`performedSetCount`/`completedWorkoutCount` + WRK_001/012/032 hooks | Route-driven transitions at exact screen boundaries |
| Food confirmation lifecycle | `cam`/`bar`/`rcp`/`fno` screens + `pendingFoodSource` + `confirmFood` | Confirmation only on return to FNO_001; source tracked by origin screen |
| Device/sync lifecycle | `dev` screens + `syncState` + DEV_007/009 hooks | Sync pending only marked through DEV flow, not generic |

### Implicit Dependencies (string/state contracts)

| Contract | Value(s) | Risk if changed |
|---|---|---|
| DataStore file names | `movefuel_canonical_state`, `movefuel_ui_state` (legacy) | Silent state loss on rename; legacy migration depends on old name |
| Preference keys | 17 string keys (`train_state`, `onboarding_step`, …) | Persisted data corruption |
| Route path strings | `tod/001`, `master/today`, … (404 paths, parsed by prefix) | Deep links + `moveFuelShellFor` prefix parsing |
| Screen ID strings | `FNO_001`, … (parsed: prefix + number) | Shell classification, registry lookup, audit tooling |
| `LocalMoveFuelBack` | Provided in NavGraph, consumed in MFScreenFrame | Composition crash if a screen is previewed/embedded outside NavGraph — mitigated by default `{}` |
| `"pending-engine"` sentinel | Plan preview placeholder reference | `activatePlan` refuses activation without real ref (intentional gate) |

### Dynamic Imports / Version Conflicts (app)

- **Dynamic imports:** none (no reflection/classloading; Kotlin imports are static).
- **Version conflicts:** none possible — single Gradle module, single Compose BOM, no duplicate transitive versions across boundaries.
- **CVEs:** dependency surface is AndroidX + Compose only; no known-CVE findings at the manifest level.

---

## 2. Reference Backend — Dependency Summary (`imports/movefule_1/services/backend`)

- **Runtime deps:** zero (TypeScript + @types/node are dev-only, confirmed via lockfile-only `npm ls`).
- **Dynamic imports:** none (all ESM static).
- **Structure:** `http/` (19 route modules) → feature modules → `foundation/`, `domain/`, `shared/`.

### Notable edges and clusters

| Cluster | Edges | Reading |
|---|---|---|
| Nutrition/vision pipeline | nutrition → vision (23), portion (22), algorithm (19), confidence (10), identity (8) | Largest hidden bounded context: meal-photo understanding; co-evolves as a unit |
| Sync core | sync → domain (11), foundation (8), shared (7), meal (4) | Sync depends on domain+meal; invalidation-boundary lives in domain |
| HTTP fan-out | http → meal (19), foundation (17), shared (13), nutrition (10), sync (5) | Route layer is thin but broad; no cycles detected at package level |
| Training | training → foundation (10), domain (8), calendar (2), .. (11 root) | Root imports (`..`) indicate src-level bootstrap dependencies worth pinning in provenance pass |

### Implicit dependencies — environment contract (19 distinct vars)

| Group | Vars (uses) | Notes |
|---|---|---|
| Appwrite | `APPWRITE_ENDPOINT`(4), `PROJECT_ID`(4), `DATABASE_ID`(5), `API_KEY`(3) | Server key — never client-side |
| AI providers | `OPENROUTER_API_KEY`(3), `OPENROUTER_FOOD_VISION_MODEL`, `OPENROUTER_FOOD_VISION_TIMEOUT_MS`, `OPENROUTER_APP_URL`, `OPENROUTER_APP_NAME`, `GEMINI_API_KEY`(4), `GEMINI_MODEL`(2) | Two providers in play |
| Food data | `USDA_FDC_API_KEY`(17 — highest use), `FDC_API_KEY`(2), `OPEN_FOOD_FACTS_USER_AGENT`(2) | **Two key names for the same USDA service** (`USDA_FDC_API_KEY` + `FDC_API_KEY`) — possible drift |
| Media/storage | `BUCKET_MEAL_MEDIA_ID`(3) | Appwrite bucket |
| Ops | `MOVEFUEL_ENV`(4), `MOVEFUEL_HOST`, `PORT`, `MOVEFUEL_PYTHON_BIN`, `MOVEFUEL_PORTION_CALIBRATION_PROFILES`, `MOVEFUEL_REVIEWED_RECIPE_SNAPSHOT` | `MOVEFUEL_PYTHON_BIN` — backend shells out to Python for portion calibration (cross-runtime dependency) |

### Version conflicts (backend)
- None — only two dev dependencies, pinned exactly (`typescript@5.8.3`, `@types/node@22.19.7`), committed lockfile.

---

## 3. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| `USDA_FDC_API_KEY` vs `FDC_API_KEY` dual naming | LOW | Inconsistent env contract; a deployment may set only one, disabling features silently or forcing fallback paths. Verify preflight covers both. |
| `MOVEFUEL_PYTHON_BIN` — backend invokes Python | MEDIUM | Cross-runtime execution boundary; untrusted path input here = command execution surface. Confirm the value is operator-controlled only (check `portion` module in build-pipeline/quality pass). |
| Server API key env (`APPWRITE_API_KEY`) | MEDIUM | Must remain server-only; no client bundle exists yet, but any future client sync design must not proxy through it. |
| Local-test auth default chain | LOW | `local-test` fallback must never be reachable in production config; production preflight scripts exist — verify in provenance. |
| Orphaned `DEEPSEEK_API_KEY` in root `.env.example` | INFO | No code in the repo reads it; likely external tooling. Harmless but confusing — remove or document. |
| No supply-chain exposure | INFO (positive) | Zero runtime deps in backend; AndroidX-only in app; static imports only; no dynamic loading anywhere. |

## 4. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| No dynamic imports, no conditional imports detected | LOW | `extract-tool-graph` will focus on flow registry instead of runtime tool dispatch |
| Hidden bounded contexts (4 lifecycle clusters) | MEDIUM | `simulate-behavior` scenario seeds; `classify-repo-artifacts` |
| Package cycle `state↔navigation` + policy concentration in NavGraph | MEDIUM | refactoring candidate; `analyzing-code-quality` |
| `MOVEFUEL_PYTHON_BIN` cross-runtime boundary | MEDIUM | `analyze-build-pipeline`, `trace-data-flows` |

## 5. Output Contract

- File: `docs/analysis/dependencies.md`
- State: `tracing-dependencies: complete`
- Next: Track A — `detecting-dead-code`
