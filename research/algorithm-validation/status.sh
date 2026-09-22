#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS="$ROOT/algorithm-validation/results"
if [[ ! -f "$RESULTS/LATEST" ]]; then
  echo "No validation run has been recorded yet."
  exit 0
fi
RUN_ID="$(tr -d '\r\n' < "$RESULTS/LATEST")"
SUMMARY="$RESULTS/$RUN_ID/validation-summary.json"
if [[ ! -f "$SUMMARY" ]]; then
  echo "Latest run id is $RUN_ID, but validation-summary.json is missing."
  exit 2
fi
python3 - "$SUMMARY" <<'PY'
import json, sys
p=sys.argv[1]
d=json.load(open(p, encoding='utf-8'))
print(f"MoveFuel validation run: {d['run_id']}")
print(f"Profile: {d['profile']}")
print(f"State: {d['state']}")
for phase in d['phases']:
    print(f"{phase['phase']:>2}. {phase['name']}: {phase['status']}")
print("\n", d['truth_boundary'])
PY
