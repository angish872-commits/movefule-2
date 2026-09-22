# MoveFuel Step 1 — Internet Food Knowledge Base

Status: **IMPLEMENTATION COMPLETE / LIVE INTERNET SYNC NOT EXECUTABLE IN THIS SANDBOX**  
Implementation version: `step1-v1`  
Date: 2026-08-10

## 1. Objective

Step 1 turns public internet sources into a reproducible, provenance-aware
knowledge pipeline for MoveFuel. The purpose is **not** to let an AI model
invent nutrition. The pipeline separates:

- canonical nutrition records,
- food-density evidence for volume → grams,
- benchmark ground truth,
- regional references that still require rights/quality review.

The raw archives remain rebuildable. The full public catalogue is **not**
pushed into Appwrite. Appwrite should keep only bounded records actually used
by confirmed meals, provenance, user recipes and caches.

## 2. Registered internet sources

### USDA FoodData Central

Role: canonical nutrition authority.  
Current Step-1 bulk release: 2026-04-30 full CSV.  
Licence: CC0 1.0; FoodData Central attribution is preserved.  
The registry also records compact Foundation/FNDDS/SR/Branded JSON artifacts
for future selective-import work.

### FAO/INFOODS Density Database v2

Role: density evidence for converting food volume to mass.  
Artifact: official FAO XLSX.  
The importer preserves raw source rows, preparation/region/reference text and
quarantines rows that do not have a valid positive density. The importer does
not create a generic 1.0 g/mL fallback.

### Nutrition5k

Role: benchmark ground truth only.  
Step 1 downloads **metadata and official split lists only**, not the 181.4 GB
full image archive. The metadata importer stores dish mass, calories, fat,
carbohydrate, protein and per-ingredient gram values. Full RGB-D imagery can
be added later for the computer-vision benchmark stage.

### Nepalese food-composition references

The 2017 and 1994 Nepal publications are registered with provenance, but are
held as `REFERENCE_ONLY` until commercial-use rights and data-quality review
are completed. The pipeline intentionally does not scrape a PDF and silently
turn it into production nutrition truth.

## 3. Implemented software

### Source registry

`python/movefuel_fdc/source_registry.py`

- explicit source role and authority tier,
- versioned artifact URLs,
- licence/terms URL,
- commercial-use policy,
- attribution requirement,
- bounded download profiles.

Machine-readable mirror:
`data-sources/step1-sources.v1.json`.

### Secure acquisition

`python/movefuel_fdc/download_manager.py`

- HTTPS-only automatic downloads,
- no credentials in URLs,
- bounded retries and timeouts,
- atomic `.part` writes,
- maximum-byte guard,
- SHA-256 hashing,
- ETag / Last-Modified capture when available,
- acquisition manifest,
- HTML-error-page rejection for binary artifacts,
- `gsutil` support for Nutrition5k directory-level acquisition.

### Multi-source knowledge schema

`python/movefuel_fdc/knowledge_schema.py`

Adds:

- `kb_source`
- `kb_artifact`
- `kb_ingestion_run`
- `kb_quarantine`
- `kb_density_record`
- `kb_food_alias`
- `kb_regional_reference`
- `kb_benchmark_dish`
- `kb_benchmark_ingredient`
- `kb_nutrition5k_ingredient_catalog`
- `kb_build_state`

These coexist with the existing normalized FDC tables in one server-side
SQLite catalogue.

### FAO density importer

`python/movefuel_fdc/density_importer.py`

- detects food/density headers instead of relying on one row number,
- imports positive plausible density values,
- stores source/preparation/region/reference/raw cells,
- rejects/quarantines unmappable rows,
- deterministic density IDs,
- searchable normalized food names.

A source-reported central density is not automatically given fabricated
minimum/maximum bounds. Interval calibration belongs to the later portion
calibration step.

### Nutrition5k importer

`python/movefuel_fdc/nutrition5k_importer.py`

- imports official dish metadata,
- imports ingredient metadata,
- imports train/test/validation split IDs where present,
- supports variable-width per-dish ingredient groups,
- quarantines malformed dish rows.

Nutrition5k is explicitly blocked from becoming the app's nutrition authority.
It is benchmark truth for the fields supplied by that dataset.

### Step-1 orchestrator

`python/movefuel_fdc/step1_pipeline.py`

- `step1-sync` acquires public artifacts,
- `step1-build` imports acquired artifacts,
- `step1-validate` reports acquisition/import completeness,
- `step1-snapshot` exports a compact source/density snapshot,
- `density-search` inspects imported density evidence.

### Runtime source-use policy

`backend/src/nutrition/knowledgeSourcePolicy.ts`

Machine-enforces:

- USDA → nutrition authority,
- FAO density → density evidence,
- Nutrition5k → benchmark ground truth,
- Nepal publications → held until rights review.

This prevents a benchmark or reference source from being silently used as
production nutrient truth.

## 4. Commands

Install research package:

```bash
python3 -m pip install -e nutrition-research/python
```

Inspect source registry:

```bash
python3 -m movefuel_fdc.cli sources
```

Acquire Step-1 sources:

```bash
python3 -m movefuel_fdc.cli step1-sync \
  --profile step1 \
  --allow-large-usda
```

The `--allow-large-usda` switch is intentionally required because the full
USDA CSV release is approximately 460 MB zipped. Nutrition5k uses `gsutil` and
fetches metadata/splits only.

Build after acquisition:

```bash
python3 -m movefuel_fdc.cli step1-build \
  --usda-zip nutrition-research/data/raw/FoodData_Central_csv_2026-04-30.zip \
  --density-xlsx nutrition-research/data/raw/fao_infoods_density_v2.xlsx \
  --nutrition5k-root nutrition-research/data/raw/nutrition5k
```

Validate:

```bash
python3 -m movefuel_fdc.cli step1-validate
```

Search density evidence:

```bash
python3 -m movefuel_fdc.cli density-search "rice white" --preparation cooked
```

## 5. Test verification

Offline fixture verification performed in this environment:

- Python ingestion/ETL tests: **17 / 17 passed**.
- Backend unit/contract tests after Step-1 source policy: **338 / 338 passed**.

The end-to-end fixture test builds one database from a synthetic USDA bundle,
a synthetic density XLSX and synthetic Nutrition5k metadata, then verifies
that USDA nutrition, density evidence and benchmark ground truth all coexist
without source-role leakage.

## 6. Sandbox internet limitation

This execution environment cannot resolve external hosts from the coding
container. Therefore the actual USDA/FAO/Nutrition5k bytes could not be fetched
here. The acquisition code is implemented and tested, but a **live sync must be
run once on a machine/container with ordinary internet access** before the
`internet_sync_complete` flag can truthfully be `true`.

This is not an algorithm/data gap: it is an execution-environment network
restriction. The source URLs and current release metadata were independently
verified against the official USDA, FAO and Google Research pages on
2026-08-10.

## 7. Step-1 completion boundary

Implemented and complete:

- source selection,
- source roles/authority rules,
- source version registry,
- licences/terms metadata,
- internet download commands,
- checksums/manifests,
- multi-source database schema,
- USDA import integration,
- FAO density ingestion,
- Nutrition5k benchmark metadata ingestion,
- regional-reference rights hold,
- source-use enforcement,
- validation/reporting/snapshot,
- automated tests.

Not claimed complete by Step 1:

- real food segmentation,
- monocular/hardware depth,
- scale calibration,
- volume reconstruction calibration,
- reviewed density intervals,
- Nepal recipe/nutrient production authority,
- real-world weighed-meal calibration.

Those are Step 2 onward and must not be confused with the Internet knowledge
foundation.
