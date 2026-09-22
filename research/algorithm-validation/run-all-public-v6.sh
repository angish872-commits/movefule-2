#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
: "${GEMINI_API_KEY:?GEMINI_API_KEY must be loaded privately in the shell/environment}"
export MOVEFUEL_ALLOW_DOWNLOADS=1
export MOVEFUEL_ALLOW_LARGE_USDA=1
export MOVEFUEL_ALLOW_LIVE_API=1
export MOVEFUEL_ALLOW_RESEARCH_DATASETS=1
export MOVEFUEL_CONFIRM_FULL_PUBLIC_BENCHMARK=YES
exec "$ROOT/algorithm-validation/validate-v6.sh" full "$@"
