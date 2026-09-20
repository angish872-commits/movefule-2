# MoveFuel Full-Product Schema Expansion

## What the 400-screen audit changes
The **81-table core is a proven baseline**, but it does not fully normalize every durable capability exposed by the 400-screen UI.

### Draft additions
- Recipe + YouTube/Web/Text import: **12**
- Meal planning: **7**
- Shopping + pantry: **5**
- Soreness/readiness: **3**
- Progress media/body observations: **2**
- Proposed private-core additions: **29**
- Baseline 81 + 29 = **~110 private core tables** if all survive reconciliation.

### Shared food/barcode catalog
A separate shared catalog proposal adds **15 tables**. It stores normalized USDA/Open Food Facts/product/barcode/reference facts, not private meal history.

## Barcode flow

```mermaid
flowchart LR
 SCAN[Camera barcode scan] --> DEC[Normalize UPC/EAN/GTIN]
 DEC --> BAR[barcode]
 BAR --> BP[branded_product]
 BP --> FOOD[food + food_revision]
 FOOD --> NUT[food_nutrient + serving]
 NUT --> REVIEW[Serving review]
 REVIEW --> MD[core meal_draft]
 MD --> CONFIRM[Confirm]
 CONFIRM --> MEAL[core meal / meal_item / meal_revision]
```

## YouTube recipe flow

```mermaid
flowchart TD
 URL[YouTube/Web/Text] --> SRC[recipe_source]
 SRC --> JOB[recipe_import_job]
 JOB --> EVENT[recipe_import_event]
 JOB --> AI[AI extraction evidence]
 AI --> CAND[recipe_import_candidate]
 CAND --> MATCH[recipe_food_match]
 MATCH --> ISSUE{Unresolved?}
 ISSUE -- yes --> FIX[recipe_import_issue + user correction]
 ISSUE -- no --> CALC[Deterministic nutrition]
 FIX --> CALC
 CALC --> SNAP[recipe_nutrition_snapshot]
 SNAP --> CONFIRM[User confirmation]
 CONFIRM --> REC[recipe / revision / ingredient / step]
 REC --> PLAN[planned_meal]
 REC --> SHOP[shopping_item]
 REC --> LOG[meal draft -> confirmed meal]
```

AI extracts candidates; **MoveFuel nutrition logic + trusted food data remain authoritative**.

## Training connection

```mermaid
flowchart LR
 CORE[Private MoveFuel facts] --> SAFE[Safety / eligibility]
 KNOW[141-table training platform] --> SAFE
 SAFE --> ALG[Training algorithms 59-78]
 ALG --> PLAN[workout_plan / revision / step]
 PLAN --> EXEC[Phone / Watch execution]
 EXEC --> EVT[workout_event / session_revision]
 EVT --> PROG[Progression / readiness]
 PROG --> ALG
```

## Count warning
Raw architecture counts can exceed 250 logical tables if you simply add 110 private core + 15 food catalog + all 141 training-platform tables. **Do not do that blindly.** The 141 training matrix contains athlete/device/governance concepts that overlap the core.

The next database task is a **deduplication/authority reconciliation**: one canonical owner for every noun, then final SQL migrations.
