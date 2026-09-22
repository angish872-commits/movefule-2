#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYROOT="$ROOT/nutrition-research/python"
VENV="$ROOT/.movefuel-validation-venv"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "ERROR: required command '$1' is missing." >&2; exit 2; }
}

need python3
need node
need npm
need git

python3 - <<'PY'
import sys
if sys.version_info < (3, 11):
    raise SystemExit("ERROR: Python 3.11+ is required")
print("Python:", sys.version.split()[0])
PY

node - <<'JS'
const parts = process.versions.node.split('.').map(Number);
if (parts[0] < 22 || (parts[0] === 22 && parts[1] < 6)) {
  console.error(`ERROR: Node 22.6+ required; found ${process.versions.node}`);
  process.exit(2);
}
console.log("Node:", process.versions.node);
JS

if [[ ! -d "$VENV" ]]; then
  echo "Creating validation virtual environment..."
  python3 -m venv "$VENV"
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"
python -m pip install --upgrade pip setuptools wheel
python -m pip install -e "$PYROOT[vision]" pytest

cat <<EOF

MoveFuel validation setup complete.

Next safe command:
  $ROOT/algorithm-validation/validate-v6.sh pilot

Optional later components:
- Normal HTTPS is enough for Nutrition5k; gsutil/Google Cloud CLI is optional because a public-GCS HTTPS fallback is included.
- PyTorch + Depth Anything V2 repo/checkpoint for real monocular-depth runs
- GEMINI_API_KEY in the shell environment for live recognition (never copy it into source/results)

For the exhaustive selected-public-data run after setup:
  export MOVEFUEL_CONFIRM_FULL_PUBLIC_BENCHMARK=YES
  $ROOT/algorithm-validation/run-all-public-v6.sh

No API-key value was requested or written by this setup script.
EOF
