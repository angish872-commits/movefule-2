# MoveFuel Algorithm Validation Suite V1

This directory is the execution harness for taking the current MoveFuel algorithm from **implemented** to **empirically validated**.

It deliberately keeps three claims separate:

1. **Science/reference parity** — does the Personal Target Engine implement its chosen equations and product rules correctly?
2. **Known grams -> nutrition parity** — when food identity, preparation, source, and grams are known, are calories/macros calculated deterministically and correctly?
3. **Photo -> food -> grams -> nutrition accuracy** — does an unseen real meal image produce a useful central estimate and uncertainty interval without seeing ground truth first?

Only claim 3 can justify an end-to-end photo-calorie accuracy statement.

## One-command workflow on the user's Mac/Linux machine

First run setup:

```bash
./algorithm-validation/setup.sh
```

Then run the safe pilot:

```bash
./algorithm-validation/validate-v6.sh pilot
```

The pilot performs local tests, target-reference validation, machine/network preflight, local corpus checks, and live API probes **only when the corresponding credentials are already present in the environment**. It does not download hundreds of gigabytes.

For the standard validation after the pilot succeeds:

```bash
MOVEFUEL_ALLOW_DOWNLOADS=1 \
MOVEFUEL_ALLOW_LIVE_API=1 \
./algorithm-validation/validate-v6.sh standard
```

For the large/full research run, explicit large-download permission is required:

```bash
MOVEFUEL_ALLOW_DOWNLOADS=1 \
MOVEFUEL_ALLOW_LARGE_USDA=1 \
MOVEFUEL_ALLOW_LIVE_API=1 \
./algorithm-validation/validate-v6.sh full
```

The validation runner never prints API-key values. Keep credentials in environment variables or the existing private configuration outside any result ZIP.

## Credentials

Recognized environment variables:

- `GEMINI_API_KEY`
- `MOVEFUEL_FOOD_VISION_MODEL` (optional model override)
- `USDA_FDC_API_KEY` or `FDC_API_KEY` (optional; USDA DEMO_KEY can be used for a tiny smoke probe)

Do **not** paste keys into the result CSV/JSON files.

## Outputs

Each run creates a timestamped directory under:

`algorithm-validation/results/`

The final command creates a sanitized bundle:

```bash
./algorithm-validation/pack-results-v6.sh
```

Upload that results ZIP back to ChatGPT. It contains machine capability, dataset state, test results, live-smoke status, benchmark inputs/results, model lock data, and failure logs — but excludes private environment files and key values.

## Profiles

### pilot

- Existing 30-image internet corpus only.
- Existing 10 measured Nutrition5k ground-truth meals.
- No large downloads.
- Fastest way to verify machine, code, keys, network, and report generation.

### standard

- Full USDA bulk nutrition catalogue (explicit download permission).
- FAO density source.
- Nutrition5k metadata/splits.
- Selected benchmark imagery rather than the entire ~181 GB corpus.
- Live Gemini candidate-recognition sampling.
- Intended for the first serious calibration cycle.

### full

- Intended for final research/acceptance work.
- Allows larger public benchmark acquisition.
- Must still preserve an untouched held-out test partition.
- The runner refuses silent large downloads unless explicitly enabled.

## Release rule

The suite does not call the algorithm "accurate" because software tests pass. A release candidate must have independently generated predictions for held-out meals and pass the configured mass/calorie/interval gates. Launch-market validation remains a separate required acceptance set, prioritized for the U.S., U.K., and Australia while keeping globally diverse foods in scope.
