# MoveFuel sync/product MVP slice

This document records the isolated sync/product implementation. It is a local
backend slice and does not claim a physical watch integration or Appwrite
deployment.

## Implemented boundary

- `SyncProductAdapter` validates and delegates the existing `daily_summary`
  push/pull contracts to the existing `SyncStore`.
- Push remains per-operation: accepted, duplicate, older, and rejected results
  are returned without discarding valid operations in the same batch.
- The existing device-operation idempotency behavior is preserved. Reusing an
  idempotency key with a different request is rejected.
- `SyncProductStore` adds watch delivery state with a stable unique key of
  user, watch, summary, and revision. A transport attempt is `SENT`; only a
  persisted watch receipt moves delivery state to `ACKNOWLEDGED`.
- Watch receipts are idempotent by user, watch, summary, revision, and result.
  Older delivery revisions return `STALE`; receipts from another user or watch
  are rejected.
- Workout sessions use the specification states
  `PREPARING -> ACTIVE <-> PAUSED -> ENDING -> COMPLETED`, with `FAILED` as a
  terminal failure path. Authority-device checks, expected revisions, stable
  idempotency keys, and active-time calculation are enforced.
- `OfflineRetryPolicy` uses bounded exponential backoff for network/transient
  errors. Accepted, duplicate, older, validation, and other non-retryable
  outcomes are terminal. `OfflineSyncQueue` keeps retry state in memory for
  local-first workflow tests.

## Standalone route handler

`src/http/sync-routes.ts` exports `createSyncProductHandler` and
`createSyncProductServer`. The routes are intentionally standalone because the
coordinator assigned this agent a disjoint write set and protected the existing
server files from edits.

Supported routes:

- `POST /v1/sync/push`
- `POST /v1/sync/pull`
- `POST /v1/watch/deliveries`
- `GET /v1/watch/deliveries?watchDeviceId=...`
- `POST /v1/watch/deliveries/{deliveryId}/attempt`
- `POST /v1/watch/receipts`
- `POST /v1/workouts/start`
- `POST /v1/workouts/{sessionId}/transition`
- `POST /v1/workouts/{sessionId}/complete`

All responses use the existing `schemaVersion`, `correlationId`, `data`, and
structured `error` envelope. The default local authenticator accepts only
`Authorization: Bearer local-user:<id>`. Production mode stops with
`auth_not_configured` until the Appwrite session adapter is supplied.

## Verification

Run the focused slice with:

```text
cd <MOVEFUEL_REPO>/services/backend
node --experimental-strip-types --test src/tests/sync-product/*.test.ts
```

The existing suite remains separate and should also be run:

```text
node --experimental-strip-types --test src/tests/*.test.ts
```

No API keys, signing secrets, private health payloads, or Appwrite credentials
are read, requested, printed, or embedded by this slice.

