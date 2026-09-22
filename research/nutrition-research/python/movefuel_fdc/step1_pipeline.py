"""Orchestrator for MoveFuel Step 1 internet food knowledge base."""

from __future__ import annotations

import json
from pathlib import Path

from .density_importer import import_density_xlsx
from .download_manager import AcquisitionError, acquire_gsutil, acquire_https, acquired_tree_record, record_acquisition
from .importer import build_catalogue
from .knowledge_base import export_snapshot, initialize_knowledge_base, record_acquired_artifact, validate_step1
from .nutrition5k_importer import import_nutrition5k_metadata
from .search_index import rebuild_search_index
from .source_registry import artifact_by_id, artifacts_for_profile
from .usda_density import derive_usda_portion_densities


DEFAULT_RAW_ROOT = Path("nutrition-research/data/raw")
DEFAULT_DB = Path("nutrition-research/data/processed/movefuel_food_kb.sqlite")
DEFAULT_MANIFEST = Path("nutrition-research/data/raw/acquisition-manifest.json")
DEFAULT_SNAPSHOT = Path("nutrition-research/data/processed/movefuel_food_kb.snapshot.json")


def sync_sources(
    profile: str,
    *,
    raw_root: Path = DEFAULT_RAW_ROOT,
    db_path: Path = DEFAULT_DB,
    manifest_path: Path = DEFAULT_MANIFEST,
    force: bool = False,
    allow_large_usda: bool = False,
    acquire_nutrition5k: bool = True,
) -> dict:
    initialize_knowledge_base(db_path)
    acquired: list[dict] = []
    deferred: list[dict] = []
    for artifact in artifacts_for_profile(profile):
        if artifact.artifact_id == "usda_full_csv_2026_04_30" and not allow_large_usda:
            deferred.append({
                "artifact_id": artifact.artifact_id,
                "reason": "large_download_requires_explicit_allow_large_usda",
                "approx_bytes": artifact.approx_bytes,
            })
            continue
        if artifact.transport == "https":
            record = acquire_https(artifact, raw_root, manifest_path=manifest_path, force=force)
            record_dict = record.__dict__.copy()
            acquired.append(record_dict)
            record_acquired_artifact(db_path, record_dict)
        elif artifact.transport == "gsutil":
            if not acquire_nutrition5k:
                deferred.append({"artifact_id": artifact.artifact_id, "reason": "nutrition5k_acquisition_disabled"})
                continue
            path = acquire_gsutil(artifact, raw_root, force=force)
            record = acquired_tree_record(artifact, path)
            record_acquisition(manifest_path, record)
            record_dict = record.__dict__.copy()
            record_dict["transport"] = "gsutil"
            acquired.append(record_dict)
            record_acquired_artifact(db_path, record.__dict__)
        else:
            deferred.append({"artifact_id": artifact.artifact_id, "reason": f"unsupported_transport:{artifact.transport}"})
    return {"profile": profile, "acquired": acquired, "deferred": deferred}


def build_step1(
    *,
    db_path: Path = DEFAULT_DB,
    usda_zip: Path | None = None,
    fao_density_xlsx: Path | None = None,
    nutrition5k_root: Path | None = None,
    snapshot_path: Path = DEFAULT_SNAPSHOT,
) -> dict:
    initialize_knowledge_base(db_path)
    stages: dict[str, object] = {}
    if usda_zip is not None:
        summary = build_catalogue(Path(usda_zip), db_path, "2026-04-30")
        stages["usda"] = {"tables": summary.tables, "rejected": summary.rejected}
        stages["usda_search_index_rows"] = rebuild_search_index(db_path)
        # Prefer FDC's CC0 household portion gram-weights for production-safe
        # density evidence. FAO remains a rights-gated reference/validator.
        stages["usda_derived_density"] = derive_usda_portion_densities(db_path, release="2026-04-30")
    if fao_density_xlsx is not None:
        stages["fao_density"] = import_density_xlsx(Path(fao_density_xlsx), db_path).__dict__
    if nutrition5k_root is not None:
        stages["nutrition5k"] = import_nutrition5k_metadata(Path(nutrition5k_root), db_path).__dict__
    snapshot = export_snapshot(db_path, snapshot_path)
    validation = validate_step1(db_path)
    return {
        "stages": stages,
        "validation": validation,
        "snapshot": str(snapshot_path),
        "snapshot_density_records": len(snapshot["density_records"]),
    }
