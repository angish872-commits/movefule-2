# Data Flow Analysis — MoveFuel 2

**Skill:** trace-data-flows
**Status:** complete
**Date:** 2026-09-22
**Prerequisites read:** `tech-stack.md`, `build-pipeline.md`
**Scope:** canonical app (closed local system) + reference backend (full HTTP/outbound system)

---

## 1. Entry Points

### 1.1 Canonical App — closed system (no external entry)

| Entry | Source | Shape | Trust | Location |
|---|---|---|---|---|
| UI interactions | Compose callbacks (`onNavigate`) | `MoveFuelRoute` enum values (compile-time constants) | Trusted | all screens → `navigate` lambda |
| App-private DataStore | `movefuel_canonical_state` prefs | 16 typed keys (string/int/bool) | Trusted (same app) | `CanonicalStateStore.observe` |
| Legacy DataStore (read-once) | `movefuel_ui_state` | string keys | Trusted | `ensureInitialized` |
| Android system | — | **NO permissions declared, no INTERNET permission, no ContentResolver/File/Camera APIs** | — | `AndroidManifest.xml` (verified: 0 `uses-permission`) |

**Verification:** grep found zero network/file/camera APIs in app source; camera/barcode screens are visual stubs. The app is a fully closed data system.

### 1.2 Reference Backend — HTTP server (Node, Appwrite-backed)

| Entry | Source | Shape | Trust | Location |
|---|---|---|---|---|
| Request body | JSON over HTTP | unknown → `readJson` (size-capped, JSON-parsed) | **Untrusted** | `http/requestSupport.ts:54` (`MAX_BODY_BYTES` guard) |
| `authorization` header | Bearer/JWT | session token | **Untrusted** (resolved via provider) | `requireSession` |
| `x-device-id` header | client | string | **Untrusted** (validated non-empty) | `requireDeviceId` |
| Query string | URL | parsed via `new URL` | **Untrusted** | per-route |
| Env vars | operator | config + capability flags | Partially trusted (operator-controlled) | `bootstrap/backend-runtime.ts` |
| Appwrite rows | TablesDB REST | records (contract-shaped) | Untrusted-on-read (may have been poisoned upstream) | foundation/appwrite-tables-client.ts |
| External provider responses | OpenRouter, USDA FDC, OpenFoodFacts | JSON | **Untrusted** | nutrition adapters |

## 2. Validation Map

| Entry | Validation | Location | Gaps |
|---|---|---|---|
| JSON body | Size cap (`MAX_BODY_BYTES`) → `JSON.parse` with typed error (`invalid_json`, `body_too_large`) | `requestSupport.readJson` | Per-field schema validation delegated to route/domain services (spot-checked strong, not exhaustively audited here) |
| Session | Provider resolution; production requires `appwrite` + request-scoped `accessToken`; failures normalized (`unauthenticated`, `production_session_incomplete`, `invalid_session`) — **fails closed when provider absent** | `requireSession` | — |
| Device id | Non-empty string check | `requireDeviceId` | Uniqueness/ownership binding happens downstream (watch session) |
| Consents | Array bounds 1–16; `choice ∈ {GRANTED, DENIED}` allowlist; `nonEmpty()` with length caps (64/32); unknown fields dropped | `foundation/consents.ts:36` | — (exemplary) |
| Sync events | `payloadHash` (sha256) verify; `idempotencyKey` dedupe; `SyncOutcome` state machine (`STALE_REVISION`, `CONCURRENT_EDIT`, `AUTHORITY_REVOKED`, `INVALID_EVENT_ORDER`, `SCHEMA_MISMATCH`…) | `domain/sync-store.ts:74–161` | — (exemplary) |
| Image refs | Regex-validated object ids (`local-meal-image:[a-f0-9]{24}`, `appwrite-meal-image:<id>:<id>`) | `meal/local-image-store.ts:64,77`, `privacy/meal-media-lifecycle.ts:51` | — |
| Retention values | Integer bounds 1–3650 days | `privacy/preferences.ts:41` | — |
| Contract payloads | Enum strictness (`unknownEnumPolicy: reject`) at contract boundaries | `contracts/canonical/v1/contracts.json` | Only enforced where contract parsing is used per route |

## 3. Trust Boundaries

| Boundary | From → To | Gate | Verdict |
|---|---|---|---|
| Client → Backend HTTP | Untrusted → Authenticated context | `requireSession` (+ device id on sync/bootstrap) | ✅ Single gate, fails closed; verify branch order preserved (build-pipeline flagged fragility) |
| Backend → Appwrite TablesDB | Authenticated user → owner-scoped data | `X-Appwrite-JWT` request-scoped token (NOT admin key); `OwnerScopedRepository`; `userScopedKey(userId, …)`; row filters by `userId` | ✅ Least privilege + ownership enforcement |
| Backend → OpenRouter (images) | User image → third party | Retention prefs (`retainMealImages`, `imageRetentionDays`), image store mediation, cache keyed by `ownerUserId|imageReference|checksum` | ✅ Purpose-bound; privacy flags honored |
| Backend → USDA/OpenFoodFacts | Food query → external | Key presence gate (`trustedFdcNutrition`), timeouts/retries | ✅ Optional capability |
| Backend → Python worker | Image bytes → subprocess | `execFile` with **argument array (no shell)**, fixed module `-m movefuel_fdc.vision_quality_worker`, server-generated temp path, 15 s timeout, 1 MB buffer | ✅ Constrained (interpreter from operator env) |
| App process → OS | Local state only | App sandbox (no permissions) | ✅ Minimal |
| Stored data → Read path | Database → Application | Enum/field parse with safe defaults on app side; contract strictness on backend side | ✅ Re-validated at boundaries |

## 4. Control Flow Influences (injection surface)

| Influence point | Data source | Protection | Risk |
|---|---|---|---|
| Appwrite REST paths (`/tablesdb/…`) | db/table/row ids | `encodeURIComponent` on **all** path segments (`appwrite-tables-client.ts:119,123`) | ✅ None |
| SQL execution | — | **No SQL is executed by code**; `.sql` files are blueprints only | ✅ N/A |
| Shell execution | — | No shell; single `execFile` with arg array (see above) | ✅ Low |
| Dynamic dispatch / eval | — | None in app; none in backend (method-name `import()` matches were false positives — verified) | ✅ None |
| Deserialization | JSON only | `JSON.parse` with error mapping; no YAML/pickle/serialized objects | ✅ Low |
| Routing by data | URL paths | Match-based dispatch; unknown → 404 | ✅ Low |
| Feature behavior | Env var presence | Capability booleans; deterministic fixture provider only when `MOVEFUEL_ENV !== "production"` | ⚠️ Config-dependent (gates analysis in map-feature-gates) |

## 5. Persistence Points

| Store | Schema enforcement | Re-validation on read | Notes |
|---|---|---|---|
| App DataStore (canonical + legacy) | Typed keys; enum names with safe fallback | Yes — every enum parse defaults safely (`Unknown`, `Idle`, `NotConfigured`) | Two stores during migration window |
| Backend Appwrite TablesDB | Contract records (`schemaVersion`, revision fields); row-level owner scoping | Yes — contract enums rejected on mismatch | `revision` fields + `payloadHash` support conflict detection |
| Backend in-memory stores (dev/local-test) | Clone-on-write maps, `userScopedKey` | N/A (process-local) | Used when Appwrite not configured |
| Consent records | Versioned (`consentType`, `documentVersion`), idempotent upsert | Yes | Idempotency prevents duplicate legal state on retry |
| Sync operation log | `idempotencyKey`, `requestHash`, `payloadHash` | Yes | Replay-safe |
| App logs | None (no logging in app) | — | |
| SQLite `.db` files in repo | Data, not code; untracked live DBs flagged in provenance | — | Not wired to app |

## 6. Exit Points

| Exit | Destination | Data included | Sensitive risk | Redaction |
|---|---|---|---|---|
| API responses | Client | Envelope `{data, error, correlationId}`; contract-shaped payloads | Scoped to session user | Unknown errors normalized to `internal_error` (no stack traces) |
| Startup logs (4 statements only) | Operator console | host, port, environment, auth mode; preflight presence booleans; `config-check` prints names + OK/MISSING, **never values** | Environment name disclosure (low) | ✅ |
| External API calls | OpenRouter / USDA / OpenFoodFacts | Image payloads or food queries only | Purpose-bound; retention prefs honored | ✅ |
| Error messages | Client | Coded messages; contract errors carry domain codes | No internals leaked | ✅ |
| App exits | — | **None** (no network, no logs, no IPC, no file writes outside sandbox DataStore) | — | N/A |
| Redirects | — | None observed | — | N/A |

## 7. Side-Channel Flows

| Channel | Finding |
|---|---|
| Logging | 4 total `console.*`: server start, preflight report, config-check. **No per-request logging, no PII, no tokens.** Privacy-positive; forensics-negative (see findings) |
| Metrics | None observed |
| Error traces | Baseline: unknown errors → generic message + `correlationId`; **ContractError messages pass through** (domain-authored, e.g., "Route not found.") — reviewed messages are safe |
| Debug endpoints | None (`/health` only; `/v1/config` requires session) |
| CORS | Not implemented (no CORS headers observed; local server binds `127.0.0.1` by default) |
| Cache | Vision scene cache keyed by owner/image/checksum (no cross-user mixing: cache key includes `ownerUserId`) |

## 8. Findings Summary

### Critical
None.

### High
None. (The strongest candidates — sync tampering, path injection, shell injection — all have explicit, verified controls.)

### Medium
| # | Finding | Location | Recommendation |
|---|---|---|---|
| M1 | **No request audit trail.** `correlationId` is generated and returned but never persisted; there is no request log at all. Incident forensics on a production incident would have no server-side evidence. | `http/request-handler.ts:50` | Add structured audit logging for mutating routes (ids/outcomes only, no payloads) — or document the intentional privacy trade-off |
| M2 | **Config-dependent security posture.** `MOVEFUEL_ENV !== "production"` enables deterministic fixture provider and default `local-test` auth; a misconfigured deploy silently weakens auth. Preflight scripts exist but are manual. | `bootstrap/backend-runtime.ts`, `server.ts` | Enforce production env via deployment preflight in CI/CD, not by operator discipline |
| M3 | **Trust in stored/upstream data is implicit in places.** Reads from Appwrite are treated as contract-shaped without re-parse in some paths (spot-checked; not exhaustive). | foundation stores | Re-parse contract records on read at least at payload hash verification points |

### Low
| # | Finding | Location | Note |
|---|---|---|---|
| L1 | `/v1/config` returns feature map + environment name to any authenticated user | `request-handler.ts:62` | Minor capability disclosure; acceptable for mobile clients |
| L2 | Dual USDA key naming (`USDA_FDC_API_KEY` ?? `FDC_API_KEY`) is an intentional fallback, but `config-check` validates only the primary name | `backend-runtime.ts:144`, `config-check.ts:13` | Align preflight with fallback chain |
| L3 | Root `.env.example` still advertises orphaned `DEEPSEEK_API_KEY` (no consumer) | `.env.example` | Remove to prevent confusion |
| L4 | Vision cache stores scene results keyed by image checksum; no TTL observed | `openRouterFoodSceneAdapter.ts:230` | Bound cache lifetime to respect deletion semantics |

### Positive controls (explicitly verified)
- Argument-array `execFile` with fixed module + internal path + timeout/buffer caps (no shell).
- `encodeURIComponent` on every Appwrite path segment.
- Request-scoped `X-Appwrite-JWT` (never admin key) + owner-scoped repositories + `userScopedKey`.
- Sync integrity: sha256 payload hashes + idempotency keys + explicit outcome state machine.
- Consent validation (allowlist, bounds, length caps) with idempotent legal-state upsert.
- Retention bounds (1–3650 days) and purge lifecycle for meal media.
- No secrets or PII in any log; `config-check` never prints values.
- App: zero permissions, zero network, zero file APIs — minimal possible attack surface for the current prototype state.

### Cross-references
- Gate fragility for the auth boundary: `build-pipeline.md` §6.1 (audit passes on a comment).
- Untracked live DB files (no integrity chain): `provenance.md` §4.
- Feature behavior switches: `map-feature-gates` (Phase 3) will map every env-driven branch enumerated here.

## 9. Output Contract

- File: `docs/analysis/data-flows.md`
- State: `trace-data-flows: complete`
- Next: Track B Phase 2 — `analyze-agent-loop` (applicability check)
