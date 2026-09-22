# Provenance — MoveFuel 2

**Skill:** trace-codebase-provenance
**Status:** complete
**Date:** 2026-09-22
**Prerequisites read:** `target-classification.md`, `tech-stack.md`

---

## 0. Iron Law Compliance

| Check | Result |
|---|---|
| Sourcemaps without source | **None** — zero `.js.map`/`.map` files in repo |
| Minified/obfuscated code | **None** — all 1,117 kt / 401 ts / 82 py files are readable source |
| Decompiled signatures | **None found** |
| Binary blobs masquerading as source | Only standard Gradle wrapper JARs (2) and SQLite `.db` data files |
| Generated code declared as such | Yes — contracts carry `Generated from … Do not edit` headers, and codegen `--check` **passes** (generated files are current) |

**No source/derived confusion detected.** The repo is unusually disciplined about provenance.

---

## 1. Provenance Map

```
 EXTERNAL SOURCES                 REPO ARTIFACTS                      STATUS
┌──────────────────────┐    ┌────────────────────────────────┐
│ SRC-001              │    │ imports/mufil2/  21 patches +  │    external freeze
│ angish872-commits/   │───►│ READY marker (699bf3d6,        │    (commit+manifest,
│ movefule_1 @         │    │ 400/428/404 expectations)      │     local copy untracked)
│ 699bf3d6 (ui-test)   │    └──────────────┬─────────────────┘
└──────────────────────┘                   │ CI applies ordered patches
                                           ▼
┌──────────────────────┐    ┌────────────────────────────────┐
│ SRC-000  FROZEN      │    │ bootstrap/movefuel-2-foundation│
│ Mufil-2 tree         │◄───│ → import commit 3ffbb28        │    repo freeze
│ 6875fa95 (459 files) │    │   "import verified Mufil-2     │    (tree hash
│                      │    │    source snapshot" (459 files)│     verified in git)
└──────────┬───────────┘    └────────────────────────────────┘
           │ 83 modified / 9 added / 0 deleted
           ▼
┌──────────────────────────────────────────────────────────┐
│ CURRENT HEAD (state/canonical-domain-integration)        │
│ Mufil-2 tree = 468 entries                              │
│ ba0dc44 (48f) → b761c01 (106f) → 1d66712 (61f) + small  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────┐    ┌────────────────────────────────┐
│ SRC-002  raw upload  │───►│ sources/src002-old-upload/     │    raw archive NOT in
│ movefule.zip 268 MB  │    │ src002_old_meaningful_source   │    repo (SHA-256 only);
│ raw SHA 4b23521a…    │    │ .zip (13 files)                │    sanitized subset
│ embedded HEAD        │    │ sanitized SHA e511b87b… ✓      │    verified
│ 4debb60a (movefule)  │    └────────────────────────────────┘
└──────────────────────┘

SRC-003 (movefuel-legacy)  → WAITING    SRC-004 (g-latest) → WAITING

Generated layer: contracts/canonical/v1/contracts.json
                 → codegen → generated/{typescript,kotlin,swift} (✓ current)
Copied layer:    ui/audit/*.csv → Mufil-2/audit/*.csv (CI byte-compares)
```

## 2. Verification Results (claims tested)

| Claim | Source | Verification | Result |
|---|---|---|---|
| Baseline tree `6875fa95…` is a real frozen Mufil-2 tree | README, Source Registry | `git cat-file -t` = tree; reachable as `Mufil-2` subtree of commit `3ffbb28`; 459 entries | ✅ VERIFIED |
| 400 domain screens | README, audit, CI | exactly 400 `*Screen(` functions in `ui/screens`; CI asserts =400 | ✅ VERIFIED |
| 428 Kotlin files at import | CI workflow, READY marker | baseline tree count consistent; current = 435 (grew via 9 additions) | ✅ VERIFIED |
| 404 registry rows | CI | `SCREEN_REGISTRY_404.csv` = 404 rows (400 + 4 masters) | ✅ VERIFIED |
| 81-table DB / 32 phone / 4 wear | Source-of-truth doc | `grep CREATE TABLE` = 81 / 32 / 4 exactly | ✅ VERIFIED |
| Sanitized SRC-002 zip SHA | Inventory doc §"Sanitized" | `shasum -a 256` = `e511b87b…` — exact match | ✅ VERIFIED |
| SRC-002 per-file manifest | `SRC002_SOURCE_MANIFEST.csv` | sampled file inside zip hashes to manifest value exactly | ✅ VERIFIED (sample n=1) |
| Patch chain terminal commit = source commit | `imports/mufil2/READY` | `021_699bf3d6.patch` name = SRC-001 commit `699bf3d6…` | ✅ VERIFIED |
| Generated contracts current | codegen design | `generate-contracts.mjs --check` exit 0 | ✅ VERIFIED |
| Production code never references frozen trees | README rule | zero `imports/`/`sources/` references in app or backend src | ✅ VERIFIED |
| All 400 screens wired product-semantically | — | audit CSV declares all 400 `PARTIAL_PROTOTYPE` with registry-sequential wiring | ❌ **CLAIMED GAP (disclosed honestly by repo itself)** |

### Documentation nuance (LOW)
`01_SOURCE_REGISTRY.md` lists only the **raw** SRC-002 SHA next to the **local sanitized** path. The detailed inventory (`10_SRC002…md`) explains both hashes correctly, but the registry table alone could mislead a checksum audit (as it nearly did this one). Recommend adding the sanitized SHA to the registry row.

---

## 3. Derivation Chain (authoritative)

1. **External source generation** — `angish872-commits/movefule_1` @ `699bf3d6` (branch `ui-test`), tree with 503 entries; Mufil-2 subtree = 459 entries.
2. **Patch encoding** — 21 ordered patches (`001_69b97e2b` → `021_699bf3d6`), each named for a source commit; `READY` marker states expectations (400 screens / 428 kt / 404 rows).
3. **Reconstruction** — CI (`apply-mufil2-import.yml`) applies patches to `bootstrap/*` from empty state, restores API-omitted audit files, asserts counts, commits.
4. **Freeze** — commit `3ffbb28` ("import verified Mufil-2 source snapshot", 459 files, 21,430 insertions) — this is SRC-000.
5. **Canonical evolution** — `ba0dc44` (48f) → `b761c01` (106f) → `1d66712` (61f) + small commits: 83 modified, 9 added, **0 deleted**.
6. **Live DB additions (untracked)** — `database/**/030/031/032` files added after last commit; not yet in any commit.

### Batch analysis (generated vs hand-written)
Only the import commit is a mass-batch (459 files/commit). All subsequent commits are small and targeted (≤106 files, mostly edits). This matches "snapshot import + hand-evolution" — no hidden mass-generation beyond the declared contracts.

### Drift since baseline (exact)

| Category | Files |
|---|---|
| **Added (9)** | `CanonicalStateStore`, `CanonicalStateTransitions`, `TodayUiState`, `TrainStateStore`, `CanonicalStateTransitionsTest`, `MoveFuelUiArchitecture`, `MFNavigationIcon`, `UI_RUNTIME_VERIFICATION_404.csv`, `tools/ui_closed_loop_audit.py` |
| **Modified (83)** | 68 screens, 8 components, 4 masters, 1 navigation (`MoveFuelRoute.kt` paths/aliases), 1 design (`MoveFuelColors`), `app/build.gradle.kts` |
| **Deleted (0)** | none — evolution is purely additive + in-place edits |

## 4. Untracked Working-Tree Material (reproducibility notes)

| Path | Meaning | Risk |
|---|---|---|
| `imports/movefule_1/` (154 MB) | Local SRC-001 copy, **not committed** | Frozen by external commit + manifest per registry rule 4; local copy is convenience only. Do not treat as canonical. |
| `Mufil-2/gradle/`, `gradlew`, `gradlew.bat` | Gradle wrapper untracked | Build reproducibility gap — CI uses `gradle` not wrapper; wrapper should be committed for offline reproducibility |
| `database/**/030,031,032.*` | Live training/MVP DBs + SQL (not committed) | Analysis target includes them; freeze before canonical decisions |
| `.opencode/` (61 MB) | Agent tooling state incl. old code-graph.db | Not analysis evidence; exclude from decisions |
| `docs/analysis/` | This analysis output | Newly created here |

## 5. Deception Assessment

| Probe | Finding |
|---|---|
| Misleading names | None found — names match behavior in sampled code (store, transitions, registry) |
| Intent-implementation gaps | **One**: stale comment in `MoveFuelNavGraph.kt:172` calls dead `TrainStateStore.markActive` "the audited activation boundary" (see dead-code.md). The real gate `activatePlan` behaves as documented. |
| Comments vs behavior on counts | Verified; counts match |
| Encoded/obfuscated strings | None (base64-scan clean; only camelCase test names matched) |
| Suspicious URLs | None — USDA API, placeholders (`example.invalid`, `example.test`), localhost, `dftqc.gov.np` (Nepal food authority, plausible data source) |
| Honesty about prototype status | **High** — audit CSV declares all 400 screens `PARTIAL_PROTOTYPE` and enumerates per-screen conflicts + P0 remediation plans |
| Hidden endpoints | None — endpoint inventory complete; webhooks fail closed |
| Credentials in examples/tests | None — templates only; secrets gitignored |

**Conclusion: the repo's self-description is accurate.** The governance layer (registry, audits, CI assertions) matches observed reality, with the noted minor documentation nuance and one stale comment.

## 6. Build Dimensions Analyzed

```
## Build Dimensions Analyzed
- ENVIRONMENT: local + canonical (no production deployment artifacts in repo)
- USER_TYPE: not applicable to app (no auth/session implementation);
             backend: local-test vs appwrite auth modes both inspected
- PROVIDER: appwrite, openrouter, gemini, usda/fdc, openfoodfacts
            (capability presence driven by env vars)

## Dimensions NOT Analyzed
- USER_TYPE: internal/admin (no such surfaces exist in app)
- PROVIDER: live provider behavior (no network calls made in this analysis)
- ENVIRONMENT: production deployment configs (not present; templates only)
```

## 7. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| Untracked live database files (030/031/032) | MEDIUM | Real data-bearing SQLite files sit outside version control; no integrity chain for them. Freeze or remove per the repo's own rules. |
| Untracked Gradle wrapper | LOW | CI bypasses wrapper (`gradle-version: current`); toolchain drift possible between local and CI builds |
| Registry fingerprint ambiguity (raw vs sanitized SHA) | LOW | Could cause a future checksum audit to falsely flag SRC-002 as tampered (or falsely pass it) |
| No decompiled/obfuscated/encoded material | INFO (positive) | Clean |
| No credentials in history sample / examples | INFO (positive) | Templates + empty `.env.example` only |
| Governance CI hard-codes expected counts | INFO (positive) | Tampering with the snapshot would trip CI assertions |

## 8. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| Patch-apply CI + structural count enforcement + python audit in build | HIGH | `analyze-build-pipeline` (next) |
| Generated contracts + copied audit CSVs (derived layer) | MEDIUM | `classify-repo-artifacts` |
| SRC-002 partial snapshot (58/65 imports unresolved) | MEDIUM | Phase 4 intent: algorithmic evidence is incomplete — keep as reference only |
| All-additive drift (0 deletions) | LOW | no concern |

## 9. Output Contract

- File: `docs/analysis/provenance.md`
- State: `trace-codebase-provenance: complete`
- Next: Track B Phase 1 — `analyze-build-pipeline`
