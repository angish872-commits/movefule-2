# Build Pipeline — MoveFuel 2

**Skill:** analyze-build-pipeline
**Status:** complete
**Date:** 2026-09-22
**Prerequisite read:** `provenance.md`
**Live verification:** ran `python3 Mufil-2/tools/ui_closed_loop_audit.py` → all 22 checks PASS (exit 0)

---

## 1. Pipeline Map (three independent pipelines)

### Pipeline A — Canonical Android App (`Mufil-2/`)

```
[CI] python3 tools/ui_closed_loop_audit.py      ← 22-check source gate (runs FIRST)
      │
      ▼
[Gradle 9.6.0]  :app:compileDebugKotlin          ← Kotlin 2.2.10 + Compose compiler plugin
      │                                            (no kapt/ksp, no codegen, no annotation processing)
      ▼
[D8] dex                                        ← debug build: no R8/minify (release default also off)
      │
      ▼
[Package] app-debug.apk                         ← no flavors, no buildConfig, no resource shrinking,
                                                   empty proguard-rules.pro (touched by CI)
```

- **Variants:** `debug` + `release` only; no product flavors, no build types customization, no BuildConfig generation → **build shapes almost nothing**; source ≈ artifact.
- **CI:** `.github/workflows/mufil-2-ui-verify.yml` — Python audit → Android SDK 37 install → `:app:compileDebugKotlin` → `:app:assembleDebug`. Uses `gradle-version: current` (i.e., NOT the pinned wrapper; wrapper files are untracked locally).
- **No code generation, no build-time constants, no filtering** beyond compiler defaults.

### Pipeline B — Snapshot Reconstruction (bootstrap branch, pre-build source shaping)

```
imports/mufil2/*.patch (21, ordered by source commit SHA)
      │  git apply --check → git apply
      ▼
restore API-omitted files (ui/audit/*.csv → Mufil-2/audit/)
      │
      ▼
assert: 400 domain screens, 428 kt files, 404 registry rows, CSV byte-equality
      │
      ▼
commit Mufil-2 snapshot to bootstrap/movefuel-2-foundation
```

Triggered by push to `bootstrap/*` touching `imports/mufil2/READY`. This pipeline **shapes the source tree itself** — the only pipeline that can create/alter production files from declarative inputs. It runs only for the bootstrap branch (not current dev branches).

### Pipeline C — Reference Backend (no build output; verify-gated runtime)

```
contracts/canonical/v1/contracts.json
      │  generate-contracts.mjs            ← CODEGEN (TS + Kotlin + Swift)
      ▼
generated/typescript … ── imported by backend src (calendar, privacy, today)
generated/kotlin …      ── NOT consumed by any build (gap)
generated/swift …       ── unused (future iOS)

npm run verify = contracts:check (drift gate) → tsc --noEmit (strict typecheck) → node --test (169 files)
npm start      = node --experimental-strip-types src/server.ts   ← types stripped at RUNTIME, no emit
npm run start:configured = same + --env-file=…/MoveFuel-Private-Configuration.env
```

- **Transformation chain:** TS source → (runtime strip-types) → Node 22 execution. Typechecking is a *separate gate*, not part of execution. No bundler, no transpiler output, no minification. Source semantics preserved exactly.
- **Broken script found:** `nutrition:evidence:simulate` runs `npm run build && node dist/…` — but **no `build` script exists** and `tsconfig` has `noEmit: true`. This script cannot succeed. (dead pipeline branch)
- **Preflight set:** `migration:dry-run|preflight|watch-preflight`, `deployment:preflight`, `config:check` — operator gates for production.

## 2. Filtering Report

| Filter | Where | What it does |
|---|---|---|
| Python audit gate | CI before compile (Pipeline A) | Fails build on structural drift: registry=404, ≤380 semantic actions mapped, route coverage, bottom-nav=4, train-state routing, feature-specific string assertions |
| Patch application | Pipeline B | Selects exactly the 459-file snapshot; refuses overwrite if `Mufil-2/` exists |
| Count assertions | Pipeline B, CI | 400/428/404 exact equality; CSV `cmp` byte-equality |
| `contracts:check` | Pipeline C | Fails if generated files drift from `contracts.json` |
| tsc `noEmit` | Pipeline C | Types checked; no compiled artifacts to drift |
| `.gitignore` | repo | Build outputs, `.env*`, keys, `.reconciliation-cache/` excluded |
| R8/minify | Android | **Disabled** (default) — no dead-code stripping or renaming in artifacts |

## 3. Code Generation

| Generator | Input | Output | Consumer | Status |
|---|---|---|---|---|
| `generate-contracts.mjs` | `contracts.json` (19 enums, ~40 records) | TS, Kotlin, Swift | Backend (TS: 5+ modules); Kotlin/Swift unused | ✅ Current (`--check` passes) |
| CI import | 21 patches | `Mufil-2/` snapshot | Android build | ✅ Deterministic |
| Audit-file copy | `ui/audit/*.csv` | `Mufil-2/audit/*.csv` | Audit + registry | ✅ Byte-compared |

No other codegen (no protobuf, GraphQL, OpenAPI, annotation processors, kapt/ksp).

## 4. Build-Time Constants

**None found.** No `DefinePlugin`/equivalent, no BuildConfig fields, no injected version constants, no conditional source sets. Version/name live in `app/build.gradle.kts` literals (`0.1-ui-prototype`). Backend reads all configuration at **runtime** via env vars.

## 5. Build Dimension Catalogue (axes)

```
AXIS: BUILD_VARIANT (Android)
  Values: debug, release
  Mechanism: AGP defaults (no customization)
  Impact: none observable — minify off in both; artifacts semantically identical

AXIS: ENVIRONMENT (backend runtime)
  Values: local / development / production (MOVEFUEL_ENV)
  Mechanism: --env-file + process.env reads at startup
  Impact: fixtures vs Appwrite persistence; auth-mode default (local-test vs appwrite);
          deterministicFixtureProvider enabled only when env≠production

AXIS: PROVIDER (backend runtime capability)
  Values: appwrite, openrouter, gemini, usda/fdc, openfoodfacts (presence per key)
  Mechanism: env var presence → capability booleans in /v1/config and /v1/bootstrap
  Impact: meal analysis, packaged food lookup, trusted FDC nutrition, image estimates,
          billing, runtime auth — features switch on/off without code change

AXIS: BRANCH / TRIGGER (CI)
  Values: bootstrap (import pipeline), any push with Mufil-2 change (verify pipeline)
  Mechanism: workflow `on:` filters + READY marker file
  Impact: source reconstruction vs verification-only

AXIS: RUNTIME (backend)
  Values: node strip-types (all), python subprocess (portion calibration via MOVEFUEL_PYTHON_BIN)
  Mechanism: child_process spawn
  Impact: cross-runtime execution surface (see security)
```

## 6. Adversarial Findings — Build Gate Integrity

### 6.1 The audit gate passes on a COMMENT (HIGH — process integrity)

`ui_closed_loop_audit.py` check `trs_020_activation_is_action_and_persists_active` asserts the string `"TrainStateStore.markActive(context)" in nav_text`. Verified live:

- The **only** occurrence of that string in `MoveFuelNavGraph.kt` is a **comment** (line 172): `// TrainStateStore.markActive(context) remains the audited activation boundary;`
- The real runtime path calls `CanonicalStateStore.activatePlan(context)` inside `activateTrainPlan`.
- Therefore the gate that certifies "activation persists" is satisfied by documentation text, not by the code it claims to verify. If dead-code cleanup removes the comment (recommended in `dead-code.md`), **the CI gate will fail** while the real behavior stays identical.

Root cause: the audit is a string-presence checker, not a behavior test. Several other checks work the same way (e.g., `"state.nextAction" in today_text`). This makes the gate simultaneously **brittle** (breaks on harmless rewording) and **gameable** (comments satisfy it).

### 6.2 Injection surfaces

- **Pipeline B (patches):** patches are committed in-repo and applied by CI with `git apply` — reviewable, but any PR to `imports/mufil2/` + `READY` can reshape the baseline tree on bootstrap branches. Scope: bootstrap branch only.
- **Gradle plugin resolution:** `google()` + `mavenCentral()` with **no dependency verification metadata and no lockfiles** — standard but unverified supply chain; a compromised plugin/dependency would execute in CI and developer machines.
- **Untracked wrapper** (`gradlew`, `gradle/wrapper/*`): local builds use whatever Gradle is on PATH (or a newly generated wrapper), while CI uses `gradle-version: current` — no pinned, verified distribution across environments.
- **Python audit** executes in CI before compile; it only reads files (no writes/network observed).
- **Backend:** no postinstall scripts; zero runtime deps; `MOVEFUEL_PYTHON_BIN` spawn is the only cross-process execution (operator-controlled env).

## 7. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| CI gate certified by comment text | **HIGH** | `trs_020_activation_is_action_and_persists_active` passes on a stale comment; the check will break on cleanup and never actually tested the activation path. Fix: assert on `CanonicalStateStore.activatePlan(context)` / onTrsActivation symbol, ideally with a real unit test. |
| No Gradle dependency verification/locking | MEDIUM | Supply-chain exposure for Android builds (plugin classpath executes arbitrary code at build time). |
| Wrapper not committed, CI not pinned to wrapper | MEDIUM | Reproducibility/trust gap: local vs CI toolchains differ; a malicious local wrapper could be used unnoticed. |
| Patch pipeline reshapes source | MEDIUM (contained) | Powerful by design; restricted to bootstrap branch; patches reviewable. Ensure branch protections on `bootstrap/*`. |
| Private config env absent + gitignored; templates only | INFO (positive) | Scripts reference `MoveFuel-Private-Configuration.env`; file exists only on operator machines (ignored by git). Verified absent locally. |
| No build-time constant injection / no build-time secrets | INFO (positive) | Nothing sensitive enters the artifact from the build. |
| Broken `nutrition:evidence:simulate` script | LOW | Calls nonexistent `npm run build` + `dist/` (noEmit) — will always fail; confusion risk, no security impact. |
| Minify disabled | INFO | Artifacts stay readable (good for audit, irrelevant for security now — no secrets in app). |

## 8. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| Build conditions filter capabilities (runtime env → feature map) | HIGH | `map-feature-gates` (primary input) |
| Environment-specific code paths (local-test vs appwrite; fixture provider) | HIGH | `trace-data-flows`, `map-feature-gates` |
| Code generation step (contracts) | MEDIUM | provenance already verified; note Kotlin output unconsumed |
| String-based audit gate | MEDIUM | `simulate-behavior` scenario: "cleanup removes comment → CI fails" |
| No build-time injection | LOW | no escalation |

## 9. Output Contract

- File: `docs/analysis/build-pipeline.md`
- State: `analyze-build-pipeline: complete`
- Next: Track B Phase 2 — `classify-repo-artifacts`
