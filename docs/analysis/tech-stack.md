# Tech Stack — MoveFuel 2

**Skill:** identifying-tech-stack
**Status:** complete
**Date:** 2026-09-22
**Scope:** whole repo; canonical vs reference layers separated

---

## Layer 1 — Canonical App: `Mufil-2/` (Android)

### Languages & Runtime
| Item | Value | Evidence |
|---|---|---|
| Language | Kotlin 2.2.10 | `Mufil-2/build.gradle.kts` (`org.jetbrains.kotlin.plugin.compose` 2.2.10) |
| JVM | Java 17 (source/target) | `Mufil-2/app/build.gradle.kts` |
| Android SDK | compileSdk 37 / targetSdk 37 / minSdk 24 | same |
| App version | `0.1-ui-prototype` (versionCode 1) | same — **UI prototype, not a release** |
| Namespace | `com.movefuel.mufil2` | same |

### Frameworks & Libraries (all declarations, no runtime deps beyond AndroidX)
| Library | Version | Role |
|---|---|---|
| Jetpack Compose BOM | 2026.09.00 | UI toolkit |
| Compose Material3, Foundation, UI tooling-preview | (BOM) | UI |
| activity-compose | 1.13.0 | Activity integration |
| lifecycle-runtime-ktx | 2.11.0 | Lifecycle |
| navigation-compose | 2.10.1 | In-app navigation |
| datastore-preferences | 1.1.1 | **Only** persistence mechanism |
| JUnit | 4.13.2 | Test (1 test file: `CanonicalStateTransitionsTest.kt`) |

### Build & CI
| Item | Value |
|---|---|
| Build tool | Gradle 9.6.0 (wrapper, Kotlin DSL) |
| Android Gradle Plugin | 9.4.1 |
| Modules | single module `:app` (settings.gradle.kts) |
| CI | GitHub Actions: `mufil-2-ui-verify.yml` (Java 17 temurin, SDK 37, `:app:compileDebugKotlin` + `:app:assembleDebug`, runs `Mufil-2/tools/ui_closed_loop_audit.py`), `apply-mufil2-import.yml` (applies ordered `.patch` files, verifies 400 screens / 428 kt / 404 registry rows) |

### Structural Census
- 435 `.kt` files; `ui/` split into `design`, `navigation`, `state`, `screens/` (22 family packages: auth, onb, tod, cam, bar, fno, fpl, fsh, rcp, trs, trn, wrk, sor, rdy, exr, cal, prg, pro, dev, bil, war, sys), `components`, `master`, `dev`.
- 400 domain screens; 4 master dashboards (Today, Fuel, Train, Progress).

### Diagnostic Findings (declared deps vs reality)
1. **UI-shell only.** No Room/SQLite, no Retrofit/Ktor/OkHttp, no DI (Hilt/Koin), no WorkManager, no coroutines declaration, no Wear module. The canonical app cannot persist structured data or talk to a network — consistent with `versionName = 0.1-ui-prototype` and the README's reconciliation framing.
2. **DataStore is the only state persistence**, plus in-memory UI state (`ui/state`, `CanonicalStateTransitionsTest`).
3. **Single-module Gradle** despite a 400-screen surface — no feature modularization yet.
4. `android.builtInKotlin=true` + separate Compose compiler plugin = modern AGP 9 model (not a migration fossil).

## Layer 2 — Reference Import: `imports/movefule_1/` (TypeScript backend/algorithms)

| Item | Value |
|---|---|
| Runtime | Node **>= 22.6**, ESM (`"type": "module"`) |
| Language | TypeScript 5.8.3, run natively via `node --experimental-strip-types` (no ts-node/bundler) |
| Package manager | npm@10.9.2 with committed `package-lock.json` |
| Runtime deps | **None** — backend has zero runtime dependencies (node builtins only); devDeps: typescript + @types/node |
| Backend domain modules | `appwrite`, `billing`, `calendar`, `device`, `diet-intelligence`, `foundation`, `health`, `meal`, `notification`, `nutrition`, `privacy`, `progress`, `report`, `http`, `domain`, `bootstrap` |
| Tests | `node --test` native runner; ~150 test files across nutrition/foundation/meal/training/sync |
| Contracts | `contracts/codegen/generate-contracts.mjs` with `--check` gate in `verify` script |
| Algorithms | `algorithms/training/src` (TS) |
| Backend platform | **Appwrite** (src/appwrite + `infra/deployment/appwrite-function-deployment.md`, function variables templates) |
| Deployment | Appwrite Functions; `movefuel-exercise-data/func` is a CommonJS function package; env via `--env-file` + private configuration env templates |
| Verification scripts | `config:check`, `production-preflight`, migration dry-run/preflight/watch-preflight |

### Migration-Fossil / Drift Checks
- No `.js.map` anywhere → no hidden compiled-source divergence.
- `imports/movefule_1/Mufil-2/` is a complete duplicate of the canonical app tree (by design — frozen snapshot for reconciliation), and `imports/mufil2/` holds 21+ ordered `.patch` files used by CI to reconstruct the baseline.
- No Dockerfile / docker-compose anywhere → no containerized deployment.

## Layer 3 — Tooling & Data

| Item | Technology |
|---|---|
| Reconciliation tooling | Python 3 (`tools/compare_source_manifests.py`, `source_snapshot_inventory.py`; `Mufil-2/tools/ui_closed_loop_audit.py` runs in CI) |
| Database blueprints | Azure SQL (81-table core + drafts: 29 additions, 15 barcode, 141 training) and SQLite (32 phone offline, 4 wear offline); `.db` binaries committed for 3 live DBs |
| UI control plane | CSV registries (`ui/SCREEN_REGISTRY_404.csv`, control audit, button-action contract) |
| Agent tooling | `.opencode/` with `@opencode-ai/plugin` 1.18.31 + prebuilt `code-graph.db` |
| Root `.env.example` | `DEEPSEEK_API_KEY=` (empty; likely for tooling, not the app) |

## Dependency Health

| Layer | Health | Notes |
|---|---|---|
| Android app | Good | Small, current library set (Compose BOM 2026.09, AndroidX current majors). Only JUnit 4 (legacy but low risk). |
| TS backend | Good | Zero runtime deps removes most supply-chain surface; TypeScript 5.8.3 pinned with lockfile. |
| Python tools | Unknown/pinless | No requirements.txt / pyproject — relies on system Python (stdlib-only scripts observed at root `tools/`). |
| Gradle plugins | Current | AGP 9.4.1, Gradle 9.6.0, Kotlin 2.2.10. |

## Trigger Signals (for downstream skills)

| Signal | Confidence | Routes to |
|---|---|---|
| Mixed language ecosystem (Kotlin + TS + Python + SQL) across canonical/reference layers | MEDIUM | affects all Track B phases; `classify-repo-artifacts` mandatory |
| Custom CI tool `Mufil-2/tools/ui_closed_loop_audit.py` gates the build alongside Gradle | MEDIUM | `analyze-build-pipeline` |
| Multi-source reconciliation with patch-based reconstruction (CI applies 21+ patches) | MEDIUM | `trace-codebase-provenance` |
| Canonical app is a UI shell with no persistence/network — behavior depends entirely on in-memory state | MEDIUM | `trace-data-flows`, `simulate-behavior` applicability |
| No agent runtime discovered in canonical app; reference backend has no AI runtime either (Appwrite functions only) | LOW | `analyze-agent-loop` likely N/A — will verify in Phase 2 |

## SECURITY_SIGNAL

| Signal | Severity | Evidence |
|---|---|---|
| Secrets hygiene positive | INFO | `.gitignore` blocks `.env*` (except example), keys, certs, `secrets.*`; only TEMPLATE env files in `infra/deployment/`; root `.env.example` empty |
| Root `.env.example` declares `DEEPSEEK_API_KEY` for repo-root tooling | LOW | If tooling runs with a real key in `.env`, ensure it is never committed; gitignore already covers `.env` |
| Appwrite function variables via checked-in templates only | LOW | `MoveFuel-Appwrite-Function-Variables-TEMPLATE.env` — verify no real values ever committed (Track B provenance will re-check) |
| No container/supply-chain surface | INFO | No Dockerfiles, no remote-fetching build steps outside standard Gradle/Android SDK downloads in CI |
| No outdated-CVE dependency evidence at manifest level | INFO | Runtime dep surface is near-zero (AndroidX only; zero TS runtime deps) |

## Output Contract

- File: `docs/analysis/tech-stack.md`
- State: `identifying-tech-stack: complete` appended to `docs/analysis/.state`
- Next: Track A — `mapping-architecture`
