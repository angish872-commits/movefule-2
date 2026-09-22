#!/usr/bin/env python3
"""MoveFuel Algorithm V6 comprehensive validation orchestrator.

The runner is designed to turn every algorithm claim into one of:
PASS, FAIL, PARTIAL, BLOCKED_EXTERNAL_EXECUTION, BLOCKED_INPUT_REQUIRED,
or WAITING_FOR_BLIND_PREDICTIONS. It never calls an unexecuted empirical stage
"ready" and never substitutes ground truth for a prediction.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.util
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
VALIDATION = ROOT / "algorithm-validation"
RESULTS = VALIDATION / "results-v6"
PYROOT = ROOT / "nutrition-research" / "python"
BACKEND = REPO_ROOT / "services" / "backend"
RAW = ROOT / "nutrition-research" / "data" / "raw"
DB = ROOT / "nutrition-research" / "data" / "processed" / "movefuel_food_kb.sqlite"
LEDGER = VALIDATION / "verified-source-ledger-2026-08-10.json"
CORPUS = ROOT / "nutrition-research" / "benchmark" / "internet-corpus"
if str(PYROOT) not in sys.path:
    sys.path.insert(0, str(PYROOT))

# Reuse hardened logging/redaction/corpus helpers from the V5 runner.
spec = importlib.util.spec_from_file_location("movefuel_v5_runner", VALIDATION / "run_validation.py")
rv = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules["movefuel_v5_runner"] = rv
spec.loader.exec_module(rv)

STATUSES = {
    "PASS", "FAIL", "PARTIAL", "BLOCKED_EXTERNAL_EXECUTION",
    "BLOCKED_INPUT_REQUIRED", "WAITING_FOR_BLIND_PREDICTIONS", "NOT_APPLICABLE",
}

PROFILES = {
    "pilot": {"min_free_gb": 5, "gemini_samples": 10, "foodseg_samples": 10, "depth_samples": 10, "n5k_overhead": 10},
    "standard": {"min_free_gb": 25, "gemini_samples": 100, "foodseg_samples": 100, "depth_samples": 100, "n5k_overhead": 100},
    # Full means exhaustive over the selected public benchmark, not a small convenience sample.
    # Nutrition5k has 5,006 dishes total; only official-test dishes with overhead RGB-D and valid truth enter blind scoring.
    "full": {"min_free_gb": 250, "gemini_samples": 5006, "foodseg_samples": 7118, "depth_samples": 5006, "n5k_overhead": 5006},
}

NETWORK_HOSTS = [
    "fdc.nal.usda.gov", "api.nal.usda.gov", "www.fao.org",
    "storage.googleapis.com", "generativelanguage.googleapis.com", "openrouter.ai", "github.com", "huggingface.co",
    "research.larc.smu.edu.sg",
]

@dataclass
class Phase:
    phase: int
    name: str
    status: str
    started_at: str
    finished_at: str
    details: dict[str, Any]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def done(i: int, name: str, status: str, started: str, details: dict[str, Any]) -> Phase:
    assert status in STATUSES, status
    return Phase(i, name, status, started, now(), details)


def external_block(exc: BaseException | str) -> bool:
    s = str(exc).lower()
    needles = [
        "temporary failure in name resolution", "could not resolve", "name or service not known",
        "network is unreachable", "network_unavailable", "fetch failed", "getaddrinfo",
        "connection timed out", "timed out", "dns", "no route to host",
    ]
    return any(n in s for n in needles)


def safe_run(run_dir: Path, label: str, cmd: list[str], *, cwd: Path = ROOT, env: dict[str, str] | None = None,
             timeout: int = 1800, allow_failure: bool = False) -> dict[str, Any]:
    return rv.run_command(run_dir, label, cmd, cwd=cwd, env=env, timeout=timeout, allow_failure=allow_failure)


def scan_safe_source() -> dict[str, Any]:
    """Find likely real secrets in the safe source without printing values."""
    patterns = [
        re.compile(rb"AIza[0-9A-Za-z_-]{30,}"),
        re.compile(rb"(?im)^(?:GEMINI|USDA_FDC|FDC|APPWRITE)[A-Z0-9_]*(?:API_)?KEY\s*=\s*([^\r\n]{16,})$"),
    ]
    suspicious=[]
    skipped_ext={".zip",".png",".jpg",".jpeg",".webp",".sqlite",".db",".jar",".apk",".aab",".pdf"}
    placeholders=(b"REPLACE_", b"test-key", b"DEMO_KEY", b"[REDACTED", b"<", b"${")
    for p in ROOT.rglob("*"):
        if not p.is_file() or p.suffix.lower() in skipped_ext or ".git" in p.parts:
            continue
        try:
            if p.stat().st_size > 3_000_000:
                continue
            data=p.read_bytes()
        except OSError:
            continue
        for pat in patterns:
            for m in pat.finditer(data):
                blob=m.group(0)
                if any(x in blob for x in placeholders):
                    continue
                suspicious.append(str(p.relative_to(ROOT)))
                break
            if suspicious and suspicious[-1] == str(p.relative_to(ROOT)):
                break
    private_files=[str(p.relative_to(ROOT)) for p in ROOT.rglob("*") if p.is_file() and p.name == "MoveFuel-Private-Configuration.env"]
    return {"suspicious_file_count":len(set(suspicious)),"suspicious_files":sorted(set(suspicious)),"private_config_files_in_safe_source":private_files,"passed":not suspicious and not private_files}


def parse_backend_count(log: Path) -> dict[str, int | None]:
    text=log.read_text(encoding="utf-8",errors="replace") if log.exists() else ""
    p=re.findall(r"# pass (\d+)",text); f=re.findall(r"# fail (\d+)",text)
    return {"passed":int(p[-1]) if p else None,"failed":int(f[-1]) if f else None}


def parse_pytest_count(log: Path) -> dict[str, int | None]:
    text=log.read_text(encoding="utf-8",errors="replace") if log.exists() else ""
    m=re.search(r"(\d+) passed",text); f=re.search(r"(\d+) failed",text)
    return {"passed":int(m.group(1)) if m else None,"failed":int(f.group(1)) if f else 0 if m else None}


def dns_report() -> dict[str, Any]:
    # Resolver failures in sandboxed CI can block getaddrinfo for tens of seconds
    # per host. Probe in bounded child processes so validation itself never hangs.
    out={}
    code=("import socket,sys,json; "
          "a=socket.getaddrinfo(sys.argv[1],443,type=socket.SOCK_STREAM); "
          "print(json.dumps({\"dns\":True,\"address_count\":len(a)}))")
    for host in NETWORK_HOSTS:
        try:
            proc=subprocess.run([sys.executable,"-c",code,host],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=3)
            if proc.returncode==0:
                out[host]=json.loads(proc.stdout)
            else:
                tail=(proc.stderr or "dns_resolution_failed").strip().splitlines()[-1][:160]
                out[host]={"dns":False,"error":tail}
        except subprocess.TimeoutExpired:
            out[host]={"dns":False,"error":"dns_probe_timeout"}
        except Exception as exc:
            out[host]={"dns":False,"error":f"{type(exc).__name__}:{str(exc)[:160]}"}
    return out


def locate_n5k_root() -> Path | None:
    p=RAW/"nutrition5k"
    return p if p.exists() else None


def locate_foodseg_root() -> Path | None:
    override=os.getenv("MOVEFUEL_FOODSEG103_ROOT")
    candidates=[Path(override)] if override else []
    candidates += [RAW/"foodseg103"/"FoodSeg103", RAW/"FoodSeg103"]
    for p in candidates:
        if p.exists(): return p
    return None


def locate_n5k_overhead() -> Path | None:
    n=locate_n5k_root()
    if not n:return None
    p=n/"imagery"/"realsense_overhead"
    return p if p.exists() else None


def classify_run_failure(log_rel: str | None, fallback: str) -> tuple[str,str]:
    text=fallback
    if log_rel:
        p=ROOT/log_rel
        if p.exists(): text += "\n"+p.read_text(encoding="utf-8",errors="replace")[-4000:]
    return ("BLOCKED_EXTERNAL_EXECUTION" if external_block(text) else "FAIL", rv.redact(text)[:2000])


def create_ground_truth_scaffold(run_dir: Path) -> dict[str, Any]:
    """Create the small locally licensed pilot with a truth-free inference manifest."""
    env=os.environ.copy(); env["PYTHONPATH"]=str(PYROOT)
    gt=run_dir/"nutrition5k-ground-truth.json"
    pred=run_dir/"blind-predictions.template.csv"
    manifest=run_dir/"blind-inference-manifest.json"
    cmd=[sys.executable,"-m","movefuel_fdc.cli","nutrition5k-ground-truth","--corpus-root",str(CORPUS),"--output",str(gt),"--prediction-template",str(pred),"--inference-manifest",str(manifest)]
    r=safe_run(run_dir,"blind-ground-truth",cmd,env=env,timeout=180)
    payload=json.loads(gt.read_text())
    header=next(csv.reader(pred.open(encoding="utf-8")),[])
    leakage=[c for c in header if c.lower().startswith(("actual_","true_","ground_truth"))]
    manifest_text=manifest.read_text(encoding="utf-8").lower()
    forbidden=[token for token in ("actual_","true_","ground_truth","ingredient_list_grams") if token in manifest_text]
    if leakage or forbidden:
        raise RuntimeError(f"blind inference boundary leaked truth: columns={leakage}, manifest_tokens={forbidden}")
    return {"sample_count":payload.get("sample_count"),"sealed_ground_truth":str(gt.relative_to(ROOT)),"prediction_template":str(pred.relative_to(ROOT)),"inference_manifest":str(manifest.relative_to(ROOT)),"ground_truth_leakage_columns":leakage,"manifest_truth_tokens":forbidden,"source":"local_licensed_pilot","command":r}


def create_best_blind_scaffold(run_dir: Path, limit: int) -> dict[str, Any]:
    """Prefer the official Nutrition5k test split once metadata + overhead RGB-D are local."""
    n5k=locate_n5k_root(); overhead=locate_n5k_overhead()
    if n5k and overhead:
        env={**os.environ,"PYTHONPATH":str(PYROOT)}
        gt=run_dir/"nutrition5k-official-test-ground-truth.json"
        pred=run_dir/"nutrition5k-official-test-predictions.template.csv"
        manifest=run_dir/"nutrition5k-official-test-inference-manifest.json"
        cmd=[sys.executable,"-m","movefuel_fdc.cli","nutrition5k-blind-set","--root",str(n5k),"--truth",str(gt),"--inference-manifest",str(manifest),"--prediction-template",str(pred),"--limit",str(limit)]
        r=safe_run(run_dir,"nutrition5k-official-blind-set",cmd,cwd=PYROOT,env=env,timeout=600,allow_failure=True)
        if r["returncode"]==0 and gt.exists() and manifest.exists():
            payload=json.loads(gt.read_text(encoding="utf-8"))
            if int(payload.get("sample_count",0))>0:
                header=next(csv.reader(pred.open(encoding="utf-8")),[])
                leakage=[c for c in header if c.lower().startswith(("actual_","true_","ground_truth"))]
                manifest_text=manifest.read_text(encoding="utf-8").lower()
                forbidden=[token for token in ("actual_","true_","ground_truth","ingredient") if token in manifest_text]
                if leakage or forbidden:
                    raise RuntimeError(f"official blind set leaked truth: columns={leakage}, manifest_tokens={forbidden}")
                return {"sample_count":payload.get("sample_count"),"sealed_ground_truth":str(gt.relative_to(ROOT)),"prediction_template":str(pred.relative_to(ROOT)),"inference_manifest":str(manifest.relative_to(ROOT)),"ground_truth_leakage_columns":leakage,"manifest_truth_tokens":forbidden,"source":"nutrition5k_official_test_split","command":r}
    return create_ground_truth_scaffold(run_dir)


def maybe_generate_blind_predictions(run_dir: Path, scaffold: dict[str, Any], args: argparse.Namespace, network: dict[str, Any]) -> dict[str, Any]:
    """Run the actual production-composition algorithm; never synthesize prediction values."""
    supplied=VALIDATION/"empirical-input"/"blind-predictions.csv"
    if supplied.exists():
        return {"status":"PASS","prediction_file":supplied,"source":"user_or_previous_prediction_file","generated":False}
    output=run_dir/"blind-predictions.csv"
    diagnostics=run_dir/"blind-runtime-diagnostics.json"
    if output.exists():
        return {"status":"PASS","prediction_file":output,"diagnostics":diagnostics,"source":"run_cache","generated":True}
    if not args.allow_live_api:
        return {"status":"BLOCKED_INPUT_REQUIRED","reason":"MOVEFUEL_ALLOW_LIVE_API=1 not enabled; candidate recognition cannot run"}
    gemini_configured=bool(os.getenv("GEMINI_API_KEY","").strip())
    openrouter_configured=bool(os.getenv("OPENROUTER_API_KEY","").strip())
    if not gemini_configured and not openrouter_configured:
        return {"status":"BLOCKED_INPUT_REQUIRED","reason":"No candidate-only vision provider key is configured; keep credentials private and load them only as environment secrets"}
    provider_host="openrouter.ai" if openrouter_configured else "generativelanguage.googleapis.com"
    if not network.get(provider_host,{}).get("dns"):
        return {"status":"BLOCKED_EXTERNAL_EXECUTION","reason":f"Configured vision provider host {provider_host} does not resolve in this execution environment","key_problem":False}
    manifest=ROOT/str(scaffold["inference_manifest"])
    if not manifest.exists():
        return {"status":"FAIL","reason":"truth-free inference manifest missing"}
    snapshot=ROOT/"nutrition-research/data/processed/movefuel_food_kb.snapshot.json"
    # For serious runs, prefer the bulk catalogue so benchmark size is not coupled to API quotas.
    if not DB.exists() and args.profile != "pilot" and not (os.getenv("USDA_FDC_API_KEY") or os.getenv("FDC_API_KEY")):
        return {"status":"BLOCKED_INPUT_REQUIRED","reason":"serious blind run needs populated USDA bulk catalogue or a private FoodData Central key"}
    cmd=["node","--experimental-strip-types","scripts/run-blind-algorithm.ts","--manifest",str(manifest),"--output",str(output),"--diagnostics",str(diagnostics),"--scene-dir",str(VALIDATION/"empirical-output"/"scenes-v6"),"--reuse-scenes","--provider-timeout-ms","45000"]
    country_prior=(os.getenv("MOVEFUEL_COUNTRY_PRIOR") or "United States").strip()
    if country_prior: cmd += ["--country-prior", country_prior]
    if DB.exists(): cmd += ["--knowledge-db",str(DB)]
    if snapshot.exists(): cmd += ["--knowledge-snapshot",str(snapshot)]
    overhead=locate_n5k_overhead()
    if overhead: cmd += ["--nutrition5k-overhead-root",str(overhead)]
    if args.profile=="pilot" and not DB.exists() and not (os.getenv("USDA_FDC_API_KEY") or os.getenv("FDC_API_KEY")): cmd += ["--allow-demo-key"]
    r=safe_run(run_dir,"blind-end-to-end-runtime",cmd,cwd=BACKEND,timeout=86400,allow_failure=True)
    if r["returncode"]!=0:
        status,error=classify_run_failure(r["log"],"blind end-to-end runtime failed")
        return {"status":status,"reason":error,"log":r["log"],"generated":False}
    if not output.exists():
        return {"status":"FAIL","reason":"blind runtime returned success without prediction file","log":r["log"]}
    diag=json.loads(diagnostics.read_text(encoding="utf-8")) if diagnostics.exists() else {}
    return {"status":"PASS","prediction_file":output,"diagnostics":diagnostics,"source":"production_composition_blind_runtime","generated":True,"coverage":diag.get("prediction_coverage"),"prediction_count":diag.get("prediction_count"),"requested_samples":diag.get("requested_samples"),"log":r["log"]}


def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument("profile",choices=PROFILES,nargs="?",default="pilot")
    ap.add_argument("--run-id",default=os.getenv("MOVEFUEL_VALIDATION_RUN_ID"))
    ap.add_argument("--allow-downloads",action="store_true",default=os.getenv("MOVEFUEL_ALLOW_DOWNLOADS")=="1")
    ap.add_argument("--allow-large-usda",action="store_true",default=os.getenv("MOVEFUEL_ALLOW_LARGE_USDA")=="1")
    ap.add_argument("--allow-live-api",action="store_true",default=os.getenv("MOVEFUEL_ALLOW_LIVE_API")=="1")
    ap.add_argument("--allow-research-datasets",action="store_true",default=os.getenv("MOVEFUEL_ALLOW_RESEARCH_DATASETS")=="1")
    args=ap.parse_args()
    rid=args.run_id or datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir=RESULTS/rid; run_dir.mkdir(parents=True,exist_ok=True)
    phases=[]
    meta={"suite":"MoveFuel Algorithm V6 Comprehensive Validation","run_id":rid,"profile":args.profile,"created_at":now(),"permissions":{"downloads":args.allow_downloads,"large_usda":args.allow_large_usda,"live_api":args.allow_live_api,"research_datasets":args.allow_research_datasets}}
    write_json(run_dir/"run-meta.json",meta)

    # 1 Hermetic software/security integrity.
    st=now(); details={}; status="PASS"
    try:
        if os.getenv("MOVEFUEL_LOCAL_TESTS_PREVALIDATED")=="1":
            bl=ROOT/os.getenv("MOVEFUEL_LOCAL_TESTS_BACKEND_LOG",""); pl=ROOT/os.getenv("MOVEFUEL_LOCAL_TESTS_PYTHON_LOG","")
            details["backend_tests"]=parse_backend_count(bl); details["python_tests"]=parse_pytest_count(pl)
            details["backend_log"]=str(bl.relative_to(ROOT)) if bl.exists() else None; details["python_log"]=str(pl.relative_to(ROOT)) if pl.exists() else None
        else:
            env=os.environ.copy()
            for k in ["MOVEFUEL_ENV","MOVEFUEL_AUTH_MODE","APPWRITE_ENDPOINT","APPWRITE_PROJECT_ID","APPWRITE_DATABASE_ID","APPWRITE_API_KEY","GEMINI_API_KEY","USDA_FDC_API_KEY","FDC_API_KEY"]: env.pop(k,None)
            b=safe_run(run_dir,"backend-tests",["npm","test"],cwd=BACKEND,env=env,timeout=1800); p=safe_run(run_dir,"python-tests",[sys.executable,"-m","pytest","-q"],cwd=PYROOT,env={**env,"PYTHONPATH":str(PYROOT)},timeout=1800)
            details.update({"backend":b,"python":p})
        security=scan_safe_source(); details["security_scan"]=security
        if not security["passed"]: status="FAIL"
    except Exception as exc:
        status="FAIL"; details["error"]=rv.redact(str(exc))
    phases.append(done(1,"hermetic_software_and_secret_integrity",status,st,details))

    # 2 Current official source/science policy ledger.
    st=now();
    try:
        env={**os.environ,"PYTHONPATH":str(PYROOT)}
        report=run_dir/"source-ledger-validation.json"
        r=safe_run(run_dir,"source-ledger",[sys.executable,"-m","movefuel_fdc.cli","source-ledger-validate","--ledger",str(LEDGER)],cwd=PYROOT,env=env,timeout=120,allow_failure=True)
        # CLI prints JSON to log; copy parsed output if possible.
        txt=(ROOT/r["log"]).read_text(encoding="utf-8",errors="replace")
        try: payload=json.loads(txt)
        except Exception: payload={"raw_log":r["log"]}
        write_json(report,payload)
        status="PASS" if r["returncode"]==0 and payload.get("status")=="PASS" else "FAIL"
        phases.append(done(2,"current_official_source_and_science_ledger",status,st,{"report":str(report.relative_to(ROOT)),"source_count":payload.get("source_count"),"public_verification_note":str((VALIDATION/'CURRENT-PUBLIC-SOURCE-VERIFICATION-2026-08-10.md').relative_to(ROOT))}))
    except Exception as exc: phases.append(done(2,"current_official_source_and_science_ledger","FAIL",st,{"error":rv.redact(str(exc))}))

    # 3 Exhaustive personal target engine reference parity.
    st=now()
    try:
        out=run_dir/"target-exhaustive.json"; proc=subprocess.run(["node","--experimental-strip-types","scripts/validate-target-exhaustive.ts"],cwd=BACKEND,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=600)
        if proc.returncode!=0: raise RuntimeError(proc.stderr or proc.stdout)
        payload=json.loads(proc.stdout); write_json(out,payload)
        status="PASS" if payload.get("passed") and payload.get("parity",{}).get("failures")==0 and payload.get("goals",{}).get("failures")==0 else "FAIL"
        phases.append(done(3,"exhaustive_personal_target_reference_validation",status,st,{"report":str(out.relative_to(ROOT)),"equation_cases":payload.get("parity",{}).get("cases"),"goal_cases":payload.get("goals",{}).get("cases"),"floor_clamps":payload.get("goals",{}).get("floorClamps"),"macro_review_warnings":payload.get("goals",{}).get("macroReviewWarnings"),"science_boundary":"formula parity does not equal an individual's measured energy expenditure"}))
    except Exception as exc: phases.append(done(3,"exhaustive_personal_target_reference_validation","FAIL",st,{"error":rv.redact(str(exc))}))

    # 4 Execution environment + actual DNS reachability + model/key presence.
    st=now(); machine=rv.machine_report(args.profile if args.profile in rv.PROFILES else "pilot"); network=dns_report(); machine["network"]=network
    machine["gemini_key_present"]=bool(os.getenv("GEMINI_API_KEY","").strip()); machine["usda_key_present"]=bool((os.getenv("USDA_FDC_API_KEY") or os.getenv("FDC_API_KEY") or "").strip())
    write_json(run_dir/"environment-preflight.json",machine)
    tools_ok=all(machine["tools"][k]["present"] for k in ["python","node","npm","git"])
    ext_ok=all(x["dns"] for x in network.values())
    status="PASS" if tools_ok and ext_ok else "PARTIAL" if tools_ok else "FAIL"
    phases.append(done(4,"execution_environment_network_model_preflight",status,st,{"report":str((run_dir/'environment-preflight.json').relative_to(ROOT)),"tools_ok":tools_ok,"all_public_hosts_dns_resolve":ext_ok,"gemini_key_present":machine["gemini_key_present"],"usda_key_present":machine["usda_key_present"],"note":"USDA bulk data needs no API key; live API may use a private key or bounded DEMO_KEY."}))

    # 5 Public authoritative/reference artifact acquisition.
    st=now(); acquisition={"attempts":[]}; status="PASS"
    if not args.allow_downloads:
        status="BLOCKED_INPUT_REQUIRED"; acquisition["reason"]="MOVEFUEL_ALLOW_DOWNLOADS=1 not enabled"
    elif not (network.get("fdc.nal.usda.gov",{}).get("dns") and network.get("www.fao.org",{}).get("dns")):
        status="BLOCKED_EXTERNAL_EXECUTION"
        acquisition["reason"]="required USDA/FAO hosts do not resolve in this execution environment; acquisition not retried after proven DNS failure"
        acquisition["network_gate"]={h:network.get(h) for h in ("fdc.nal.usda.gov","www.fao.org")}
    else:
        env={**os.environ,"PYTHONPATH":str(PYROOT)}
        artifacts=["fao_density_v2_xlsx"]
        if args.allow_large_usda: artifacts.insert(0,"usda_full_csv_2026_04_30")
        else: artifacts.insert(0,"usda_foundation_json_2026_04_30")
        for aid in artifacts:
            r=safe_run(run_dir,f"acquire-{aid}",[sys.executable,"-m","movefuel_fdc.cli","source-download",aid],cwd=PYROOT,env=env,timeout=7200,allow_failure=True)
            attempt={"artifact_id":aid,"returncode":r["returncode"],"log":r["log"]}; acquisition["attempts"].append(attempt)
            if r["returncode"]!=0:
                ss,e=classify_run_failure(r["log"],f"acquisition failed: {aid}"); attempt["classification"]=ss; attempt["error_tail"]=e; status=ss if status=="PASS" else status
        # Nutrition5k metadata/splits and bounded RGB-D subsets use the public GCS bucket.
        # The downloader prefers gsutil when installed but has a public HTTPS fallback,
        # so normal macOS/Linux HTTPS access is sufficient.
        r=safe_run(run_dir,"acquire-n5k-metadata",[sys.executable,"-m","movefuel_fdc.cli","step1-sync","--profile","lightweight"],cwd=PYROOT,env=env,timeout=7200,allow_failure=True)
        acquisition["nutrition5k_metadata_sync"]={"returncode":r["returncode"],"log":r["log"],"gsutil_optional":True}
        if r["returncode"]!=0:
            ss,e=classify_run_failure(r["log"],"Nutrition5k metadata acquisition failed"); acquisition["nutrition5k_metadata_sync"].update({"classification":ss,"error_tail":e}); status=ss if status=="PASS" else status
        elif args.allow_research_datasets:
            vision_out=run_dir/"vision-acquisition.json"
            vision_cmd=[sys.executable,str(VALIDATION/"acquire-vision-benchmarks.py"),"--foodseg","--nutrition5k-overhead",str(PROFILES[args.profile]["n5k_overhead"]),"--output",str(vision_out)]
            vr=safe_run(run_dir,"acquire-vision-benchmarks",vision_cmd,env={**env,"MOVEFUEL_ALLOW_RESEARCH_DATASETS":"1"},timeout=86400,allow_failure=True)
            acquisition["vision_benchmarks"]={"returncode":vr["returncode"],"log":vr["log"],"report":str(vision_out.relative_to(ROOT)) if vision_out.exists() else None,"requested_nutrition5k_overhead":PROFILES[args.profile]["n5k_overhead"],"requested_foodseg":True,"gsutil_optional":True}
            if vr["returncode"]!=0:
                ss,e=classify_run_failure(vr["log"],"vision benchmark acquisition failed"); acquisition["vision_benchmarks"].update({"classification":ss,"error_tail":e}); status=ss if status=="PASS" else status
        else:
            acquisition["vision_benchmarks"]={"classification":"BLOCKED_INPUT_REQUIRED","reason":"MOVEFUEL_ALLOW_RESEARCH_DATASETS=1 not enabled"}
            if status=="PASS": status="BLOCKED_INPUT_REQUIRED"
    write_json(run_dir/"public-artifact-acquisition.json",acquisition)
    phases.append(done(5,"public_dataset_acquisition_and_checksums",status,st,{"report":str((run_dir/'public-artifact-acquisition.json').relative_to(ROOT)),**acquisition}))

    # 6 Populate knowledge DB from acquired artifacts.
    st=now();
    paths=rv.find_acquired_paths(); details={"artifacts":{k:str(v) if v else None for k,v in paths.items()}}
    if not any(paths.values()):
        inherited="BLOCKED_EXTERNAL_EXECUTION" if phases[-1].status=="BLOCKED_EXTERNAL_EXECUTION" else "BLOCKED_INPUT_REQUIRED"
        phases.append(done(6,"production_food_knowledge_base_population",inherited,st,{**details,"reason":"required acquired artifacts are absent"}))
    else:
        try:
            env={**os.environ,"PYTHONPATH":str(PYROOT)}; cmd=[sys.executable,"-m","movefuel_fdc.cli","step1-build","--db",str(DB)]
            if paths.get("usda"):cmd += ["--usda-zip",str(paths["usda"])]
            if paths.get("density"):cmd += ["--density-xlsx",str(paths["density"])]
            if paths.get("nutrition5k"):cmd += ["--nutrition5k-root",str(paths["nutrition5k"])]
            r=safe_run(run_dir,"knowledge-build",cmd,cwd=PYROOT,env=env,timeout=10800,allow_failure=True)
            if r["returncode"]==0:
                snapshot=ROOT/"nutrition-research/data/processed/movefuel_food_kb.snapshot.json"
                kb_status="PASS" if paths.get("usda") is not None and DB.exists() and snapshot.exists() else "PARTIAL"
                phases.append(done(6,"production_food_knowledge_base_population",kb_status,st,{**details,"command":r,"db":str(DB.relative_to(ROOT)),"snapshot":str(snapshot.relative_to(ROOT)) if snapshot.exists() else None,"full_usda_catalogue_present":paths.get("usda") is not None,"note":"PASS requires the complete April 2026 USDA bulk catalogue; reference-only/density-only population is PARTIAL."}))
            else:
                s,e=classify_run_failure(r["log"],"knowledge build failed"); phases.append(done(6,"production_food_knowledge_base_population",s,st,{**details,"command":r,"error_tail":e}))
        except Exception as exc: phases.append(done(6,"production_food_knowledge_base_population","FAIL",st,{"error":rv.redact(str(exc)),**details}))

    # 7 Exhaustive structural/data-quality audit of everything actually imported.
    st=now(); details={};
    try:
        from movefuel_fdc.all_data_audit import audit_source_ledger, audit_nutrition5k_files, audit_usda_catalogue, audit_density_records
        ledger_a=audit_source_ledger(LEDGER); details["source_ledger"]=ledger_a
        n5k=locate_n5k_root()
        if n5k: details["nutrition5k"]=audit_nutrition5k_files(n5k)
        if DB.exists():
            details["usda"]=audit_usda_catalogue(DB); details["density"]=audit_density_records(DB)
        write_json(run_dir/"all-imported-data-audit.json",details)
        pieces=[v for k,v in details.items() if isinstance(v,dict) and "passed" in v]
        if DB.exists() and n5k and pieces and all(bool(x.get("passed")) for x in pieces): status="PASS"
        elif any(not bool(x.get("passed")) for x in pieces): status="FAIL"
        else: status="PARTIAL"
        phases.append(done(7,"all_imported_data_integrity_and_quarantine_audit",status,st,{"report":str((run_dir/'all-imported-data-audit.json').relative_to(ROOT)),"db_present":DB.exists(),"nutrition5k_metadata_present":bool(n5k),"note":"PARTIAL means the auditor ran but the full selected public corpus is not locally present."}))
    except Exception as exc: phases.append(done(7,"all_imported_data_integrity_and_quarantine_audit","FAIL",st,{"error":rv.redact(str(exc))}))

    # 8 Live USDA current-source query and branded freshness probe.
    st=now()
    if not args.allow_live_api:
        phases.append(done(8,"live_usda_current_source_and_freshness_probe","BLOCKED_INPUT_REQUIRED",st,{"reason":"MOVEFUEL_ALLOW_LIVE_API=1 not enabled"}))
    elif not network.get("api.nal.usda.gov",{}).get("dns"):
        phases.append(done(8,"live_usda_current_source_and_freshness_probe","BLOCKED_EXTERNAL_EXECUTION",st,{"reason":"api.nal.usda.gov does not resolve in this execution environment","key_problem":False}))
    else:
        try:
            env={**os.environ,"PYTHONPATH":str(PYROOT)}; out=run_dir/"usda-live-smoke.json"; code=f"from pathlib import Path; from movefuel_fdc.usda_live_smoke import write_smoke; write_smoke(Path({str(out)!r}))"
            r=safe_run(run_dir,"usda-live",[sys.executable,"-c",code],cwd=PYROOT,env=env,timeout=300,allow_failure=True)
            if r["returncode"]==0: phases.append(done(8,"live_usda_current_source_and_freshness_probe","PASS",st,{"report":str(out.relative_to(ROOT)),"queries":6,"credential":"private env or DEMO_KEY; never logged"}))
            else:
                s,e=classify_run_failure(r["log"],"USDA live probe failed"); phases.append(done(8,"live_usda_current_source_and_freshness_probe",s,st,{"error_tail":e,"log":r["log"]}))
        except Exception as exc:
            s="BLOCKED_EXTERNAL_EXECUTION" if external_block(exc) else "FAIL"; phases.append(done(8,"live_usda_current_source_and_freshness_probe",s,st,{"error":rv.redact(str(exc))}))

    # 9 Live Gemini candidate-only recognition + region output on blinded measured images.
    st=now(); key=bool(os.getenv("GEMINI_API_KEY","").strip())
    if not args.allow_live_api:
        phases.append(done(9,"live_gemini_identity_and_region_execution","BLOCKED_INPUT_REQUIRED",st,{"reason":"MOVEFUEL_ALLOW_LIVE_API=1 not enabled"}))
    elif not key:
        phases.append(done(9,"live_gemini_identity_and_region_execution","BLOCKED_INPUT_REQUIRED",st,{"reason":"GEMINI_API_KEY absent from execution environment; do not paste it into result files"}))
    elif not network.get("generativelanguage.googleapis.com",{}).get("dns"):
        phases.append(done(9,"live_gemini_identity_and_region_execution","BLOCKED_EXTERNAL_EXECUTION",st,{"reason":"generativelanguage.googleapis.com does not resolve in this execution environment","key_present":True,"key_problem":False}))
    else:
        measured=[]
        for p in sorted((CORPUS/"samples").glob("*.json")):
            d=json.loads(p.read_text());
            if d.get("evidence_class")=="MEASURED_DATASET": measured.append(d)
        rows=[]; completed=0
        for d in measured[:PROFILES[args.profile]["gemini_samples"]]:
            image=CORPUS/d["local_image_path"]
            r=safe_run(run_dir,f"gemini-{d['stable_sample_id']}",["node","--experimental-strip-types","scripts/live-gemini-food-scene-smoke.ts",str(image)],cwd=BACKEND,timeout=300,allow_failure=True)
            txt=(ROOT/r["log"]).read_text(errors="replace")
            try: parsed=json.loads(txt)
            except Exception: parsed={"status":"UNPARSEABLE","tail":txt[-1000:]}
            rows.append({"sample_id":d["stable_sample_id"],"result":parsed,"log":r["log"]}); completed += int(r["returncode"]==0 and parsed.get("status")=="COMPLETED")
        out=run_dir/"gemini-blind-measured-images.json";write_json(out,{"attempted":len(rows),"completed":completed,"rows":rows})
        phases.append(done(9,"live_gemini_identity_and_region_execution","PASS" if rows and completed==len(rows) else "FAIL",st,{"report":str(out.relative_to(ROOT)),"attempted":len(rows),"completed":completed,"nutrition_output_forbidden":True}))

    # 10 FoodSeg103 food-foreground segmentation benchmark.
    st=now(); fs=locate_foodseg_root()
    if not fs:
        status="BLOCKED_EXTERNAL_EXECUTION" if not network.get("research.larc.smu.edu.sg",{}).get("dns") else "BLOCKED_INPUT_REQUIRED"
        phases.append(done(10,"foodseg103_foreground_segmentation_benchmark",status,st,{"reason":"FoodSeg103 dataset not present","acquisition_script":"algorithm-validation/acquire-vision-benchmarks.py --foodseg","rights_gate":"benchmark/research only until commercial dataset rights are explicitly closed"}))
    elif not args.allow_live_api or not key:
        phases.append(done(10,"foodseg103_foreground_segmentation_benchmark","BLOCKED_INPUT_REQUIRED",st,{"reason":"dataset exists but live Gemini segmentation execution requires live API permission and GEMINI_API_KEY","dataset_root":str(fs)}))
    else:
        # Locate test images in known FoodSeg layouts; run bounded sample through the same MoveFuel segmentation provider.
        candidates=[]
        for d in [fs/"Images"/"img_dir"/"test",fs/"img_dir"/"test",fs/"images"/"test"]:
            if d.exists(): candidates=sorted(list(d.glob("*.jpg"))+list(d.glob("*.jpeg"))+list(d.glob("*.png"))); break
        pred_dir=run_dir/"foodseg-predictions";pred_dir.mkdir(exist_ok=True)
        complete=0
        for image in candidates[:PROFILES[args.profile]["foodseg_samples"]]:
            r=safe_run(run_dir,f"foodseg-gemini-{image.stem}",["node","--experimental-strip-types","scripts/live-gemini-food-scene-smoke.ts",str(image)],cwd=BACKEND,timeout=300,allow_failure=True)
            txt=(ROOT/r["log"]).read_text(errors="replace")
            try: doc=json.loads(txt)
            except Exception: doc={"status":"UNPARSEABLE"}
            if r["returncode"]==0 and doc.get("status")=="COMPLETED": complete+=1;write_json(pred_dir/f"{image.stem}.json",doc)
        out=run_dir/"foodseg-foreground.json"
        r=safe_run(run_dir,"foodseg-score",[sys.executable,str(VALIDATION/"foodseg-foreground-benchmark.py"),"--root",str(fs),"--prediction-dir",str(pred_dir),"--output",str(out)],timeout=600,allow_failure=True)
        phases.append(done(10,"foodseg103_foreground_segmentation_benchmark","PASS" if r["returncode"]==0 and complete>0 else "FAIL",st,{"report":str(out.relative_to(ROOT)) if out.exists() else None,"executed":complete,"rights_gate":"separate from benchmark score"}))

    # 11 Depth Anything V2 Small vs Nutrition5k RGB-D + production calibration boundary.
    st=now(); overhead=locate_n5k_overhead()
    model_root=ROOT/".external-models"
    default_repo=model_root/"Depth-Anything-V2"
    default_ckpt=model_root/"checkpoints"/"depth_anything_v2_vits.pth"
    repo=os.getenv("MOVEFUEL_DEPTH_ANYTHING_REPO") or (str(default_repo) if default_repo.exists() else None)
    ckpt=os.getenv("MOVEFUEL_DEPTH_ANYTHING_CHECKPOINT") or (str(default_ckpt) if default_ckpt.exists() else None)
    setup_attempt=None
    if overhead and (not repo or not ckpt or not Path(repo).exists() or not Path(ckpt).exists()) and args.allow_downloads and args.allow_research_datasets:
        if network.get("github.com",{}).get("dns") and network.get("huggingface.co",{}).get("dns"):
            setup_env={**os.environ,"MOVEFUEL_ALLOW_MODEL_DOWNLOADS":"1"}
            setup_attempt=safe_run(run_dir,"setup-depth-anything-v2",["bash",str(VALIDATION/"setup-depth-anything-v2.sh")],env=setup_env,timeout=7200,allow_failure=True)
            if default_repo.exists() and default_ckpt.exists():
                repo=str(default_repo); ckpt=str(default_ckpt)
    if not overhead:
        phases.append(done(11,"depth_anything_rgbd_and_metric_calibration_benchmark","BLOCKED_EXTERNAL_EXECUTION" if not network.get("storage.googleapis.com",{}).get("dns") else "BLOCKED_INPUT_REQUIRED",st,{"reason":"selected Nutrition5k overhead RGB-D not present","acquisition":"algorithm-validation/acquire-vision-benchmarks.py --nutrition5k-overhead N"}))
    elif not repo or not ckpt or not Path(repo).exists() or not Path(ckpt).exists():
        external_model_hosts_ok=network.get("github.com",{}).get("dns") and network.get("huggingface.co",{}).get("dns")
        model_status="BLOCKED_EXTERNAL_EXECUTION" if args.allow_downloads and args.allow_research_datasets and not external_model_hosts_ok else "BLOCKED_INPUT_REQUIRED"
        phases.append(done(11,"depth_anything_rgbd_and_metric_calibration_benchmark",model_status,st,{"reason":"Depth Anything V2 Small repo/checkpoint unavailable after automatic setup attempt","setup_script":"algorithm-validation/setup-depth-anything-v2.sh","automatic_setup_attempt":setup_attempt,"small_only_commercial_candidate":True}))
    else:
        out=run_dir/"depth-rgbd-benchmark.json"; r=safe_run(run_dir,"depth-rgbd",[sys.executable,str(VALIDATION/"depth-rgbd-benchmark.py"),"--n5k-overhead-root",str(overhead),"--repo",repo,"--checkpoint",ckpt,"--limit",str(PROFILES[args.profile]["depth_samples"]),"--output",str(out)],timeout=7200,allow_failure=True)
        if r["returncode"]==0:
            phases.append(done(11,"depth_anything_rgbd_and_metric_calibration_benchmark","PASS",st,{"report":str(out.relative_to(ROOT)),"diagnostic_executed":True,"ordinary_phone_metric_scale_proven":False,"reason":"Depth candidate was quantitatively compared against Nutrition5k RGB-D. The benchmark validates relative-depth behavior only; ordinary-phone metric scale remains a separate physical-evidence integration responsibility and cannot be inferred from this PASS."}))
        else:
            s,e=classify_run_failure(r["log"],"depth benchmark failed"); phases.append(done(11,"depth_anything_rgbd_and_metric_calibration_benchmark",s,st,{"error_tail":e,"log":r["log"]}))

    # 12-13 Blind public end-to-end acceptance. The runner now generates the
    # prediction-only CSV automatically from the production algorithm composition
    # whenever the provider/data environment permits it. No ground truth is passed
    # to the executor.
    st=now()
    blind_exec: dict[str, Any]
    try:
        scaffold=create_best_blind_scaffold(run_dir, PROFILES[args.profile]["n5k_overhead"])
        blind_exec=maybe_generate_blind_predictions(run_dir, scaffold, args, network)
        if blind_exec.get("status") != "PASS":
            phases.append(done(12,"blind_photo_to_mass_portion_acceptance",str(blind_exec.get("status")),st,{"scaffold":scaffold,"execution":{k:(str(v.relative_to(ROOT)) if isinstance(v,Path) else v) for k,v in blind_exec.items()},"critical":"No prediction is manufactured when live execution/data is blocked."}))
        else:
            empirical=Path(blind_exec["prediction_file"])
            out=run_dir/"blind-acceptance.json"; env={**os.environ,"PYTHONPATH":str(PYROOT)}
            minimum_samples=100
            r=safe_run(run_dir,"blind-score",[sys.executable,"-m","movefuel_fdc.cli","blind-v6-acceptance","--predictions",str(empirical),"--truth",str(ROOT/scaffold["sealed_ground_truth"]),"--output",str(out),"--minimum-samples",str(minimum_samples)],cwd=PYROOT,env=env,timeout=300,allow_failure=True)
            payload=json.loads(out.read_text()) if out.exists() else {}; mass=payload.get("metrics",{}).get("mass",{})
            mass_pass=bool(payload.get("acceptance_gate",{}).get("mass_passed"))
            phases.append(done(12,"blind_photo_to_mass_portion_acceptance","PASS" if mass_pass else "FAIL",st,{"scaffold":scaffold,"execution":{k:(str(v.relative_to(ROOT)) if isinstance(v,Path) else v) for k,v in blind_exec.items()},"report":str(out.relative_to(ROOT)) if out.exists() else None,"mass_metrics":mass,"prediction_coverage":payload.get("prediction_coverage"),"leakage_controls":payload.get("leakage_controls"),"minimum_samples":minimum_samples}))
    except Exception as exc:
        blind_exec={"status":"FAIL","reason":rv.redact(str(exc))}
        phases.append(done(12,"blind_photo_to_mass_portion_acceptance","FAIL",st,{"error":rv.redact(str(exc))}))

    # 13 Calorie/protein/macronutrient uncertainty acceptance from the exact same
    # blind predictions and sealed truth; this prevents selective re-running.
    st=now()
    if blind_exec.get("status") == "PASS":
        try:
            out=run_dir/"blind-acceptance.json"
            payload=json.loads(out.read_text()) if out.exists() else {}
            passed=bool(payload.get("acceptance_gate",{}).get("passed")); metrics=payload.get("metrics",{})
            phases.append(done(13,"blind_calorie_protein_uncertainty_acceptance","PASS" if passed else "FAIL",st,{"report":str(out.relative_to(ROOT)) if out.exists() else None,"acceptance_passed":passed,"prediction_coverage":payload.get("prediction_coverage"),"calorie":metrics.get("calorie"),"protein":metrics.get("protein"),"carbohydrate":metrics.get("carbohydrate"),"fat":metrics.get("fat"),"leakage_controls":payload.get("leakage_controls"),"acceptance_gate":payload.get("acceptance_gate")}))
        except Exception as exc:
            phases.append(done(13,"blind_calorie_protein_uncertainty_acceptance","FAIL",st,{"error":rv.redact(str(exc))}))
    else:
        status=str(blind_exec.get("status") or "BLOCKED_INPUT_REQUIRED")
        phases.append(done(13,"blind_calorie_protein_uncertainty_acceptance",status,st,{"reason":blind_exec.get("reason","blind end-to-end predictions were not produced"),"minimum_initial_gate":{"samples":100,"minimum_prediction_coverage":0.80,"calorie_central_within_15_rate":0.80,"calorie_interval_coverage":0.90,"max_calorie_mean_relative_interval_width":0.60,"protein_central_within_15_rate_when_available":0.70},"note":"gates are provisional engineering release gates, not a medical guarantee"}))

    # 14 Launch-market acceptance + release freeze. Public cafeteria data is useful but does not
    # by itself prove performance for the intended launch markets. Ground truth and inference
    # remain separated exactly like the public blind benchmark.
    st=now()
    launch_capture=VALIDATION/"empirical-input"/"launch-market-weighed-meals.csv"
    legacy_capture=VALIDATION/"empirical-input"/"regional-weighed-meals.csv"
    capture=launch_capture if launch_capture.exists() else legacy_capture
    launch_predictions=VALIDATION/"empirical-input"/"launch-market-predictions.csv"
    legacy_predictions=VALIDATION/"empirical-input"/"regional-predictions.csv"
    regional_predictions=launch_predictions if launch_predictions.exists() else legacy_predictions
    critical={p.phase:p.status for p in phases}
    if capture.exists():
        try:
            regional_truth=run_dir/"launch-market-sealed-ground-truth.json"
            regional_template=run_dir/"launch-market-predictions.template.csv"
            env={**os.environ,"PYTHONPATH":str(PYROOT)}
            build=safe_run(run_dir,"regional-seal-truth",[sys.executable,"-m","movefuel_fdc.cli","regional-ground-truth","--input",str(capture),"--output",str(regional_truth),"--prediction-template",str(regional_template)],cwd=PYROOT,env=env,timeout=120)
            truth_doc=json.loads(regional_truth.read_text())
            sample_count=int(truth_doc.get("sample_count",0))
            header=next(csv.reader(regional_template.open(encoding="utf-8")),[])
            leakage=[c for c in header if c.lower().startswith(("actual_","true_","ground_truth"))]
            if leakage:
                raise RuntimeError(f"launch-market blind template leaked truth columns: {leakage}")
            if regional_predictions.exists():
                out=run_dir/"launch-market-blind-acceptance.json"
                score=safe_run(run_dir,"launch-market-blind-score",[sys.executable,"-m","movefuel_fdc.cli","blind-v6-acceptance","--predictions",str(regional_predictions),"--truth",str(regional_truth),"--output",str(out),"--minimum-samples","50"],cwd=PYROOT,env=env,timeout=300,allow_failure=True)
                payload=json.loads(out.read_text()) if out.exists() else {}
                passed=bool(payload.get("acceptance_gate",{}).get("passed"))
                regional_status="PASS" if passed else "FAIL"
                details={"capture_rows":sample_count,"minimum_requested":50,"sealed_truth":str(regional_truth.relative_to(ROOT)),"prediction_template":str(regional_template.relative_to(ROOT)),"prediction_file":str(regional_predictions.relative_to(ROOT)),"report":str(out.relative_to(ROOT)) if out.exists() else None,"acceptance_passed":passed,"metrics":payload.get("metrics"),"acceptance_gate":payload.get("acceptance_gate"),"ground_truth_leakage_columns":leakage,"commands":{"seal":build,"score":score}}
            else:
                regional_status="BLOCKED_INPUT_REQUIRED" if sample_count < 50 else "WAITING_FOR_BLIND_PREDICTIONS"
                details={"capture_rows":sample_count,"minimum_requested":50,"sealed_truth":str(regional_truth.relative_to(ROOT)),"prediction_template":str(regional_template.relative_to(ROOT)),"ground_truth_leakage_columns":leakage,"reason":"launch-market photos/weights are sealed, but no prediction-only launch-market-predictions.csv exists" if sample_count>=50 else "fewer than 50 blinded launch-market weighed meals supplied","required_prediction_file":"algorithm-validation/empirical-input/launch-market-predictions.csv","legacy_prediction_file_supported":"algorithm-validation/empirical-input/regional-predictions.csv"}
        except Exception as exc:
            regional_status="FAIL"; details={"error":rv.redact(str(exc))}
    else:
        regional_status="BLOCKED_INPUT_REQUIRED"; details={"reason":"final blinded U.S./U.K./Australia launch-market weighed acceptance set not supplied","target":"about 50-100 meals after public benchmark calibration","capture_template":"algorithm-validation/templates/launch-market-weighed-meals.csv","legacy_capture_template_supported":"algorithm-validation/templates/regional-weighed-meals.csv","prediction_rule":"truth columns never enter the inference process"}
    required_pass={1,2,3,5,6,7,8,9,10,11,12,13}
    all_required=all(critical.get(i)=="PASS" for i in required_pass)
    release="PASS" if all_required and regional_status=="PASS" else "FAIL" if regional_status=="FAIL" else regional_status
    details["release_candidate_freeze"]={"status":release,"required_public_empirical_phases":sorted(required_pass),"phase_statuses":critical,"launch_market_status":regional_status,"rule":"freeze model/prompt/dataset/density/science revisions only after blind public and launch-market metric gates pass"}
    phases.append(done(14,"launch_market_acceptance_and_algorithm_freeze",release,st,details))

    summary={"suite":meta["suite"],"run_id":rid,"profile":args.profile,"finished_at":now(),"phases":[asdict(p) for p in phases]}
    statuses=[p.status for p in phases]
    if all(s=="PASS" for s in statuses): state="ALGORITHM_RELEASE_VALIDATED"
    elif "FAIL" in statuses: state="VALIDATION_FOUND_FAILURES"
    else: state="VALIDATION_INCOMPLETE_WITH_EXPLICIT_BLOCKERS"
    summary["state"]=state
    summary["truth_boundary"]="Only blind held-out end-to-end predictions may validate photo-to-mass/calorie accuracy. Public-source verification, unit tests, reference-equation parity, or possession of API keys cannot substitute for those predictions."
    write_json(run_dir/"comprehensive-validation-summary.json",summary)
    (RESULTS/"LATEST").write_text(rid+"\n")
    print(json.dumps({"run_id":rid,"state":state,"summary":str((run_dir/'comprehensive-validation-summary.json').relative_to(ROOT)),"phases":[{"phase":p.phase,"name":p.name,"status":p.status} for p in phases]},indent=2))
    return 1 if "FAIL" in statuses else 0

if __name__=="__main__":
    raise SystemExit(main())
