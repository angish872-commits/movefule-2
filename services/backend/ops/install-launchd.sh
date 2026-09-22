#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_PATH="$(command -v node || true)"
if [[ -z "$NODE_PATH" ]]; then
  echo "node_not_found: install Node.js >=22.6 and retry" >&2
  exit 2
fi

TEMPLATE="$SCRIPT_DIR/com.movefuel.backend.plist"
TARGET="$HOME/Library/LaunchAgents/com.movefuel.backend.plist"
mkdir -p "$(dirname "$TARGET")"
python3 - "$TEMPLATE" "$TARGET" "$BACKEND_ROOT" "$NODE_PATH" <<'PY'
from pathlib import Path
import sys
src, dst, backend_root, node_path = sys.argv[1:]
text = Path(src).read_text()
text = text.replace('__MOVEFUEL_BACKEND_ROOT__', backend_root).replace('__NODE_PATH__', node_path)
Path(dst).write_text(text)
PY

launchctl bootout "gui/$(id -u)" "$TARGET" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$TARGET"
launchctl kickstart -k "gui/$(id -u)/com.movefuel.backend"
echo "Installed $TARGET using backend root $BACKEND_ROOT"
