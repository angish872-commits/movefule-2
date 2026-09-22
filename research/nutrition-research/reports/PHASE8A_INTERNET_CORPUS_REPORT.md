# MoveFuel — Phase 8A: Licensed Internet Image Corpus — Completion Report

Status: COMPLETE (all 30 images downloaded, validated, licensed, tested)
Date: 2026-08-06

## 1. Exact files changed

Created (corpus):
- `nutrition-research/benchmark/internet-corpus/` (directory tree)
- `nutrition-research/benchmark/internet-corpus/images/` — 30 images
  (`ic-001.png` … `ic-010.png` from Nutrition5k; `ic-011.jpg` … `ic-030.jpg`
  from Wikimedia Commons; ~9.4 MB total)
- `nutrition-research/benchmark/internet-corpus/samples/ic-001.json` …
  `ic-030.json` — per-sample full provenance
- `nutrition-research/benchmark/internet-corpus/manifest.json` — corpus
  manifest (counts, sources, class balance, 5-item real-camera pilot marked
  AWAITING_COLLECTION)
- `nutrition-research/benchmark/internet-corpus/attribution/attribution.json`
  and `attribution/ATTRIBUTION.md`

Created (backend):
- `backend/src/nutrition/internetCorpus.ts` — provenance validator
  (`validateProvenance`, `validateLicence`, `validateAttribution`,
  `validateEvidenceClassMetricRules`, `validateReferenceHasNoGroundTruth`,
  `validateSupportedFormat`, `verifySha256`, `findDuplicateChecksums`,
  `findDuplicateSourceIdentifiers`, `toMetricValue`, `extractMeasuredFields`,
  `corpusReplayKey`, `LIVE_PROVIDER_CALL`)
- `backend/src/tests/nutrition/internet-corpus.test.ts` — 19 tests
- Modified `backend/src/nutrition/index.ts` — re-exports `internetCorpus.ts`

Created (reports):
- `nutrition-research/reports/INTERNET_IMAGE_CORPUS_PLAN.md`
- `nutrition-research/reports/INTERNET_IMAGE_LICENSE_AUDIT.md`
- `nutrition-research/reports/PHASE8A_INTERNET_CORPUS_REPORT.md`

## 2. Sources and datasets used

- Nutrition5k (Google Research), CC BY 4.0 — measured per-dish total mass (g),
  calories, fat, carbohydrate, protein, and per-ingredient grams. Files fetched
  individually from the public GCS bucket; no complete dataset download.
- Wikimedia Commons — CC0, CC BY-SA 3.0, CC BY-SA 4.0 photographs covering the
  ten preferred regional categories.

No other sources were used. No paid API, no AI image-provider call, and no model
weight download occurred.

## 3. Image count by evidence class

| Evidence class | Count | Samples |
|---|---|---|
| MEASURED_DATASET | 10 | ic-001 … ic-010 |
| LABELLED_IDENTITY_ONLY | 10 | ic-011 … ic-020 |
| REFERENCE_ONLY | 10 | ic-021 … ic-030 |
| Total | 30 | ic-001 … ic-030 |

## 4. Total download size

- 30 images: 9,424,310 bytes (~9.0 MB)
- Nutrition5k metadata CSVs: ~3.1 MB (supporting data, not corpus images)
- Combined, far below the 3 GB cap.

## 5. Licence and attribution status

- 10 × CC BY 4.0, 17 × CC BY-SA 4.0, 1 × CC BY-SA 3.0, 2 × CC0.
- Zero UNKNOWN licences; zero NC licences. Every image records author/owner,
  licence name, licence URL, usage terms, and original source reference
  (`attribution/attribution.json`, `samples/*.json`).
- Attribution obligations are recorded per file; `ATTRIBUTION.md` lists the
  required credits and licences.

## 6. Measurable fields

- ic-001 … ic-010 (MEASURED_DATASET): `total_mass_g`, `total_calories_kcal`,
  `total_fat_g`, `total_carb_g`, `total_protein_g`, and per-ingredient
  `{name, grams}` — all taken verbatim from the dataset metadata.
- ic-011 … ic-020 (LABELLED_IDENTITY_ONLY): food label only (identity truth).
- ic-021 … ic-030 (REFERENCE_ONLY): none.

## 7. Metrics blocked as NOT_MEASURABLE

- LABELLED_IDENTITY_ONLY: gram, calorie and nutrient errors.
- REFERENCE_ONLY: gram, calorie and nutrient errors, hidden ingredients, oil.
- MEASURED_DATASET: fibre, sodium and per-region gram errors (dataset does not
  supply them); anything else not supplied by the dataset stays null.

## 8. Tests and results

- Backend: 291 tests, 291 passed, 0 failed (19 new corpus tests, including
  every required validation case: unknown licence, missing attribution,
  duplicate checksum, duplicate source identifier, missing image file,
  SHA-256 mismatch, unsupported format, identity-only nutrition blocking,
  reference-only gram/calorie blocking, measured-fields preservation,
  missing-never-zero, reference-never-recipe-truth, deterministic replay, and
  no live provider call).
- Python: 10 tests, 10 passed (unittest, unchanged).
- TypeScript: clean on `phase8`, `phase8tests`, `idx`, and re-checked
  `phase6`, `phase6tests`, `phase7`, `phase7tests`, `bs` (no regressions).
- Provenance validation: all 30 samples pass `validateCorpus` with zero errors;
  SHA-256 of every local file matches its recorded checksum.

## 9. Secret-scan result

Clean — no API keys, tokens, or secrets in the corpus JSON, attribution files,
backend module, tests, or reports.

## 10. Remaining real-camera pilot (AWAITING_COLLECTION)

1. banana
2. cooked rice
3. steamed momo
4. dal bhat
5. packaged food with a nutrition label

These five items remain in the manifest as AWAITING_COLLECTION and are not part
of the internet corpus. No accuracy claims are made from the internet corpus
for portion or nutrition estimation.

## 11. Next bounded action

Capture the five-item real-camera pilot (weighed banana, weighed cooked rice,
weighed steamed momo, weighed dal bhat, packaged food with its nutrition label),
add each with the same provenance record, then run the existing Phase-7 harness
against the MEASURED_DATASET samples to exercise identity and (for Nutrition5k)
mass/calorie metrics end to end with MOCK providers only.
