"""MoveFuel FDC command line interface."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .importer import build_catalogue
from .release_manifest import (
    DownloadError,
    DownloadedRelease,
    download,
    full_bundle_artifact,
    sha256_of_file,
    update_manifest,
)
from .search_index import rebuild_search_index, search
from .validator import validate_catalogue
from .source_registry import source_manifest, artifact_by_id
from .download_manager import AcquisitionError, acquire_https, acquire_gsutil
from .knowledge_base import initialize_knowledge_base, validate_step1, export_snapshot, search_density, record_acquired_artifact
from .density_importer import import_density_xlsx
from .nutrition5k_importer import import_nutrition5k_metadata
from .step1_pipeline import build_step1, sync_sources, DEFAULT_RAW_ROOT, DEFAULT_DB as STEP1_DEFAULT_DB, DEFAULT_MANIFEST as STEP1_DEFAULT_MANIFEST, DEFAULT_SNAPSHOT
from .portion_benchmark import evaluate_file
from .calorie_validation import evaluate_calorie_file
from .nutrition5k_ground_truth import build_ground_truth
from .nutrition5k_blind_set import build_official_test_blind_set
from .regional_ground_truth import build_regional_ground_truth
from .usda_density import derive_usda_portion_densities
from .vision_quality import assessment_json
from .all_data_audit import audit_all, audit_source_ledger
from .blind_acceptance import evaluate_blind_predictions

DEFAULT_RAW = Path("data/raw/usda")
DEFAULT_DB = Path("data/processed/fdc.sqlite")
DEFAULT_MANIFEST = DEFAULT_RAW / "manifest.json"


def cmd_manifest(args: argparse.Namespace) -> int:
    artifact = full_bundle_artifact(args.release)
    print(json.dumps(artifact.__dict__, indent=2, sort_keys=True))
    return 0


def cmd_download(args: argparse.Namespace) -> int:
    artifact = full_bundle_artifact(args.release)
    raw = args.raw_dir
    target = raw / artifact.name
    if target.exists() and not args.force:
        print(f"exists: {target} (use --force to re-download)")
        return 0
    print(f"downloading {artifact.url} -> {target}")
    total = download(artifact.url, target, artifact.expected_bytes)
    sha256 = sha256_of_file(target)
    record = DownloadedRelease(
        release=artifact.release,
        name=artifact.name,
        url=artifact.url,
        file_size_bytes=total,
        sha256=sha256,
        downloaded_at_epoch=__import__("time").time(),
        source_ref=artifact.url,
    )
    update_manifest(args.raw_dir / "manifest.json", record)
    (raw / "SHA256SUMS.txt").write_text(f"{sha256}  {artifact.name}\n")
    print(f"downloaded {total} bytes sha256={sha256}")
    return 0


def cmd_import(args: argparse.Namespace) -> int:
    artifact = full_bundle_artifact(args.release)
    zip_path = args.raw_dir / artifact.name
    if not zip_path.exists():
        print(f"missing bundle: {zip_path}. Run download first.", file=sys.stderr)
        return 1
    summary = build_catalogue(zip_path, args.db, artifact.release)
    indexed = rebuild_search_index(args.db)
    print(json.dumps({
        "release": summary.release,
        "tables": summary.tables,
        "rejected": summary.rejected,
        "indexed_rows": indexed,
    }, indent=2, sort_keys=True))
    return 0


def cmd_reindex(args: argparse.Namespace) -> int:
    indexed = rebuild_search_index(args.db)
    print(json.dumps({"indexed_rows": indexed}, indent=2, sort_keys=True))
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    report = validate_catalogue(args.db)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


def cmd_search(args: argparse.Namespace) -> int:
    rows = search(args.db, args.query, args.limit)
    print(json.dumps(rows, indent=2, sort_keys=True))
    return 0



def cmd_sources(args: argparse.Namespace) -> int:
    print(json.dumps(source_manifest(), indent=2, sort_keys=True))
    return 0


def cmd_source_download(args: argparse.Namespace) -> int:
    artifact = artifact_by_id(args.artifact_id)
    initialize_knowledge_base(args.db)
    if artifact.transport == "https":
        record = acquire_https(artifact, args.raw_root, manifest_path=args.manifest, force=args.force, max_bytes=args.max_bytes)
        record_acquired_artifact(args.db, record.__dict__)
        print(json.dumps(record.__dict__, indent=2, sort_keys=True))
        return 0
    if artifact.transport == "gsutil":
        path = acquire_gsutil(artifact, args.raw_root, force=args.force)
        print(json.dumps({"artifact_id": artifact.artifact_id, "local_path": str(path)}, indent=2, sort_keys=True))
        return 0
    raise AcquisitionError(f"unsupported transport: {artifact.transport}")


def cmd_step1_sync(args: argparse.Namespace) -> int:
    result = sync_sources(
        args.profile,
        raw_root=args.raw_root,
        db_path=args.db,
        manifest_path=args.manifest,
        force=args.force,
        allow_large_usda=args.allow_large_usda,
        acquire_nutrition5k=not args.skip_nutrition5k,
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def cmd_density_import(args: argparse.Namespace) -> int:
    initialize_knowledge_base(args.db)
    result = import_density_xlsx(args.xlsx, args.db)
    print(json.dumps(result.__dict__, indent=2, sort_keys=True))
    return 0


def cmd_nutrition5k_import(args: argparse.Namespace) -> int:
    initialize_knowledge_base(args.db)
    result = import_nutrition5k_metadata(args.root, args.db)
    print(json.dumps(result.__dict__, indent=2, sort_keys=True))
    return 0


def cmd_step1_build(args: argparse.Namespace) -> int:
    result = build_step1(
        db_path=args.db,
        usda_zip=args.usda_zip,
        fao_density_xlsx=args.density_xlsx,
        nutrition5k_root=args.nutrition5k_root,
        snapshot_path=args.snapshot,
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def cmd_step1_validate(args: argparse.Namespace) -> int:
    print(json.dumps(validate_step1(args.db), indent=2, sort_keys=True))
    return 0


def cmd_step1_snapshot(args: argparse.Namespace) -> int:
    payload = export_snapshot(args.db, args.output)
    print(json.dumps({"output": str(args.output), "density_records": len(payload["density_records"]), "inventory": payload["inventory"]}, indent=2, sort_keys=True))
    return 0


def cmd_density_search(args: argparse.Namespace) -> int:
    print(json.dumps(search_density(args.db, args.query, args.preparation, args.limit), indent=2, sort_keys=True))
    return 0

def cmd_image_quality(args: argparse.Namespace) -> int:
    print(json.dumps(assessment_json(args.image), indent=2, sort_keys=True))
    return 0


def cmd_portion_benchmark(args: argparse.Namespace) -> int:
    payload = evaluate_file(
        args.csv,
        output_json=args.output,
        profiles_json=args.profiles,
        minimum_samples=args.minimum_samples,
        minimum_interval_coverage=args.minimum_interval_coverage,
        maximum_gram_mape=args.maximum_gram_mape,
    )
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0




def cmd_algorithm_v4_calorie(args: argparse.Namespace) -> int:
    payload = evaluate_calorie_file(
        args.csv,
        output_json=args.output,
        minimum_samples=args.minimum_samples,
        minimum_central_within_15_rate=args.minimum_central_within_15_rate,
        minimum_interval_coverage=args.minimum_interval_coverage,
        maximum_mean_relative_interval_width=args.maximum_mean_relative_interval_width,
    )
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def cmd_blind_v6_acceptance(args: argparse.Namespace) -> int:
    payload = evaluate_blind_predictions(
        args.predictions, args.truth, output_json=args.output,
        minimum_samples=args.minimum_samples,
        minimum_prediction_coverage=args.minimum_prediction_coverage,
        minimum_mass_coverage=args.minimum_mass_interval_coverage,
        maximum_mass_mape=args.maximum_mass_mape,
        minimum_calorie_within15=args.minimum_calorie_within_15_rate,
        minimum_calorie_coverage=args.minimum_calorie_interval_coverage,
        max_calorie_interval_width=args.maximum_calorie_mean_relative_interval_width,
        minimum_protein_within15=args.minimum_protein_within_15_rate,
    )
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if payload["acceptance_gate"]["passed"] else 2


def cmd_nutrition5k_blind_set(args: argparse.Namespace) -> int:
    payload = build_official_test_blind_set(
        args.root, args.truth, args.inference_manifest, args.prediction_template, limit=args.limit
    )
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def cmd_nutrition5k_ground_truth(args: argparse.Namespace) -> int:
    payload = build_ground_truth(args.corpus_root, args.output, args.prediction_template, args.inference_manifest)
    print(json.dumps({
        "sample_count": payload["sample_count"],
        "output": str(args.output),
        "prediction_template": str(args.prediction_template),
        "inference_manifest": str(args.inference_manifest) if args.inference_manifest else None,
    }, indent=2, sort_keys=True))
    return 0

def cmd_comprehensive_audit(args: argparse.Namespace) -> int:
    payload = audit_all(
        args.db,
        nutrition5k_root=args.nutrition5k_root,
        ledger_path=args.ledger,
    )
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if payload["status"] in {"PASS", "PARTIAL_OR_BLOCKED"} else 1


def cmd_source_ledger_validate(args: argparse.Namespace) -> int:
    payload = audit_source_ledger(args.ledger)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if payload["status"] == "PASS" else 1



def cmd_usda_density(args: argparse.Namespace) -> int:
    payload = derive_usda_portion_densities(args.db, release=args.release)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def cmd_regional_ground_truth(args: argparse.Namespace) -> int:
    payload = build_regional_ground_truth(args.input, args.output, args.prediction_template)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="movefuel-fdc", description="USDA FoodData Central toolkit")
    parser.add_argument("--release", default="2026-04-30", help="FDC release date tag")
    sub = parser.add_subparsers(dest="command", required=True)

    p_manifest = sub.add_parser("manifest", help="show the bulk bundle artifact for a release")
    p_manifest.set_defaults(func=cmd_manifest)

    p_dl = sub.add_parser("download", help="download the bulk bundle")
    p_dl.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW)
    p_dl.add_argument("--force", action="store_true")
    p_dl.set_defaults(func=cmd_download)

    p_import = sub.add_parser("import", help="import the bundle into the catalogue")
    p_import.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW)
    p_import.add_argument("--db", type=Path, default=DEFAULT_DB)
    p_import.set_defaults(func=cmd_import)

    p_reindex = sub.add_parser("reindex", help="rebuild the FTS search index")
    p_reindex.add_argument("--db", type=Path, default=DEFAULT_DB)
    p_reindex.set_defaults(func=cmd_reindex)

    p_val = sub.add_parser("validate", help="validate the catalogue")
    p_val.add_argument("--db", type=Path, default=DEFAULT_DB)
    p_val.set_defaults(func=cmd_validate)

    p_search = sub.add_parser("search", help="search the catalogue")
    p_search.add_argument("query")
    p_search.add_argument("--db", type=Path, default=DEFAULT_DB)
    p_search.add_argument("--limit", type=int, default=20)
    p_search.set_defaults(func=cmd_search)

    p_sources = sub.add_parser("sources", help="print Step-1 internet source registry")
    p_sources.set_defaults(func=cmd_sources)

    p_source_dl = sub.add_parser("source-download", help="download one registered Step-1 source artifact")
    p_source_dl.add_argument("artifact_id")
    p_source_dl.add_argument("--raw-root", type=Path, default=DEFAULT_RAW_ROOT)
    p_source_dl.add_argument("--manifest", type=Path, default=STEP1_DEFAULT_MANIFEST)
    p_source_dl.add_argument("--db", type=Path, default=STEP1_DEFAULT_DB)
    p_source_dl.add_argument("--max-bytes", type=int, default=None)
    p_source_dl.add_argument("--force", action="store_true")
    p_source_dl.set_defaults(func=cmd_source_download)

    p_sync = sub.add_parser("step1-sync", help="acquire the registered internet sources for Step 1")
    p_sync.add_argument("--profile", choices=["step1", "lightweight", "branded"], default="step1")
    p_sync.add_argument("--raw-root", type=Path, default=DEFAULT_RAW_ROOT)
    p_sync.add_argument("--manifest", type=Path, default=STEP1_DEFAULT_MANIFEST)
    p_sync.add_argument("--db", type=Path, default=STEP1_DEFAULT_DB)
    p_sync.add_argument("--allow-large-usda", action="store_true", help="allow the ~460 MB USDA full CSV bundle")
    p_sync.add_argument("--skip-nutrition5k", action="store_true")
    p_sync.add_argument("--force", action="store_true")
    p_sync.set_defaults(func=cmd_step1_sync)

    p_density = sub.add_parser("density-import", help="import FAO/INFOODS density XLSX into the Step-1 knowledge base")
    p_density.add_argument("xlsx", type=Path)
    p_density.add_argument("--db", type=Path, default=STEP1_DEFAULT_DB)
    p_density.set_defaults(func=cmd_density_import)

    p_n5k = sub.add_parser("nutrition5k-import", help="import Nutrition5k metadata and splits")
    p_n5k.add_argument("root", type=Path)
    p_n5k.add_argument("--db", type=Path, default=STEP1_DEFAULT_DB)
    p_n5k.set_defaults(func=cmd_nutrition5k_import)

    p_build = sub.add_parser("step1-build", help="build the multi-source Step-1 food knowledge base from acquired artifacts")
    p_build.add_argument("--db", type=Path, default=STEP1_DEFAULT_DB)
    p_build.add_argument("--usda-zip", type=Path, default=None)
    p_build.add_argument("--density-xlsx", type=Path, default=None)
    p_build.add_argument("--nutrition5k-root", type=Path, default=None)
    p_build.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    p_build.set_defaults(func=cmd_step1_build)

    p_step1_val = sub.add_parser("step1-validate", help="validate Step-1 acquisition/import completeness")
    p_step1_val.add_argument("--db", type=Path, default=STEP1_DEFAULT_DB)
    p_step1_val.set_defaults(func=cmd_step1_validate)

    p_snap = sub.add_parser("step1-snapshot", help="export compact algorithm-safe source/density snapshot")
    p_snap.add_argument("--db", type=Path, default=STEP1_DEFAULT_DB)
    p_snap.add_argument("--output", type=Path, default=DEFAULT_SNAPSHOT)
    p_snap.set_defaults(func=cmd_step1_snapshot)

    p_dsearch = sub.add_parser("density-search", help="search imported density records")
    p_dsearch.add_argument("query")
    p_dsearch.add_argument("--preparation", default=None)
    p_dsearch.add_argument("--limit", type=int, default=10)
    p_dsearch.add_argument("--db", type=Path, default=STEP1_DEFAULT_DB)
    p_dsearch.set_defaults(func=cmd_density_search)

    p_portion = sub.add_parser("portion-benchmark", help="evaluate weighed ground truth and fit empirical portion calibration profiles")
    p_portion.add_argument("csv", type=Path)
    p_portion.add_argument("--output", type=Path, default=None)
    p_portion.add_argument("--profiles", type=Path, default=None)
    p_portion.add_argument("--minimum-samples", type=int, default=100)
    p_portion.add_argument("--minimum-interval-coverage", type=float, default=0.85)
    p_portion.add_argument("--maximum-gram-mape", type=float, default=0.35)
    p_portion.set_defaults(func=cmd_portion_benchmark)


    p_v4 = sub.add_parser("algorithm-v4-calorie", help="validate calorie central estimates and displayed intervals against ground truth")
    p_v4.add_argument("csv", type=Path)
    p_v4.add_argument("--output", type=Path, default=None)
    p_v4.add_argument("--minimum-samples", type=int, default=100)
    p_v4.add_argument("--minimum-central-within-15-rate", type=float, default=0.80)
    p_v4.add_argument("--minimum-interval-coverage", type=float, default=0.90)
    p_v4.add_argument("--maximum-mean-relative-interval-width", type=float, default=0.60)
    p_v4.set_defaults(func=cmd_algorithm_v4_calorie)

    p_usda_density = sub.add_parser("usda-derived-density", help="derive CC0 FDC g/mL evidence from volumetric household portion gram weights")
    p_usda_density.add_argument("--db", type=Path, required=True)
    p_usda_density.add_argument("--release", default=None)
    p_usda_density.set_defaults(func=cmd_usda_density)

    p_regional_gt = sub.add_parser("regional-ground-truth", help="seal regional weighed truth and generate a prediction-only blind template")
    p_regional_gt.add_argument("--input", type=Path, required=True)
    p_regional_gt.add_argument("--output", type=Path, required=True)
    p_regional_gt.add_argument("--prediction-template", type=Path, required=True)
    p_regional_gt.set_defaults(func=cmd_regional_ground_truth)

    p_blind = sub.add_parser("blind-v6-acceptance", help="leak-resistant blind mass/calorie/protein/macro acceptance against sealed ground truth")
    p_blind.add_argument("--predictions", type=Path, required=True)
    p_blind.add_argument("--truth", type=Path, required=True)
    p_blind.add_argument("--output", type=Path, default=None)
    p_blind.add_argument("--minimum-samples", type=int, default=100)
    p_blind.add_argument("--minimum-prediction-coverage", type=float, default=0.80, help="minimum fraction of sealed truth samples that must yield a prediction; prevents cherry-picking only easy meals")
    p_blind.add_argument("--minimum-mass-interval-coverage", type=float, default=0.85)
    p_blind.add_argument("--maximum-mass-mape", type=float, default=0.35)
    p_blind.add_argument("--minimum-calorie-within-15-rate", type=float, default=0.80)
    p_blind.add_argument("--minimum-calorie-interval-coverage", type=float, default=0.90)
    p_blind.add_argument("--maximum-calorie-mean-relative-interval-width", type=float, default=0.60)
    p_blind.add_argument("--minimum-protein-within-15-rate", type=float, default=0.70)
    p_blind.set_defaults(func=cmd_blind_v6_acceptance)

    p_n5k_blind = sub.add_parser("nutrition5k-blind-set", help="build blind truth/inference manifests from the official Nutrition5k test split and locally present overhead RGB-D")
    p_n5k_blind.add_argument("--root", type=Path, required=True)
    p_n5k_blind.add_argument("--truth", type=Path, required=True)
    p_n5k_blind.add_argument("--inference-manifest", type=Path, required=True)
    p_n5k_blind.add_argument("--prediction-template", type=Path, required=True)
    p_n5k_blind.add_argument("--limit", type=int, default=None)
    p_n5k_blind.set_defaults(func=cmd_nutrition5k_blind_set)

    p_gt = sub.add_parser("nutrition5k-ground-truth", help="build the licensed measured Nutrition5k calorie validation set and prediction template")
    p_gt.add_argument("--corpus-root", type=Path, default=Path("../benchmark/internet-corpus"))
    p_gt.add_argument("--output", type=Path, default=Path("../benchmark/v4/nutrition5k-ground-truth-15pct.json"))
    p_gt.add_argument("--prediction-template", type=Path, default=Path("../benchmark/v4/calorie-predictions.template.csv"))
    p_gt.add_argument("--inference-manifest", type=Path, default=None, help="write a prediction-time manifest with no ground-truth fields")
    p_gt.set_defaults(func=cmd_nutrition5k_ground_truth)

    p_audit = sub.add_parser("comprehensive-audit", help="audit all imported USDA, density, Nutrition5k and source-ledger data")
    p_audit.add_argument("--db", type=Path, default=STEP1_DEFAULT_DB)
    p_audit.add_argument("--nutrition5k-root", type=Path, default=None)
    p_audit.add_argument("--ledger", type=Path, default=Path("../../algorithm-validation/verified-source-ledger-2026-08-10.json"))
    p_audit.add_argument("--output", type=Path, default=None)
    p_audit.set_defaults(func=cmd_comprehensive_audit)

    p_ledger = sub.add_parser("source-ledger-validate", help="validate the frozen official-source policy ledger")
    p_ledger.add_argument("--ledger", type=Path, default=Path("../../algorithm-validation/verified-source-ledger-2026-08-10.json"))
    p_ledger.set_defaults(func=cmd_source_ledger_validate)

    p_quality = sub.add_parser("image-quality", help="run the local OpenCV blur/exposure/glare quality gate")
    p_quality.add_argument("image", type=Path)
    p_quality.set_defaults(func=cmd_image_quality)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except (DownloadError, AcquisitionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
