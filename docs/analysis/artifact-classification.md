# Artifact Classification — MoveFuel 2

**Skill:** classify-repo-artifacts
**Status:** complete
**Date:** 2026-09-22
**Prerequisites read:** `provenance.md`, `architecture.md`

---

## 1. Category Breakdown

Total tracked/working files (excl. `.git`, `.opencode/node_modules`, build dirs, `.gradle`): **2,234**

| Category | Files | Where | Notes |
|---|---:|---|---|
| **Core — canonical app (presentation)** | ~437 | `Mufil-2/app/src/main` (434 kt, res, manifest) | 400 screens + state + navigation + components. High volume, low logic density (see §3) |
| **Core — reference domain logic** | ~214 | `imports/movefule_1/services/backend/src` (198 ts) + `algorithms/training/src` (16 ts) | Highest business-rule density in repo; Appwrite backend + Training Engine 5 |
| **Core — app tests** | 1 | `Mufil-2/app/src/test` | The only app test |
| **Tests — reference** | 173 | `imports/.../src/tests` | Nutrition/foundation/meal/training/sync suites |
| **Generated / derived** | ~10 | `contracts/generated` (3), `Mufil-2/audit/*.csv` (7 copies, CI-byte-compared) | Provenance-verified |
| **Reference prototypes** | ~40 | `imports/movefule_1/UI-Test` (HTML/CSS/JS prototype + docs) | **Pre-Kotlin design contract**: "UNKNOWN is never zero", "planned ≠ consumed", "draft AI not canonical" |
| **Infrastructure** | ~12 | `.github/workflows` (2), Gradle files, `tsconfig.production.json`, package.json(s), CI scripts | |
| **Governance / evidence** | ~156 | `docs` (30), `qa` (102 dumps/screenshots), `ui` (4 CSVs), `database` (20 SQL blueprints + `.db` data), `tools` (2 py) | Not runtime code; controls decisions |
| **Frozen snapshots (reference)** | ~1,554 total in `imports/` | includes backend 371, UI-Test ~40, patches 21, `Mufil-2` duplicate, apps, contracts, infra, docs | Per registry: comparison-only |
| **Tooling state** | 5 + db | `.opencode/` (code-graph.db, package files) | Not analysis evidence |

### Signal-to-Noise Ratio

| Measure | Value |
|---|---|
| Canonical app core / total | ~437 / 2,234 = **19.6%** |
| All core (app + reference domain) / total | ~651 / 2,234 = **29.1%** |
| Governance + evidence + frozen reference / total | ~71% |

**Reading:** For a reconciliation monorepo this is expected and healthy — the majority of files are *deliberately* non-runtime (frozen sources, manifests, audits, evidence). The noise is governed noise, not accidental clutter: every reference tree is registered, hashed, and barred from production imports (verified in provenance pass).

---

## 2. Domain-Logic Test (concrete applications)

| Module | Identifier stripped → remaining logic | Verdict |
|---|---|---|
| `CanonicalStateStore.activatePlan` | refuses activation unless a real (non-`pending-engine`) revision reference exists | **CORE rule** (draft≠active gate) |
| `CanonicalStateStore.confirmFood` | increments confirmed count, marks sync pending, clears draft source | **CORE rule** (draft≠consumed) |
| `CanonicalStateStore.commitWorkoutSummary` | only commits after summary phase; never mutates prescription fields | **CORE rule** (planned≠performed) |
| `invalidation-boundary.ts` (backend) | decides which derived states are invalidated by an event | **CORE rule** |
| `program-engine.ts`, `progression.ts`, `scoring.ts` | training program generation + progression constraints | **CORE domain** |
| `portionEstimator.ts`, `imageEstimatePipeline.ts` | food-mass estimation from evidence, with confidence/limitations | **CORE domain** |
| `MFScreenFrame` + 400 screens | render given labels/routes; no rules beyond registry fallback | **Support/presentation scaffolding** (wears core clothing) |
| `MoveFuelRoute` (404-value enum) | data only | Support |
| `ui_closed_loop_audit.py` | encodes project constraints (400/404, four nav, invariants) | **Support (governance)** with embedded project rules |

---

## 3. Entropy Analysis

### High information density (≥2σ candidates — all verified as genuine, not obfuscated)

| Artifact | Density driver | Classification |
|---|---|---|
| `imageEstimatePipeline.ts` (650 lines) | staged vision pipeline, provider adapters, confidence logic | Core (reference) |
| `portionEstimator.ts` (491) | multi-method portion math with uncertainty | Core (reference) |
| `calendar-service.ts` (509) | conflict/placement rules | Core (reference) |
| `MoveFuelNavGraph.navigate` (54-line lambda) | 8 guard branches, route substitution, state writes | Core — **but misplaced policy** (see code-quality.md 3.5) |
| `ui_closed_loop_audit.py` | 22 assertions in ~150 lines | Support/governance |
| `openRouterFoodSceneAdapter.ts` (506) | provider protocol handling | Core (reference) |

### Low information density (scaffolding/generated)

| Artifact | Why low | Classification |
|---|---|---|
| 400 screens (66-line avg, uniform structure) | template: frame + blocks + labels | Presentation scaffolding |
| `MoveFuelRoute.kt` (408 lines) | enum listing | Data/scaffold |
| `contracts/generated/*` (3 files) | pure type boilerplate | Generated |
| `SCREEN_REGISTRY_404.csv`, audit CSVs | tabular data | Governance data |
| `imports/mufil2/*.patch` (21) | mechanical diffs | Build inputs (derived from git history) |

### Naming entropy

- **High (unique business vocabulary):** backend `domain/` (`invalidation-boundary`), `sync-store`, nutrition/vision/portion modules; app `ui/state` (`CanonicalAppState`, `WorkoutExecutionState`, `FoodDraftSource`).
- **Low (repetitive):** screens (`XXX###…Screen`), route enum, registry keys, generated contracts.
- No module classified core on the strength of its name alone — all passed the §2 domain test.

---

## 4. Validation Against Provenance Map

| Check | Result |
|---|---|
| Every generated file appears as derived | ✅ contracts (3), audit copies (7), `.db` data files |
| Any core file actually generated? | ✅ None — codegen `--check` passes; no hidden handcrafting in generated outputs |
| Any generated file misclassified as core? | ✅ None |
| Entropy outliers genuine (not obfuscated/vendored)? | ✅ All are domain algorithms or policy; no minified/vendored code anywhere |
| Low-naming-entropy files passing the domain test? | ❌ None — repetitive modules are all scaffolding/data |
| Frozen reference barred from production imports | ✅ Verified (0 references in app/backend src) |
| **Residual uncertainty** | ⚠️ Patches in `imports/mufil2/` are constrained by **count assertions** (400/428/404) but not content hashing. A malicious/incorrect patch could alter a file while preserving counts. Provenance relies on trust in the patch commit history — no automatic content verification against an external baseline exists in-repo. |

## 5. Adversarial Lens

- **Generated contracts** — verified output == generator output (drift gate). Nothing hiding.
- **UI-Test HTML prototype** — pure reference; not wired to any build (no HTML step in any pipeline). Could be mistaken for production web assets by a naive reader; the README explicitly scopes it as isolated prototype.
- **Patch-based source** — the strongest hiding spot in this repo: patches *are* the source of a whole app tree, and only counts are asserted. Reviewed commits mitigate this, but a content-level manifest comparison against SRC-001 (like `SRC001_MOVEFULE1_FILE_MANIFEST.csv`) would close the loop. *(Note: the tool `tools/compare_source_manifests.py` exists precisely for manifest comparison — see whether it covers patches in Phase 3/4 recommendations.)*

## 6. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| Patch content not hash-verified in CI | MEDIUM | Count assertions only; supply-chain integrity of the baseline tree rests on commit review |
| Derived audit copies can drift silently if CI skipped | LOW | `cmp` runs only in the bootstrap workflow; local `Mufil-2/audit` could diverge |
| No other issues | INFO (positive) | Generated code honest; reference trees isolated; no vendored/minified code; no credentials in classified artifacts |

## 7. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| High-density domain logic concentrated in reference backend + algorithms | MEDIUM | `trace-data-flows` should cover nutrition/training pipelines |
| Verification-by-counts only for patches | MEDIUM | Phase 4 recommendation; `simulate-behavior` scenario |
| UI-Test prototype as design contract (invariants) | LOW | Phase 4 intent narrative ("UNKNOWN is never zero" lineage) |

## 8. Output Contract

- File: `docs/analysis/artifact-classification.md`
- State: `classify-repo-artifacts: complete`
- Next: Track B Phase 2 — `trace-data-flows`
