# Codebase Analysis Report

**Date:** 2026-09-22
**Target:** `/Users/ariksapkota/Development/MoveFuel 2` — MoveFuel 2 canonical integration repository
**Pipeline:** codebase-analyzer — classify-analysis-target → Track A (6 skills) → Track B Phases 1–3 (9 skills) → reconstruct-system-intent
**Platform:** OpenCode (no agent dispatch — inline analysis; degraded traces marked `partial` in individual files)
**Branch analyzed:** `state/canonical-domain-integration-2026-09-21` @ `1d66712`

---

## Executive Summary

MoveFuel 2 is a **two-day-old reconciliation monorepo** building the canonical next-generation MoveFuel: an offline-first, evidence-driven fitness/nutrition platform. It contains a deliberately limited Android UI shell (400 screens, `0.1-ui-prototype`, no network/DB/auth), a **production-grade reference backend** (64 endpoints, 169 test files, Appwrite persistence, contract codegen for TS/Kotlin/Swift, sync integrity with payload hashes, consent-gated AI privacy), SQL blueprints for an 81-table core, and exceptionally disciplined governance (frozen sources with verified hashes, 22-check CI audit, a 167-algorithm reconciliation registry). The most important findings: the **moat lives in the domain/sync/privacy layer**, not the UI; and the system's only serious security gap is a **conditional auth-impersonation path when `MOVEFUEL_ENV` is omitted in a deployment** (`LocalTestSessionProvider`), currently mitigated only by an operator-run preflight.

---

## Track A: Code Quality Findings

| Area | Finding | Reference |
|---|---|---|
| **Target** | Monorepo: Android app + reference backend + SQL blueprints + governance; no obfuscation; 19.6% of files are canonical app core | `target-classification.md`, `artifact-classification.md` |
| **Tech stack** | Kotlin 2.2.10/Compose BOM 2026.09, AGP 9.4.1, Gradle 9.6, Java 17, DataStore-only persistence; Node ≥22.6 + TS 5.8 (runtime type-stripping, zero runtime deps), Appwrite, USDA/OpenRouter/Gemini/OpenFoodFacts | `tech-stack.md` |
| **Architecture** | `MoveFuelNavGraph` is the real orchestrator (637 lines; routes + gates + transitions); screens are template shells via `MFScreenFrame`; state is a 16-field canonical aggregate with strict null-vs-zero semantics; **no runtime link yet** between app, backend, and DB blueprints | `architecture.md` |
| **Dependencies** | Stable core (`design`/`navigation`/`components` fan-in 405–420); one package cycle `state ↔ navigation`; 4 hidden bounded contexts (train/food/workout/sync lifecycles); 19 env-var implicit contracts; zero runtime deps in backend | `dependencies.md`, `data-flows.md` |
| **Dead code** | Small and benign: `MotionLab.kt` orphan, `CanonicalStateTransitions` (test-only), `TrainStateStore.markActive`/`reset`, `beginFoodDraft` (never called); **stale comment claims a dead method is the "audited activation boundary"** | `dead-code.md` |
| **API surface** | App: 404 routes + implicit contracts (paths, screen IDs, DataStore keys); Backend: 64 endpoints, single dispatcher auth gate, typed error envelope, env-driven feature maps; contracts v1 (reject-unknown-enum) **not yet consumed by the app** | `api-surface.md` |
| **Code quality** | App: B− (impeccable edges, middle-layer debt, 1 test for 435 files); Backend: A− (169 tests / 198 files, no TODO debt); hotspots = NavGraph, MFScreenFrame, master dashboards | `code-quality.md` |

### Prioritized refactoring (impact/effort)
1. Store ↔ transitions single implementation + store tests (S effort) — eliminates tested-vs-shipped divergence.
2. Extract NavGraph policy into testable functions (M) — defuses highest churn×complexity file.
3. Unit-test the gating rules (train entry, plan activation, food confirmation, workout commit) (M).
4. Single source of truth for flow actions (registry vs inline) (M).
5. Error handling around DataStore writes (S).

---

## Track B: System Intelligence Findings

### Provenance & Integrity (highly mature)

- **Derivation chain verified:** external source (`movefule_1` @ `699bf3d6`) → 21 ordered patches (named by source commits) → CI-reconstructed 459-file snapshot (`3ffbb28`, tree `6875fa95…`) → 83 modified + 9 added + **0 deleted** files → current tree (468 entries).
- **Verified claims:** 400 screens / 428 kt / 404 registry rows / 81+32+4 tables / SRC-002 sanitized SHA `e511b87b…` (file-level hash confirmed) / contracts codegen current.
- **Gaps:** 15 untracked working-tree items (entire `imports/` tree, live SQLite DBs 030/031/032, Gradle wrapper, `.opencode/`); registry lists only the raw SRC-002 SHA beside the sanitized local path (checksum-audit trap); patch content verified by **counts only**, not content hashing.

### Build Pipeline

- Three pipelines: app (Python 22-check audit → Gradle compile → APK; no flavors/minify/codegen), bootstrap reconstruction (patch apply + count asserts), backend (codegen drift gate → strict typecheck → 169 tests; no build output; runtime type-stripping).
- **SECURITY_SIGNAL — audit gate passes on a comment:** the CI check certifying the train-activation boundary asserts a string that exists only in a comment (`TrainStateStore.markActive(context)`); the real call is `CanonicalStateStore.activatePlan`. Removing the dead method/comment (recommended) **will fail CI** while behavior is unchanged.
- Broken script (`nutrition:evidence:simulate`); no Gradle dependency verification/locking; wrapper untracked.

### Gates & Behavior (conditional surface map complete — no dynamic registration anywhere)

- **Five gate types mapped** (build/runtime/permission/provider/config) across 64 endpoints, 404 routes, operator CLIs.
- **Privacy gates are real:** image analysis blocked pre-provider without consent (`meal_image_analysis_consent_required`); model-improvement learning opt-in gated.
- **Sync integrity is strong:** sha256 `payloadHash`, idempotency keys, `SyncOutcome`/`RetryClass` state machines; owner-scoped data access via request-scoped Appwrite JWT (never admin key).
- **Simulation revealed:** the production/staging/misconfig state space is safe **except S1** (below); billing is deliberately unreachable until a verifier exists; production boot fails closed on missing Appwrite config.

### LLM / Prompt Surface

- No agent loop (verified), no system prompts. The single vision prompt is **over-enforced by code** (forbidden-nutrition-key scan, confidence clamp ≤0.65, portion range forcing, assumption filtering). Model non-compliance cannot corrupt canonical data because draft→confirm is the only write path.

### Threat Model (what it could do if misused)

| Capability | Worst case | Current control |
|---|---|---|
| 64 authenticated endpoints | Full user-data access via impersonation **if run in non-production mode** | Appwrite sessions in production; preflight (manual) |
| Image pipeline | Third-party vision exposure of meal photos | Consent gate, retention prefs, purge lifecycle |
| Owner-scoped persistence | Cross-user reads | `userScopedKey` + JWT-scoped repos (held in simulation) |
| Webhooks | Forged billing events | Always reject until verifier implemented |
| Operator CLIs | Migration/config changes | Operator possession + env-file |

---

## System Intent Narrative

### Q1 — What is this system designed to become? *(confidence: HIGH)*

A full production platform: offline-first mobile + Wear client (400 screens, 4 dashboards) backed by a canonical service layer (sync/reconciliation, meal vision evidence pipeline, Training Engine 5, calendar, targets, privacy/consent, billing), with cross-platform contracts (Kotlin/TS/Swift) implying an iOS/watchOS future, and a **167-algorithm canonical registry with scientific-validation tracking**. The 15-step reconciliation plan and the absent `integration/canonical-build` branch show a gated program: freeze sources → compare by behavior → assign dispositions → only then write canonical code. Evidence: contracts for 3 languages, Wear screens, billing stubs, privacy module, knowledge/calibration artifact gates.

### Q2 — Where is the moat? *(confidence: HIGH)*

**Not the client.** The client is deliberately thin and replaceable (template screens; no logic outside navigation). The moat is the **domain layer + integrity discipline**:
1. Nutrition evidence pipeline (vision → portion estimator → FDC catalog → confidence/limitations, with provider output stripped of authority).
2. Sync reconciliation (revision semantics, payload hashes, idempotency, outcome taxonomy).
3. Training program engine (program state, progression, scoring, readiness, missed-workout/calendar adaptation).
4. Privacy/authority architecture (consent gates, UNKNOWN≠zero, draft≠confirmed, planned≠performed).
These are exactly the modules where complexity concentrates and where replication cost is highest.

### Q3 — What can it do that it does not expose? *(confidence: HIGH for backend, MEDIUM for app)*

| Dormant capability | State |
|---|---|
| Production billing verification | Interface + routes exist; verifier **deliberately unimplemented** (preflight error blocks paid features) |
| Store webhooks | Stubbed, always reject |
| Swift/iOS client | Contracts generated and current; unconsumed |
| Gemini vision provider | Dormant without key (priority-20 fallback) |
| Fixture AI provider | Active in non-production (`deterministicFixtureProvider`) |
| Legacy summary sync | Advertised for old clients |
| `LocalTestSessionProvider` | Unverified bearer identity — dormant in production wiring, but embedded in the runtime default path |
| App: SYS state screens (20) | Navigate generically, no semantic product flows |
| App: onboarding completion / resume | Persisted but write-only (no reader) |

### Q4 — How is behavior really controlled? *(confidence: HIGH)*

**Server-side, environment-driven composition** is the true control plane: capability map (`/v1/config`, `/v1/bootstrap`) is computed from env presence (Appwrite, provider keys, bucket, entitlement mode) and fed to clients; contracts with `unknownEnumPolicy: reject` let the server control the vocabulary universe; an operator preflight gate governs what may run in production. The app is a state machine driven by local gates (TrainState, food/workout lifecycle) — behavior, not prompts, defines capability everywhere.

### Q5 — What are the hidden dependencies? *(confidence: HIGH)*

- **Appwrite** (auth, TablesDB, storage bucket) — hard production dependency; production boot refuses without it.
- **Vision providers** OpenRouter (primary) → Gemini (fallback); **USDA FDC** (nutrition authority); **OpenFoodFacts**; **Python runtime** for portion calibration (`MOVEFUEL_PYTHON_BIN`).
- **Off-repo Notion** architecture governance (referenced as controlling product truth) — external source of authority.
- **Checksummed research artifacts** (knowledge snapshot, calibration profiles, reviewed recipe snapshot) gating camera release.
- **Local tooling state** (`.opencode/` 61 MB) and untracked live databases.

### Maturity Assessment

| Layer | Maturity |
|---|---|
| Governance & provenance | **Unusually mature** (verified hashes, CI assertions, registries) |
| Reference backend | **Production-shaped** (typed errors, tests, fail-closed gates) |
| Canonical app | **Honest prototype** (all 400 screens `PARTIAL_PROTOTYPE`; 1 test; no integration) |
| Overall | Framework complete; **content migration and integration are the next phase** |

---

## Confidence-Weighted Evidence Map

| Finding | Confidence | Evidence | What would strengthen |
|---|---|---|---|
| Monorepo classification, no obfuscation | High | File census, manifests, source reads | — |
| App is a UI shell (no auth/network/DB) | High | Gradle deps, manifest (0 permissions), code greps | — |
| NavGraph is the policy hub | High | Import/call analysis, churn data | Refactoring spike |
| Tested transitions ≠ shipped transitions | High | Two implementations compared; test file imports | Store-level tests |
| Contracts unconsumed by app | High | Grep of `com.movefuel.contracts` (zero hits) | Integration plan |
| Patch chain reconstructs snapshot | High | READY marker, patch names, CI workflow, tree hash | Content-hash verification per patch |
| SRC-002 sanitized hash verified | High | Recomputed SHA-256 match; manifest spot-check | Full manifest verification (all 13 files) |
| Audit gate passes on comment | High | Live run exit 0; string located in comment only | — |
| Env-omission impersonation path (G1) | High (code) / Medium (realized risk) | `LocalTestSessionProvider` wiring, defaults, preflight report | Deployment env audit; boot-time fix |
| Moat = domain/sync/privacy layers | High | Complexity concentration, gate analysis, algorithm registry | Roadmap docs (Notion) |
| iOS/WatchOS planned | Medium-High | Swift contract codegen + Wear screens | Roadmap confirmation |
| 167-algorithm program intent | High | Reconciliation matrix (167 rows), plan steps | Disposition progress |
| No audit logging | High | 4 console statements total; correlationId unstored | — |
| Untracked live DBs / wrapper / imports tree | High | `git status`, ignore checks | Repo hygiene pass |

---

## Priority Actions

1. **Fix the environment-omission auth path (G1).** Make boot refuse (or refuse to wire `LocalTestSessionProvider`) unless `MOVEFUEL_ENV` is explicitly `local`/`development`/`test`. This converts the only HIGH-severity finding into a closed gate, independent of operator discipline. *(Security)*
2. **Repair the CI audit gate.** Replace the comment-satisfied activation check with a symbol assertion (`CanonicalStateStore.activatePlan`) or a real unit test; only then perform the recommended dead-code cleanup without breaking CI. *(Process integrity)*
3. **Unify transition logic and test the gates.** Make `CanonicalStateStore` use `CanonicalStateTransitions`; add unit tests for `trainEntryRoute`, `activatePlan`, `confirmFood`, `commitWorkoutSummary`. *(Correctness)*
4. **Extract navigation policy from `MoveFuelNavGraph`** into a testable `MoveFuelNavigationPolicy`; make the flow registry the single source of action truth. *(Maintainability, churn hotspot)*
5. **Repo hygiene freeze:** commit Gradle wrapper; decide tracked/ignored status for live DBs (030/031/032) and the `imports/movefule_1` tree; add the sanitized SRC-002 SHA to the registry row; remove orphaned `DEEPSEEK_API_KEY` from `.env.example`. *(Provenance/reproducibility)*
6. **Plan the contracts integration seam.** Import generated Kotlin contracts into the app in a dedicated module and define the mapping from local enums (`CanonicalSyncState`, `WorkoutExecutionState`) to contract enums before any backend wiring begins. *(Architecture)*
7. **Remove or fix dead items:** `markActive`, `reset`, `beginFoodDraft`, `MotionLab.kt`, broken `nutrition:evidence:simulate`; either implement onboarding resume or delete write-only onboarding state. *(Hygiene)*
8. **Add mutating-route audit logging** (ids/outcomes only, honoring the privacy posture) to close the forensics gap. *(Security/ops)*

---

## SECURITY_SIGNAL Summary (aggregated across the pipeline)

| # | Signal | Severity | Location |
|---|---|---|---|
| 1 | Non-production default wires unverified `LocalTestSessionProvider` (impersonation via `Bearer local-user:<id>`); only external preflight catches misconfig | **HIGH (conditional)** | `backend-runtime.ts:95-98`, `session.ts:88` |
| 2 | CI gate certifies the activation boundary via a comment string | MEDIUM | `ui_closed_loop_audit.py:118` vs `MoveFuelNavGraph.kt:172` |
| 3 | No request audit logging on any mutating endpoint | MEDIUM | `http/request-handler.ts` |
| 4 | All sensitive self-service endpoints share one dispatcher auth gate (ordering fragility) | MEDIUM | `request-handler.ts:97+` |
| 5 | Untracked live databases with no integrity chain | MEDIUM | `database/**/030..032` |
| 6 | Patch-based source verified by counts, not content hashes | MEDIUM | `imports/mufil2/`, CI |
| 7 | No Gradle dependency verification / locking; wrapper untracked | MEDIUM | `Mufil-2/` |
| 8 | Positive controls (verified): consent gates pre-provider; sync payload hashes + idempotency; owner-scoped JWT repos; `encodeURIComponent` on Appwrite paths; argument-array `execFile` only; config-check never prints values; production fail-closed boot; no secrets committed | INFO | multiple |

---

## Deliverables Index (`docs/analysis/`)

| File | Content |
|---|---|
| `.state` | Pipeline status ledger |
| `target-classification.md` | Monorepo classification, signals, adversarial notes |
| `tech-stack.md` | Layers, versions, diagnostics, dependency health |
| `architecture.md` | Layer maps, coupling, cross-cutting concerns |
| `dependencies.md` | Import graph, cycles, env contracts |
| `dead-code.md` | Orphans, test-only code, dead APIs |
| `api-surface.md` | 64 endpoints, contracts system, chains, implicit surface |
| `code-quality.md` | Hotspots, anti-patterns, recommendations |
| `track-a-summary.md` | Signal aggregation |
| `provenance.md` | Derivation chain, hash verification, deception assessment |
| `build-pipeline.md` | Three pipelines, gates, audit-gate finding |
| `artifact-classification.md` | Core/support/generated/reference breakdown, entropy |
| `data-flows.md` | Entry→validation→persistence→exit, trust boundaries |
| `agent-loop.md` | N/A verdict + substitute state machines |
| `tool-graph.md` | Capability inventory, conditional registration |
| `gate-map.md` | Five gate types, tool-to-gate matrix, hidden capabilities |
| `behavior-simulation.md` | 13 scenarios, gap detection (G1–G6), hardening |
| `prompt-influence.md` | Vision-prompt vs code enforcement |
| `analysis-report-2026-09-22.md` | **This report (terminal deliverable)** |

*Individual skill docs carry their own `Status` lines; degraded phases (no agent dispatch on OpenCode) are marked `partial` and use inline tracing within the 3-level limit.*
