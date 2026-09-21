#!/usr/bin/env python3
"""Fingerprint a ZIP snapshot without extracting it."""
from __future__ import annotations
import argparse, csv, hashlib, json
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def safe_member(name: str) -> bool:
    p = PurePosixPath(name.replace("\\", "/"))
    return not p.is_absolute() and ".." not in p.parts

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("zip_path", type=Path)
    ap.add_argument("--out-dir", type=Path, default=Path(".reconciliation-cache"))
    args = ap.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    archive_hash = sha256_file(args.zip_path)
    rows, unsafe = [], []
    with ZipFile(args.zip_path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            ok = safe_member(info.filename)
            if not ok:
                unsafe.append(info.filename)
            rows.append({
                "path": info.filename,
                "safe_path": ok,
                "size_bytes": info.file_size,
                "compressed_bytes": info.compress_size,
                "crc32": f"{info.CRC:08x}",
            })
    if unsafe:
        raise SystemExit("Unsafe ZIP member paths detected: " + ", ".join(unsafe[:10]))
    stem = args.zip_path.stem
    manifest = args.out_dir / f"{stem}.manifest.csv"
    with manifest.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["path","safe_path","size_bytes","compressed_bytes","crc32"])
        w.writeheader()
        w.writerows(rows)
    summary = {
        "archive": str(args.zip_path),
        "sha256": archive_hash,
        "file_count": len(rows),
        "uncompressed_bytes": sum(r["size_bytes"] for r in rows),
        "manifest": str(manifest),
    }
    (args.out_dir / f"{stem}.summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
