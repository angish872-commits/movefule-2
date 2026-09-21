#!/usr/bin/env python3
"""Compare two source manifests by path and available stable fingerprint."""
from __future__ import annotations
import argparse, csv, json
from pathlib import Path

FINGERPRINT_COLUMNS = ("sha256", "blob_sha", "crc32")

def load(path: Path):
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        return {}, None
    fp = next((c for c in FINGERPRINT_COLUMNS if c in rows[0]), None)
    return {r["path"]: r for r in rows}, fp

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("old_manifest", type=Path)
    ap.add_argument("new_manifest", type=Path)
    args = ap.parse_args()
    old, old_fp = load(args.old_manifest)
    new, new_fp = load(args.new_manifest)
    old_paths, new_paths = set(old), set(new)
    common = old_paths & new_paths
    changed, identical = [], []
    if old_fp and new_fp:
        for path in sorted(common):
            if old[path].get(old_fp) == new[path].get(new_fp):
                identical.append(path)
            else:
                changed.append(path)
    else:
        changed = sorted(common)
    result = {
        "only_old": sorted(old_paths - new_paths),
        "only_new": sorted(new_paths - old_paths),
        "changed_or_unverified": changed,
        "identical_by_fingerprint": identical,
        "counts": {
            "old": len(old_paths),
            "new": len(new_paths),
            "only_old": len(old_paths - new_paths),
            "only_new": len(new_paths - old_paths),
            "changed_or_unverified": len(changed),
            "identical": len(identical),
        },
    }
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
