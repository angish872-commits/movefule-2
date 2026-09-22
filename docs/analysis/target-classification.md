# Target Classification — MoveFuel 2

**Skill:** classify-analysis-target
**Status:** complete
**Date:** 2026-09-22
**Analyst:** opencode (codebase-analyzer pipeline)

---

## Target

| Field | Value |
|---|---|
| Path | `/Users/ariksapkota/Development/MoveFuel 2` |
| Git repo | yes |
| Branch | `state/canonical-domain-integration-2026-09-21` |
| Repo size | 272 MB (`.git` 22 MB) |
| HEAD | `1d66712 Integrate canonical state across MoveFuel dashboards` |
| Declared purpose | Canonical integration repository for the next MoveFuel system (README.md) |

## Detected Structure

| Path | Size | Contents | Role (declared) |
|---|---|---|---|
| `Mufil-2/` | 3.1 MB | Android Kotlin Compose app, Gradle KTS, 435 `.kt` files, 400 domain screens + 4 dashboards, proguard | Canonical app baseline |
| `imports/` | 154 MB | Two imported source trees: `movefule_1/` (TypeScript backend `services/backend`, `algorithms/training`, apps, contracts, UI-Test, 21+ patches) and `mufil2/` | Reference/comparison snapshots |
| `sources/` | 24 KB | `src002_old_meaningful_source.zip` | Frozen snapshot (comparison only) |
| `database/` | 5.2 MB | Azure SQL (81-table core, 29 additions, 15 barcode, 141 training) + SQLite (32 phone, 4 wear) + architecture CSVs/ERD | Database blueprints |
| `docs/` | 488 KB | `reconciliation/` plan + registries, `architecture/` source-of-truth docs | Governance/docs |
| `ui/` | 704 KB | 404-screen registry CSV + control audit CSVs | UI control plane |
| `qa/` | 25 MB | Runtime dumps + screenshots | Verification evidence |
| `tools/` | 8 KB | Python manifest/inventory scripts | Tooling |
| `.opencode/` | 61 MB | Pre-existing code-graph.db + node_modules | Tooling state (untracked) |

**File census (excl. `.git`, `node_modules`, `build`):** 1117 `.kt`, 401 `.ts`, 129 `.md`, 101 `.json`, 85 `.xml`, 82 `.py`, 65 `.png`, 39 `.html`, 33 `.csv`, 21 `.sql`, 21 `.patch`, 15 `.sh`.

**Manifests:** `Mufil-2/build.gradle.kts`, `Mufil-2/app/build.gradle.kts`, `Mufil-2/settings.gradle.kts`, `.opencode/package.json`, `imports/movefule_1/movefuel-exercise-data/{production,func}/package.json`.

## Target Type

**MONOREPO** — multi-part system in one repository:

1. **Primary production code:** Android/Kotlin/Compose mobile app (`Mufil-2/`) — offline-first fitness/nutrition product with 400 screens.
2. **Reference layer:** imported TypeScript backend + training algorithms under `imports/` and frozen zips under `sources/` — comparison inputs, not canonical.
3. **Data architecture layer:** SQL blueprints (Azure SQL online + SQLite offline) and training schema maps.
4. **Governance layer:** reconciliation docs, screen registries, QA evidence, Python tooling.

## Obfuscation / Minification Check

- **PASS — no obfuscation detected.** All 1117 Kotlin, 401 TypeScript, 82 Python, and 21 SQL files are plain readable source.
- `.opencode/code-graph.db` is a SQLite index (tooling artifact), not counted as source.
- No `.wasm`, no packed binaries, no single-line minified JS bundles in source paths (one pre-existing `code-graph.db` only).

## Applicable Skills (per target-type matrix)

| Track | Skills |
|---|---|
| Track A | identifying-tech-stack, mapping-architecture, tracing-dependencies, detecting-dead-code, inventorying-api-surface, analyzing-code-quality |
| Track B Phase 1 | trace-codebase-provenance, analyze-build-pipeline |
| Track B Phase 2 | classify-repo-artifacts, trace-data-flows, analyze-agent-loop |
| Track B Phase 3 | extract-tool-graph, map-feature-gates, simulate-behavior, analyze-prompt-influence |
| Phase 4 | reconstruct-system-intent |

Notes:
- This is not an AI agent system; `analyze-agent-loop` and `analyze-prompt-influence` may be `skipped — not applicable` unless an agent runtime is discovered in imports.
- Detailed provenance is unusually relevant here: repo is a reconciliation of multiple sources (SRC000/SRC001/SRC002 registries already exist in `docs/reconciliation/`).
- Platform degradation: OpenCode has no agent dispatch; Track B skills run inline with max-3-level traces where dispatch would normally be used. Outputs will be marked `partial` where this applies.

## Adversarial Lens

- README declares `sources/` snapshots must "not silently become production code." **Verification needed (Track B):** whether `imports/` duplicates actually shadow the canonical `Mufil-2/` app or its database assets — the repo contains at least 3 complete-looking copies of the app tree (`Mufil-2/`, `imports/movefule_1/Mufil-2/`, `imports/mufil2/`).
- The git working tree has many untracked additions (`imports/movefule_1/` entirely untracked; newer `database/` files untracked). Canonicality claims must be validated against actual file contents, not directory naming.
- Existing project docs already assert authority (81-table core, 404-screen registry, four dashboards). Those claims are inputs to verify, not ground truth.

## Preliminary Signals

| Signal | Level | Note |
|---|---|---|
| Multiple divergent app copies in one repo | MEDIUM | Canonicality/merge-confusion risk; untracked imports tree |
| Secrets posture | LOW (positive) | `.gitignore` excludes `.env`, keys, certs; `.env.example` carries no real key |
| Offline-first mobile + sync architecture | MEDIUM | Data-authority conflicts possible between Azure SQL and SQLite blueprints |
| Large untracked artifacts (154 MB imports, 61 MB .opencode) | LOW | Repo hygiene, not correctness |

## Output Contract

- State file: `docs/analysis/.state` created.
- This document: `docs/analysis/target-classification.md`.
- Next: Track A (identifying-tech-stack).
