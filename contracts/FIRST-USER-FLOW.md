# MoveFuel — First User Flow Implemented

Implementation pass: 2026-08-07

## Design authority

The approved MoveFuel HTML/Kotlin satin flow remains the visual source of truth. This pass connects the real application architecture to its first-user path rather than replacing that design.

## First account path

1. Splash — `MoveFuel / Calm. Clear. Consistent.`
2. Sign in or create account.
3. Restore an existing owner-scoped cloud profile when this is a fresh installation.
4. If this is a genuinely new account, enter the resumable personalization flow.
5. Consent/context choices: Health & movement and reminders remain optional Android permissions.
6. Profile: display name, date of birth, country/region, measurement system.
7. Body: height, current weight, energy-equation selection, daily activity.
8. Optional body-composition range. It is stored as context and is not used to invent false precision in the v1 formula.
9. Goal: lose weight / maintain weight / gain muscle / improve performance.
10. Training: days per week, preferred session duration, optional dietary preference.
11. Personal target review:
    - adult maintenance-energy estimate where supported,
    - conservative goal adjustment,
    - protein target/range,
    - starting carbohydrate/fat/fiber targets,
    - explicit user review and confirmation.
12. Watch/data choices.
13. Complete onboarding only when positive calorie AND protein targets are confirmed.
14. Open the real five-destination product: Today / Log / Train / Fuel / Progress. Profile and Watch/Data remain utility surfaces.

## Existing-account recovery

A fresh phone installation no longer automatically means a fresh MoveFuel profile. When an Appwrite-authenticated account signs in and the local Room profile is absent, Android now attempts to fetch `/v1/profile`, reconstruct the owner-scoped onboarding/profile/target state, save it locally, and continue from the completed account state. If cloud recovery is unavailable, the app falls back safely to local onboarding rather than fabricating cloud state.

## Personal target policy implemented

`movefuel-targets-2026-08-v1`

- Adult automatic energy estimation is limited to ages 19+ in this version.
- Energy uses the 2023 National Academies adult EER equations for the user-selected energy equation (Male/Female), age, height, weight and activity category.
- `Prefer not to say` does not block MoveFuel; it disables automatic calorie calculation and requires a manual reviewed calorie target.
- Goal energy adjustments are deliberately conservative MoveFuel product rules and are versioned separately from the maintenance formula.
- Protein is weight/activity/goal aware and shown as a range plus a starting target.
- Fat starts at 30% of energy and carbohydrates take remaining energy after protein/fat.
- Fiber starts at 14 g per 1,000 kcal.
- Every target remains a preview until the user confirms it.
- No ectomorph/mesomorph/endomorph rule is used.

## Dashboard behavior changed

### Today

- User greeting is dynamic by local time (`Good morning`, `Good afternoon`, `Good evening`) and uses the authenticated display name.
- No generic 2,000 kcal / 140 g protein fallback is treated as personal truth.
- Missing/unconfirmed personal targets route to `TargetsPending`.
- Confirmed meals are numbered in the timeline as Meal 1, Meal 2, Meal 3, etc.
- Meal entries can display a photo marker when media exists.

### Fuel

- Uses confirmed meals for current calories/protein/carbs/fat/fiber.
- Uses the personal target engine for starting macro/fiber targets.
- Keeps food-photo capture/manual entry reachable.

### Train

- Existing plan/history/state-machine behavior is preserved.
- Watch payload now includes current plan, duration and next exercise information.

### Progress

- Remains a primary destination; authoritative trends are intended to continue using confirmed meals, completed workouts and approved health summaries.

## Phone ↔ Galaxy Watch foundation implemented

The phone enriches the existing revisioned `DailyRingSummary` with:

- display name,
- privacy-preserving account key (hash-derived; raw user ID is not sent),
- local date,
- steps when available,
- calories/protein/carbs/fat/fiber + goals,
- one next-best action,
- workout plan/title/duration,
- next exercise,
- current workout state.

The existing durable Data Layer summary + receipt architecture remains authoritative.

The Watch7 UI now has organized sections:

- Day — greeting, core values, next action, freshness/receipt.
- Fuel — calorie/protein/carbs/fat/fiber view.
- Train — synced workout + Start/Pause/Resume/End commands.
- Trend — compact daily progress percentages.

Workout commands use `MessageClient` for immediate phone control, but the authoritative phone summary is republished after state transition so the durable Data Layer state remains the reconciliation path.

## Verification performed in this environment

- Backend: 299 / 299 tests passing.
- Backend `/health`: starts successfully in local mode.
- Source XML: all `src/**.xml` files parse successfully.
- Kotlin compiler-oriented syntax scan: no `expecting`, `unexpected tokens`, unclosed-brace or syntax-error diagnostics found. Full Android compilation is not possible in this sandbox because Android SDK/Gradle dependency resolution is unavailable.
- Secret scan: no Google-style API keys, private-key blocks or JWT-like secrets detected. Gemini and Appwrite server-key slots remain placeholders.

## Not claimed complete yet

This pass intentionally finishes the *first-user and personalized target/watch foundation*. The next production passes still need physical-device and provider acceptance, including:

1. Full Android Studio compile/install on Galaxy A34 + Watch7.
2. Physical Data Layer receipt/reconnect/restart acceptance on the paired devices.
3. Live Wear Health Services workout sensor authority.
4. Health Connect background/import synchronization and deduplication.
5. Production Appwrite Storage for private meal images and retention jobs.
6. Provider-backed meal-photo benchmark and real-world portion-quality validation.
7. Expanded micronutrient target/evidence/license registry before presenting personalized vitamin/mineral recommendations.
8. Wear Tiles and watch-face complications.
9. Direct watch-to-cloud fallback/device credential design if required for standalone resilience.
10. Curated/licensed exercise demonstration media / optional YouTube links.
11. Remaining canonical P01-P33 phone surfaces and W01-W10 acceptance states where not yet represented by the current UI.
12. Billing verification, notifications, release signing, privacy/legal/store release evidence.
