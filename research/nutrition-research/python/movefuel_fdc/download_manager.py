"""Secure, reproducible public-data downloader for MoveFuel Step 1."""

from __future__ import annotations

import hashlib
import json
import os
import random
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import quote, urlencode, urlparse

from .source_registry import SourceArtifact


class AcquisitionError(RuntimeError):
    pass


@dataclass(frozen=True)
class AcquiredArtifact:
    artifact_id: str
    source_id: str
    version: str
    url: str
    local_path: str
    bytes: int
    sha256: str
    acquired_at_epoch: int
    etag: str | None = None
    last_modified: str | None = None


def sha256_file(path: Path, chunk_size: int = 1 << 20) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def _validate_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise AcquisitionError(f"only https artifacts are auto-downloaded: {url}")
    if parsed.username or parsed.password:
        raise AcquisitionError("credentials must never be embedded in source URLs")
    if not parsed.hostname:
        raise AcquisitionError(f"invalid public URL: {url}")


def _atomic_write_manifest(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".part")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    tmp.replace(path)


def _load_manifest(path: Path) -> dict:
    if not path.exists():
        return {"version": 1, "artifacts": {}}
    try:
        payload = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise AcquisitionError(f"invalid acquisition manifest: {path}: {exc}") from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("artifacts", {}), dict):
        raise AcquisitionError(f"unexpected acquisition manifest shape: {path}")
    payload.setdefault("version", 1)
    payload.setdefault("artifacts", {})
    return payload


def record_acquisition(manifest_path: Path, record: AcquiredArtifact) -> None:
    manifest = _load_manifest(manifest_path)
    manifest["artifacts"][record.artifact_id] = asdict(record)
    _atomic_write_manifest(manifest_path, manifest)


def acquire_https(
    artifact: SourceArtifact,
    root: Path,
    *,
    manifest_path: Path,
    max_bytes: int | None = None,
    force: bool = False,
    retries: int = 4,
    timeout_seconds: int = 120,
) -> AcquiredArtifact:
    """Download one public artifact with bounded retries and an atomic write.

    The file is never trusted by filename alone. We reject obvious HTML error
    pages, hash the final bytes and persist an acquisition manifest.
    """
    if artifact.transport != "https":
        raise AcquisitionError(f"artifact {artifact.artifact_id} uses {artifact.transport}, not https")
    _validate_public_url(artifact.url)
    target = root / artifact.filename
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and not force:
        record = AcquiredArtifact(
            artifact_id=artifact.artifact_id,
            source_id=artifact.source_id,
            version=artifact.version,
            url=artifact.url,
            local_path=str(target),
            bytes=target.stat().st_size,
            sha256=sha256_file(target),
            acquired_at_epoch=int(target.stat().st_mtime),
        )
        record_acquisition(manifest_path, record)
        return record

    budget = max_bytes if max_bytes is not None else max(artifact.approx_bytes or 0, 1_000_000_000)
    # Give known artifact-size estimates room for upstream variation, but keep
    # a hard ceiling against accidental multi-GB HTML/redirect loops.
    if artifact.approx_bytes:
        budget = max(budget, int(artifact.approx_bytes * 1.25) + 1_000_000)

    tmp = target.with_suffix(target.suffix + ".part")
    tmp.unlink(missing_ok=True)
    last_error: Exception | None = None
    etag: str | None = None
    last_modified: str | None = None

    for attempt in range(1, retries + 1):
        total = 0
        digest = hashlib.sha256()
        request = urllib.request.Request(
            artifact.url,
            headers={"User-Agent": "MoveFuel-FoodKB/1.0 (+public-data-ingestion)"},
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response, tmp.open("wb") as out:
                content_type = (response.headers.get("Content-Type") or "").lower()
                etag = response.headers.get("ETag")
                last_modified = response.headers.get("Last-Modified")
                while True:
                    block = response.read(1 << 20)
                    if not block:
                        break
                    total += len(block)
                    if total > budget:
                        raise AcquisitionError(
                            f"download exceeds safety budget ({budget} bytes) for {artifact.artifact_id}"
                        )
                    digest.update(block)
                    out.write(block)
            if total == 0:
                raise AcquisitionError(f"empty download for {artifact.artifact_id}")
            # Many CDN endpoints use application/octet-stream, so only reject
            # an explicit text/html response for a binary artifact.
            if "text/html" in content_type and artifact.kind not in {"html", "reference_page"}:
                raise AcquisitionError(f"server returned HTML instead of {artifact.kind} for {artifact.artifact_id}")
            tmp.replace(target)
            record = AcquiredArtifact(
                artifact_id=artifact.artifact_id,
                source_id=artifact.source_id,
                version=artifact.version,
                url=artifact.url,
                local_path=str(target),
                bytes=total,
                sha256=digest.hexdigest(),
                acquired_at_epoch=int(time.time()),
                etag=etag,
                last_modified=last_modified,
            )
            record_acquisition(manifest_path, record)
            return record
        except (OSError, urllib.error.URLError, urllib.error.HTTPError, AcquisitionError) as exc:
            last_error = exc
            tmp.unlink(missing_ok=True)
            if attempt == retries:
                break
            time.sleep(min(10.0, (0.5 * (2 ** (attempt - 1))) + random.random() * 0.25))

    raise AcquisitionError(f"failed to acquire {artifact.artifact_id}: {last_error}")



def sha256_tree(path: Path) -> tuple[str, int]:
    """Deterministic digest + total bytes for a directory tree."""
    path = Path(path)
    digest = hashlib.sha256()
    total = 0
    for file in sorted((p for p in path.rglob("*") if p.is_file()), key=lambda p: p.relative_to(path).as_posix()):
        rel = file.relative_to(path).as_posix().encode("utf-8")
        digest.update(len(rel).to_bytes(4, "big"))
        digest.update(rel)
        with file.open("rb") as handle:
            while True:
                block = handle.read(1 << 20)
                if not block:
                    break
                total += len(block)
                digest.update(block)
    return digest.hexdigest(), total


def acquired_tree_record(artifact: SourceArtifact, path: Path) -> AcquiredArtifact:
    checksum, total = sha256_tree(path)
    return AcquiredArtifact(
        artifact_id=artifact.artifact_id,
        source_id=artifact.source_id,
        version=artifact.version,
        url=artifact.url,
        local_path=str(path),
        bytes=total,
        sha256=checksum,
        acquired_at_epoch=int(time.time()),
    )

def _parse_gs_url(url: str) -> tuple[str, str]:
    if not url.startswith("gs://"):
        raise AcquisitionError(f"invalid GCS URL: {url}")
    rest = url[5:]
    bucket, sep, prefix = rest.partition("/")
    if not bucket or not sep or not prefix:
        raise AcquisitionError(f"GCS URL must include bucket and object prefix: {url}")
    return bucket, prefix.rstrip("/")


def _public_gcs_list(bucket: str, prefix: str, *, timeout_seconds: int = 120) -> list[dict]:
    """List objects in a public GCS prefix without requiring gcloud/gsutil.

    Nutrition5k's bucket is public. Using the JSON storage endpoint means the
    validation runner only needs ordinary HTTPS/DNS, which makes the handoff
    substantially more reproducible on macOS/Linux machines.
    """
    items: list[dict] = []
    page_token: str | None = None
    while True:
        params = {"prefix": prefix.rstrip("/") + "/", "maxResults": "1000", "fields": "items(name,size,md5Hash,crc32c),nextPageToken"}
        if page_token:
            params["pageToken"] = page_token
        url = f"https://storage.googleapis.com/storage/v1/b/{quote(bucket, safe='')}/o?{urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": "MoveFuel-FoodKB/1.0 (+public-data-ingestion)"})
        try:
            with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
                doc = json.loads(response.read().decode("utf-8"))
        except (OSError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as exc:
            raise AcquisitionError(f"public GCS listing failed for gs://{bucket}/{prefix}: {exc}") from exc
        for item in doc.get("items", []) or []:
            if isinstance(item, dict) and isinstance(item.get("name"), str):
                items.append(item)
        page_token = doc.get("nextPageToken")
        if not page_token:
            break
    return items


def _download_public_gcs_object(bucket: str, name: str, target: Path, *, timeout_seconds: int = 180, max_bytes: int = 2 * 1024**3) -> None:
    url = f"https://storage.googleapis.com/{quote(bucket, safe='')}/{quote(name, safe='/')}"
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".part")
    total = 0
    req = urllib.request.Request(url, headers={"User-Agent": "MoveFuel-FoodKB/1.0 (+public-data-ingestion)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as response, tmp.open("wb") as out:
            while True:
                block = response.read(1 << 20)
                if not block:
                    break
                total += len(block)
                if total > max_bytes:
                    raise AcquisitionError(f"GCS object exceeds safety budget: {name}")
                out.write(block)
        if total <= 0:
            raise AcquisitionError(f"empty GCS object: {name}")
        tmp.replace(target)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise


def acquire_public_gcs_prefix(artifact: SourceArtifact, root: Path, *, force: bool = False, max_files: int = 100_000, max_total_bytes: int = 5 * 1024**3) -> Path:
    """Download a public GCS directory tree over plain HTTPS."""
    bucket, prefix = _parse_gs_url(artifact.url)
    target = root / artifact.filename
    if target.exists() and not force and any(p.is_file() for p in target.rglob("*")):
        return target
    if force and target.exists():
        shutil.rmtree(target)
    objects = _public_gcs_list(bucket, prefix)
    if not objects:
        raise AcquisitionError(f"no public GCS objects found for {artifact.url}")
    if len(objects) > max_files:
        raise AcquisitionError(f"GCS prefix contains {len(objects)} files, above safety limit {max_files}")
    expected = sum(int(item.get("size") or 0) for item in objects)
    if expected > max_total_bytes:
        raise AcquisitionError(f"GCS prefix expected size {expected} exceeds safety limit {max_total_bytes}")
    base = prefix.rstrip("/") + "/"
    for item in objects:
        name = item["name"]
        if not name.startswith(base) or name.endswith("/"):
            continue
        rel = name[len(base):]
        if not rel or rel.startswith("/") or ".." in Path(rel).parts:
            raise AcquisitionError(f"unsafe GCS relative path: {rel}")
        _download_public_gcs_object(bucket, name, target / rel)
    if not target.exists() or not any(p.is_file() for p in target.rglob("*")):
        raise AcquisitionError(f"public GCS acquisition produced no files: {target}")
    return target


def acquire_gsutil(artifact: SourceArtifact, root: Path, *, force: bool = False) -> Path:
    """Copy a public GCS directory, preferring gsutil but not requiring it.

    Nutrition5k is intentionally fetched by directory path so Step 1 can copy
    only metadata/splits rather than the 181.4 GB full dataset. If gsutil is
    unavailable, the public GCS JSON/HTTPS API is used instead.
    """
    if artifact.transport != "gsutil":
        raise AcquisitionError(f"artifact {artifact.artifact_id} is not a gsutil artifact")
    if not artifact.url.startswith("gs://"):
        raise AcquisitionError(f"invalid gsutil URL: {artifact.url}")
    target = root / artifact.filename
    if target.exists() and not force and any(p.is_file() for p in target.rglob("*")):
        return target
    gsutil = shutil.which("gsutil")
    if not gsutil:
        return acquire_public_gcs_prefix(artifact, root, force=force)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and force:
        shutil.rmtree(target)
    cmd = [gsutil, "-m", "cp", "-r", artifact.url, str(target.parent)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        # A normal HTTPS fallback is useful on machines where the CLI exists
        # but has a broken local auth/configuration despite a public bucket.
        return acquire_public_gcs_prefix(artifact, root, force=force)
    if not target.exists():
        copied = target.parent / Path(artifact.url.rstrip("/")).name
        if copied.exists() and copied != target:
            copied.replace(target)
    if not target.exists():
        raise AcquisitionError(f"GCS acquisition reported success but target is missing: {target}")
    return target
