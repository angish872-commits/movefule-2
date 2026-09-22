# MoveFuel backend

There is one production backend service in this repository: `services/backend`.

The folders under `src/` are product/domain modules inside that service. They are not separate backends.

## Entry points

```text
Appwrite Function
functions/api/src/main.ts
        ↓
http/request-handler.ts
        ↓
bootstrap/backend-runtime.ts
        ↓
route/domain modules
```

```text
Local development
src/server.ts
        ↓
http/local-server.ts
        ↓
http/request-handler.ts
        ↓
bootstrap/backend-runtime.ts
```

Both launch paths use the same request handler and the same backend composition root.

## Where backend code lives

| Responsibility | Path |
|---|---|
| Dependency/runtime composition | `src/bootstrap/backend-runtime.ts` |
| HTTP dispatch | `src/http/request-handler.ts` |
| Local TCP wrapper | `src/http/local-server.ts` |
| Meals | `src/meal/` + `src/http/meal-routes.ts` |
| Saved meals/personal foods/nutrition library routes | `src/http/meal-library-routes.ts` |
| Health | `src/health/` + `src/http/health-routes.ts` |
| Device trust/commands | `src/device/` + device route modules |
| Phone/watch sync + workouts | `src/sync/` + `src/http/sync-routes.ts` |
| Profile/account/bootstrap | `src/foundation/` + `src/http/profile-account-routes.ts` |
| Reports | `src/report/` + `src/http/report-routes.ts` |
| Progress/dashboard insights | `src/progress/`, `src/dashboard/`, `src/http/insight-routes.ts` |
| Billing/entitlements | `src/billing/` + `src/http/experience-routes.ts` |
| Notifications/support/privacy | their matching domain folders |
| Nutrition algorithm | `src/nutrition/` |
| Appwrite schema/catalog support | `src/appwrite/` + `migrations/` |

## Persistence is not a second backend

MoveFuel uses interfaces/adapters so the same backend can run in different environments:

- local development/tests can use in-memory/local stores;
- authenticated production requests use Appwrite-backed adapters;
- production startup fails closed when required Appwrite persistence configuration is missing.

The local stores are development/test implementations of backend contracts. They are not a second product backend.

`src/foundation/appwrite-runtime.ts` centralizes creation of session-scoped Appwrite repositories so feature routes do not each invent their own authenticated persistence behavior.

## Authentication

`bootstrap/backend-runtime.ts` owns backend authentication composition.

- Local development defaults to the explicit `Bearer local-user:<user-id>` fixture boundary.
- Production with `APPWRITE_ENDPOINT` and `APPWRITE_PROJECT_ID` automatically wires `AppwriteSessionProvider`.
- Appwrite Function requests map the user JWT into the same authentication path used by the request handler.
- Request-scoped user JWTs are not serialized or logged.

## Nutrition engine

The canonical algorithm composition root is:

`src/nutrition/algorithm/moveFuelAlgorithm.ts`

The provider layer proposes visual identity/preparation/region evidence. Final physical portion, density, mass, trusted nutrient calculation, calibration and clarification remain MoveFuel-owned logic.

```text
nutrition/
├── algorithm/
├── vision/
│   ├── config/
│   ├── providers/
│   └── telemetry/
├── identity/
├── portion/
├── nutrients/
├── confidence/
├── personalization/
├── service/
└── benchmark/
```

OpenRouter/Gemini credentials remain server-side. Database rows select provider/model/routing configuration but do not contain the raw provider secret.

## Meal lifecycle

Meal storage is separated by responsibility:

- `meal/store.ts` — draft + analysis + confirmation lifecycle facade;
- `meal/confirmed-meal-projection.ts` — confirmed-meal projection, daily totals, revision and tombstone behavior;
- `meal/store-types.ts` — store request/result contracts;
- `meal/store-support.ts` — validation/key helpers;
- Appwrite-specific persistence lives in dedicated adapter files.

## Verification

Install the backend verification dependencies once:

```bash
npm install --ignore-scripts
```

Then run:

```bash
npm run verify
```

`verify` performs a strict production TypeScript check and the complete backend test suite.

For an Appwrite deployment, run `tools/verification/package-appwrite-function.sh`
from the repository root. The package keeps the repository root intact and
uses `services/backend/functions/api/src/main.ts` as its entrypoint so the
shared `algorithms/` and generated `contracts/` trees resolve correctly.

The production TypeScript gate includes `strict`, `noImplicitReturns`, `useUnknownInCatchVariables`, and `noUncheckedIndexedAccess`. Node still executes the source using its supported strip-types subset, so runtime tests remain mandatory in addition to compiler checks.

## Local server

```bash
npm start
```

Default address: `http://127.0.0.1:8787`.

For configured local development, use the deployment environment template under `infra/deployment/` and the existing configured-start script. Never commit live `.env` values or provider/Appwrite secrets.
