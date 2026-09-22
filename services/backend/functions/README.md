# MoveFuel Appwrite Function

The current production backend is deployed as one canonical Appwrite Function
from the `services/backend` directory using Node 22:

- `movefuel_api`: authenticated public `/v1` API. Attach the production API
  domain and allow HTTP execution only through that domain.

The historical analysis-worker and maintenance-worker names are not current
Appwrite resources. Their server capabilities are routed inside the canonical
API service; do not create duplicate Functions for them.

Use the function-specific environment variables listed in
`deployment/MoveFuel-Appwrite-Function-Variables-TEMPLATE.env`. Create the
functions with the scopes in `deployment/appwrite-function-deployment.md`.
Never set `APPWRITE_API_KEY` in an Appwrite Function: the runtime passes a
short-lived dynamic key in `x-appwrite-key` during execution and exposes the
same credential as `APPWRITE_FUNCTION_API_KEY` during build.

The API adapter preserves the existing HTTP routes and converts Appwrite's
authenticated-user JWT header into the backend's `Authorization: Bearer` route
contract. It does not log request bodies, JWTs, or response bodies.
