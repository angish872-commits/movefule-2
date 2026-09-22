# UI / Feature Import Plan — old `apps/android` → canonical `Mufil-2`

Status: ACTIVE (Option A layout confirmed)
Date: 2026-09-22
Machine-readable companion: `14_UI_FEATURE_IMPORT_GAP.csv`

## 1. What was compared

| Source | Path | Role |
|---|---|---|
| Old client (SRC-001) | `imports/movefule_1/apps/android/MoveFuelAndroid/` | Full multi-module Android app: `app` (253 `.kt`), `core-model`, `wear` — real domain logic (meal, workout, today, progress, datalayer, offline) |
| Old visual shell | `imports/movefule_1/Mufil-2/` | 428 `.kt` Compose UI prototype (404 routes) |
| New canonical | `Mufil-2/` | 435 `.kt`; the old visual shell already mirrored (`ba0dc44`) |

## 2. Finding

`Mufil-2/` is a **UI-only prototype**: every screen renders static hardcoded values
(`PRO_002` shows `Name="Alex"`, `PRO_003` shows a fixed goal). It contains the full
404-route visual layer and shared state-transition stubs, but **no domain logic**, no
persistence, no networking, and no algorithm wiring.

The old `apps/android` app holds the actual client-side domain implementations that the
screens are supposed to call. Those are the "missing UI features".

## 3. Import categories (`14_UI_FEATURE_IMPORT_GAP.csv`)

| Category | Meaning | Examples |
|---|---|---|
| `IMPORTED_DONE` | Ported already in this pass | U05 `PersonalTargetEngine` |
| `PORT` | Pure Kotlin, no Android deps — copy + test | U02/U03 workout state machine, U07 wellness report, U08/U09 meal math |
| `PORT_AND_ADAPT` | Needs Room/DataStore/backend wiring or model adaptation | U06 progress signals, U10/U13/U14 stores, U18 today reducer, U26 profile stores |
| `PORT_UI_WIRING` | Screens already exist; wire them to domain + state | U30–U36 feature screens |
| `KEEP` | Already mirrored; do not re-import | U37 shell, U38 ui kit |
| `DEFER` | Runtime/platform-specific or out of current scope | U22 Health Connect, U23 datalayer Wear, U24 auth, U28 notifications, U29 billing, U39 wear app |

## 4. Execution wave plan

1. **K1 — pure domain port (no new build deps):** U02, U03, U07, U08, U09.
   Adds `com.movefuel.mufil2.domain.*` with JUnit tests.
2. **K2 — model port (needs kotlinx-serialization):** U01, U04, U06.
   Add dependency, port `core-model` types, port `ProgressSignals`.
3. **K3 — persistence port (needs Room + KSP):** U13, U14, U20, U21, U26.
   Follow old rule: UI prefs in DataStore, structured/offline data in Room.
4. **K4 — state/reducer wiring:** U16, U17, U18, U19, U15.
5. **K5 — screen wiring:** U30–U36 wire existing `FNO_*`/`TRN_*`/`TOD_*`/`PRO_*` screens to K1–K4.
6. **Deferred:** U12, U22–U24, U28, U29, U39.

## 5. Constraints carried over from old `AGENTS.md`

- Business algorithms do not belong inside dashboard/screen files.
- Preserve approved Human-First visual semantics; do not redesign screens while wiring.
- UI-only preferences use DataStore; structured/offline product data stays in Room.
- `UNKNOWN != ZERO`; planned != consumed; prescribed != performed; pain != soreness.

## 5b. Progress log

| Item | Status |
|---|---|
| U05 PersonalTargetEngine (domain/target) | DONE + tests |
| U02/U03 WorkoutStateMachine + WorkoutElapsed (domain/workout) | DONE + tests |
| U08/U09 MealNutritionMath + MealTypeResolver (domain/meal) | DONE + tests |
| U06/U07 ProgressSignals + WellnessReport (domain/progress, domain/model) | DONE + tests |
| U34 target-preview wiring: `CanonicalAppState` target inputs → `toTargetPreviewUiState()` → `PRO_005` | DONE + tests |
| TS algorithms: full `services/backend` + `research` + `infra` mirrored | DONE, 773 tests pass |

`CanonicalAppState` now carries target-preview inputs (DataStore-backed, consistent with the
existing canonical store). Room-backed profile/meal/workout stores remain K3 (deferred until
Room + KSP compatibility with the built-in Kotlin toolchain is verified).

## 6. Verification

- Kotlin unit tests: `cd Mufil-2 && ./gradlew :app:testDebugUnitTest --offline --no-daemon`
  (baseline green before K1; each wave must keep it green).
- TypeScript algorithm tests: `npm run test:algorithms` (33 tests, green).
- Algorithm typecheck: `npm run typecheck:algorithms` (clean).
