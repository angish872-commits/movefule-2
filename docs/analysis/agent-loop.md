# Agent Loop Analysis — MoveFuel 2

**Skill:** analyze-agent-loop
**Status:** **skipped — not applicable** (with scoped substitute analysis below)
**Date:** 2026-09-22
**Prerequisite read:** `artifact-classification.md`

---

## 1. Applicability Verdict

**No LLM agent loop exists in this codebase.** Evidence:

| Probe | Result |
|---|---|
| `tool_call` / `toolCall` / tool registry / `max_turns` / conversation history patterns | **0 hits** in backend or app (excluding test noise) |
| LLM integrations | Single-shot calls: one `POST /chat/completions` (OpenRouter vision), Gemini/Nutrition authority paths — no multi-turn orchestration, no tool continuation |
| Loop around LLM | Only a bounded **retry** loop (`for attempt <= maxAttempts` + timeout/abort) — not a turn loop |
| Agent frameworks (LangChain, etc.) | None; backend has zero runtime dependencies |
| Canonical app | No AI, no network, no agent runtime |
| `.opencode/` | Agent *tooling* for development — not part of the analyzed system |

The classification-phase note ("agent loop may be N/A unless an agent runtime is discovered in imports") is confirmed.

**Substitute:** the skill's true subject — *the runtime execution spine: how input is processed and state evolves* — maps onto two real state machines that were a focus of this repo. They are documented below so downstream skills (`simulate-behavior`, `reconstruct-system-intent`) still get the spine.

---

## 2. Nearest Analog A — Canonical App State Machine (execution spine)

```
APP LAUNCH → AUTH_001 (start destination, visual stub)
   │
   ▼
ONBOARDING (ONB_001…018)          ── route-observed writes: persistOnboardingStep
   │  exit edge: ONB_018 → MASTER_TODAY/TOD_001  → completeOnboarding()
   ▼
MASTER DASHBOARDS (Today/Fuel/Train/Progress)
   │
   ├─ TRAIN LIFECYCLE (guarded by TrainState):
   │    NotConfigured ──(enter TRS_001)──► SetupIncomplete ──(TRS_002…019 observed)
   │         └──► PlanPreview ──(TRS_020)──► *activatePlan gate*
   │                    (refuses unless real plan reference; "pending-engine" blocked)
   │                            └──► Active ──(MASTER_TRAIN)──► TRN_001
   │
   ├─ FOOD LIFECYCLE (draft ≠ confirmed invariant):
   │    beginFoodDraft(source ∈ {Camera,Barcode,Recipe,Search})
   │         └─► …review screens… ──(return to FNO_001)──► confirmFood()
   │                  (only write boundary that turns draft into confirmed intake)
   │
   └─ WORKOUT LIFECYCLE:
        Idle ──(WRK_001)──► InProgress ──(WRK_012→WRK_013)──► +1 performed set (only if InProgress)
             └──(WRK_032 exit to Train/Progress)──► SummaryPending ──► committed (+1) ──► Idle
```

**Termination/consistency properties (verified in source):**
- Every persisted enum read falls back safely (`Unknown/Idle/NotConfigured`) — no crash on corrupt state.
- `recordPerformedSet` is a no-op unless `InProgress`; `commitWorkoutSummary` cannot double-commit from `Idle` (guarded).
- `activatePlan` returns false for missing/`pending-engine` references — the loop cannot reach `Active` on fabricated data.
- State survives app restarts via DataStore (single source of truth) — the "persistence between turns" analog.

## 3. Nearest Analog B — Sync Retry State Machine (backend)

```
operation → SyncStore.apply(payloadHash, idempotencyKey)
   ├─ duplicate idempotencyKey            → prior stored result returned (DUPLICATE)
   ├─ payloadHash mismatch                → REJECTED / CONCURRENT_EDIT paths
   ├─ stale revision                      → STALE_REVISION (canonical record compare)
   ├─ authority revoked                   → AUTHORITY_REVOKED
   └─ ok                                  → ACCEPTED (result stored under idempotencyKey)
RetryClass: COMPLETE | RETRYABLE | REQUIRES_REFRESH | REQUIRES_USER | FAILED_FINAL
   └─ retry-policy.ts defines backoff/terminal mapping
```

This is a **termination-guaranteed** machine: every path ends in a stored outcome or a typed retry class; `FAILED_FINAL` is terminal; duplicates are idempotent (no replay loops).

## 4. Prompt-vs-Code Gap (Iron Law, adapted)

No system prompts exist. The nearest "prompt" is the **provider instruction** to the vision model, and its declared/code-enforced contract is explicitly inverted:

- Provider prompt: *"Detect only food visibly present… do not automatically sum multiple plates."*
- Code enforcement (`openRouterFoodSceneAdapter.ts`): provider output is scanned for **forbidden nutrition keys** (`hasForbiddenNutritionKey`) — the model may return regions, never nutrition numbers; nutrition authority stays server-side (contract `NutritionSnapshot` with source provenance).
- Bounding: region count capped (`MAX_REGIONS`), bbox/confidence validated numerically, errors typed (`invalid_provider_region`, `invalid_provider_bbox`, …).

**Gap assessment:** none found — code enforces *less* authority for the model than the prompt implies. This is a deliberate, documented anti-hallucination control.

## 5. SECURITY_SIGNAL

| Signal | Severity | Detail |
|---|---|---|
| No agent loop → no agent attack surface | INFO (positive) | No prompt injection / tool abuse / infinite-loop surface exists |
| Model output authority explicitly bounded | INFO (positive) | Forbidden-nutrition-key scan + region caps + typed validation |
| App state machine gates are untested | MEDIUM | `activatePlan`, `confirmFood`, `commitWorkoutSummary` gating logic has only string-level CI checks (see build-pipeline §6.1) |
| Sync idempotency prevents replay | INFO (positive) | `idempotencyKey` + `payloadHash` verified |

## 6. Trigger Signals

| Signal | Confidence | Routes to |
|---|---|---|
| No conditional tool availability (no tools at all) | LOW | `extract-tool-graph` scope reduced to flow/route graph |
| State transitions gated by conditions (app + sync) | HIGH | `map-feature-gates`, `simulate-behavior` |

## 7. Output Contract

- File: `docs/analysis/agent-loop.md`
- State: `analyze-agent-loop: skipped (not applicable) — substitute spine documented`
- Next: Track B Phase 3 — `extract-tool-graph`
