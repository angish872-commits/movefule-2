# Tool Graph — MoveFuel 2

**Skill:** extract-tool-graph
**Status:** complete (platform note: agent dispatch unavailable on OpenCode; registration chains traced inline — 3 modules deep, within 3-level trace limit)
**Date:** 2026-09-22
**Prerequisites read:** `agent-loop.md`, `build-pipeline.md`

---

## 1. Tool Inventory

"Tools" = every callable capability: HTTP endpoints, navigable app capabilities, operator CLIs.

### 1.1 Backend HTTP tools (64 endpoints in 12 capability groups)

| Tool group | Count | Location | Registration |
|---|---:|---|---|
| Health/config | 2 (`/health` public, `/v1/config`, `/v1/bootstrap` = 3) | `http/request-handler.ts` inline | static dispatch chain |
| Sync & watch | 10 (`/v1/sync/*`, legacy summary-sync, workouts, watch deliveries/receipts, phone-session) | `http/sync-routes.ts`, `canonical-sync-routes.ts`, inline | dispatched by path group to `syncHandler` |
| Meal & nutrition | 12 (meals/*, nutrition search/packaged, personal-food, saved-meals, reports/nutrition) | `http/meal-routes.ts`, `meal-library-routes.ts`, `packaged-food-routes.ts` | handler-per-module |
| Training | 3 (setup, generate, current-plan) | `http/training-routes.ts` | handler-per-module |
| Calendar | 11 | `http/calendar-routes.ts` | handler-per-module |
| Profile & account | 6 (profile, consents, targets preview/commit, export, delete) | `http/profile-account-routes.ts` | handler-per-module |
| Privacy | 3 (privacy, inventory, media purge) | `http/privacy-routes.ts` | handler-per-module |
| Health integrations | 4 | `http/health-routes.ts` | handler-per-module |
| Devices | 2 (trust, commands) | `http/device-routes.ts`, `device-command-routes.ts` | handler-per-module |
| Insights/reports | 5 (progress, calendar read, reports, generate, narrative) | `http/insight-routes.ts`, `report-routes.ts` | handler-per-module |
| Experience/billing | 5 (entitlements, notifications, support, google/apple verify) | `http/experience-routes.ts` | handler-per-module |
| Diet | 1 | `http/diet-routes.ts` | handler-per-module |
| Webhook stubs | 2 (fail closed) | inline | static |

### 1.2 App navigation tools (route capabilities)

| Tool group | Count | Registration |
|---|---:|---|
| Domain screen routes | 400 (`auth/*` … `sys/*`) | `MoveFuelNavGraph` — 404 static `composable()` registrations |
| Master dashboards | 4 | same |
| Flow-action overrides | 380 entries | static registry `semanticFlowActions` (consumed by `MFScreenFrame`) |
| Shell classes | 4 (MAIN/FOCUSED/STATE/WEAR) | function of screen ID (`moveFuelShellFor`) |
| Primary destinations | 4 (Today/Fuel/Train/Progress) | static mapping + bottom nav |

### 1.3 Operator CLI tools

| Tool | Location | Notes |
|---|---|---|
| `npm start` / `start:configured` | backend | local server (with/without private env-file) |
| `npm run verify` | backend | contracts:check → typecheck → tests |
| `migration:dry-run`, `migration:preflight`, `migration:watch-preflight` | backend | Appwrite migration operators |
| `deployment:preflight`, `config:check` | backend | presence-only checks (never print values) |
| `training:catalog:import` | backend | exercise catalog ingestion CLI |
| `nutrition:evidence:simulate` | backend | **broken** — calls nonexistent `npm run build` + `dist/` (noEmit) |
| `ui_closed_loop_audit.py` | Mufil-2/tools | 22-check CI gate |
| `compare_source_manifests.py`, `source_snapshot_inventory.py` | tools/ | manifest comparison |
| CI workflows | `.github/workflows` | patch-apply, UI verify |

## 2. Registration Chain Map

```
HTTP tool:
  module load → createMoveFuelRequestHandler(options)
    → createFeatureRuntime(options)        [env-conditional construction]
    → createBackendRuntime(features)       [handler composition + provider chains]
    → request-handler closure              [single dispatch chain; 404 fallback]

App route tool:
  MoveFuelRoute enum → NavGraph composable() registration
    → MFScreenFrame resolves actions via semanticFlowActions (380) with inline fallback
    → navigate lambda applies state gates (train/food/workout/onboarding)

CI tool: workflow on-push → python audit → Gradle compile/assemble
```

## 3. Conditional Registration Summary (hidden capability surface)

### Backend — env/provider-gated (constructed only when configured)

| Capability | Gate | Where |
|---|---|---|
| Appwrite-backed runtime (repositories, calendar store, training runtime, bootstrap, media store) | `APPWRITE_ENDPOINT` + `APPWRITE_PROJECT_ID` + `APPWRITE_API_KEY` + `BUCKET_MEAL_MEDIA_ID` | `feature-runtime.ts`, `backend-runtime.ts` |
| **Production mode fails closed if any of the above missing** | `production && (…)` → throw | `backend-runtime.ts:115` |
| Vision provider chain — OpenRouter (priority 10) | `OPENROUTER_API_KEY` present | provider config array |
| Vision provider chain — Gemini (priority 20) | `GEMINI_API_KEY` present | provider config array |
| Trusted FDC nutrition | `USDA_FDC_API_KEY ?? FDC_API_KEY` | `backend-runtime.ts:144` |
| Packaged food lookup | `OPEN_FOOD_FACTS_USER_AGENT` present | `request-handler.ts` |
| Billing verification | `entitlementProvider` configured (else local dev provider; verify endpoints gated) | `billing/entitlements.ts` |
| Provider call telemetry | Appwrite tables client present | `providerCallRecorder` |
| Privacy-guarded image estimation | wrapper always applied when service exists | `backend-runtime.ts:209` |
| Deterministic fixture provider | `MOVEFUEL_ENV !== "production"` | `/v1/config` feature map |
| Runtime auth (`requireSession` success) | `MOVEFUEL_AUTH_MODE=appwrite` + session provider; otherwise fails closed | `server.ts`, `requestSupport.ts` |

### App — runtime state-gated (route substitution)

| Capability | Gate | Behavior |
|---|---|---|
| Train tab + TRN_*/WRK_* entry | `TrainState` via `trainEntryRoute()` | Redirects to TRS_001 / stored setup step / TRS_020 / TRN_001 |
| Plan activation | `activatePlan` — requires real plan reference (not `pending-engine`) | Non-activating return `false`; navigation blocked |
| Onboarding completion | Leaving ONB_018 → MASTER_TODAY/TOD_001 only | Persists `onboardingCompleted` |
| Food confirmation | Return to FNO_001 from {FNO_012, CAM_017, BAR_011} | Only write that converts draft → confirmed |
| Performed-set counting | `workoutExecution == InProgress` | No-op otherwise |
| Workout commit | WRK_032 → Train/Progress; `InProgress|SummaryPending` | No double-commit from Idle |
| Sync pending | DEV_007→DEV_009 / DEV_009 | Marks `syncState=Pending` |

### Build/CI — branch-gated
| Capability | Gate |
|---|---|
| Source reconstruction (21 patches) | push to `bootstrap/*` touching `imports/mufil2/READY` |
| UI verification (audit + compile + APK) | push/PR touching `Mufil-2/**` |

## 4. Cross-Gate-Tool Matrix

| Tool group | Build gate | Runtime gate | Permission gate | Provider gate | Config gate |
|---|---|---|---|---|---|
| `/health` | — | — | **N (public)** | — | — |
| `/v1/config`, `/v1/bootstrap` | — | Y | Y (session) | conditional (features reflect providers) | Y |
| Sync/watch/workouts (10) | — | Y | Y (session + device id) | conditional (Appwrite runtime) | Y |
| Meals/nutrition (12) | — | Y | Y (session) | conditional (OpenRouter/Gemini/FDC/OpenFoodFacts) | Y |
| Meal media content/purge | — | Y | Y | conditional (bucket configured) | Y |
| Training (3) | — | Y | Y | conditional (Appwrite repo) | Y |
| Calendar (11) | — | Y | Y | conditional (Appwrite repo) | Y |
| Profile/account incl. delete/export | — | Y | Y | conditional | Y |
| Privacy (3) | — | Y | Y | conditional | Y |
| Devices trust/commands (2) | — | Y | Y | conditional | Y |
| Billing verify (2) | — | Y | Y | conditional (entitlement provider) | Y |
| Webhooks (2) | — | Y | N (but hard-reject) | — | Y |
| App route groups (404) | CI count gate | Y (state substitution) | N (no auth exists) | — | — |
| Operator CLIs | — | — | N (local operator) | conditional (env-file) | Y |
| CI patch-apply | — | — | N (repo write via workflow token) | — | Y (branch + READY) |

## 5. Dynamic Registration Patterns

**None.** Exhaustively verified:

- No plugin loaders, no directory scanning, no reflection, no DB-driven registries.
- All conditional composition is **explicit construction** (`x ? new Service() : undefined`) in `feature-runtime.ts` / `backend-runtime.ts`.
- App registration is a 404-line static block; registry is a static map.
- Consequence: the capability surface is **fully visible statically** — the conditional matrix above is complete, not sampled.

## 6. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| Admin-grade endpoints share one auth gate | MEDIUM | `account/delete`, `account/export`, `devices/trust`, `calendar/lock`, `privacy/media/purge` rely on the single dispatcher gate; a reordering mistake above `requireSession` would expose them (see build-pipeline fragility note) |
| No audit logging on any tool | MEDIUM | Mutating tools leave no server-side trail (data-flows M1) |
| Device-scoped watch tools | LOW (positive) | Require session + `x-device-id`; ownership enforced in watch session service |
| Public `/health` | LOW | Discloses environment + boundary string |
| Webhook tools fail closed | INFO (positive) | Always reject until verification exists |
| No dynamic/untrusted-source tool loading | INFO (positive) | Static surface; no upload-driven or remote-driven capability |
| Production config fail-closed | INFO (positive) | Missing Appwrite config aborts boot in production mode |
| Broken CLI tool (`nutrition:evidence:simulate`) | LOW | Cannot run; dead operator path — remove or fix |

## 7. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| Conditional tool availability via env/provider composition | HIGH | `map-feature-gates` (primary input — matrix §3) |
| No dynamic registration | LOW | reduces gates scope; no escalation |
| State-gated route substitution | HIGH | `simulate-behavior` (train/food/workout gates) |

## 8. Output Contract

- File: `docs/analysis/tool-graph.md`
- State: `extract-tool-graph: complete (partial due to platform: no agent dispatch)`
- Next: Track B Phase 3 — `map-feature-gates`
