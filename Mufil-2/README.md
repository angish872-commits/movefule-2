# Mufil-2 — MoveFuel Compose UI Prototype

This is an isolated nested Android/Jetpack Compose project inside the `ui-test` branch of `movefule_1`.

## 404 dashboards

- **4 custom visual-target master dashboards**: Today, Fuel, Train, Progress.
- **400 individual domain/state screens**.
- Every screen/state is stored in its own Kotlin file.
- Every screen/state has an `@Preview` for individual inspection in Android Studio.
- All routes are registered in one central navigation graph.

## Open an individual dashboard

Open any file under:

`app/src/main/java/com/movefuel/mufil2/ui/screens/`

Then open its Compose Preview.

The four visual anchors are here:

`app/src/main/java/com/movefuel/mufil2/ui/master/`

## Refactoring rule

Screen files own screen composition only. Reusable UI stays in:

`ui/components/`

Global styling stays in:

`ui/design/`

Navigation stays in:

`ui/navigation/`

Business algorithms do **not** belong inside dashboard files.

## Navigation

- Route catalog: `ui/navigation/MoveFuelRoute.kt`
- Full 404-route graph: `ui/navigation/MoveFuelNavGraph.kt`
- Screen registry: `SCREEN_REGISTRY_404.csv`

## Visual source of truth

The four custom master dashboards use the approved MoveFuel Sage/forest direction:

- premium dark background
- Sage identity
- restrained Fuel/Train/Progress marker accents
- 4/8/12/16/24/32 spacing rhythm
- refactored shared cards/buttons/rings/loading components
- Today/Fuel/Train/Progress bottom navigation

## Loading and media

Shared components include:

- skeleton loading
- circular media loading
- progress rings
- trend graph
- reusable cards/buttons
- explicit loading/offline/error screen families

Train/recipe/media flows should show loading or staged processing instead of appearing frozen.

## Import/build

The parent repository has no Gradle wrapper committed.

Open the `Mufil-2` directory as an Android Studio project and sync with:

- JDK 17
- Gradle 9.6+
- Android SDK 37

If you prefer a wrapper, generate one locally after opening the project.

## Product invariants

- UNKNOWN != ZERO
- Planned meal != consumed meal
- Planned workout != performed workout
- AI result is a draft until user confirmation
- Pain != soreness
- Historical days are not rewritten by later target changes
- Watch performed facts remain pending until acknowledged by phone/backend
