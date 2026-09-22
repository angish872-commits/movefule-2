# MoveFuel — Phase 8A: Internet Image Licence Audit

Date: 2026-08-06
Scope: verify that every image in `nutrition-research/benchmark/internet-corpus/`
carries a licence that permits the intended use (pipeline testing and benchmark
planning, including in a commercial product), and that attribution obligations
are recorded. Every image with an UNKNOWN licence is rejected by rule and by
code.

## Licence inventory

30/30 images have an explicit, known licence.

| Licence | Count | Samples | Intended use permitted |
|---|---|---|---|
| CC BY 4.0 | 10 | ic-001 … ic-010 (Nutrition5k) | Yes — commercial, share, adapt |
| CC BY-SA 4.0 | 17 | ic-011/012/014–028 | Yes — commercial, share-alike |
| CC BY-SA 3.0 | 1 | ic-029 | Yes — commercial, share-alike |
| CC0 (public domain) | 2 | ic-013, ic-030 | Yes — no conditions |
| NC (non-commercial) | 0 | — | n/a (rejected) |
| UNKNOWN | 0 | — | n/a (rejected) |

## Nutrition5k (10 images, MEASURED_DATASET)

- Licence: CC BY 4.0, stated in the dataset README: "We release all Nutrition5k
  data under the Creative Commons V4.0 license. You are free to share and adapt
  this data for any purpose, even commercially."
- Evidence reference: https://github.com/google-research-datasets/Nutrition5k#license--contact
- Attribution: attribute Google Research and cite Thames et al., "Nutrition5k:
  Towards Automatic Nutritional Understanding of Generic Food", CVPR 2021.
- Only 10 overhead RGB images and three metadata CSVs were fetched from the
  public bucket; no complete dataset download (total ~9.4 MB).

## Wikimedia Commons (20 images, LABELLED_IDENTITY_ONLY / REFERENCE_ONLY)

- Every file records: author/owner, licence short name, licence URL, usage
  terms, and the Commons file page (DescriptionUrl) as the original source
  reference.
- Attribution obligations per file are stored in
  `attribution/attribution.json` and `attribution/ATTRIBUTION.md`.
- No NC licence, no unknown licence, no unlicensed image was accepted.

## Rejected sources (documented for traceability)

- Food-101 and other non-commercial datasets (CC BY-NC-SA) — rejected: NC does
  not permit the intended commercial use.
- Google Images, social media, restaurant/delivery-app photos, unlicensed
  blogs — rejected by rule; none were used.
- Datasets without an explicit reusable licence (e.g. UECFood, VIREO, research
  only) — rejected; not evaluated for inclusion.
- Commons search hits that are documents/PDFs or unrelated subjects — rejected
  on inspection.
- "Momo achar" and "momo with achar" searches returned non-food documents; the
  momo-achar category is instead represented by two verified Commons photos
  that clearly show momos with achar (ic-013 CC0, ic-024 CC BY-SA 4.0).

## Enforcement in code

`validateProvenance` in `backend/src/nutrition/internetCorpus.ts` rejects any
sample whose licence is empty, "unknown", "unlicensed", or "unknown licence
status"; it also rejects missing attribution/author for licences in the CC BY /
CC BY-SA / GFDL family. The backend suite asserts the whole corpus validates
clean (291/291 passing, including 19 corpus tests).

## Conclusion

The corpus contains no image with an unknown licence; every image's licence,
licence URL, author and attribution requirement are recorded; total download is
well below the 3 GB limit; and attribution obligations are met by the recorded
per-file credits.
