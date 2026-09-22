#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS="$ROOT/algorithm-validation/results"
if [[ ! -f "$RESULTS/LATEST" ]]; then
  echo "ERROR: no validation run to package." >&2
  exit 2
fi
RUN_ID="$(tr -d '\r\n' < "$RESULTS/LATEST")"
SRC="$RESULTS/$RUN_ID"
OUT="$RESULTS/MoveFuel-Validation-Results-$RUN_ID.zip"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/result"

# Copy only the run result tree. Private config and source-wide env files are not included.
rsync -a "$SRC/" "$TMP/result/"

# Defensive redaction of text-like logs/reports using currently loaded secret values.
while IFS= read -r -d '' f; do
  case "$f" in
    *.json|*.log|*.txt|*.md|*.csv)
      python3 "$ROOT/algorithm-validation/scripts/redact.py" "$f" "$f.redacted"
      mv "$f.redacted" "$f"
      ;;
  esac
done < <(find "$TMP/result" -type f -print0)

# Reject suspicious secret assignments even after redaction.
if grep -RIEq '(^|[^A-Z])(GEMINI_API_KEY|USDA_FDC_API_KEY|FDC_API_KEY|APPWRITE_API_KEY|APPWRITE_KEY)[[:space:]]*=[[:space:]]*[^[]' "$TMP/result"; then
  echo "ERROR: potential secret assignment detected; refusing to create results bundle." >&2
  exit 3
fi

rm -f "$OUT"
(cd "$TMP" && zip -qr "$OUT" result)
shasum -a 256 "$OUT" > "$OUT.sha256"
echo "$OUT"
