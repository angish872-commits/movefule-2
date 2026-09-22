# MoveFuel Algorithm — Current Public Source Verification

Verified: 2026-08-10
Scope: algorithm/science/data/CV evidence only. This file records source facts; it is not an end-to-end accuracy claim.

## USDA FoodData Central

- Latest bulk releases observed on the official downloads page: Foundation Foods April 2026; FNDDS 2021–2023 released October 2024; Branded April 2026; Full Download April 2026; SR Legacy final April 2018.
- Branded foods are updated monthly in the online/API system; the official update log shows FoodData Central v15.3 on 2026-07-23, after the April bulk archive.
- Runtime policy: use Foundation/FNDDS for generic foods where appropriate; use the live API/current branded record for exact packaged products when freshness matters. Preserve FDC ID, data type and date/version metadata.
- FoodData Central is public domain / CC0. API keys must remain private.

Official pages checked:
- https://fdc.nal.usda.gov/download-datasets/
- https://fdc.nal.usda.gov/data-documentation/
- https://fdc.nal.usda.gov/api-guide/
- https://fdc.nal.usda.gov/log/

## FAO/INFOODS

- The official FAO/INFOODS Density Database v2 is explicitly intended to help convert food volume to weight and vice versa.
- FAO/INFOODS also exposes AnFooD2.0 as a scrutinized analytical cross-check source.
- FAO states that inclusion in its food-composition directory is not an endorsement; databases should be quality-evaluated for the intended use.
- The FAO statistical-database terms include additional restrictions for use in conjunction with promotion of commercial enterprises/products/services. Because MoveFuel is a commercial product, copied FAO density/composition records are research/validation references until exact rights review is closed. The algorithm must not silently treat them as production authority.

Official pages checked:
- https://www.fao.org/infoods/infoods/tables-and-databases/faoinfoods-databases/en/
- https://www.fao.org/food-composition/tables-and-databases/detail/(global--2012)-fao-infoods-density-database---version-2/en
- https://www.fao.org/contact-us/terms/db-terms-of-use/en
- https://www.fao.org/food-composition/tables-and-databases/6/en

## Nutrition5k

- Official archive: 5,006 plates; per-ingredient mass; total dish mass, calories and macros; overhead RGB-D when available; official train/test split.
- Full archive is about 181.4 GB, but individual directories can be fetched selectively from public GCS. MoveFuel now supports direct public GCS HTTPS acquisition, so `gsutil` is optional rather than a hard requirement.
- Raw depth units are 10,000 units per meter.
- Dataset is CC BY 4.0 and explicitly warns that it does not cover all cuisines.
- MoveFuel uses Nutrition5k only as held-out benchmark/calibration evidence, never as canonical nutrition truth.

Official page checked:
- https://github.com/google-research-datasets/Nutrition5k

## FoodSeg103

- Official project describes 7,118 images, 104 ingredient classes, an average of six labels per image and pixel-wise masks.
- Repository/project states Apache-2.0; dataset/image/pretrained-weight rights remain a separate commercial-release gate in MoveFuel.
- Benchmark usage is allowed for research validation while production redistribution/use remains fail-closed until rights are confirmed.

Official page checked:
- https://github.com/LARC-CMU-SMU/FoodSeg103-Benchmark-v1

## Depth Anything V2

- Official repository lists the Small model at 24.8M parameters.
- Small weights are Apache-2.0; Base/Large/Giant are CC-BY-NC-4.0.
- The standard model is relative-depth; metric-depth variants are separately fine-tuned. MoveFuel must never treat raw relative depth as centimeters.
- MoveFuel candidate policy: Small only, checkpoint SHA-256 pinned, physical scale/calibration required, and final commercial provenance review retained as a gate.

Official pages checked:
- https://github.com/DepthAnything/Depth-Anything-V2
- https://github.com/depthanything/depth-anything-v2/blob/main/metric_depth/README.md

## Gemini

- Gemini 3.6 Flash is listed as stable, updated July 2026, with image input and structured output support.
- The stable Interactions REST endpoint is `POST /v1/interactions` with `x-goog-api-key`. The 2026 schema uses `steps` in REST responses and the polymorphic `response_format` object for JSON output.
- MoveFuel's candidate-only adapter is intentionally prohibited from accepting grams/calories/macros/micronutrients as authoritative model output.

Official pages checked:
- https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash
- https://ai.google.dev/gemini-api/docs/interactions-breaking-changes-may-2026
- https://ai.google.dev/gemini-api/docs/api-versions
- https://ai.google.dev/gemini-api/docs/image-understanding

## Personal target science

- 2023 NASEM EER is the energy-estimation basis. The reference itself states that planning is a two-step process: estimate EER, then monitor body weight and adjust as needed.
- Adult AMDR guardrails: carbohydrate 45–65% energy, fat 20–35%, protein 10–35%.
- MoveFuel's lose/gain deltas remain versioned product starting rules, not universal biological truths.
- Weight-trend recalibration is therefore part of the target algorithm rather than claiming one equation is permanent truth.

Primary pages checked:
- https://www.ncbi.nlm.nih.gov/books/NBK591034/
- https://www.ncbi.nlm.nih.gov/books/NBK545442/
- https://pubmed.ncbi.nlm.nih.gov/28698222/
- https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner

## Nepal/regional references

- FAO directory entries for the Nepal 2017, 2012 and 1994 tables are valid regional references.
- The 2017 entry reports a screening score of 35/120.
- Because directory inclusion is not FAO endorsement and source-specific rights/quality remain relevant, these are regional cross-check sources until MoveFuel completes explicit quality/rights review.

