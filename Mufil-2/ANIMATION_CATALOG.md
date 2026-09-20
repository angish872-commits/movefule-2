# Animation catalog

## Global motion

- Screen enter: 310ms fade/soft vertical arrival.
- Route transition: fade in/out through the central NavHost.
- Button press: subtle scale compression.
- Card resizing: animated content size.
- Metric rings: animate from zero to the current value.
- Progress graphs: reveal from left to right.
- Skeletons: moving sage-tinted shimmer.
- Media buffering: persistent content frame + circular buffer indicator + metadata skeletons.
- Bottom navigation: selected pill/marker animates between destinations.

## Process motion

### Camera
Captured image remains visible while staged analysis progresses:
1. Checking image
2. Detecting foods
3. Estimating portions
4. Matching nutrition
5. Preparing review

### Recipe / YouTube import
1. Queued
2. Reading source
3. Extracting recipe evidence
4. Normalizing ingredients
5. Matching trusted foods
6. Checking nutrition
7. Review

The user can leave and return without the UI pretending the process stopped.

### Active workout
- Complete set -> confirmation state -> rest timer.
- Media can buffer without blocking set logging.
- Pause preserves state.
- Rest timer remains visible and resumable.
- Performed values stay distinct from planned values.

### Sync
- Local save is distinct from server acknowledgment.
- Pending is a static/queued state rather than an endless fake success spinner.
- Failed sync keeps local data and exposes retry.

## Motion Lab

Open:
`app/src/main/java/com/movefuel/mufil2/ui/dev/MotionLab.kt`

Use Compose Preview to inspect shared motion components together.
