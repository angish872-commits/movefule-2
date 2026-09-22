#!/usr/bin/env python3
"""MoveFuel Algorithm Validation Suite V1.

This orchestrator is intentionally conservative:
- It never prints secret values.
- It never performs large downloads unless explicitly enabled.
- It records SKIPPED/BLOCKED states rather than fabricating empirical results.
- It keeps reference/science parity separate from end-to-end photo accuracy.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
VALIDATION_ROOT = ROOT / "algorithm-validation"
DEFAULT_RESULTS_ROOT = VALIDATION_ROOT / "results"
PYTHON_ROOT = ROOT / "nutrition-research" / "python"
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))
CORPUS_ROOT = ROOT / "nutrition-research" / "benchmark" / "internet-corpus"
BENCHMARK_V4 = ROOT / "nutrition-research" / "benchmark" / "v4"
REPORTS_ROOT = ROOT / "nutrition-research" / "reports"
BACKEND_ROOT = REPO_ROOT / "services" / "backend"

SECRET_NAMES = (
    "GEMINI_API_KEY",
    "USDA_FDC_API_KEY",
    "FDC_API_KEY",
    "APPWRITE_API_KEY",
    "APPWRITE_KEY",
)

PROFILES = {
    "pilot": {
        "min_free_gb": 5,
        "gemini_samples": 3,
        "allow_data_sync": False,
        "large": False,
    },
    "standard": {
        "min_free_gb": 25,
        "gemini_samples": 20,
        "allow_data_sync": True,
        "large": False,
    },
    "full": {
        "min_free_gb": 250,
        "gemini_samples": 100,
        "allow_data_sync": True,
        "large": True,
    },
}

NETWORK_ENDPOINTS = {
    "usda_download": "https://fdc.nal.usda.gov/",
    "usda_api": "https://api.nal.usda.gov/",
    "gemini": "https://generativelanguage.googleapis.com/",
    "google_storage": "https://storage.googleapis.com/",
    "github": "https://github.com/",
    "fao": "https://www.fao.org/",
}


@dataclass
class PhaseResult:
    phase: int
    name: str
    status: str
    started_at: str
    finished_at: str
    details: dict[str, Any]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def redact(text: str) -> str:
    for name in SECRET_NAMES:
        value = os.getenv(name, "")
        if value and len(value) >= 6:
            text = text.replace(value, "[REDACTED_SECRET]")
    text = re.sub(
        r"(?im)^((?:GEMINI|USDA_FDC|FDC|APPWRITE)[A-Z0-9_]*(?:KEY|TOKEN|SECRET)\s*=\s*).+$",
        r"\1[REDACTED_SECRET]",
        text,
    )
    return text


def command_version(command: str, args: list[str]) -> dict[str, Any]:
    exe = shutil.which(command)
    if not exe:
        return {"present": False, "path": None, "version": None}
    try:
        proc = subprocess.run([exe, *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=15)
        first = (proc.stdout or "").strip().splitlines()
        return {"present": proc.returncode == 0, "path": exe, "version": first[0] if first else None}
    except Exception as exc:  # noqa: BLE001 - diagnostic boundary
        return {"present": True, "path": exe, "version": None, "error": type(exc).__name__}


def run_command(
    run_dir: Path,
    label: str,
    command: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    timeout: int = 1800,
    allow_failure: bool = False,
) -> dict[str, Any]:
    logs = run_dir / "logs"
    logs.mkdir(parents=True, exist_ok=True)
    safe_label = re.sub(r"[^a-zA-Z0-9_.-]+", "-", label).strip("-")
    log_path = logs / f"{safe_label}.log"
    started = time.monotonic()
    proc = subprocess.run(
        command,
        cwd=str(cwd or ROOT),
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
    )
    elapsed = round(time.monotonic() - started, 3)
    output = redact(proc.stdout or "")
    log_path.write_text(output, encoding="utf-8")
    payload = {
        "command": [command[0], *["[REDACTED_ARG]" if any(v and arg == v for v in [os.getenv(n, "") for n in SECRET_NAMES]) else arg for arg in command[1:]]],
        "cwd": str(cwd or ROOT),
        "returncode": proc.returncode,
        "elapsed_seconds": elapsed,
        "log": str(log_path.relative_to(ROOT)),
    }
    if proc.returncode != 0 and not allow_failure:
        tail = "\n".join(output.splitlines()[-20:])
        raise RuntimeError(f"{label} failed ({proc.returncode})\n{tail}")
    return payload


def parse_version_tuple(value: str | None) -> tuple[int, ...]:
    if not value:
        return ()
    nums = re.findall(r"\d+", value)
    return tuple(int(v) for v in nums[:3])


def dns_https_probe(url: str, timeout: float = 3.0) -> dict[str, Any]:
    """Strictly bounded DNS preflight.

    Live HTTPS is verified by the actual USDA/Gemini/data commands later. DNS
    resolution is isolated in a child process so a broken resolver cannot hang
    the complete validation run.
    """
    host = re.sub(r"^https?://", "", url).split("/", 1)[0]
    result: dict[str, Any] = {"url": url, "host": host, "dns": False, "https_reachable": None}
    code = (
        "import socket,sys; "
        "a=socket.getaddrinfo(sys.argv[1],443,type=socket.SOCK_STREAM); "
        "print(len(a))"
    )
    try:
        proc = subprocess.run(
            [sys.executable, "-c", code, host],
            text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout,
        )
        result["dns"] = proc.returncode == 0 and (proc.stdout or "").strip().isdigit()
        if result["dns"]:
            result["resolved_count"] = int((proc.stdout or "0").strip())
        elif proc.stderr:
            result["dns_error"] = proc.stderr.strip().splitlines()[-1][:300]
    except subprocess.TimeoutExpired:
        result["dns_error"] = "dns_probe_timeout"
    return result


def machine_report(profile: str) -> dict[str, Any]:
    usage = shutil.disk_usage(ROOT)
    free_gb = usage.free / (1024 ** 3)
    tools = {
        "python": command_version("python3", ["--version"]),
        "node": command_version("node", ["--version"]),
        "npm": command_version("npm", ["--version"]),
        "git": command_version("git", ["--version"]),
        "gsutil": command_version("gsutil", ["version", "-l"]),
    }
    credentials = {
        "gemini_api_key_present": bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "usda_api_key_present": bool((os.getenv("USDA_FDC_API_KEY") or os.getenv("FDC_API_KEY") or "").strip()),
        "private_values_logged": False,
    }
    model_repo = Path(os.getenv("MOVEFUEL_DEPTH_ANYTHING_REPO", "")) if os.getenv("MOVEFUEL_DEPTH_ANYTHING_REPO") else None
    model_ckpt = Path(os.getenv("MOVEFUEL_DEPTH_ANYTHING_CHECKPOINT", "")) if os.getenv("MOVEFUEL_DEPTH_ANYTHING_CHECKPOINT") else None
    model = {
        "depth_anything_repo": str(model_repo) if model_repo else None,
        "depth_anything_repo_present": bool(model_repo and model_repo.exists()),
        "depth_anything_checkpoint": str(model_ckpt) if model_ckpt else None,
        "depth_anything_checkpoint_present": bool(model_ckpt and model_ckpt.exists()),
        "depth_anything_checkpoint_sha256": sha256(model_ckpt) if model_ckpt and model_ckpt.is_file() else None,
    }
    # Optional torch accelerator report. Import torch in a bounded child process:
    # some CPU-only/container builds can take a very long time to initialize.
    accelerator: dict[str, Any] = {"torch_present": False, "cuda": False, "mps": False}
    if shutil.which("python3"):
        code = (
            "import json; "
            "import torch; "
            "print(json.dumps({\"torch_present\": True, \"torch_version\": str(torch.__version__), "
            "\"cuda\": bool(torch.cuda.is_available()), "
            "\"mps\": bool(getattr(torch.backends, \"mps\", None) and torch.backends.mps.is_available())}))"
        )
        try:
            proc = subprocess.run([sys.executable, "-c", code], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=12)
            if proc.returncode == 0:
                accelerator.update(json.loads(proc.stdout))
            elif proc.stderr:
                accelerator["probe_error"] = proc.stderr.strip().splitlines()[-1][:240]
        except subprocess.TimeoutExpired:
            accelerator["probe_error"] = "torch_probe_timeout"
        except Exception as exc:  # noqa: BLE001
            accelerator["probe_error"] = type(exc).__name__
    return {
        "generated_at": utc_now(),
        "profile": profile,
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "python_runtime": sys.version,
        "cpu_count": os.cpu_count(),
        "disk": {
            "root": str(ROOT),
            "total_gb": round(usage.total / (1024 ** 3), 2),
            "free_gb": round(free_gb, 2),
            "minimum_for_profile_gb": PROFILES[profile]["min_free_gb"],
            "meets_profile_minimum": free_gb >= PROFILES[profile]["min_free_gb"],
        },
        "tools": tools,
        "credentials": credentials,
        "accelerator": accelerator,
        "model_artifacts": model,
    }


def audit_local_corpus() -> dict[str, Any]:
    samples = sorted((CORPUS_ROOT / "samples").glob("*.json"))
    evidence: dict[str, int] = {}
    problems: list[dict[str, Any]] = []
    sha_checked = 0
    measured = 0
    for sample_path in samples:
        data = json.loads(sample_path.read_text(encoding="utf-8"))
        cls = str(data.get("evidence_class") or "UNKNOWN")
        evidence[cls] = evidence.get(cls, 0) + 1
        if cls == "MEASURED_DATASET":
            measured += 1
        rel = data.get("local_image_path")
        if not rel:
            problems.append({"sample": sample_path.name, "problem": "missing_local_image_path"})
            continue
        image = CORPUS_ROOT / rel
        if not image.exists():
            problems.append({"sample": sample_path.name, "problem": "image_missing", "path": str(image)})
            continue
        expected = str(data.get("sha256") or "")
        if expected:
            actual = sha256(image)
            sha_checked += 1
            if actual != expected:
                problems.append({"sample": sample_path.name, "problem": "sha256_mismatch", "expected": expected, "actual": actual})
    return {
        "sample_count": len(samples),
        "evidence_classes": evidence,
        "measured_ground_truth_count": measured,
        "sha256_checked": sha_checked,
        "problems": problems,
        "passed": len(samples) >= 30 and measured >= 10 and not problems,
    }


def run_local_quality(run_dir: Path) -> dict[str, Any]:
    from movefuel_fdc.vision_quality import assessment_json

    rows: list[dict[str, Any]] = []
    for sample_path in sorted((CORPUS_ROOT / "samples").glob("*.json")):
        sample = json.loads(sample_path.read_text(encoding="utf-8"))
        image = CORPUS_ROOT / sample["local_image_path"]
        try:
            out = assessment_json(image)
            rows.append({
                "sample_id": sample.get("stable_sample_id"),
                "evidence_class": sample.get("evidence_class"),
                "status": out.get("state") or out.get("status") or "UNKNOWN",
                "issues": out.get("issueCodes") or out.get("issue_codes") or [],
                "metrics": out.get("metrics") or {},
            })
        except Exception as exc:  # noqa: BLE001
            rows.append({"sample_id": sample.get("stable_sample_id"), "status": "ERROR", "error": redact(str(exc))[:500]})
    status_counts: dict[str, int] = {}
    for row in rows:
        status_counts[row["status"]] = status_counts.get(row["status"], 0) + 1
    report = {
        "sample_count": len(rows),
        "status_counts": status_counts,
        "rows": rows,
    }
    path = run_dir / "local-image-quality.json"
    path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return {"report": str(path.relative_to(ROOT)), "sample_count": len(rows), "status_counts": status_counts}


def find_acquired_paths() -> dict[str, Path | None]:
    raw = ROOT / "nutrition-research" / "data" / "raw"
    return {
        "usda": next(iter(sorted(raw.rglob("FoodData_Central_csv_2026-04-30.zip"))), None),
        "density": next(iter(sorted(raw.rglob("*density*.xlsx"))), None),
        "nutrition5k": (raw / "nutrition5k") if (raw / "nutrition5k").exists() else None,
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def phase_result(phase: int, name: str, status: str, started: str, details: dict[str, Any]) -> PhaseResult:
    return PhaseResult(phase, name, status, started, utc_now(), details)


def main() -> int:
    parser = argparse.ArgumentParser(description="MoveFuel Algorithm Validation Suite V1")
    parser.add_argument("profile", choices=sorted(PROFILES), nargs="?", default="pilot")
    parser.add_argument("--run-id", default=os.getenv("MOVEFUEL_VALIDATION_RUN_ID"))
    parser.add_argument("--allow-downloads", action="store_true", default=os.getenv("MOVEFUEL_ALLOW_DOWNLOADS") == "1")
    parser.add_argument("--allow-large-usda", action="store_true", default=os.getenv("MOVEFUEL_ALLOW_LARGE_USDA") == "1")
    parser.add_argument("--allow-live-api", action="store_true", default=os.getenv("MOVEFUEL_ALLOW_LIVE_API") == "1")
    parser.add_argument("--skip-local-tests", action="store_true")
    args = parser.parse_args()

    run_id = args.run_id or datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = DEFAULT_RESULTS_ROOT / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    phases: list[PhaseResult] = []

    meta = {
        "suite": "MoveFuel Algorithm Validation Suite V1",
        "profile": args.profile,
        "run_id": run_id,
        "created_at": utc_now(),
        "permissions": {
            "downloads": args.allow_downloads,
            "large_usda": args.allow_large_usda,
            "live_api": args.allow_live_api,
        },
    }
    write_json(run_dir / "run-meta.json", meta)

    # Phase 1: local software integrity.
    started = utc_now()
    if args.skip_local_tests:
        if os.getenv("MOVEFUEL_LOCAL_TESTS_PREVALIDATED") == "1":
            phases.append(phase_result(1, "local_software_integrity", "PASS", started, {
                "reason": "prevalidated_by_validate_sh",
                "backend_log": os.getenv("MOVEFUEL_LOCAL_TESTS_BACKEND_LOG"),
                "python_log": os.getenv("MOVEFUEL_LOCAL_TESTS_PYTHON_LOG"),
            }))
        else:
            phases.append(phase_result(1, "local_software_integrity", "SKIPPED", started, {"reason": "--skip-local-tests"}))
    else:
        try:
            backend = run_command(run_dir, "backend-tests", ["npm", "test"], cwd=BACKEND_ROOT, timeout=1800)
            env = os.environ.copy(); env["PYTHONPATH"] = str(PYTHON_ROOT)
            python_tests = run_command(run_dir, "python-tests", [sys.executable, "-m", "pytest", "-q"], cwd=PYTHON_ROOT, env=env, timeout=1800)
            phases.append(phase_result(1, "local_software_integrity", "PASS", started, {"backend": backend, "python": python_tests}))
        except Exception as exc:  # noqa: BLE001
            phases.append(phase_result(1, "local_software_integrity", "FAIL", started, {"error": redact(str(exc))}))

    # Phase 2: target science/reference parity.
    started = utc_now()
    try:
        target_output = run_dir / "target-reference-validation.json"
        command = ["node", "--experimental-strip-types", "scripts/validate-target-reference.ts"]
        proc = subprocess.run(command, cwd=str(BACKEND_ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
        stdout = redact(proc.stdout or "")
        stderr = redact(proc.stderr or "")
        if proc.returncode != 0:
            raise RuntimeError(stderr or stdout or f"exit {proc.returncode}")
        payload = json.loads(stdout)
        write_json(target_output, payload)
        passed = bool(payload.get("passed")) and payload.get("parity", {}).get("failures") == 0 and payload.get("goalMatrix", {}).get("failures") == 0
        phases.append(phase_result(2, "personal_target_reference_validation", "PASS" if passed else "FAIL", started, {
            "report": str(target_output.relative_to(ROOT)),
            "equation_profiles": payload.get("parity", {}).get("cases"),
            "equation_failures": payload.get("parity", {}).get("failures"),
            "goal_matrix_cases": payload.get("goalMatrix", {}).get("cases"),
            "goal_matrix_failures": payload.get("goalMatrix", {}).get("failures"),
        }))
    except Exception as exc:  # noqa: BLE001
        phases.append(phase_result(2, "personal_target_reference_validation", "FAIL", started, {"error": redact(str(exc))}))

    # Phase 3: machine/network/model preflight.
    started = utc_now()
    progress_path = run_dir / "progress.log"
    def _progress(message: str) -> None:
        with progress_path.open("a", encoding="utf-8") as handle:
            handle.write(f"{utc_now()} {message}\n")
    _progress("phase3 machine_report start")
    report = machine_report(args.profile)
    _progress("phase3 machine_report complete")
    network = {}
    if os.getenv("MOVEFUEL_RUN_NETWORK_PREFLIGHT") == "1":
        for name, url in NETWORK_ENDPOINTS.items():
            _progress(f"phase3 network {name} start")
            network[name] = dns_https_probe(url)
            _progress(f"phase3 network {name} complete dns={network[name]['dns']}")
        _progress("phase3 network complete")
    else:
        network = {name: {"url": url, "host": re.sub(r"^https?://", "", url).split("/", 1)[0], "dns": None, "https_reachable": None, "status": "NOT_PROBED"} for name, url in NETWORK_ENDPOINTS.items()}
        _progress("phase3 network probes skipped; live commands are authoritative")
    report["network"] = network
    required_tools = report["tools"]["python"]["present"] and report["tools"]["node"]["present"] and report["tools"]["npm"]["present"] and report["tools"]["git"]["present"]
    report["preflight_passed"] = bool(required_tools and report["disk"]["meets_profile_minimum"])
    write_json(run_dir / "machine-preflight.json", report)
    phases.append(phase_result(3, "execution_environment_preflight", "PASS" if report["preflight_passed"] else "BLOCKED", started, {
        "report": str((run_dir / "machine-preflight.json").relative_to(ROOT)),
        "free_gb": report["disk"]["free_gb"],
        "network_dns": {k: v["dns"] for k, v in network.items()},
        "gemini_key_present": report["credentials"]["gemini_api_key_present"],
        "usda_key_present": report["credentials"]["usda_api_key_present"],
    }))

    # Phase 4: local benchmark corpus integrity + quality.
    started = utc_now()
    corpus = audit_local_corpus()
    write_json(run_dir / "corpus-audit.json", corpus)
    try:
        quality = run_local_quality(run_dir)
        status = "PASS" if corpus["passed"] and quality["sample_count"] >= 30 else "FAIL"
        phases.append(phase_result(4, "benchmark_corpus_and_quality_gate", status, started, {
            "corpus_report": str((run_dir / "corpus-audit.json").relative_to(ROOT)),
            "quality": quality,
            "measured_ground_truth_count": corpus["measured_ground_truth_count"],
        }))
    except Exception as exc:  # noqa: BLE001
        phases.append(phase_result(4, "benchmark_corpus_and_quality_gate", "FAIL", started, {"error": redact(str(exc)), "corpus": corpus}))

    # Phase 5: public data acquisition. Safe default is skip.
    started = utc_now()
    if not PROFILES[args.profile]["allow_data_sync"]:
        phases.append(phase_result(5, "public_data_acquisition", "READY", started, {"reason": "pilot_profile_uses_existing_bounded_corpus", "next": "run standard/full with MOVEFUEL_ALLOW_DOWNLOADS=1"}))
    elif not args.allow_downloads:
        phases.append(phase_result(5, "public_data_acquisition", "BLOCKED", started, {"reason": "download_permission_not_enabled", "required": "MOVEFUEL_ALLOW_DOWNLOADS=1"}))
    else:
        try:
            env = os.environ.copy(); env["PYTHONPATH"] = str(PYTHON_ROOT)
            cmd = [sys.executable, "-m", "movefuel_fdc.cli", "step1-sync", "--profile", "step1"]
            if args.allow_large_usda:
                cmd.append("--allow-large-usda")
            sync = run_command(run_dir, "step1-sync", cmd, cwd=ROOT, env=env, timeout=7200)
            phases.append(phase_result(5, "public_data_acquisition", "PASS", started, {"sync": sync}))
        except Exception as exc:  # noqa: BLE001
            phases.append(phase_result(5, "public_data_acquisition", "FAIL", started, {"error": redact(str(exc))}))

    # Phase 6: knowledge-base build/validation when artifacts exist.
    started = utc_now()
    paths = find_acquired_paths()
    if not any(paths.values()):
        phases.append(phase_result(6, "food_knowledge_base_population", "READY", started, {"reason": "acquired_artifacts_not_present_yet"}))
    else:
        try:
            env = os.environ.copy(); env["PYTHONPATH"] = str(PYTHON_ROOT)
            cmd = [sys.executable, "-m", "movefuel_fdc.cli", "step1-build"]
            if paths["usda"]:
                cmd += ["--usda-zip", str(paths["usda"])]
            if paths["density"]:
                cmd += ["--density-xlsx", str(paths["density"])]
            if paths["nutrition5k"]:
                cmd += ["--nutrition5k-root", str(paths["nutrition5k"])]
            build = run_command(run_dir, "step1-build", cmd, cwd=ROOT, env=env, timeout=7200)
            validate = run_command(run_dir, "step1-validate", [sys.executable, "-m", "movefuel_fdc.cli", "step1-validate"], cwd=ROOT, env=env, timeout=300, allow_failure=True)
            status = "PASS" if validate["returncode"] == 0 else "FAIL"
            phases.append(phase_result(6, "food_knowledge_base_population", status, started, {"build": build, "validation": validate, "artifacts": {k: str(v) if v else None for k, v in paths.items()}}))
        except Exception as exc:  # noqa: BLE001
            phases.append(phase_result(6, "food_knowledge_base_population", "FAIL", started, {"error": redact(str(exc))}))

    # Phase 7: live authoritative source probe.
    started = utc_now()
    if not args.allow_live_api:
        phases.append(phase_result(7, "live_usda_source_probe", "READY", started, {"reason": "live_api_permission_not_enabled", "required": "MOVEFUEL_ALLOW_LIVE_API=1"}))
    else:
        try:
            env = os.environ.copy(); env["PYTHONPATH"] = str(PYTHON_ROOT)
            output = run_dir / "usda-live-smoke.json"
            # Call module directly so the key stays in the environment, not argv.
            code = (
                "from pathlib import Path; from movefuel_fdc.usda_live_smoke import write_smoke; "
                f"write_smoke(Path({str(output)!r}))"
            )
            smoke = run_command(run_dir, "usda-live-smoke", [sys.executable, "-c", code], cwd=ROOT, env=env, timeout=180)
            phases.append(phase_result(7, "live_usda_source_probe", "PASS", started, {"command": smoke, "report": str(output.relative_to(ROOT)), "credential": "private_env_or_DEMO_KEY"}))
        except Exception as exc:  # noqa: BLE001
            phases.append(phase_result(7, "live_usda_source_probe", "FAIL", started, {"error": redact(str(exc))}))

    # Phase 8: live Gemini candidate-recognition smoke on held-out images.
    started = utc_now()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not args.allow_live_api:
        phases.append(phase_result(8, "live_gemini_candidate_recognition", "READY", started, {"reason": "live_api_permission_not_enabled", "required": "MOVEFUEL_ALLOW_LIVE_API=1"}))
    elif not gemini_key:
        phases.append(phase_result(8, "live_gemini_candidate_recognition", "BLOCKED", started, {"reason": "GEMINI_API_KEY_not_present_in_execution_environment"}))
    else:
        measured_samples = []
        for sample_path in sorted((CORPUS_ROOT / "samples").glob("*.json")):
            d = json.loads(sample_path.read_text(encoding="utf-8"))
            if d.get("evidence_class") == "MEASURED_DATASET":
                measured_samples.append(d)
        max_samples = min(PROFILES[args.profile]["gemini_samples"], len(measured_samples))
        outputs = []
        passed = 0
        for sample in measured_samples[:max_samples]:
            image = CORPUS_ROOT / sample["local_image_path"]
            label = f"gemini-{sample['stable_sample_id']}"
            try:
                result = run_command(run_dir, label, ["node", "--experimental-strip-types", "scripts/live-gemini-food-scene-smoke.ts", str(image)], cwd=BACKEND_ROOT, timeout=180, allow_failure=True)
                output_text = (ROOT / result["log"]).read_text(encoding="utf-8", errors="replace")
                try:
                    parsed = json.loads(output_text)
                except json.JSONDecodeError:
                    parsed = {"status": "UNPARSEABLE", "tail": "\n".join(output_text.splitlines()[-10:])}
                outputs.append({"sample_id": sample["stable_sample_id"], "result": parsed, "log": result["log"]})
                if result["returncode"] == 0 and parsed.get("status") == "COMPLETED":
                    passed += 1
            except Exception as exc:  # noqa: BLE001
                outputs.append({"sample_id": sample["stable_sample_id"], "result": {"status": "FAILED", "error": redact(str(exc))}})
        report_path = run_dir / "gemini-candidate-smoke.json"
        write_json(report_path, {"sample_count": max_samples, "completed": passed, "samples": outputs})
        status = "PASS" if max_samples > 0 and passed == max_samples else "FAIL"
        phases.append(phase_result(8, "live_gemini_candidate_recognition", status, started, {"report": str(report_path.relative_to(ROOT)), "attempted": max_samples, "completed": passed}))

    # Phase 9: build blind benchmark manifests/templates. Does not insert fake predictions.
    started = utc_now()
    try:
        env = os.environ.copy(); env["PYTHONPATH"] = str(PYTHON_ROOT)
        gt = run_dir / "nutrition5k-ground-truth.json"
        pred = run_dir / "calorie-predictions.csv"
        command = [sys.executable, "-m", "movefuel_fdc.cli", "nutrition5k-ground-truth", "--corpus-root", str(CORPUS_ROOT), "--output", str(gt), "--prediction-template", str(pred)]
        result = run_command(run_dir, "ground-truth-build", command, cwd=ROOT, env=env, timeout=120)
        # Also create a mass template from the same ground truth.
        payload = json.loads(gt.read_text(encoding="utf-8"))
        mass = run_dir / "mass-predictions.csv"
        with mass.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["sample_id", "category", "predicted_min_g", "predicted_central_g", "predicted_max_g", "actual_g", "predicted_calories", "actual_calories"])
            writer.writeheader()
            for row in payload.get("samples", []):
                writer.writerow({
                    "sample_id": row["sample_id"],
                    "category": row.get("category", "mixed_cafeteria_plate"),
                    "predicted_min_g": "",
                    "predicted_central_g": "",
                    "predicted_max_g": "",
                    "actual_g": row["actual_mass_g"],
                    "predicted_calories": "",
                    "actual_calories": row["actual_calories_kcal"],
                })
        phases.append(phase_result(9, "blind_held_out_benchmark_scaffold", "PASS", started, {
            "ground_truth": str(gt.relative_to(ROOT)),
            "calorie_prediction_template": str(pred.relative_to(ROOT)),
            "mass_prediction_template": str(mass.relative_to(ROOT)),
            "sample_count": payload.get("sample_count"),
            "warning": "prediction columns are intentionally blank until generated by the algorithm without ground-truth leakage",
            "command": result,
        }))
    except Exception as exc:  # noqa: BLE001
        phases.append(phase_result(9, "blind_held_out_benchmark_scaffold", "FAIL", started, {"error": redact(str(exc))}))

    # Phase 10: score empirical predictions if user/runtime has filled them.
    started = utc_now()
    empirical_dir = VALIDATION_ROOT / "empirical-input"
    calorie_csv = empirical_dir / "calorie-predictions.csv"
    mass_csv = empirical_dir / "mass-predictions.csv"
    score_details: dict[str, Any] = {}
    score_status = "READY"
    try:
        env = os.environ.copy(); env["PYTHONPATH"] = str(PYTHON_ROOT)
        if calorie_csv.exists() and mass_csv.exists():
            cal_out = run_dir / "calorie-acceptance.json"
            mass_out = run_dir / "mass-acceptance.json"
            cal = run_command(run_dir, "score-calories", [sys.executable, "-m", "movefuel_fdc.cli", "algorithm-v4-calorie", str(calorie_csv), "--output", str(cal_out)], cwd=ROOT, env=env, timeout=180, allow_failure=True)
            mass_cmd = [sys.executable, "-m", "movefuel_fdc.cli", "portion-benchmark", str(mass_csv), "--output", str(mass_out), "--profiles", str(run_dir / "portion-calibration-profiles.json")]
            mass_r = run_command(run_dir, "score-mass", mass_cmd, cwd=ROOT, env=env, timeout=180, allow_failure=True)
            cal_payload = json.loads(cal_out.read_text(encoding="utf-8")) if cal_out.exists() else {}
            mass_payload = json.loads(mass_out.read_text(encoding="utf-8")) if mass_out.exists() else {}
            passed = bool(cal_payload.get("acceptance_gate", {}).get("passed")) and bool(mass_payload.get("acceptance_gate", {}).get("passed"))
            score_status = "PASS" if passed else "FAIL"
            score_details = {
                "calorie_report": str(cal_out.relative_to(ROOT)) if cal_out.exists() else None,
                "mass_report": str(mass_out.relative_to(ROOT)) if mass_out.exists() else None,
                "calorie_command": cal,
                "mass_command": mass_r,
                "both_acceptance_gates_passed": passed,
            }
        else:
            score_details = {
                "reason": "independent_end_to_end_predictions_not_supplied_yet",
                "expected_directory": str(empirical_dir.relative_to(ROOT)),
                "required_files": ["calorie-predictions.csv", "mass-predictions.csv"],
                "critical_rule": "do not fill predictions from ground-truth values; they must come from a blind algorithm run",
            }
    except Exception as exc:  # noqa: BLE001
        score_status = "FAIL"
        score_details = {"error": redact(str(exc))}
    phases.append(phase_result(10, "empirical_mass_calorie_acceptance", score_status, started, score_details))

    overall = {
        "suite": meta["suite"],
        "profile": args.profile,
        "run_id": run_id,
        "finished_at": utc_now(),
        "phases": [asdict(p) for p in phases],
    }
    hard_fail = any(p.status == "FAIL" for p in phases[:4])
    empirical_pass = any(p.phase == 10 and p.status == "PASS" for p in phases)
    overall["state"] = "EMPIRICALLY_VALIDATED" if empirical_pass and not hard_fail else "READY_FOR_EMPIRICAL_EXECUTION" if not hard_fail else "LOCAL_VALIDATION_FAILED"
    overall["truth_boundary"] = (
        "The suite is prepared and local/reference checks can pass without proving photo-calorie accuracy. "
        "Only Phase 10 PASS on blind held-out predictions supports an empirical end-to-end acceptance claim."
    )
    summary_path = run_dir / "validation-summary.json"
    write_json(summary_path, overall)

    latest = DEFAULT_RESULTS_ROOT / "LATEST"
    latest.write_text(run_id + "\n", encoding="utf-8")
    print(json.dumps({
        "run_id": run_id,
        "profile": args.profile,
        "state": overall["state"],
        "summary": str(summary_path.relative_to(ROOT)),
        "phases": [{"phase": p.phase, "name": p.name, "status": p.status} for p in phases],
    }, indent=2))
    return 1 if hard_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
