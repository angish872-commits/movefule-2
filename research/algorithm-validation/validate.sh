#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
VENV="$ROOT/.movefuel-validation-venv"
PROFILE="${1:-pilot}"
shift || true
RUN_ID="${MOVEFUEL_VALIDATION_RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
RUN_DIR="$ROOT/algorithm-validation/results/$RUN_ID"
mkdir -p "$RUN_DIR/logs"

if [[ -x "$VENV/bin/python" ]]; then
  PY="$VENV/bin/python"
else
  PY="$(command -v python3)"
fi

# Run the large local suites directly in the shell. This avoids buffering a
# long Node test stream inside the Python orchestrator and gives immediate
# standalone logs if a test process crashes.
if [[ "${MOVEFUEL_SKIP_LOCAL_TESTS:-0}" != "1" ]]; then
  echo "[MoveFuel] backend tests..."
  # Local/unit tests must be hermetic. A developer may have production Appwrite
  # or MoveFuel runtime variables in the shell for later live-provider phases;
  # those values must not change deterministic unit/integration test behavior.
  (cd "$REPO_ROOT/services/backend" && env \
    -u MOVEFUEL_ENV -u MOVEFUEL_AUTH_MODE -u MOVEFUEL_HOST -u PORT \
    -u APPWRITE_ENDPOINT -u APPWRITE_PROJECT_ID -u APPWRITE_DATABASE_ID -u APPWRITE_API_KEY \
    -u MOVEFUEL_MEDIA_DIR -u MOVEFUEL_RECOVERY_REDIRECT_URL -u TABLE_MANIFEST_PATH \
    -u BUCKET_MEAL_MEDIA_ID -u BUCKET_EXPORT_ARTIFACTS_ID \
    -u FUNCTION_API_ID \
    -u GEMINI_API_KEY -u USDA_FDC_API_KEY -u FDC_API_KEY \
    npm test) > "$RUN_DIR/logs/backend-tests.log" 2>&1
  echo "[MoveFuel] Python algorithm/data tests..."
  (cd "$ROOT/nutrition-research/python" && env \
    -u MOVEFUEL_ENV -u MOVEFUEL_AUTH_MODE -u APPWRITE_ENDPOINT -u APPWRITE_PROJECT_ID \
    -u APPWRITE_DATABASE_ID -u APPWRITE_API_KEY \
    -u GEMINI_API_KEY -u USDA_FDC_API_KEY -u FDC_API_KEY \
    "$PY" -m pytest -q) > "$RUN_DIR/logs/python-tests.log" 2>&1
  export MOVEFUEL_LOCAL_TESTS_PREVALIDATED=1
  export MOVEFUEL_LOCAL_TESTS_BACKEND_LOG="algorithm-validation/results/$RUN_ID/logs/backend-tests.log"
  export MOVEFUEL_LOCAL_TESTS_PYTHON_LOG="algorithm-validation/results/$RUN_ID/logs/python-tests.log"
fi

export MOVEFUEL_VALIDATION_RUN_ID="$RUN_ID"
cd "$ROOT"
exec "$PY" "$ROOT/algorithm-validation/run_validation.py" "$PROFILE" --skip-local-tests "$@"
