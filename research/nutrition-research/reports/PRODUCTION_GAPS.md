# MoveFuel — Production Gaps

Status: DRAFT
Last updated: 2026-08-06

This report tracks what is required before MoveFuel V1 food estimation can
be called production-acceptable. It is expected to change as phases
complete.

## Known gaps (V1)

- [x] USDA FoodData Central bulk catalogue downloaded + imported locally.
- [x] Normalization, search index, source ranking, deterministic calculator, recipe engine, mock vision pipeline, JSON schema, QA reports.
- [ ] USDA FoodData Central API key obtained (backend-only env).
- [ ] Weighed-food benchmark dataset collected (20–30 foods).
- [ ] Confirmed-basis nutrient calculation validated against weighed data.
- [ ] Regional (Nepali/South Asian) recipe variants reviewed by a human.
- [ ] Licence decision for any third-party vision model (AGPL/Enterprise).
- [ ] Real-device + provider integration tests (image providers).
- [ ] Production catalogue database (PostgreSQL) migration validated.
- [ ] Privacy review of image handling (delete-after-analysis, consent).
- [ ] User A / User B authorization denial tests for estimates.
- [ ] USDA API client live-call tests (mock only so far).

## Explicit non-claims

- No medical, clinical or production accuracy is claimed until the
  corresponding evidence (benchmark + tests) exists.
- Classification accuracy is not calorie accuracy.
- A single ordinary photo is not treated as exact physical measurement.
