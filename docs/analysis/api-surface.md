# API Surface — MoveFuel 2

**Skill:** inventorying-api-surface
**Status:** complete
**Date:** 2026-09-22
**Scope:** canonical app (implicit surface) + reference backend (HTTP API + contracts)

---

## 1. Canonical App — No Network API (by design)

The Android app exposes **zero HTTP/RPC endpoints** and makes **zero network calls** (no HTTP client dependency exists). Its API surface is **internal + implicit**:

### 1.1 Public symbols (internal API)

| Symbol group | Members | Stability |
|---|---|---|
| `CanonicalStateStore` | `observe`, `ensureInitialized`, `markSetupIncomplete`, `persistOnboardingStep`, `completeOnboarding`, `markPlanPreview`, `activatePlan`, `beginFoodDraft`, `confirmFood`, `beginWorkout`, `recordPerformedSet`, `commitWorkoutSummary`, `setProfileName`, `markSyncPending`, `reset` (15 ops) | Stable — 14 consumers; the only write boundary |
| `CanonicalAppState` | 16-field data class with nullable "unknown vs zero" semantics | Stable |
| `CanonicalStateTransitions` | 9 pure transition functions | **Test-only** (dead to runtime — see dead-code.md) |
| `TrainStateStore` | facade; 2 dead APIs (`markActive`, `reset`) | Stable minus dead members |
| Selectors | `toTodayUiState`, `previewTodayUiState` | Stable |
| Navigation types | `MoveFuelRoute` (404 values), `MoveFuelShell`, `MoveFuelPrimaryDestination`, `MoveFuelFlowAction`, `LocalMoveFuelBack` | Stable — route enum imported by 400 files |
| Components | 29 `MF*` functions across 14 files | Stable — all consumed |
| Design tokens | colors/typography/spacing/radius/motion | Stable |

### 1.2 Implicit entry points (contracts by string)

| Entry point | Contract | Consumers |
|---|---|---|
| Route paths | 404 strings (`auth/001` … `sys/020`, `master/*`) parsed by prefix | NavGraph, shell classifier, deep links (future) |
| Screen IDs | `XXX_NNN` format parsed for shell + destination + registry | `moveFuelShellFor`, registry, audit CSVs, CI |
| Flow registry | 380 `MoveFuelFlowAction` entries (primary/secondary label+route) | `MFScreenFrame` only |
| DataStore | Store `movefuel_canonical_state` + 16 keys; legacy store `movefuel_ui_state` (read-only migration) | Store only |
| CompositionLocal | `LocalMoveFuelBack` — provided by NavGraph, consumed by MFScreenFrame (default `{}` prevents preview crashes) | 3 files |
| Sentinels | `"pending-engine"` plan placeholder; `"Unknown"`/null distinctions | Store gates |
| CI contract | `apply-mufil2-import.yml` enforces exactly 400 screens / 428 kt / 404 registry rows | build system |

---

## 2. Reference Backend — HTTP API (Node, Appwrite-backed)

**64 unique `/v1/` endpoints** + `/health` + 2 webhook stubs. All JSON; response envelope `{ data, error, correlationId }`; schema version constant `API_SCHEMA_VERSION = 1`.

### 2.1 Endpoint inventory by module

| Module | Endpoints |
|---|---|
| `request-handler` (inline) | `GET /health` (public), `GET /v1/config` (auth), `POST /v1/sync/phone-session`, `GET /v1/bootstrap`, `POST /webhooks/{google-play,app-store}` (stub: always rejects) |
| `meal-routes` + `meal-library-routes` | `/v1/meals`, `/v1/meals/{analysis,confirm,drafts,estimates,media/content}`, `/v1/nutrition/search`, `/v1/nutrition/packaged`, `/v1/personal-food`, `/v1/saved-meals`, `/v1/reports/nutrition` |
| `sync-routes` + `canonical-sync-routes` | `/v1/sync/{push,pull,reconcile}`, `/v1/legacy/summary-sync/{push,pull}`, `/v1/workouts`, `/v1/workouts/start`, `/v1/watch/{deliveries,receipts}` |
| `training-routes` | `/v1/training/{setup,generate,current-plan}` |
| `calendar-routes` | `/v1/calendar` + `/v1/calendar/{adapt,commands,lock,missed,move,rest-day,training-adaptation,training-placement,unavailable,unlock}` |
| `profile-account-routes` | `/v1/profile`, `/v1/consents` (PUT), `/v1/targets/{preview,commit}`, `/v1/account/{export,delete}` |
| `privacy-routes` | `/v1/privacy`, `/v1/privacy/inventory`, `/v1/privacy/media/purge` |
| `health-routes` | `/v1/health/{connections,gaps,import,summaries}` |
| `device-routes` + `device-command-routes` | `/v1/devices/trust`, `/v1/devices/commands` |
| `insight-routes` | `/v1/progress`, `/v1/calendar` (read) |
| `report-routes` | `/v1/reports`, `/v1/reports/{generate,narrative}` |
| `experience-routes` | `/v1/entitlements`, `/v1/notifications`, `/v1/support/tickets`, `/v1/billing/{google,apple}/verify` |
| `diet-routes` | `/v1/diet/recommendation` |

### 2.2 Auth policy (centralized, single gate)

```
/health                      → public
/v1/config                   → requireSession
/webhooks/*                  → unauthenticated but hard-rejects until verified billing
───────────────── requireSession (ALL routes below) ─────────────────
POST /v1/sync/phone-session  → requireSession + requireDeviceId(body)
GET  /v1/bootstrap           → requireSession + requireDeviceId(header x-device-id)
… all 60+ remaining routes  → authenticated dispatch to module handlers
404 fallback                 → { code: "not_found" }
```

- Route modules contain **zero** `requireSession` calls — auth is enforced once in the dispatcher. Correct only while every dispatch branch stays below the gate (verified in source order; `map-feature-gates` will re-verify conditional branches).
- Device-level binding via `x-device-id` on sync/bootstrap paths.

### 2.3 Error contract

| Error type | Status | Notes |
|---|---|---|
| `ConsentContractError`, `ProfileContractError`, `AccountLifecycleError` | 400 | Domain contract violations |
| `ContractError` | via `contractErrorStatus` | Coded, retryable flag |
| Unknown exception | internal_error | Message not leaked (`Unexpected local backend error.`) |
| Billing webhooks | 400 `billing_not_configured` | Fails closed until verifier exists |

### 2.4 Feature-flag surfaces (server-declared)

`GET /v1/config` and `GET /v1/bootstrap` return a `features` object:
`summarySync`, `legacySummarySync`, `canonicalSync`, `calendar`, `trainingEngine5`, `privacyMediaLifecycle`, `mealAnalysis`, `candidateOnlyImageEstimate`, `packagedFoodLookup`, `legacyGeminiNutritionAuthority` (false), `deterministicFixtureProvider` (non-prod only), `geminiFoodScene`, `trustedFdcNutrition`, `billing`, `billingMode`, `healthIntegrations`, `healthImportProjection`, `appwriteRuntime`.
→ These are **runtime capability gates driven by env presence** — primary input for `map-feature-gates`.

---

## 3. Contracts System (cross-platform type API)

| Artifact | Path |
|---|---|
| Canonical registry | `contracts/canonical/v1/contracts.json` (19 enums + ~40 records: Profile, Targets, MealDraft, ConfirmedMeal, CorrectionEvent, NutritionState, Recommendation*, TrainingPlanEnvelope, WorkoutSessionRevision, Calendar*, Sync*, Device*, Privacy*) |
| Codegen | `contracts/codegen/generate-contracts.mjs` → TypeScript, **Kotlin**, Swift; `--check` gate in `npm run verify` |
| Compatibility policy | minReadableVersion=1, unknownEnumPolicy=**reject**, unknownFieldPolicy=**ignore** |
| Generics | e.g., `Payload<T>` pattern in records |

### Integration gap (HIGH relevance)

`Mufil-2/` (canonical app) contains **no `com.movefuel.contracts.v1` package and does not consume the generated Kotlin contracts** (verified by grep — zero matches). The app's local enums (`CanonicalSyncState`, `WorkoutExecutionState`, `FoodDraftSource`) are simplified look-alikes, not contract types (contract enums: `TodaySyncState`, `WorkoutSessionState`, `MealDraftStatus`…). Any future wiring of app→backend must import the generated Kotlin file and reconcile local enums with contract enums (reject-unknown-enum policy makes mismatches hard failures).

---

## 4. API→Data-Flow Chains (intended workflows)

| Chain | Endpoints | Reading |
|---|---|---|
| Meal capture → confirm | `POST /v1/meals/drafts` → `POST /v1/meals/estimates`/`/analysis` → `POST /v1/meals/confirm` → `GET /v1/reports/nutrition` | Draft id returned by drafts feeds estimates/confirm; mirrors app's `beginFoodDraft → confirmFood` state machine |
| Sync | `POST /v1/sync/push` → `POST /v1/sync/pull` → `POST /v1/sync/reconcile` (plus legacy summary-sync pair) | Outcome enum `SyncOutcome` (ACCEPTED/STALE_REVISION/CONCURRENT_EDIT/…) defines reconciliation contract |
| Wear handoff | `POST /v1/sync/phone-session` → `POST /v1/workouts/start` → `GET /v1/watch/deliveries` → `POST /v1/watch/receipts` | Device-bound (x-device-id); receipt = delivery acknowledgement |
| Targets | `POST /v1/targets/preview` → `POST /v1/targets/commit` | Mirrors app's `markPlanPreview` (`pending-engine`) → `activatePlan` gate |
| Training | `POST /v1/training/setup` → `POST /v1/training/generate` → `GET /v1/training/current-plan` | Plan envelope carries 6 versioned algorithm fields |
| Privacy | `GET /v1/privacy/inventory` → `POST /v1/privacy/media/purge` (image lifecycle) | `privacyMediaLifecycle` flag |

---

## 5. Stability Categories

| Category | Items |
|---|---|
| Stable / versioned | All `/v1/*` endpoints; contracts v1 with compatibility policy |
| Legacy (kept) | `/v1/legacy/summary-sync/{push,pull}` |
| Stub / not implemented | `/webhooks/google-play`, `/webhooks/app-store` (reject by design), billing verify endpoints require `entitlementProvider` |
| Conditional | `/v1/config` feature map varies by env presence (FDC key, Appwrite config, OpenRouter/Gemini keys) |
| Internal / documented-as-such | App route strings + DataStore keys (not external API) |

---

## 6. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| Auth single-point gate in dispatcher | MEDIUM (design) | All modules rely on the dispatcher gate. Any new early-return branch added ABOVE `requireSession` becomes silently public. Source order is the policy — fragile to refactors. |
| Sensitive account routes | MEDIUM | `POST /v1/account/delete`, `GET /v1/account/export`, `PUT /v1/consents`, `/v1/privacy/media/purge` — destructive/privacy-critical; rely on the same single gate + domain guards. Confirm `AccountLifecycleError` guards are exhaustive in gates pass. |
| Device trust route | MEDIUM | `POST /v1/devices/trust` grants device authorization; `authorized` is contract field. Verify no self-service escalation path (device-trust pass in gates). |
| Webhooks fail closed | INFO (positive) | Store webhooks respond `billing_not_configured` — no unverified billing events accepted. |
| Public `/health` discloses environment name | LOW | `{status, environment, backendBoundary}` — minor version/stack disclosure. |
| Error envelope avoids leaking internals | INFO (positive) | Unknown errors normalized; correlationId present for audit. |
| Contracts reject unknown enums | INFO (positive) | Prevents version skew downgrade confusion. |
| App has no auth implementation to bypass | INFO | No session/token code client-side — nothing to attack yet; nothing protecting state either (all local). |

## 7. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| APIs exposed conditionally behind env-driven feature flags (`/v1/config`, `/v1/bootstrap`) | HIGH | `map-feature-gates` (primary input) |
| Undocumented/internal APIs exposed broadly (bootstrap sync surface) | MEDIUM | `classify-repo-artifacts` |
| Versioned contract system + generated clients (TS/Kotlin/Swift) not yet consumed by canonical app | HIGH | `trace-codebase-provenance`, `analyze-build-pipeline` (codegen), Phase 4 intent |
| Chain-shaped workflows (draft→confirm, push→pull→reconcile) | MEDIUM | `trace-data-flows`, `simulate-behavior` |

## 8. Output Contract

- File: `docs/analysis/api-surface.md`
- State: `inventorying-api-surface: complete`
- Next: Track A — `analyzing-code-quality`
