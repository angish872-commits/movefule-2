# MoveFuel UI Control Implementation Plan

## Phase 0 — Replace prototype traversal with real navigation
1. Keep `MoveFuelRoute`, but remove registry-sequential product behavior.
2. Add typed destination/UiAction contracts by feature.
3. Use `NavController.popBackStack()` for ordinary Back, not previous registry ID.
4. Define explicit success/error/offline/cancel destinations.
5. Add deep-link contracts for reminders, import completion, reports and sync failures.

## Phase 1 — Upgrade shared controls
Create/refactor:
- `MFTextField` / `MFNumberField`
- `MFPasswordField`
- `MFDateField`
- `MFOptionCard(onClick, selected, enabled)`
- `MFListItem(onClick, trailingAction)`
- `MFToggleRow(onCheckedChange)`
- `MFTabStrip(onSelect)`
- `MFRangeStrip(onSelect)`
- `MFTopBar(onCalendar, onNotifications, onProfile)`
- `MFBodyMap(onRegionSelect)`
- `MFCalendar(onDateSelect, onEventSelect)`
- `MFNotice(onAction)`
- `MFSearchField`
- destructive/confirmation sheets
- loading/disabled/submitting button variants

## Phase 2 — State ownership
For each family create:
- `*Route.kt` — ViewModel collection + navigation
- `*Screen.kt` — stateless rendering
- `*UiState.kt`
- `*UiAction.kt`
- `*ViewModel.kt`
- preview/sample state files
- focused component files

No SQL, provider, AI, or algorithm code inside Compose.

## Phase 3 — Permission coordinator
Implement point-of-use permission flows:
- Camera
- Photo Picker
- Notifications
- Health Connect selected data types
- Wear/health sensors
- optional BLE/location only where architecture proves they are needed

Every permission needs:
- rationale/pre-prompt where appropriate
- grant
- deny
- permanently denied / Settings handoff
- feature-degraded path
- revoke detection

## Phase 4 — Draft/canonical rules
Create explicit state types:
- user draft
- AI/provider candidate
- confirmed canonical fact
- planned value
- performed/consumed actual
- pending sync event
- server-acknowledged fact
- unknown/unavailable

Never collapse these into one nullable DTO.

## Phase 5 — Command/idempotency layer
High-risk commands receive stable command/event IDs:
- Confirm Meal
- Save Recipe
- Complete Set
- Finish Workout
- Confirm Plan
- Purchase/Restore
- Device Sync Event
- Delete Account request
- contribution/food correction

Repeated taps/retries must not duplicate canonical records.

## Phase 6 — Feature-family implementation order
1. AUTH + ONB
2. Today + global navigation
3. Fuel Now + Camera + Barcode
4. Active Workout + Train + Readiness/Soreness
5. Calendar
6. Progress
7. Recipe import + Plan + Shop
8. Profile/Privacy/Notifications
9. Devices + Wear
10. Billing
11. system/deep-link/recovery hardening

## Phase 7 — Test contract
For every planned action in `MOVEFUEL_BUTTON_ACTION_CONTRACT.csv` add:
- UI test: action is available when valid
- UI test: disabled when invalid
- navigation test
- ViewModel reducer test
- use-case test
- repository contract test
- idempotency test for write commands
- offline/retry test where applicable
- permission denied test where applicable
- accessibility semantics test

## Acceptance rule
A screen is not “implemented” because it renders. It is implemented only when:
1. required controls are actually interactive,
2. validation exists,
3. state survives expected lifecycle/restart boundaries,
4. success/error/offline are handled,
5. writes are idempotent,
6. navigation is semantic,
7. permissions are point-of-use,
8. analytics/audit events do not expose sensitive payloads,
9. planned/actual and unknown/zero invariants remain intact.
