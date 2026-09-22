# Track A Summary — MoveFuel 2

**Skills:** identifying-tech-stack · mapping-architecture · tracing-dependencies · detecting-dead-code · inventorying-api-surface · analyzing-code-quality
**Status:** complete
**Date:** 2026-09-22

---

## Target in One Paragraph

MoveFuel 2 is a **reconciliation monorepo** holding (a) a canonical Android Kotlin/Compose UI shell (`Mufil-2/`, 435 kt files, 400 screens, `0.1-ui-prototype`, DataStore-backed canonical state, no network/DB), (b) a frozen, fully tested reference backend (`imports/movefule_1/`, Node 22 + TS, Appwrite, 64 endpoints, codegen contracts for TS/Kotlin/Swift), (c) SQL blueprints (Azure SQL + SQLite), and (d) heavy governance (registries, audits, CI enforcement, patch-based reconstruction).

## Highest-Value Findings

1. **The canonical app is intentionally a UI shell** — no auth, no network, no database library; all state is a 16-field local aggregate with strict null-vs-zero semantics.
2. **`MoveFuelNavGraph` is the real product brain** — routing + guards + transitions + lifecycle in one 637-line hub (highest churn×complexity).
3. **The tested transition logic is not the shipped transition logic** — `CanonicalStateTransitions` (pure, tested) vs `CanonicalStateStore` (shipped, untested).
4. **Contracts exist but aren't consumed** — generated Kotlin contracts (`com.movefuel.contracts.v1`) are absent from the app; local enums are simplified look-alikes.
5. **Reference backend is production-shaped** — centralized auth gate, typed errors, env-driven capability flags, 169 test files, zero runtime deps.
6. **Dead code is tiny and benign** — MotionLab orphan, 2 dead TrainStateStore APIs, one stale comment overstating an unused method as an "audited boundary".

## Signal Aggregation

| Priority | Signal | Routed To | Status |
|---|---|---|---|
| HIGH | Patch-based reconstruction + verified SHA + generated contracts (provenance) | trace-codebase-provenance | scheduled |
| HIGH | Hidden/parallel module trees (`imports/`, `sources/`) | classify-repo-artifacts | scheduled |
| HIGH | CI-enforced build (counts, patches, python audit) | analyze-build-pipeline | scheduled |
| HIGH | Env-driven feature flags (`/v1/config`, `/v1/bootstrap`, provider keys) | map-feature-gates | scheduled |
| HIGH | Chain workflows + lifecycle clusters (meal, sync, workout, train) | trace-data-flows, simulate-behavior | scheduled |
| MEDIUM | Duplication + gating logic untested | code-quality recommendations; simulate-behavior | captured |
| MEDIUM | `MOVEFUEL_PYTHON_BIN` cross-runtime exec boundary | analyze-build-pipeline, trace-data-flows | scheduled |
| MEDIUM | Package cycle state↔navigation | refactoring candidate | captured |
| LOW | No dynamic imports, no hidden runtime dispatch in app | extract-tool-graph scope adjustment | captured |

**Security posture:** No secrets committed (templates only); backend fails closed; no auth exists in app (nothing to bypass yet); the main security-adjacent concern is **untested gating logic in the highest-churn file** and a **stale comment mislabeling a dead method as the audited activation boundary**.

**HIGH-priority items are pre-authorized** — the user requested full analysis ("all of it"), and every HIGH signal routes to an already-scheduled Track B skill. Proceeding without pause.

## Track A Artifacts

| File | Contents |
|---|---|
| `target-classification.md` | Monorepo classification, obfuscation check, applicable skills |
| `tech-stack.md` | Layers, versions, dependency health, diagnostics |
| `architecture.md` | Layer maps, coupling, god-module findings, security signals |
| `dependencies.md` | Import graph, cycles, fan-in/instability, env contracts |
| `dead-code.md` | Orphans, test-only code, dead APIs, keep-for-compat list |
| `api-surface.md` | App implicit surface, 64 backend endpoints, contracts system, chains |
| `code-quality.md` | Hotspots, anti-patterns, gradient, recommendations, security signals |
