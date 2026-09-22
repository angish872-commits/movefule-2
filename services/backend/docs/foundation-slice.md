# MoveFuel foundation slice

This slice defines the backend boundaries that meal and sync implementations
can depend on without coupling them to the HTTP server or an Appwrite SDK.

## Contracts

`src/shared/api-contracts.ts` provides the versioned `{ schemaVersion,
correlationId, data, error }` envelope plus constructors and validation. A
response contains either data or a structured error, never both.

## Sessions

`src/foundation/session.ts` exposes `SessionProvider` and the narrow
`AppwriteSessionClient` boundary. `AppwriteSessionProvider` delegates bearer
validation to an injected deployment client. It does not store, print, or
embed credentials. `LocalTestSessionProvider` is explicitly test-only and
must not be used for production authentication.

## Repository and permissions

`AppwriteOwnerScopedRepository` injects an authenticated `userId` query for
every owner-scoped read, prevents owner changes, returns no cross-user row,
and rejects access to the server-only `schema_migrations` table. The policy
declarations are default-deny with row security enabled for every approved
table.

## Idempotency

`IdempotencyStore` provides an atomic claim/replay/conflict abstraction keyed
by `(userId, key)`. `hashRequest` is stable across object key order. The
in-memory implementation is for tests and local development; a deployed
Appwrite adapter must preserve the same unique-key and request-hash behavior.

## Migration boundary

`migrations/manifest.v1.json` covers the twelve-table foundation slice. The
dry-run tool is report-only: it never contacts Appwrite or mutates resources.
The original empty `schema_migrations` table was inspected and, under the
bounded deployment authorization, was given the required server-only ledger
shape and one bootstrap row. A matching sanitized snapshot now makes the
dry-run idempotent: the ledger is `verify_existing`, with no destructive
operations and `applyAllowed: true` for a separately reviewed deployment
runner.

The twelve-table slice itself is not yet claimed as deployed; only the
migration-ledger bootstrap is recorded.
