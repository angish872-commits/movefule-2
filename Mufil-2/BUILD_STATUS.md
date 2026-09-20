# Build Status

## Generated

- 404 Compose dashboard/routes are present in source.
- 4 custom master dashboards: Today, Fuel, Train, Progress.
- 400 individual domain/state screen files.
- Every generated screen has an `@Preview`.
- Central route catalog and NavHost wiring are present.
- Shared Sage design tokens/components are present.

## Toolchain

- Android Gradle Plugin: 9.4.1
- Built-in Kotlin: enabled (AGP 9)
- Compose compiler plugin: 2.2.10
- Compose BOM: 2026.09.00
- Navigation Compose: 2.10.1
- compileSdk / targetSdk: 37
- minSdk: 24
- JDK: 17

## Important

The parent repository does not currently contain a Gradle wrapper at `gradle/wrapper/gradle-wrapper.properties`.
Open the `Mufil-2` folder directly in Android Studio and let the IDE sync it with Gradle 9.6+ / JDK 17, or generate a wrapper locally with a compatible Gradle installation.

This branch was statically generated and audited for route/screen counts, but no Android build was executed by this chat environment.
