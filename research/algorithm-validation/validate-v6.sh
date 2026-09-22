#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
VENV="$ROOT/.movefuel-validation-venv"
PROFILE="${1:-standard}"
shift || true
case "$PROFILE" in pilot|standard|full) ;; *) echo "ERROR: profile must be pilot, standard, or full" >&2; exit 2;; esac
if [[ "$PROFILE" == "full" && "${MOVEFUEL_CONFIRM_FULL_PUBLIC_BENCHMARK:-}" != "YES" ]]; then
  cat >&2 <<'EOF'
ERROR: full mode is intentionally guarded because it can download >200 GB and make thousands of provider calls.
Set MOVEFUEL_CONFIRM_FULL_PUBLIC_BENCHMARK=YES only when you intend to run the exhaustive public benchmark.
EOF
  exit 3
fi
PY="$VENV/bin/python"
[[ -x "$PY" ]] || PY="$(command -v python3)"
# The blind end-to-end tests spawn Node, which in turn invokes Python for
# physical-evidence processing. Keep that nested invocation in this validated
# environment instead of silently falling back to the machine-wide interpreter.
export PYTHON="$PY"
RUN_ID="${MOVEFUEL_VALIDATION_RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
PRE="$ROOT/algorithm-validation/prevalidated-run-$RUN_ID"
mkdir -p "$PRE"

echo "[1/3] Running hermetic backend tests..."
(cd "$REPO_ROOT/services/backend" && env -u MOVEFUEL_ENV -u MOVEFUEL_AUTH_MODE -u APPWRITE_ENDPOINT -u APPWRITE_PROJECT_ID -u APPWRITE_DATABASE_ID -u APPWRITE_API_KEY -u GEMINI_API_KEY -u USDA_FDC_API_KEY -u FDC_API_KEY npm test) > "$PRE/backend-tests.log" 2>&1

echo "[2/3] Running Python algorithm/data/CV tests..."
(cd "$ROOT/nutrition-research/python" && env -u GEMINI_API_KEY -u USDA_FDC_API_KEY -u FDC_API_KEY PYTHONPATH=. "$PY" -m pytest -q) > "$PRE/python-tests.log" 2>&1

export MOVEFUEL_LOCAL_TESTS_PREVALIDATED=1
export MOVEFUEL_LOCAL_TESTS_BACKEND_LOG="${PRE#$ROOT/}/backend-tests.log"
export MOVEFUEL_LOCAL_TESTS_PYTHON_LOG="${PRE#$ROOT/}/python-tests.log"

ARGS=("$PROFILE" --run-id "$RUN_ID")
[[ "${MOVEFUEL_ALLOW_DOWNLOADS:-0}" == "1" ]] && ARGS+=(--allow-downloads)
[[ "${MOVEFUEL_ALLOW_LARGE_USDA:-0}" == "1" ]] && ARGS+=(--allow-large-usda)
[[ "${MOVEFUEL_ALLOW_LIVE_API:-0}" == "1" ]] && ARGS+=(--allow-live-api)
[[ "${MOVEFUEL_ALLOW_RESEARCH_DATASETS:-0}" == "1" ]] && ARGS+=(--allow-research-datasets)

echo "[3/3] Running V6 comprehensive validation ($PROFILE)..."
cd "$ROOT"
exec "$PY" "$ROOT/algorithm-validation/run_comprehensive_validation.py" "${ARGS[@]}" "$@"
