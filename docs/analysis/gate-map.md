# Gate Map — MoveFuel 2

**Skill:** map-feature-gates
**Status:** complete
**Date:** 2026-09-22
**Prerequisites read:** `tool-graph.md`, `build-pipeline.md`

---

## 1. Gate Inventory by Type

### 1.1 Build-Time Gates (filter before/at artifact creation)

| Gate | Condition | Effect | Location |
|---|---|---|---|
| Bootstrap reconstruction | push to `bootstrap/*` touching `imports/mufil2/READY` | 21 patches apply → snapshot rebuilt; refuses if `Mufil-2/` exists | `apply-mufil2-import.yml` |
| Snapshot count assertions | In pipeline | Build fails unless exactly 400 screens / 428 kt / 404 registry rows; audit CSVs byte-equal | same + `ui_closed_loop_audit.py` |
| Closed-loop audit | Always in UI verify CI | 22 structural/invariant checks; build fails on drift | `mufil-2-ui-verify.yml` |
| Contract drift gate | `npm run verify` | Fails if generated contracts ≠ `contracts.json` output | `generate-contracts.mjs --check` |
| Android variant gates | — | None: no flavors, no minify, no BuildConfig, no conditional source sets | `app/build.gradle.kts` |

### 1.2 Runtime Gates (state-driven)

| Gate | Condition | Effect | Location |
|---|---|---|---|
| Train route substitution | `TrainState` ∈ {NotConfigured, SetupIncomplete, PlanPreview, Active} | MASTER_TRAIN / TRN_* / WRK_* entry redirected to TRS_001 / stored step / TRS_020 / TRN_001 | `NavGraph.trainEntryRoute()` |
| Plan activation | `planPreviewReference` exists and ≠ `"pending-engine"` | `activatePlan` returns false → navigation to TRN_001 blocked | `CanonicalStateStore.activatePlan` |
| Onboarding completion | Current = ONB_018 and target ∈ {MASTER_TODAY, TOD_001} | Persists `onboardingCompleted=true`; other exits do not | `NavGraph.navigate` |
| Draft → confirmed meal | Return to FNO_001 from {FNO_012, CAM_017, BAR_011} | Only path that increments `confirmedFoodCount`, sets `syncState=Pending` | `NavGraph.navigate` + `confirmFood` |
| Performed-set counting | `workoutExecution == InProgress` | No-op otherwise | `recordPerformedSet` |
| Workout commit | Exit WRK_032 to Train/Progress while InProgress→SummaryPending | Exactly one increment; Idle cannot commit | `commitWorkoutSummary` |
| Deterministic fixture provider | `MOVEFUEL_ENV !== "production"` | Adds fixture AI provider path | `/v1/config` feature map |
| `deterministicFixtureProvider` exposure | Same | Advertises fixture capability to clients | `/v1/config` |

### 1.3 Permission Gates

| Gate | Condition | Effect | Location |
|---|---|---|---|
| Session gate (global) | `requireSession` — provider resolves principal | 401-style contract errors otherwise; **fails closed if provider absent** | `requestSupport.ts` |
| Production session strictness | `production` flag → principal.provider must be `appwrite` **and** carry `accessToken` | Prevents weaker session types in prod | same |
| Device binding | `requireDeviceId` on sync/bootstrap/watch | Non-empty `x-device-id` required | same + routes |
| Ownership scoping | `OwnerScopedRepository`, `userScopedKey(userId, …)`, row `userId` filters | Cross-user data access blocked at repository layer | foundation/domain stores |
| Account lifecycle guards | `AccountLifecycleError` | Deletion/export precondition violations → 400 | `foundation/account-lifecycle.ts` |
| Consent gate | `parseConsentRecords` + consent service | Malformed/unknown consent choices rejected; idempotent legal state | `foundation/consents.ts` |
| **Consent gate — image analysis** | `mealImageAnalysisAllowed(userId)` | Throws `meal_image_analysis_consent_required` before any provider call | `privacy/image-estimate-privacy-guard.ts:43` |
| **Consent gate — model improvement** | `modelImprovementAllowed(userId)` | `learnConfirmed` silently skipped — confirmed meals cannot enter personalization without opt-in | same, `:72` |

### 1.4 Provider Gates

| Gate | Condition | Effect | Location |
|---|---|---|---|
| Appwrite runtime | endpoint + project + server key (+ bucket for media) | Enables repositories, calendar/training runtimes, bootstrap, media store, telemetry | `feature-runtime.ts` |
| **Production fail-closed** | production && any Appwrite config missing | **Boot throws** — cannot run production without persistence + bucket | `backend-runtime.ts:115` |
| Vision chain — OpenRouter | `OPENROUTER_API_KEY` present | Provider config `env-openrouter-food-vision` (priority **10**, temp 0.1, 4096 tokens, timeout clamp 5–60 s, 3 attempts) | `backend-runtime.ts:134` |
| Vision chain — Gemini | `GEMINI_API_KEY` present | Provider config `env-gemini-food-vision` (priority **20**, timeout 12 s) | `:135` |
| Trusted FDC nutrition | `USDA_FDC_API_KEY ?? FDC_API_KEY` | USDA-backed catalog lookups + `trustedFdcNutrition` capability | `:144` |
| Packaged food lookup | `OPEN_FOOD_FACTS_USER_AGENT` | Enables OpenFoodFacts handler; otherwise `configured=false` | `request-handler.ts` |
| Billing — demo vs production | `entitlementProvider.mode` | `demo` → `/v1/billing/*/verify` returns `billing_not_configured`; entitlements readable | `experience-routes.ts:53,61` |
| Provider telemetry | Appwrite tables client | Records provider usage (`onOpenRouterUsage`) | `providerCallRecorder` |

### 1.5 Config Gates (environment variables)

`MOVEFUEL_ENV` · `MOVEFUEL_AUTH_MODE` (`local-test` default vs `appwrite`) · `MOVEFUEL_HOST` · `PORT` · `APPWRITE_*` (4) · `BUCKET_MEAL_MEDIA_ID` · `OPENROUTER_*` (5) · `GEMINI_*` (2) · `USDA_FDC_API_KEY`/`FDC_API_KEY` · `OPEN_FOOD_FACTS_USER_AGENT` · `MOVEFUEL_PYTHON_BIN` · `MOVEFUEL_PORTION_CALIBRATION_PROFILES` · `MOVEFUEL_REVIEWED_RECIPE_SNAPSHOT`.
All gates read from env; no remote/DB-driven flags; no flag service. Enumerated in `dependencies.md` §2.

---

## 2. Tool-to-Gate Mapping (condensed)

| Tool group | Gates controlling availability |
|---|---|
| `/health` | none (public by design) |
| `/v1/config`, `/v1/bootstrap` | Session; provider gates shape the returned feature map |
| Sync / watch / workouts | Session + device binding; Appwrite runtime for persistence (in-memory otherwise, non-prod only) |
| Meals / vision | Session; **consent gate (analysis)**; provider gate (OpenRouter/Gemini); privacy guard wrapper |
| Meals / learning (learnConfirmed) | Session + **model-improvement consent gate** |
| Nutrition search / packaged | Session; FDC key gate / OpenFoodFacts gate |
| Training / calendar | Session; Appwrite repo gate (runtime absent without it) |
| Profile/account/consents | Session; lifecycle guards; consent parser |
| Privacy/media purge | Session; retention bounds; Appwrite bucket gate |
| Devices trust/commands | Session + device binding; Appwrite gate |
| Billing entitlements/verify | Session; entitlement provider mode gate (`demo` blocks verify) |
| Webhooks | Hard reject (no gate can enable them) |
| App routes (404) | Build gates (counts/audit); runtime state substitution gates; **no auth gates exist** |
| Operator CLIs | Env-file/config gates; operator possession only |

---

## 3. Hidden Capability Detection

| Capability | Category | Evidence |
|---|---|---|
| Billing verification endpoints | **Upcoming** (not implemented) | Present + routed; blocked by `billing_not_configured` until production provider exists |
| Store webhooks | **Upcoming / deliberately disabled** | Always reject (`billing_not_configured`) |
| Swift contract client | **Upcoming (future iOS)** | Generated, current, unconsumed |
| `nutrition:evidence:simulate` | **Dead** | Calls nonexistent `npm run build` + `dist/` (noEmit) |
| `TrainStateStore.markActive` / `reset` | **Dead** | See `dead-code.md` |
| `MotionLab.kt` | **Dead** (orphan) | Never registered |
| `deterministicFixtureProvider` | **Hidden-by-env (intended dev capability)** | Enabled whenever env ≠ production; surfaced in `/v1/config` |
| `legacySummarySync` + `legacyGeminiNutritionAuthority(false)` | **Legacy / disabled-authority marker** | Feature map advertises legacy sync availability; Gemini nutrition authority explicitly false |
| `MOVEFUEL_PORTION_CALIBRATION_PROFILES` / `MOVEFUEL_REVIEWED_RECIPE_SNAPSHOT` | **Config-only capabilities** | No explicit gate found beyond env presence in service construction — verify operator docs |

Cross-reference: no tool exists without a traceable gate except the deliberate public `/health` and the dead items above.

---

## 4. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| **Non-production auth bypass (by design)** | MEDIUM | `MOVEFUEL_AUTH_MODE` defaults to `local-test` when unset and env ≠ production; fixture provider enabled whenever env ≠ production. Safe only if `MOVEFUEL_ENV=production` is always set; production mode itself fails closed on Appwrite config — but auth-mode default is env-gated, not fail-closed. Recommend: refuse `local-test` unless env explicitly `local`/`development`. |
| **The audit gate is bypassable by text** | MEDIUM | `ui_closed_loop_audit.py` asserts activation behavior via string presence in a **comment** (build-pipeline §6.1). A gate that looks like it works but doesn't — the adversarial-lens class. |
| Provider fallback hierarchy | LOW (contained) | OpenRouter (10) → Gemini (20) chain could silently route images to the secondary provider when primary key absent; both are explicit opt-ins via env. Production does not require any vision key (only FDC/appwrite) — capability is simply absent. |
| In-memory fallback stores | LOW | Non-production only; production boot throws without Appwrite. Verified. |
| Consent gates are real and pre-call | INFO (positive) | Image analysis blocked **before** provider invocation; personalization blocked without opt-in — a model privacy boundary. |
| No hidden admin gates | INFO (positive) | All sensitive routes are self-service under one session gate; no role/admin surface exists to hide. |
| Production fail-closed check | INFO (positive) | Verifies 5 separate config prerequisites at boot. |
| Flag changes not audited | LOW | Env changes alter capability maps with no record (no audit log — data-flows M1). |

## 5. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| Gate bypass conditions discovered (comments/string gates, env defaults) | HIGH | `simulate-behavior` scenarios (misconfig, cleanup, prod-with-default-auth) |
| Provider fallback chain (OpenRouter→Gemini) | MEDIUM | `simulate-behavior` (provider-missing scenario) |
| Consent gates (privacy boundary) | MEDIUM | `reconstruct-system-intent` (product moat signals) |

## 6. Output Contract

- File: `docs/analysis/gate-map.md`
- State: `map-feature-gates: complete`
- Next: Track B Phase 3 — `simulate-behavior`
