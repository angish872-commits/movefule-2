#!/usr/bin/env python3
"""Acquire bounded public vision benchmarks for MoveFuel validation.

This is validation/research acquisition only. It does not promote a dataset or
pretrained artifact into production authority. The runner records checksums and
keeps commercial-rights gates separate from scientific benchmark use.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from urllib.parse import quote, urlencode
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "nutrition-research" / "data" / "raw"
FOODSEG_URL = "https://research.larc.smu.edu.sg/downloads/datarepo/FoodSeg103.zip"
FOODSEG_PASSWORD = "LARCdataset9947"
N5K_BUCKET = "gs://nutrition5k_dataset/nutrition5k_dataset"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, target: Path, *, max_bytes: int = 20 * 1024**3) -> dict:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        return {"path": str(target), "bytes": target.stat().st_size, "sha256": sha256_file(target), "cached": True}
    tmp = target.with_suffix(target.suffix + ".part")
    tmp.unlink(missing_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "MoveFuel-Validation/6.0"})
    total = 0
    h = hashlib.sha256()
    with urllib.request.urlopen(req, timeout=180) as r, tmp.open("wb") as out:  # noqa: S310 fixed HTTPS source
        while True:
            block = r.read(1024 * 1024)
            if not block:
                break
            total += len(block)
            if total > max_bytes:
                raise RuntimeError(f"download exceeds {max_bytes} bytes")
            h.update(block)
            out.write(block)
    if total == 0:
        raise RuntimeError("empty download")
    tmp.replace(target)
    return {"path": str(target), "bytes": total, "sha256": h.hexdigest(), "cached": False}




def _gcs_list(bucket: str, prefix: str) -> list[dict]:
    items=[]; token=None
    while True:
        params={"prefix":prefix.rstrip("/")+"/","maxResults":"1000","fields":"items(name,size),nextPageToken"}
        if token: params["pageToken"]=token
        url=f"https://storage.googleapis.com/storage/v1/b/{quote(bucket,safe='')}/o?{urlencode(params)}"
        req=urllib.request.Request(url,headers={"User-Agent":"MoveFuel-Validation/6.0"})
        with urllib.request.urlopen(req,timeout=180) as response:  # noqa: S310 public fixed host
            doc=json.loads(response.read().decode("utf-8"))
        items.extend(x for x in (doc.get("items") or []) if isinstance(x,dict) and isinstance(x.get("name"),str))
        token=doc.get("nextPageToken")
        if not token: break
    return items


def _gcs_download_prefix(bucket: str, prefix: str, target: Path, *, max_total_bytes: int = 2 * 1024**3) -> dict:
    objects=_gcs_list(bucket,prefix)
    if not objects: raise RuntimeError(f"no public GCS objects under gs://{bucket}/{prefix}")
    total=sum(int(x.get("size") or 0) for x in objects)
    if total>max_total_bytes: raise RuntimeError(f"GCS prefix exceeds safety budget: {total} bytes")
    base=prefix.rstrip("/")+"/"; downloaded=0
    for item in objects:
        name=item["name"]
        if not name.startswith(base) or name.endswith("/"): continue
        rel=name[len(base):]
        if not rel or ".." in Path(rel).parts: raise RuntimeError(f"unsafe GCS object path: {rel}")
        dest=target/rel
        if dest.exists() and dest.stat().st_size==int(item.get("size") or dest.stat().st_size):
            downloaded+=1; continue
        dest.parent.mkdir(parents=True,exist_ok=True)
        url=f"https://storage.googleapis.com/{quote(bucket,safe='')}/{quote(name,safe='/')}"
        download(url,dest,max_bytes=max(64*1024**2,int(item.get("size") or 0)+1024*1024))
        downloaded+=1
    return {"object_count":len(objects),"downloaded_or_cached":downloaded,"bytes_expected":total}


def acquire_foodseg(extract: bool) -> dict:
    archive = RAW / "foodseg103" / "FoodSeg103.zip"
    record = download(FOODSEG_URL, archive)
    if not extract:
        return {"artifact": record, "extracted": False}
    target = RAW / "foodseg103" / "FoodSeg103"
    if target.exists() and any(target.rglob("*.jpg")):
        return {"artifact": record, "extracted": True, "root": str(target), "cached_extract": True}
    unzip = shutil.which("unzip")
    if not unzip:
        raise RuntimeError("unzip executable required for password-protected FoodSeg103 archive")
    tmp = RAW / "foodseg103" / "extract"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    proc = subprocess.run([unzip, "-q", "-P", FOODSEG_PASSWORD, str(archive), "-d", str(tmp)], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        raise RuntimeError(f"FoodSeg103 unzip failed: {proc.stderr.strip()[:500]}")
    candidates = [p for p in tmp.rglob("FoodSeg103") if p.is_dir()]
    source = candidates[0] if candidates else tmp
    if target.exists():
        shutil.rmtree(target)
    if source == tmp:
        target.mkdir(parents=True)
        for child in list(tmp.iterdir()):
            shutil.move(str(child), target / child.name)
        tmp.rmdir()
    else:
        shutil.move(str(source), target)
        shutil.rmtree(tmp, ignore_errors=True)
    image_count = sum(1 for _ in target.rglob("*.jpg"))
    mask_count = sum(1 for _ in target.rglob("*.png"))
    return {"artifact": record, "extracted": True, "root": str(target), "image_jpg_count": image_count, "png_count": mask_count}


def _test_ids(n5k_root: Path) -> list[str]:
    splits = n5k_root / "dish_ids" / "splits"
    ids: list[str] = []
    for p in sorted(splits.rglob("*")):
        if not p.is_file() or "test" not in p.name.lower():
            continue
        for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
            value = line.strip().split(",")[0]
            if value.startswith("dish_"):
                ids.append(value)
    return sorted(set(ids))


def _inference_manifest_ids(manifest: Path) -> list[str]:
    doc = json.loads(manifest.read_text(encoding="utf-8"))
    if doc.get("schema") != "movefuel-blind-inference-manifest-v1":
        raise RuntimeError("invalid blind inference manifest")
    ids=[]
    for sample in doc.get("samples", []):
        dish=str(sample.get("dish_id") or "").strip()
        if dish.startswith("dish_"):
            ids.append(dish)
    return list(dict.fromkeys(ids))


def acquire_nutrition5k_overhead(count: int, *, inference_manifest: Path | None = None) -> dict:
    n5k_root = RAW / "nutrition5k"
    ids = _inference_manifest_ids(inference_manifest) if inference_manifest else _test_ids(n5k_root)
    if not ids:
        raise RuntimeError("Nutrition5k dish IDs are missing; provide the leak-free inference manifest or run Step-1 split acquisition first")
    gsutil = shutil.which("gsutil")
    selected = ids[:max(1, count)]
    dest = n5k_root / "imagery" / "realsense_overhead"
    dest.mkdir(parents=True, exist_ok=True)
    results = []
    for dish in selected:
        target = dest / dish
        if target.exists() and any(target.iterdir()):
            results.append({"dish_id": dish, "status": "cached"})
            continue
        prefix=f"nutrition5k_dataset/imagery/realsense_overhead/{dish}"
        if gsutil:
            src = f"{N5K_BUCKET}/imagery/realsense_overhead/{dish}"
            proc = subprocess.run([gsutil, "-m", "cp", "-r", src, str(dest)], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if proc.returncode == 0:
                results.append({"dish_id": dish, "status": "downloaded", "transport":"gsutil"})
                continue
        try:
            info=_gcs_download_prefix("nutrition5k_dataset",prefix,target)
            results.append({"dish_id":dish,"status":"downloaded","transport":"public_https",**info})
        except Exception as exc:
            results.append({"dish_id": dish, "status": "failed", "error": str(exc)[:500]})
    completed = sum(1 for r in results if r["status"] in {"cached", "downloaded"})
    return {"requested": len(selected), "completed": completed, "root": str(dest), "results": results}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--foodseg", action="store_true")
    ap.add_argument("--nutrition5k-overhead", type=int, default=0)
    ap.add_argument("--nutrition5k-inference-manifest", type=Path, default=None, help="download RGB-D only for dish IDs in the leak-free prediction-time manifest")
    ap.add_argument("--no-extract", action="store_true")
    ap.add_argument("--output", type=Path, default=ROOT / "algorithm-validation" / "vision-acquisition.json")
    args = ap.parse_args()
    if os.getenv("MOVEFUEL_ALLOW_RESEARCH_DATASETS") != "1":
        print("Set MOVEFUEL_ALLOW_RESEARCH_DATASETS=1 to permit research benchmark downloads.", file=sys.stderr)
        return 2
    out: dict[str, object] = {"purpose": "validation_only", "production_authority": False}
    try:
        if args.foodseg:
            out["foodseg103"] = acquire_foodseg(not args.no_extract)
        if args.nutrition5k_overhead > 0:
            out["nutrition5k_overhead"] = acquire_nutrition5k_overhead(args.nutrition5k_overhead, inference_manifest=args.nutrition5k_inference_manifest)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(out, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps(out, indent=2))
        return 0
    except Exception as exc:
        out["error"] = f"{type(exc).__name__}: {exc}"
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(out, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps(out, indent=2), file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
