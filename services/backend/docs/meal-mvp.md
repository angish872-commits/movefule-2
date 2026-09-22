# MoveFuel meal backend MVP

This document describes the meal slice. Local fixture sessions use in-memory
storage; authenticated Appwrite sessions can use the deployed saved-meal
TablesDB adapter. Real-account acceptance remains unverified.

## Boundary

The meal slice owns:

- resumable user-owned drafts and immutable draft revisions;
- deterministic local nutrition fixtures;
- an analyzer provider interface;
- a Gemini-ready server adapter with a structured, injected transport and
  response decoder; it reports `provider_not_configured` when disabled;
- analysis request idempotency;
- explicit confirmation and corrected nutrition values;
- daily totals that are updated only during successful confirmation;
- saved meal template creation/listing with owner-scoped persistence;
- route handlers for later composition into the shared authenticated server.

It does not modify the shared HTTP server, shared contracts, sync store,
migrations, or Android code.

## Route composition

The shared server should authenticate the request first, then pass the
authenticated user id into the handler:

```ts
const mealRoutes = createMealRouteHandler({ store: mealStore });
const handled = await mealRoutes(req, res, {
  userId: auth.userId,
  correlationId,
});
```

If `handled` is `false`, the caller continues routing. The handler returns a
schema-versioned envelope for every matched route:

```json
{
  "schemaVersion": 1,
  "correlationId": "request-correlation-id",
  "data": {},
  "error": null
}
```

Implemented routes:

- `POST /v1/meals/drafts`
- `POST /v1/meals/analysis`
- `GET /v1/meals/analysis/{requestId}`
- `POST /v1/meals/confirm`
- `POST /v1/meals/drafts/{draftId}/revisions` for explicit corrections
- `POST /v1/saved-meals`
- `GET /v1/saved-meals?query=...`

## Confirmation invariant

Analysis output is a proposal. A request with `confirmed: true` is required
to create a permanent meal. Corrections are validated locally and are included
in the confirmed meal when supplied. Draft creation and analysis never change
daily totals. Replaying the same confirmation idempotency key returns the
original meal and does not increment totals again.

## Provider boundary

`DeterministicLocalMealAnalyzer` selects a stable fixture from the draft note
and returns the same nutrition estimate for the same fixture. It is explicitly
an estimate and remains editable.

Production photo analysis uses `/v1/meals/estimates`, which composes the
candidate-only `GeminiFoodSceneAdapter` with image-quality checks, physical
portion evidence, density/source resolution and trusted nutrition arithmetic.
Gemini may propose visible food identity/preparation/region information only;
provider-supplied grams, calories, macros and nutrients are rejected.

The legacy `/v1/meals/analysis` contract still accepts `provider: "gemini"`
only as a fail-closed compatibility boundary and returns
`provider_not_implemented`. Android production image analysis must use the canonical image-estimate
route. Credentials remain server-side and never cross into Android or
Wear code.

## Focused verification

Run from `backend/`:

```text
node --experimental-strip-types --test src/tests/meal/*.test.ts
```

The focused suite covers deterministic analysis, ownership, stale revisions,
explicit confirmation, corrected values, duplicate requests, standard route
envelopes, missing Gemini configuration, structured transport decoding, and
malformed provider responses.
