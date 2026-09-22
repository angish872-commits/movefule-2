# MoveFuel — Weighed-Food Benchmark Protocol

Status: DRAFT (protocol for a human collector)
Date: 2026-08-06

Purpose: capture real weighed-food samples so the mock-first pipeline can later
be measured honestly. This protocol is followed by a person, in a kitchen, with
a digital kitchen scale accurate to 1 g. Nothing here validates a provider or
claims accuracy; it defines how ground truth is created.

## Rules

- Never invent a measurement. If a value was not weighed/measured, leave the
  field absent and keep the sample `AWAITING_COLLECTION`.
- Use grams for mass and millilitres for volume; record units explicitly.
- Photographs reference stored files only (`ref://`); image bytes are never
  embedded in the benchmark artefacts.
- Corrections are recorded in `corrections` without overwriting original
  ground truth.

## Step-by-step

### 1. Weigh raw ingredients

- Zero the scale with the empty bowl/dish on it (`tare`).
- Weigh each raw ingredient separately before cooking and record
  `ingredients[].rawWeightG` with the ingredient `name` and, where resolved,
  its USDA FDC ID (`ingredients[].fdcId`).
- Record every ingredient that will be cooked, including water where relevant.

### 2. Record cooking oil / ghee / sauce

- Weigh the oil/ghee/butter container before and after adding fat; the
  difference is `addedOilGheeButterSauceG`.
- If a sauce is added after cooking, weigh the sauce portion that is actually
  served and record it the same way. Do not estimate; weigh.

### 3. Weigh the final cooked food

- After cooking, weigh the entire cooked preparation (the pot plus food minus
  the tared pot weight) and record `finalCookedWeightG`.

### 4. Weigh the served portion

- Weigh the empty serving plate/bowl, then the plate plus the served food, and
  record `portionServedWeightG` (difference). This is the ground-truth portion
  that appears in the photos.

### 5. Measure the plate or container

- Measure the plate rim diameter to the nearest 0.5 cm and record
  `plateDiameterCm`.
- For bowls/cups/glasses, fill with water and measure the volume in ml
  (`bowlCupVolumeMl`) or record the manufacturer's stated volume only if it
  was verified by weighing.
- Record the reference object used in the frame (`images.referenceObject`,
  e.g. a standard debit card or a printed 6 cm card) and never move it between
  front and side photos.

### 6. Take front and side photographs

- Fixed distance and consistent lighting; camera parallel to the plate for the
  front image; second image at ~45 degrees for the side image.
- Include the reference object and, for packaged food, the label/barcode in at
  least one photo.
- Record image `widthPx`/`heightPx`. Do not crop out part of the plate.

### 7. Record piece count

- For piece-based foods (momo, dumplings, eggs, fruits), count and record
  `pieceCount` and weigh a representative single piece if feasible (record in
  `corrections`/notes).

### 8. Capture package labels / barcodes

- For packaged foods, photograph the barcode and the nutrition-facts/serving
  label. Record the resolved FDC ID or recipe source in
  `groundTruthSource` during review.

### 9. Review food identity and source mapping

- A reviewer (identified by `reviewer`) confirms `foodNames`, preparation
  method, and `groundTruthSource` (FDC ID or recipe ID). The sample becomes
  `REVIEWED` only after this.
- Region/mask ground truth (`groundTruthRegions`) is drawn on the stored
  images for the review and links each region to its food names.

### 10. Preserve corrections without overwriting original ground truth

- Any later correction (re-measure, re-source, exclusion reason) is appended to
  `corrections` with a note; the original measured values are never edited away.
- A sample may be marked `EXCLUDED` (with `exclusions` reason) instead of
  editing it to "fit".

## Sample readiness

A sample is evaluable only when `reviewStatus` is `REVIEWED` and
`privacyConsent` is `CONSENTED`. Everything else is excluded by the
`BenchmarkEvaluator`.

## Files

- Sample schema: `nutrition-research/benchmark/benchmark-sample.schema.json`
- Plan: `nutrition-research/benchmark/benchmark-plan.json` (30 samples,
  `AWAITING_COLLECTION`)
- Templates: `benchmark-sample.template.json`, `benchmark-manifest.template.json`,
  `benchmark-samples.template.csv`
