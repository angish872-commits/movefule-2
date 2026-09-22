"""USDA FoodData Central release discovery and download.

The bulk CSV bundle contains all data types (foundation, survey/FNDDS,
branded, sr_legacy, experimental and supporting tables). Raw archives are
preserved unchanged; only a manifest and checksums are written.
"""

from __future__ import annotations

import hashlib
import json
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable

FDC_DOWNLOAD_PAGE = "https://fdc.nal.usda.gov/download-datasets.html"
FDC_DATASETS_BASE = "https://fdc.nal.usda.gov/fdc-datasets"


@dataclass(frozen=True)
class ReleaseArtifact:
    release: str
    name: str
    url: str
    expected_bytes: int | None = None


@dataclass
class DownloadedRelease:
    release: str
    name: str
    url: str
    file_size_bytes: int
    sha256: str
    downloaded_at_epoch: int
    source_ref: str

    def to_dict(self) -> dict:
        return asdict(self)


def default_release() -> str:
    """Return the known-good current release tag (2026-04-30)."""
    return "2026-04-30"


def full_bundle_artifact(release: str | None = None) -> ReleaseArtifact:
    release = release or default_release()
    name = f"FoodData_Central_csv_{release}.zip"
    return ReleaseArtifact(
        release=release,
        name=name,
        url=f"{FDC_DATASETS_BASE}/{name}",
    )


def sha256_of_file(path: Path, chunk: int = 1 << 20) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            block = handle.read(chunk)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def download(url: str, target: Path, expected_bytes: int | None = None) -> int:
    """Download to target, overwriting. Returns bytes written.

    Raises DownloadError if the response size does not match expected_bytes
    when provided.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".part")
    total = 0
    request = urllib.request.Request(url, headers={"User-Agent": "MoveFuel/0.1"})
    with urllib.request.urlopen(request, timeout=120) as response, tmp.open("wb") as out:
        while True:
            block = response.read(1 << 20)
            if not block:
                break
            out.write(block)
            total += len(block)
    if expected_bytes is not None and total != expected_bytes:
        tmp.unlink(missing_ok=True)
        raise DownloadError(
            f"size mismatch for {url}: expected {expected_bytes}, got {total}"
        )
    tmp.replace(target)
    return total


def update_manifest(path: Path, release: DownloadedRelease) -> None:
    """Append/refresh the manifest entry for a release."""
    records = []
    if path.exists():
        try:
            records = json.loads(path.read_text())
        except json.JSONDecodeError:
            records = []
    if not isinstance(records, list):
        records = []
    records = [r for r in records if not (r.get("release") == release.release and r.get("name") == release.name)]
    records.append(release.to_dict())
    records.sort(key=lambda r: (r.get("release", ""), r.get("name", "")))
    path.write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")


class DownloadError(RuntimeError):
    pass
