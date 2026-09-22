#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODEL_ROOT="${MOVEFUEL_MODEL_ROOT:-$ROOT/.external-models}"
REPO="$MODEL_ROOT/Depth-Anything-V2"
CHECKPOINT="$MODEL_ROOT/checkpoints/depth_anything_v2_vits.pth"
REPO_URL="${MOVEFUEL_DEPTH_ANYTHING_REPO_URL:-https://github.com/DepthAnything/Depth-Anything-V2.git}"
CHECKPOINT_URL="${MOVEFUEL_DEPTH_ANYTHING_CHECKPOINT_URL:-https://huggingface.co/depth-anything/Depth-Anything-V2-Small/resolve/main/depth_anything_v2_vits.pth}"

if [[ "${MOVEFUEL_ALLOW_MODEL_DOWNLOADS:-0}" != "1" ]]; then
  cat <<EOF
Depth model download is disabled by default.

When you are ready, run:
  MOVEFUEL_ALLOW_MODEL_DOWNLOADS=1 $ROOT/algorithm-validation/setup-depth-anything-v2.sh

The script will clone the external repository and download the Small checkpoint, then record exact git revision and SHA-256 locally.
EOF
  exit 0
fi

command -v git >/dev/null
command -v curl >/dev/null
mkdir -p "$MODEL_ROOT/checkpoints"
if [[ ! -d "$REPO/.git" ]]; then
  git clone --depth 1 "$REPO_URL" "$REPO"
fi
if [[ ! -f "$CHECKPOINT" ]]; then
  curl --fail --location --retry 3 --output "$CHECKPOINT.part" "$CHECKPOINT_URL"
  mv "$CHECKPOINT.part" "$CHECKPOINT"
fi
REV="$(git -C "$REPO" rev-parse HEAD)"
SHA="$(shasum -a 256 "$CHECKPOINT" | awk '{print $1}')"
LOCK="$MODEL_ROOT/depth-anything-v2-small.lock.json"
python3 - "$LOCK" "$REPO" "$CHECKPOINT" "$REV" "$SHA" <<'PY'
import json, sys
from pathlib import Path
out, repo, ckpt, rev, sha = sys.argv[1:]
payload = {
  "model_id": "depth-anything-v2-small",
  "repository": repo,
  "repository_revision": rev,
  "checkpoint": ckpt,
  "checkpoint_sha256": sha,
  "authority": "relative_depth_only_until_metric_calibrated"
}
Path(out).write_text(json.dumps(payload, indent=2, sort_keys=True)+"\n", encoding="utf-8")
print(json.dumps(payload, indent=2))
PY
cat <<EOF

Export these before validation:
  export MOVEFUEL_DEPTH_ANYTHING_REPO="$REPO"
  export MOVEFUEL_DEPTH_ANYTHING_CHECKPOINT="$CHECKPOINT"
EOF
