# MoveFuel 400-Screen Control / Feature / Permission Audit

## Scope
Audited the **400 domain Compose screens** in `Mufil-2` against the MoveFuel Notion UI architecture and current shared Compose components.

Sources used:
- Notion: **00 — Master Prompt · Google AI Studio / Stitch**
- Notion: **MoveFuel — Complete UI/UX Product Map**
- Notion: **Batch 10 — Profile + Devices + Privacy + Billing + Help**
- Notion: **Batch 11 — Wear OS**
- Notion: **Batch 12 — System States + Cross-App Integration**
- GitHub branch: `ui-test`, current UI checkpoint before this audit: `77ee7be7518aaab2e6366c5e76ed41b2ad3fbe82`

## Executive truth check

The UI is visually complete enough for a large prototype, but the control layer is **not functionally complete yet**.

### What is actually wired today
- 400 domain screens exist.
- Every domain screen renders a real `MFPrimaryButton` for **Continue**.
- Every domain screen renders a real Material `TextButton` for **Back**.
- Therefore there are **800 functional scaffold action occurrences** across the 400 domain screens.
- These actions are **registry-sequential**, not product-semantic. They are useful for preview traversal but are not valid final navigation.
- The four master dashboards have working bottom navigation.
- Today has a working Start Workout CTA.
- Fuel has a working Add Food CTA.
- Train has a working Start Workout CTA.
- NavHost route transitions and the shared motion system are present.

### What currently looks interactive but is not yet functionally interactive
Shared components currently render these as presentation-only:
- `MFField` — Surface + Text; **not editable**.
- `MFOptionCard` — no click callback.
- `MFListItem` — no click callback.
- `MFToggleRow` — Switch has `onCheckedChange = null`; display-only.
- `MFNotice(action=...)` — action label is text only.
- `MFCalendarMini` — days are not clickable.
- `MFBodyMapPlaceholder` — body regions are not clickable.
- `MFTabStrip` — tabs display selection but have no selection callback.
- `MFRangeStrip` — range choices display but have no selection callback.
- `MFTopBar` — Calendar/Profile text is not clickable.
- `MFSectionHeading(action=...)` — action text is not clickable.
- Most meal/device/cards are display-only unless a containing screen provides a real CTA.

### Current manifest
The current `Mufil-2/app/src/main/AndroidManifest.xml` contains **no uses-permission declarations**. Sensor, camera, notification, networking, Health Connect, and optional wearable permissions still need architecture + manifest implementation.

## Planned interaction inventory derived from the 400 screens
- Planned semantic action rows in the implementation contract: **612**
- Screens with user-entered/selectable input requirements: **155**
- Screens with explicit sensor/device dependencies: **42**
- Screens with explicit runtime/health permission gates: **45**

These are implementation-contract counts, not claims that the controls are already working.

## P0 conflicts to fix before database/API wiring

1. **Sequential navigation is wrong for product behavior.**
   `Continue` and `Back` currently move through registry order. Final wiring must use typed product actions and meaningful parent/success/error destinations.

2. **Inputs are not inputs yet.**
   Authentication, onboarding, meal editing, workout actuals, recipe import URLs, target editing, etc. must use real Compose stateful controls such as `TextField`, numeric controls, pickers, selectors, sliders, and validation.

3. **Visual option cards are not selectable.**
   Add `selected`, `enabled`, `onClick`, accessibility semantics, and state ownership.

4. **Rows that say Open/Edit/Add/Review are not clickable.**
   Add typed callbacks to `MFListItem` or use dedicated row components.

5. **Tabs/ranges/top-bar actions are not wired.**
   Fuel/Train/Progress internal tabs, graph ranges, Calendar/Profile shortcuts, and section actions need callbacks.

6. **No permission architecture is implemented.**
   Add point-of-use permission coordinator, denial/permanent-denial handling, Settings handoff, and continue-without-feature paths.

7. **No backend write contract is attached to UI controls yet.**
   Every create/update/delete/confirm/complete action must have repository/use-case ownership, idempotency, loading, success, retry, and conflict behavior.

8. **No real sensor integration is present.**
   Camera, Health Connect, Wear OS sensor data, and optional Bluetooth/location capabilities are still UI contracts only.

9. **Draft vs canonical state must be enforced.**
   Camera/recipe AI results stay draft until user confirmation. Planned meals/workouts remain separate from consumed/performed facts.

10. **Destructive and duplicate-sensitive actions need guards.**
    Confirm Meal, Complete Set, Save Recipe, purchase, delete account, delete meal, disconnect device, and similar actions require idempotency/confirmation.

## Implementation architecture

For each feature use:

```
Composable
  -> typed UiAction
  -> ViewModel
  -> domain use case
  -> repository
  -> local/cache/network provider
  -> result/state
  -> UiState
  -> Compose re-render
```

Never let screen files directly own database/AI/business logic.

## Files produced by this audit

- `MOVEFUEL_400_SCREEN_CONTROL_AUDIT.csv` — one row per screen.
- `MOVEFUEL_BUTTON_ACTION_CONTRACT.csv` — action-level interaction contract.
- `MOVEFUEL_FAMILY_CONTROL_COUNTS.csv` — family summary.
- `MOVEFUEL_PERMISSION_SENSOR_MATRIX.csv` — Android permissions/sensor plan.
- `MOVEFUEL_IMPLEMENTATION_PLAN.md` — engineering sequence.

## Next gate

Do **not** design 140+ SQL tables from screen count alone. First use this control contract to group canonical entities, drafts, events, revisions, observations, sync receipts, and derived outputs. Then derive the relational schema from real data ownership and transaction boundaries.
