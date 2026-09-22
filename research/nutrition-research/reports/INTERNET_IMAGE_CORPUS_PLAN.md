# MoveFuel — Phase 8A: Licensed Internet Image Corpus — Plan

Date: 2026-08-06
Scope: a small, legally usable internet-image corpus for pipeline testing and
benchmark planning. No live AI image-provider API is used, no paid API is
called, no model weights are downloaded, and no measured data is fabricated.

## Objective

Build up to 30 images for three evidence classes:

| Class | Budget | Ground truth | Metrics |
|---|---|---|---|
| MEASURED_DATASET | up to 10 | measured mass / nutrition supplied by the dataset | only fields the dataset actually supplies |
| LABELLED_IDENTITY_ONLY | up to 10 | food label, no valid portion/nutrition truth | identity top-1 / top-3 only |
| REFERENCE_ONLY | up to 10 | none (visual material) | segmentation, candidate generation, clarification, workflow |

## Source rules

Only three kinds of source are acceptable:

1. Public-domain images.
2. Creative Commons images whose licence permits the intended use
   (commercial-use permitted; NC licences are rejected).
3. Datasets with an explicit reusable licence.

Prohibited sources: random Google Images results, social-media photographs,
restaurant or delivery-app photographs, unlicensed blogs, images with unknown
licence status, and complete large-dataset downloads. Total downloaded material
must stay below 3 GB.

## Evidence-class rules

- MEASURED_DATASET: evaluate only the fields the dataset supplies; anything
  missing stays null / NOT_MEASURABLE. Never infer nutrition from a photograph.
- LABELLED_IDENTITY_ONLY: identity top-1/top-3 allowed; gram, calorie and
  nutrient errors are NOT_MEASURABLE.
- REFERENCE_ONLY: segmentation, candidate generation and clarification testing
  allowed; grams, hidden ingredients, oil and nutrition are NOT_MEASURABLE; a
  regional reference image must never be treated as recipe ground truth.

## Chosen sources

1. Nutrition5k (Google Research) — CC BY 4.0, measured per-dish mass, calories
   and macros. Individual files are fetched from the public Google Cloud
   Storage bucket; only 10 overhead RGB images plus three small metadata CSVs
   are downloaded. This supplies the MEASURED_DATASET class.
2. Wikimedia Commons — CC0 / CC BY / CC BY-SA images of the preferred regional
   categories, each with a recorded author, licence name and licence URL. This
   supplies LABELLED_IDENTITY_ONLY and REFERENCE_ONLY classes.

## Target composition (10 preferred regional categories)

steamed momo, fried momo, momo achar, dal bhat, rice, dal, tarkari,
chicken curry, chow mein, thukpa. Commons selections cover every category.

## Validation plan

Code-level tests (backend suite) enforce: unknown licence rejected; missing
attribution rejected when required; duplicate checksum detection; duplicate
source identifier; missing image file; SHA-256 mismatch; unsupported image
format; identity-only blocks nutrition metrics; reference-only blocks gram and
calorie metrics; measured fields preserved unchanged; missing values never
become zero; regional reference never becomes recipe ground truth;
deterministic replay; no live provider call.

## Real-camera pilot (kept AWAITING_COLLECTION)

1. banana
2. cooked rice
3. steamed momo
4. dal bhat
5. packaged food with a nutrition label

These are not part of the internet corpus; they require real, user-captured
photographs with weighed ground truth.
