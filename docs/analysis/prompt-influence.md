# Prompt Influence Analysis — MoveFuel 2

**Skill:** analyze-prompt-influence
**Status:** complete (scoped — no system prompts exist; analysis applied to the only runtime model instruction: the vision-provider prompt)
**Date:** 2026-09-22
**Prerequisites read:** `tool-graph.md`, `gate-map.md`

---

## 1. Applicability

| Probe | Result |
|---|---|
| System prompt templates / agent instructions at runtime | **None** (no agent runtime — see agent-loop.md) |
| LLM prompt templates | **One**: `promptFor(context)` for the vision scene recognizer (`openRouterFoodSceneAdapter.ts:183–201`) |
| Prompt versioning / A-B testing | None; config-selected providers only (OpenRouter priority 10 / Gemini 20) |
| AGENTS.md / .opencode docs | Development-time instructions, not runtime prompts — excluded |

This skill's method (declared instruction vs code enforcement, gap classification) is applied to that one prompt. It is a strong case study because the code **over-enforces** the prompt.

## 2. Declared Controls (what the prompt says)

1. Detect only visible food; one region per separable component; do not sum plates.
2. `box_2d` = `[ymin,xmin,ymax,xmax]` normalized 0..1000; concise mask polygon.
3. `visual_portion_estimate` = deliberately broad, **non-authoritative** min/central/max grams; include assumptions; **confidence ≤ 0.65**.
4. ≤ 3 plausible identity candidates + preparation candidates per region.
5. Food type ∈ {BASIC, PACKAGED, PREPARED, MIXED_DISH, LIQUID, UNCLEAR}.
6. Context hints are soft re-ranking priors only; strong visual evidence wins.
7. Do not invent hidden oil/sauce/ingredients/fillings/brand/restaurant/recipe details.
8. **Do not output calories, energy, protein, carbohydrate, fat, fiber, sodium, micronutrients, density, or any nutrient value.**
9. If unclear → `UNCLEAR` + low confidence; if no food → empty regions.

## 3. Code Enforcement (what the code forces)

| Declared behavior | Code enforcement | Location |
|---|---|---|
| No nutrient values ever | **Recursive forbidden-key scan** over the entire provider payload (normalized key matching: forbids nutrition/density keys anywhere in the tree) | `hasForbiddenNutritionKey` (`:139–146`) |
| Confidence ≤ 0.65 | **Hard clamp** — provider values above 0.65 are lowered to ≤0.65; invalid → 0.35 | `visualPortion` (`:170`) |
| Broad, non-authoritative portion prior | **Range enforcement**: positive finite values; `min ≤ central ≤ max`; `max ≤ 5000`; **min forced ≤ central×0.55**, **max forced ≥ central×1.55**; method fixed to `MONOCULAR_MODEL_PRIOR` | `visualPortion` (`:163–176`) |
| Assumptions must not smuggle numbers | Assumptions matching `/calorie\|nutrient\|density/i` **filtered out**; deduped, trimmed, capped at 6 | `visualPortion` + `cleanStrings` |
| bbox normalized 0..1000 | Numeric validation + ordering (`ymin < ymax`, `xmin < xmax`) → typed errors (`invalid_provider_bbox`, …) | `:433–440` |
| Confidence 0..1 | `validNumber01` validation | `:150–152` |
| One region per component / bounded output | `MAX_REGIONS` slice; per-region parse with typed errors | `:434` |
| ≤ 3 identity candidates | Candidate lists parsed with caps (code-limited) | parse path (spot-verified) |
| Empty regions when no food | Empty array accepted and handled downstream | parse path |
| Hints as soft priors | Hints only injected into prompt text; never used to bypass validation | `promptFor` |

**Bounded generation additionally enforced:** temperature 0.1, maxOutputTokens 4096, timeout 5–60 s (clamped), 3 attempts with backoff (provider config).

## 4. Gap Analysis by Dimension

| Dimension | Prompt (says) | Code (does) | Gap |
|---|---|---|---|
| **Nutrition authority** | "Do not output calories/nutrients" | Hard rejection of forbidden keys + portion clamps + confidence cap; nutrition authority stays in server-side FDC/evidence pipeline | **No gap — enforced beyond prompt** |
| **Measurement authority** | "Broad, non-authoritative grams" | Enforced range widening + fixed method label | **No gap — enforced** |
| **Output shape** | bbox/mask/type/candidate spec | Full structural validation with typed errors | **No gap — enforced** |
| **Confidence** | ≤ 0.65 | Clamped | **No gap — enforced** |
| **Invented details** | "Do not invent ingredients/brands" | Not semantically enforceable; mitigations: forbidden-key scan, assumption filter, user confirmation boundary (`draft ≠ confirmed`, review screens) | **Wide gap (trust-based) — bounded by downstream gates** |
| **Evidence-only detection** | "Only visible food; don't sum plates" | Not semantically enforceable; region caps + user confirmation mitigate | **Wide gap (trust-based) — product-gated** |
| **Hint obedience** | "Hints are soft" | Hints only affect prompt; all outputs validated regardless | **No gap** |
| Response style/language | (not specified) | — | n/a |

### Reverse gaps (undeclared, code-only controls — defense in depth)
- Forbidden-key scan is an **additional** rejection mechanism beyond the prompt's request (prompt asks; code refuses).
- Confidence clamping and range widening apply **even if** the provider follows instructions — outputs are normalized, not trusted.
- Model outputs never reach users directly: draft → user review → confirmation is the only path to persisted nutrition facts. Model compliance is not required for correctness of the canonical record.

## 5. Control Architecture Summary

| Class | Dimensions |
|---|---|
| **Engineering-controlled (code-enforced)** | Nutrition authority, measurement authority, output schema, confidence bounds, region limits, provider timeouts/retries |
| **Trust-controlled (prompt-only, bounded by product gates)** | Semantic honesty about visible food; not inventing ingredients; plate-summing behavior |
| **Not applicable** | Tool usage, data access, safety moderation (no agent/tools) |

**Verdict:** This is a well-designed prompt boundary — the prompt requests, the code enforces, and the product's confirm-to-canonical invariant ensures model non-compliance cannot corrupt canonical data. The two wide gaps are inherent to monocular vision and are contained by the confirmation gate rather than left to model obedience.

## 6. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| Prompt-only semantic honesty | LOW | Non-enforceable claims (ingredients, summing) could mislead pre-confirmation UI; mitigated by review→confirm boundary and "UNKNOWN never zero" display rules |
| Code over-enforces nutrition authority | INFO (positive) | Forbidden-key scan is unusual, deliberate, verified |
| Confidence/range normalization | INFO (positive) | Prevents precision theater (e.g., "57.2 g measured") |
| Provider output fully validated | INFO (positive) | Typed errors; no pass-through |
| No prompt injection surface | INFO (positive) | No user-controlled text enters the prompt except bounded priors (`countryPrior`, `cuisinePrior`, `mealTimePrior` — enum-like, not free text? verify: they are context strings; low risk given no tool access and full output validation) |

## 7. Output Contract

- File: `docs/analysis/prompt-influence.md`
- State: `analyze-prompt-influence: complete (scoped — single provider prompt; no system prompts)`
- Next: Phase 4 — `reconstruct-system-intent`
