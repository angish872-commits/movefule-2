# Behavior Simulation — MoveFuel 2

**Skill:** simulate-behavior
**Status:** complete (platform note: `behavior-simulator` dispatch unavailable on OpenCode; scenarios traced inline against `tool-graph.md` + `gate-map.md`)
**Date:** 2026-09-22

---

## 1. Scenario Inventory

| ID | Scenario | Gate combination focus |
|---|---|---|
| S0 | Production ready (all required config, proper env) | env=production, auth=appwrite, Appwrite fully configured |
| S1 | **Production misconfig: `MOVEFUEL_ENV` missing/typo** | Same config, one gate omitted |
| S2 | Production without Appwrite credentials | Boot check path |
| S3a | Provider-degraded: Gemini only (no OpenRouter key) | Provider chain fallback |
| S3b | Provider-degraded: no vision keys at all | Capability absence |
| S4 | Consent denied for image analysis / model improvement | Privacy gates |
| S5 | Billing demo vs production provider | Entitlement mode gate |
| S6 | Adversarial: all gates open (non-prod + all providers + demo billing) | Maximum surface |
| A0 | Fresh install (empty DataStore) | App state machine init |
| A1 | Relaunch after onboarding completion | Persistence semantics |
| A2 | Mid-flow process death (train setup / food draft / workout) | Resume semantics |
| A3 | Corrupted/unknown stored values | Fallback safety |

## 2. Behavioral Fingerprints

### S0 — Production ready

| Dimension | Fingerprint |
|---|---|
| Available tools | All endpoints except webhook stubs; billing verify **blocked** (`production_billing_verifier_unimplemented` — preflight error; provider is demo unless injected) |
| Auth | Appwrite session required; production strictness (provider + accessToken) enforced |
| Active paths | Real Appwrite persistence, real providers per keys, telemetry recording, retention lifecycle |
| Accessible data | Owner-scoped rows via request-scoped JWT |
| Hidden behaviors | Provider call recording; media purge lifecycle; correlationId returned (not stored) |

### S1 — Production misconfig (the critical scenario)

| Dimension | Fingerprint | Diff vs S0 |
|---|---|---|
| Auth | **`LocalTestSessionProvider` wired** — any caller with `Authorization: Bearer local-user:<anyId>` is authenticated as that user; no verification exists | **Impersonation possible** |
| Boot check | Production fail-closed check **skipped** (`production=false`) | No abort on missing config |
| AI | `deterministicFixtureProvider=true` — fixture outputs | Fake intelligence |
| Persistence | Falls back to in-memory stores if Appwrite config incomplete | Data loss on restart |
| Exposure condition | Server binds `127.0.0.1` by default (`MOVEFUEL_HOST`) — remote exploitation requires host override. **In Appwrite Functions deployment the handler is invoked directly (no bind step), so the function's env variables are the only barrier.** | Real exposure path in cloud |
| Mitigation in place | `production-preflight.ts` errors (`MOVEFUEL_ENV !== production` → `production_auth_mode_invalid`) with exit 2 — **operator/CI-run, not boot-time** | Manual gate |

### S2 — Production without Appwrite credentials

| Dimension | Fingerprint |
|---|---|
| Boot | **Throws** in `backend-runtime.ts:115` (5 prerequisites checked) — fails closed, no listeners |
| Tools | None reachable |

### S3a — Gemini-only (no OpenRouter key)

| Dimension | Fingerprint | Diff |
|---|---|---|
| Vision chain | `[Gemini priority 20]` only; OpenRouter config absent | Failover becomes primary |
| Feature map | `geminiFoodScene=true`; OpenRouter-dependent telemetry paths idle | Capability shift advertised to clients |
| Consent gate | Still pre-provider | unchanged |

### S3b — No vision keys

| Dimension | Fingerprint |
|---|---|
| Vision features | `imageEstimateService` absent → `candidateOnlyImageEstimate=false`, `geminiFoodScene=false` |
| Meal analysis | Endpoints reject with typed contract errors; no fallback to unverified estimation |
| Nutrition | FDC key may still power `trustedFdcNutrition`; packaged food needs OpenFoodFacts UA |

### S4 — Consent denied

| Dimension | Fingerprint |
|---|---|
| Image estimate | `meal_image_analysis_consent_required` thrown **before** provider call |
| Personalization | `learnConfirmed` silently returns; confirmed meal data cannot enter model improvement |
| Everything else | Unaffected |

### S5 — Billing modes

| Dimension | Fingerprint |
|---|---|
| demo provider | Entitlements readable; `/v1/billing/*/verify` → `billing_not_configured` |
| production provider | Verify still blocked until a verifier is implemented (preflight error enforces) |
| Paid features | **Cannot be enabled** in production today (fail-closed by design) |

### S6 — All gates open (maximum surface)

| Dimension | Fingerprint |
|---|---|
| Auth | Local-test impersonation path available (as S1) |
| AI | All providers + fixtures + camera pipeline (if knowledge artifacts valid) |
| Persistence | Appwrite if configured else in-memory |
| Escalation check | **No admin surface exists to escalate into** — all endpoints are self-service under session identity; no role system, no cross-user reads found (owner scoping holds). Maximum surface = impersonation of arbitrary user IDs, not privilege escalation. |

### App scenarios

| ID | Fingerprint | Surprise |
|---|---|---|
| A0 | AUTH_001 → onboarding; all metrics null/Unknown; dashboards show "unavailable" semantics (never fabricated zeros) | Stores correctly refuse to fabricate (confirmed live in `toTodayUiState`) |
| A1 | Relaunch always starts at **AUTH_001**; `onboardingCompleted`/`onboardingStep` are **write-only** (no reader anywhere) | Onboarding completion has no behavioral effect; resume is not implemented |
| A2 | Train setup resumes via `trainSetupStep` (real reader in `trainEntryRoute`); food draft source survives only in memory — after process death, source falls back to `Search`; workout state persists (Idle/InProgress) | Food source attribution can silently change across process death; `beginFoodDraft` (persistence call) is never invoked |
| A3 | Unknown enum strings → safe defaults (`Unknown/Idle/NotConfigured`); `valueOf` guarded by `runCatching` | No crash paths from corrupt prefs |
| A4 | Activation with `pending-engine` → `false`, stay on TRS_020; with real ref → Active + popUpTo(TRS_001) | Gate holds under all simulated inputs |
| A5 | Direct deep-route to WRK_013/032 without lifecycle start → no-ops; commit fires exactly once from InProgress→SummaryPending | Guards hold |
| A6 | Direct return from search (FNO_011) to FNO_001 bypasses confirmation (only FNO_012/CAM_017/BAR_011 confirm); confirmed count unaffected | Review-step requirement enforced by route topology, breakable by future route additions |

## 3. Scenario Comparison Table

| Dimension | S0 (prod) | S1 (misconfig) | S2 (no creds) | S6 (all open) |
|---|---|---|---|---|
| Authentication | Appwrite-verified | **Unverified bearer impersonation** | n/a (no boot) | Unverified |
| Persistence | Appwrite | In-memory possible | — | Appwrite/in-memory |
| AI outputs | Real providers | Fixtures possible | — | All sources |
| Fail mode | Closed | **Open (permissive)** | Closed | Open |
| Preflight outcome | ready (billing blocked) | error exit 2 | error exit 2 | error exit 2 |
| Remote exposure | Function app env | **Function app env is the only gate** | none | local only (127.0.0.1) |

## 4. Temporal Analysis

| Item | Behavior over time |
|---|---|
| Legacy summary sync | Advertised `legacySummarySync: true` — kept for old clients; no removal schedule found |
| Billing verifier | Explicitly unimplemented; preflight blocks paid features until built |
| Camera/knowledge artifacts | Preflight gates public camera on `MOVEFUEL_KNOWLEDGE_SNAPSHOT`/calibration artifacts (warnings/errors) — rollout-shaped |
| Dead code drift | Stale comment texts are load-bearing for CI (build-pipeline §6.1) — time bomb on cleanup |
| Untracked live DBs | Grow untracked (provenance §4) — future "which DB is canonical" ambiguity |

## 5. Gap Detection

| Gap | Expected | Actual | Risk |
|---|---|---|---|
| **G1: Env-omission auth bypass** | Production requires verification | Non-production default wires unverified `LocalTestSessionProvider`; only external preflight catches misconfig | **HIGH (conditional)** — cloud function deployed without `MOVEFUEL_ENV=production` accepts forged identities |
| G2: Onboarding state is write-only | Completion gates future launches | No reader; app always starts at AUTH_001; data written but unused | LOW (prototype scope) — misleading state model |
| G3: Food source attribution | Source stable per draft | In-memory only; lost across process death → defaults to Search; `beginFoodDraft` dead | LOW-MEDIUM (analytics correctness) |
| G4: CI audit certification | Activation gate verified | Passes on a comment string | MEDIUM (process integrity) |
| G5: Billing reachable in production | Verifier works | Verify endpoints structurally unreachable until provider implemented | INFO (intentional fail-closed) |
| G6: `nutrition:evidence:simulate` | Runs simulation | Always fails (missing build script) | LOW |

## 6. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| **G1 env-omission → unverified impersonation** | **HIGH (conditional on misconfig)** | `LocalTestSessionProvider` accepts any `local-user:<id>`; wired whenever `production=false`. Boot check does not exist in non-prod path. Mitigations: preflight exit 2; bind default 127.0.0.1; recommend boot-time refusal of local-test provider when `MOVEFUEL_ENV` is not explicitly `local`/`development`. |
| G4 comment-certified audit | MEDIUM | Gate that looks like it works but doesn't (adversarial-lens class) |
| No audit logging alongside sensitive ops | MEDIUM | Mutations (including impersonated ones in S1) leave no trail (data-flows M1) |
| App: zero-permission sandbox | INFO (positive) | Minimal attack surface |
| No privilege escalation surface | INFO (positive) | Owner-scoping held in all simulated combinations |
| Consent gates hold pre-provider | INFO (positive) | Verified in S4 |
| Production fail-closed boot | INFO (positive) | Verified S2 |

## 7. Recommendations for Gate Hardening

1. **Boot-time environment assertion:** refuse to start (or refuse to wire `LocalTestSessionProvider`) unless `MOVEFUEL_ENV ∈ {local, development, test}` is explicitly set. Never default to permissive on omission.
2. Replace the comment-based audit check with a symbol/behavior assertion (`CanonicalStateStore.activatePlan`) or a unit test.
3. Add request audit logging keyed by `correlationId` for mutating routes (ids + outcomes only).
4. Either implement onboarding resume or remove write-only onboarding state to avoid future false assumptions.
5. Route food confirmation through a single domain gate (not route-origin set) so topology changes can't bypass the draft→confirmed boundary.
6. Delete or fix `nutrition:evidence:simulate`; remove/annotate dead APIs (`markActive`, `reset`, `beginFoodDraft`).

## 8. Output Contract

- File: `docs/analysis/behavior-simulation.md`
- State: `simulate-behavior: complete (partial — inline simulation; no agent dispatch)`
- Next: Track B Phase 3 — `analyze-prompt-influence` (applicability check)
