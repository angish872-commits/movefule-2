# MoveFuel visual target implementation

The approved four-phone MoveFuel image is the visual benchmark for the Compose UI.

## Locked visual rules

- Forest/sage dark identity, not blue.
- Premium layered dark surfaces with restrained borders and shadows.
- Four permanent primary destinations: Today, Fuel, Train, Progress.
- 4/8/12/16/24/32 spacing rhythm.
- Controls use compact radii; cards use 16px-equivalent; hero media cards use larger rounding.
- Today uses three animated rings for glance metrics.
- Fuel is dense but readable and clearly separates planned vs consumed.
- Train gives readiness and media/workout execution visual priority.
- Progress is graph-first.
- Loading must look intentional: skeletons, media buffering, staged processing, sync state.
- No fake percentages where progress is unknown.
- Shared components own motion and styling; individual screens own composition.
- UNKNOWN is never shown as zero.
