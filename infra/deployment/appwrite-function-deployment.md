# Appwrite Cloud deployment runbook

This repository deploys no live cloud resources automatically. The account
owner creates separate EU **staging** and **production** projects, then runs
the following procedure for staging first.

1. Copy `services/backend/appwrite.config.json.template` to the ignored local filename
   `services/backend/appwrite.config.json`, insert only the public project ID and EU
   endpoint, and authenticate the Appwrite CLI as a deployment operator.
2. Run the existing migration dry run and a connected, read-only schema and
   permission inventory. Apply only reviewed additive manifests; never use a
   snapshot to delete a live table or bucket.
3. Create the private `meal-history-private` bucket with file security
   enabled and empty bucket-level permissions, then set the function variables from
   `MoveFuel-Appwrite-Function-Variables-TEMPLATE.env`. Function variable
   values are secrets; `APPWRITE_API_KEY` is deliberately absent because the
   Function receives a short-lived dynamic key at execution time.
4. Create `movefuel_api` with Node 22, a 30-second timeout, execution access
   restricted to the configured API domain, and only the database/storage/user
   scopes it needs. Attach its HTTPS custom domain to
   `MOVEFUEL_BACKEND_BASE_URL` in the release build configuration.
5. Package the Function with `tools/verification/package-appwrite-function.sh`;
   the archive keeps the repository root intact so `services/backend`, the
   shared `algorithms/`, and generated `contracts/` trees resolve together.
   Deploy it with entrypoint
   `services/backend/functions/api/src/main.ts` and build command
   `cd services/backend && npm install`, record the active deployment ID and
   source SHA-256, then run the staging acceptance suite. Roll back by
   re-activating the prior verified deployment; do not overwrite a working
   deployment in place.
6. Repeat the same source SHA and inventory-first procedure for production.
   Production promotion requires the release checklist and owner approval.

Before promotion, the connected read-only inventory must report database
`movefuel_mvp`, Function `movefuel_api`, and
`CANONICAL APPWRITE COUNT = 81`. Do not run a production schema mutation from
this repository without explicit owner authorization.

## Hard release boundaries

- Set `MOVEFUEL_CAMERA_PUBLIC_ENABLED=false` until a reviewed, immutable
  weighed-food validation artifact is recorded in
  `MOVEFUEL_CAMERA_VALIDATION_ARTIFACT`.
- Keep `MOVEFUEL_PAID_FEATURES_ENABLED=false`. No store verifier exists yet.
- Do not enable function execution for arbitrary callers, log raw image/JWT
  content, or put keys in an APK, repository, CI output, or support ticket.
- Review function execution errors, Appwrite audit logs, Google Play vitals,
  backup/export recovery, and the prior deployment ID before every promotion.
