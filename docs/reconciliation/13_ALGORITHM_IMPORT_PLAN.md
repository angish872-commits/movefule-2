# Algorithm Import Plan — old `movefule_1` → canonical `Mufil-2`

Status: ACCEPTED — Option A (mirror old project layout at repository root)
Date: 2026-09-22
Machine-readable companion: `12_ALGORITHM_IMPORT_GAP.csv`

## 1. What was compared

| Source | Path | Role |
|---|---|---|
| Old (SRC-001) | `imports/movefule_1/` @ `699bf3d6` (branch `ui-test`) | Full stack: `algorithms/training` (16), `services/backend` (373 files, 174 tests), `apps/android` (253 `.kt`), `contracts/` |
| New (canonical) | `Mufil-2/` | Android UI shell only — 435 `.kt`, no backend, no algorithms |
| Registry | `docs/reconciliation/ALGORITHM_RECONCILIATION_MATRIX.csv` (167 rows) | Canonical algorithm list |
| Old self-audit | `imports/movefule_1/docs/architecture/MOVEFUEL_167_ALGORITHM_IMPLEMENTATION_MATRIX.md` | Old repo status per algorithm |

## 2. Finding

The new `Mufil-2` has **0 dedicated implementations** for all 167 algorithms
(`src000_movefuel2_status = NO_DEDICATED_DOMAIN_IMPLEMENTATION_EVIDENCED` for every row).

The old repo self-reports:

| Old status | Count | Decision |
|---|---:|---|
| IMPLEMENTED | 84 | **IMPORT** |
| PARTIAL | 37 | **IMPORT_AND_CLOSE_GAP** |
| NOT_FOUND | 31 | MISSING_IMPLEMENT (nothing to import) |
| FUTURE | 15 | FUTURE_OUT_OF_SCOPE (ALG-137…151, expert network) |

**Import set = 121 algorithms** (IDs listed in `12_ALGORITHM_IMPORT_GAP.csv`).

## 3. Import set by domain and source module

| Domain | Algs | IDs | Old source modules |
|---|---:|---|---|
| Profile / targets | 12 | 1–9,12–14 | `services/backend/src/foundation/target-engine.ts`, `target-eligibility-policy.ts`, `apps/android/.../product/PersonalTargetEngine.kt` |
| PortionWise / food photo | 22 | 15–36 | `services/backend/src/nutrition/{algorithm,vision,identity,portion,nutrients,confidence,personalization,release,service}`, `http/meal-routes.ts` |
| Barcode / products | 8 | 37–44 | `services/backend/src/meal/nutrition-catalog.ts`, `nutrition/packaged/`, `http/packaged-routes.ts` |
| Food search / recipes | 8 | 45–56 | `services/backend/src/meal/`, `diet-intelligence/`, `nutrition/identity/` |
| Core training | 18 | 59–76 | `algorithms/training/src/` (16 files), `services/backend/src/training/` |
| Sport-specific | 5 | 79–88 | `algorithms/training/src/{contracts,program-engine,session-requirement}.ts` |
| Calendar / Today | 10 | 89–98 | `services/backend/src/calendar/`, `training/calendar-adaptation-requester.ts`, `today/` |
| Progress / reports | 10 | 99–113 | `services/backend/src/progress/progress.ts`, `report/`, `apps/android/.../feature/progress/` |
| Watch / health / sync | 14 | 116–130 | `services/backend/src/sync/`, `device/`, `health/`, `apps/android/.../datalayer/`, `wear/` |
| AI orchestration | 6 | 131–136 | `services/backend/src/nutrition/vision/providers/`, `nutrition/validation/`, `nutrition/algorithm/` |
| Competitor gap | 8 | 152–167 | `diet-intelligence/`, `foundation/target-engine.ts`, `progress/`, `algorithms/training/src/` |

## 4. Target layout (CONFIRMED — Option A)

Decision (2026-09-22): **Option A** — mirror the old ownership roots at the repository root,
as the old `AGENTS.md` prescribes.

- Add `contracts/`, `algorithms/training/`, `services/backend/` at the repo root.
- Port Kotlin domain code into `Mufil-2/app`.
- Old root ownership map is the guide: `apps/` (client), `services/` (backend), `algorithms/`
  (pure domain engines), `contracts/` (shared schemas), `research/`, `infra/`, `tools/`, `docs/`.
- Do not recreate numeric handoff roots such as `03_SOURCE` or version-stacked source trees.

Rationale: matches historical ownership, keeps pure TS domain engines independent of the
Gradle Android build, and preserves the `contracts/` codegen root that both TS and Kotlin
already reference.

## 5. Wave plan (from old BUILD_ORDER, aligned to this gate)

1. **Wave A / P0 (97 algs):** profile+targets (1–14), PortionWise (15–36),
   barcode (37–44), core training (59–78), calendar+today (89–98),
   sync/health/watch (116–130), AI orchestration (131–136).
2. **Wave B / P1 (36 algs):** food search + recipes (45–58), progress/reports (101–115),
   competitor-gap (152–158).
3. **Wave C / P2 (19 algs):** 159–167.
4. **Wave D / future:** 137–151 (expert network) — out of scope.

Per repo protocol, code is written only after disposition; the training core
(`algorithms/training/src/`) is the most self-contained first import (pure TS, tested, no Appwrite).

## 6. Blocking item

Resolved 2026-09-22: target layout confirmed as Option A. Code import may proceed.

## 7. Import execution log

| Step | Scope | Status |
|---|---|---|
| A0 | `contracts/` mirrored at repo root | DONE |
| A1 | `algorithms/training/` (16 modules) mirrored + pure tests run (33 pass, src typecheck clean) | DONE |
| A2 | `services/backend/src/foundation` (target-engine + eligibility policy) mirrored + tested (14 pass) | DONE |
| A3 | `services/backend/src/nutrition` (PortionWise pipeline) | DONE |
| A4 | `services/backend/src/{meal,training,calendar,today,progress,sync}` | DONE |
| A4b | Full `services/backend` tree + `research/` + `infra/` mirrored; 773 backend tests pass, backend typecheck clean | DONE |
| A5 | Kotlin domain/UI port into `Mufil-2/app` | IN PROGRESS — see `15_UI_FEATURE_IMPORT_PLAN.md` |

Kotlin progress: `PersonalTargetEngine` (U05) ported and tested green.
UI/feature gap register: `14_UI_FEATURE_IMPORT_GAP.csv`.
