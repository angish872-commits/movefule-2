# MoveFuel-2 — Master Data Authority Map v1

Status: **ARCHITECTURE GATE A — ACTIVE**

This document assigns one logical owner to each important MoveFuel noun before the 81-table core, 29-table draft expansion, 15-table Food/Barcode catalog, 32-table Android cache, 4-table Wear cache and 141-table Training platform are connected.

## Authority classes

| Class | Meaning |
|---|---|
| A1 | Canonical private transactional state |
| A2 | Canonical shared/reference knowledge |
| A3 | Derived/projection state; reproducible from authoritative inputs |
| A4 | Local/offline cache or pending command state |
| A5 | Immutable audit/history/evidence |
| F | Future scope; must not become a current competing authority |

## Master entity ownership

| Entity / responsibility | Canonical logical owner | Class | Other layers |
|---|---|---:|---|
| Account identity/session | MoveFuel Core / authenticated backend | A1 | Phone stores session projection only |
| User profile | MoveFuel Core | A1 | Android cache; Training platform references user key only |
| Onboarding progress | MoveFuel Core | A1 | Android may hold pending draft |
| Preferences | MoveFuel Core | A1 | DataStore only for UI-only preferences |
| Consent/privacy choices | MoveFuel Core | A1/A5 | Never duplicated by Training platform |
| Goals/targets | MoveFuel Core | A1/A5 | Target revisions preserve history |
| Body measurements/check-ins | MoveFuel Core | A1/A5 | Training consumes through backend contract |
| Device identity/trust | MoveFuel Core | A1 | Training platform references; Wear is not authority for trust |
| Health connection/import cursor | MoveFuel Core | A1 | Training consumes normalized facts |
| Health samples/summaries used by product | MoveFuel Core | A1/A5 | Raw external provider remains provenance source |
| Meal draft | Nutrition Runtime / MoveFuel Core | A1 | Android may hold pending local draft |
| Confirmed meal | Nutrition Runtime / MoveFuel Core | A1/A5 | Food Catalog never owns user meal history |
| Meal item/revision/media link | Nutrition Runtime / MoveFuel Core | A1/A5 | Provider estimates are evidence only |
| Saved meal/personal food | Nutrition Runtime / MoveFuel Core | A1 | Shared catalog may be referenced |
| Planned meal | MoveFuel Core planning domain | A1 | Recipe/food definitions referenced by ID/version |
| Recipe | MoveFuel Recipe domain | A1/A5 | Import pipeline creates reviewable drafts, not authority before confirmation |
| Recipe source/import job | Recipe Import domain | A5 | YouTube/Web/Text are source evidence |
| Ingredient candidate/extraction | Recipe Import domain | A3/A5 | Must resolve to reviewed canonical ingredient/food identity |
| Food definition | Shared Food Catalog | A2 | Private meal stores food ID/revision snapshot/reference |
| Food revision | Shared Food Catalog | A2/A5 | Historical meals preserve source revision |
| Barcode/GTIN mapping | Shared Food Catalog | A2 | Provider cache is evidence, not private state |
| Branded product | Shared Food Catalog | A2 | Open Food Facts/manufacturer source provenance retained |
| Nutrient definition/reference value | Shared Food Catalog | A2/A5 | USDA/trusted source revision retained |
| Ingredient/allergen reference | Shared Food Catalog | A2 | User allergy preference remains private MoveFuel Core |
| Serving/unit conversion reference | Shared Food Catalog | A2 | User-confirmed serving observation belongs private runtime/evidence |
| Exercise definition | Training Knowledge | A2 | Runtime references immutable ID/version |
| Exercise variation/substitution knowledge | Training Knowledge | A2 | Runtime decision records chosen substitution |
| Exercise media/instructions | Training Knowledge | A2 | Cached locally when needed |
| Anatomy/muscle mapping | Training Knowledge | A2 | Derived user muscle-load is not stored here |
| Safety/contraindication evidence | Training Knowledge | A2/A5 | Final applicability decided by MoveFuel policy layer |
| Program template | Training Knowledge | A2/A5 | User-specific plan belongs MoveFuel Runtime |
| Workout plan | MoveFuel Training Runtime | A1/A5 | Training Knowledge provides templates/candidates only |
| Workout plan step | MoveFuel Training Runtime | A1/A5 | References exercise definition/version |
| Workout session | MoveFuel Training Runtime | A1/A5 | Training platform analytics references it; never duplicates authority |
| Performed exercise/set fact | MoveFuel Training Runtime | A1/A5 | Wear can originate offline fact; backend confirmation becomes canonical |
| Workout event/summary | MoveFuel Training Runtime | A1/A5/A3 | Summary is derived; event history preserves facts |
| Readiness observation | MoveFuel Training Runtime | A1/A5 | Raw user/device inputs remain distinct |
| Readiness result | MoveFuel deterministic policy/algorithm layer | A3/A5 | Versioned formula/algorithm/policy metadata required |
| Soreness observation | MoveFuel Training Runtime | A1/A5 | Pain kept separate from soreness |
| Recovery assessment | MoveFuel deterministic policy/algorithm layer | A3/A5 | Recomputable from authoritative inputs |
| Progression/deload decision | MoveFuel deterministic training engine | A3/A5 | Training Knowledge supplies rules/evidence, not user authority |
| Calendar entry/revision | MoveFuel Core Calendar | A1/A5 | Phone cache only; stale revisions rejected |
| Today projection/next action | MoveFuel orchestration layer | A3 | Never a competing durable state owner |
| Daily nutrition summary | MoveFuel projection layer | A3 | Recomputed from confirmed meals + target revisions |
| Training load summary | MoveFuel projection layer | A3 | Recomputed from performed facts |
| Progress metric/trend | MoveFuel Progress domain | A3/A5 | Preserve input coverage/confidence |
| Report/report section/evidence | MoveFuel Progress/Reports | A3/A5 | Must cite canonical input revisions |
| Notification | MoveFuel Core notification domain | A1/A5 | OS notification is delivery surface only |
| Sync operation/cursor | MoveFuel Core Sync | A1/A5 | No duplicate sync_outbox/device_sync_cursors authority |
| Watch delivery/receipt | MoveFuel Core Sync | A1/A5 | Wear keeps local pending execution state only |
| Idempotency claim/result | MoveFuel Core | A1/A5 | Required around retryable canonical writes |
| Provider call/model/prompt metadata | MoveFuel AI Gateway | A5 | Secrets never persisted |
| AI candidate output | AI Gateway / domain evidence | A3/A5 | Never final canonical nutrition/safety authority |
| Formula definition/version | MoveFuel Formula Registry | A2/A5 | Runtime records version used |
| Algorithm definition/version | MoveFuel Algorithm Registry | A2/A5 | Runtime records version used |
| Policy version | MoveFuel Policy Registry | A2/A5 | Safety-sensitive decisions record policy |
| Coach/client collaboration | Training collaboration platform | F | Does not block consumer MoveFuel-2 |

## Cross-layer rules

### 1. Phone / Room

Phone Room owns:
- local structured cache,
- pending edits/commands,
- offline meal/workout execution state,
- last acknowledged canonical revision.

Phone Room must not independently own:
- target formulas,
- training progression truth,
- readiness decisions,
- final conflict resolution,
- account authorization.

### 2. Wear OS

Wear owns:
- downloaded workout projection,
- local performed-set/workout events,
- monotonic client sequence,
- pending delivery/receipt state.

Wear must not own:
- plan generation,
- progression,
- canonical readiness,
- direct cloud authority.

### 3. Shared Food Catalog

The Food/Barcode catalog is shared reference data and must never contain private user meal history.

Every accepted food value should be traceable by:
- source,
- source/release revision,
- food/product revision,
- nutrient value/unit basis,
- confidence/verification where applicable.

### 4. Training Knowledge vs Runtime

The 141-table Training platform is split conceptually:

- **Knowledge/evidence tables** may remain shared Training Knowledge.
- **Athlete performance tables** must map to MoveFuel runtime user/workout state rather than duplicate it.
- **Device/import/governance tables** must reference existing Core device/sync/consent/audit resources where those responsibilities already exist.
- **Coach/client tables** remain future scope.

### 5. Raw vs derived

Never overwrite a raw observation with a derived score.

Required pattern:

```text
raw observation(s)
   ↓
versioned formula / policy / algorithm
   ↓
derived result + confidence + reason codes
```

Derived records must be recomputable or explainable from versioned inputs.

### 6. Historical reproducibility

Where materially relevant, durable decisions/events reference:
- entity revision(s),
- food/exercise/source revision,
- formula version,
- algorithm version,
- policy version,
- provider/model metadata when AI materially supplied evidence,
- created/effective timestamps,
- reason/evidence codes.

## Deduplication decisions to enforce

The following duplicate-authority patterns are forbidden unless this map is explicitly revised:

- second user/athlete master table that owns profile identity,
- second private device authority inside Training Knowledge,
- second workout-session owner inside the 141-table platform,
- second health-state authority,
- separate `sync_outbox` or `device_sync_cursors` canonical stores,
- separate `today_state` canonical truth,
- separate nutrition-state cache treated as truth,
- separate readiness-state truth,
- independent Camera/Barcode/Recipe calorie engines,
- independent home/gym/watch workout engines.

## Unified engine convergence

### Food inputs

```text
Camera ───────┐
Barcode ──────┤
Search ───────┤
Manual ───────┤
Saved Meal ───┼─> Food Resolution
Recipe ───────┤        ↓
YouTube/Web ──┘    grams/serving
                     ↓
             Canonical Nutrient Engine
                     ↓
           review → confirmed meal
```

### Training inputs

```text
profile + goal + time + equipment
readiness + soreness + restrictions
program state + exercise knowledge
              ↓
         safety gate
              ↓
       eligible candidates
              ↓
  deterministic construction/adaptation
              ↓
 optional bounded ranking/simulation
              ↓
     final deterministic validation
              ↓
          workout plan
```

## Gate exit condition

Architecture Gate A is complete only when every overlapping table in:
- 81 Core,
- 29 proposed additions,
- 15 Food/Barcode,
- 141 Training Platform,
- 32 Android SQLite,
- 4 Wear SQLite

has a row in a final deduplication registry with one of:

`KEEP_CANONICAL`, `REFERENCE_ONLY`, `MERGE_INTO_CANONICAL`, `DERIVED_PROJECTION`, `LOCAL_CACHE`, `AUDIT_HISTORY`, `FUTURE_SCOPE`, `REMOVE_DUPLICATE`.
