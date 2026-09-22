"""Leak-resistant blind meal acceptance scoring for the canonical MoveFuel algorithm.

Prediction files deliberately contain *no* ground-truth columns.  Ground truth is
joined only after inference has completed.  This prevents a benchmark harness or
provider wrapper from accidentally seeing the answer it is meant to predict.
"""
from __future__ import annotations

import csv
import json
import math
from pathlib import Path
from statistics import mean, median
from typing import Any

PRED_FIELDS = {
    "sample_id", "category",
    "predicted_min_g", "predicted_central_g", "predicted_max_g",
    "predicted_min_kcal", "predicted_central_kcal", "predicted_max_kcal",
    "predicted_min_protein_g", "predicted_central_protein_g", "predicted_max_protein_g",
    "predicted_min_carb_g", "predicted_central_carb_g", "predicted_max_carb_g",
    "predicted_min_fat_g", "predicted_central_fat_g", "predicted_max_fat_g",
    "prediction_state", "algorithm_version", "model_version",
}
FORBIDDEN_TRUTH_PREFIXES = ("actual_", "true_", "ground_truth")


def _num(value: str | float | int | None, *, field: str, sample_id: str, required: bool = True) -> float | None:
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            raise ValueError(f"{sample_id}: missing {field}")
        return None
    x = float(value)
    if not math.isfinite(x) or x < 0:
        raise ValueError(f"{sample_id}: {field} must be finite and non-negative")
    return x


def load_predictions(path: Path) -> list[dict[str, Any]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fields = set(reader.fieldnames or [])
        if "sample_id" not in fields:
            raise ValueError("prediction file missing sample_id")
        forbidden = sorted(f for f in fields if f.lower().startswith(FORBIDDEN_TRUTH_PREFIXES))
        if forbidden:
            raise ValueError(f"prediction file contains forbidden ground-truth columns: {forbidden}")
        unknown = sorted(fields - PRED_FIELDS)
        if unknown:
            # Unknown fields are blocked rather than silently ignored because they
            # could leak labels/weights under a different name.
            raise ValueError(f"prediction file contains unapproved columns: {unknown}")
        out=[]; seen=set()
        required = {"predicted_min_g","predicted_central_g","predicted_max_g","predicted_min_kcal","predicted_central_kcal","predicted_max_kcal"}
        if not required.issubset(fields):
            raise ValueError(f"prediction file missing required columns: {sorted(required-fields)}")
        for raw in reader:
            sid=(raw.get("sample_id") or "").strip()
            if not sid or sid in seen:
                raise ValueError("blank or duplicate sample_id in predictions")
            seen.add(sid)
            row={"sample_id":sid,"category":(raw.get("category") or "global").strip() or "global"}
            for name in fields - {"sample_id","category","prediction_state","algorithm_version","model_version"}:
                row[name]=_num(raw.get(name),field=name,sample_id=sid,required=name in required)
            row["prediction_state"]=(raw.get("prediction_state") or "COMPLETED").strip()
            row["algorithm_version"]=(raw.get("algorithm_version") or "").strip()
            row["model_version"]=(raw.get("model_version") or "").strip()
            for prefix in ("g","kcal","protein_g","carb_g","fat_g"):
                lo=row.get(f"predicted_min_{prefix}"); c=row.get(f"predicted_central_{prefix}"); hi=row.get(f"predicted_max_{prefix}")
                if lo is not None or c is not None or hi is not None:
                    if None in (lo,c,hi) or not (lo <= c <= hi):
                        raise ValueError(f"{sid}: unordered/incomplete {prefix} interval")
            out.append(row)
    return out


def load_sealed_truth(path: Path) -> dict[str, dict[str, Any]]:
    """Load either Nutrition5k or regional sealed truth in the shared schema."""
    doc=json.loads(path.read_text(encoding="utf-8"))
    result={}
    for sample in doc.get("samples",[]):
        sid=str(sample["sample_id"])
        if sid in result: raise ValueError(f"duplicate truth sample_id: {sid}")
        mass=sample.get("actual_mass_g")
        if mass is None:
            raise ValueError(f"{sid}: sealed truth missing actual_mass_g")
        kcal=sample.get("actual_calories_kcal")
        result[sid]={
            "actual_g":float(mass),
            "actual_kcal":float(kcal) if kcal is not None else None,
            "actual_protein_g":sample.get("actual_protein_g"),
            "actual_carb_g":sample.get("actual_carb_g"),
            "actual_fat_g":sample.get("actual_fat_g"),
        }
    return result

# Backward-compatible name used by earlier callers/tests.
def load_nutrition5k_truth(path: Path) -> dict[str, dict[str, Any]]:
    return load_sealed_truth(path)


def _metric(rows: list[dict[str, Any]], base: str, truth_key: str, tolerance: float=.15) -> dict[str, Any]:
    vals=[]
    for r in rows:
        truth=r.get(truth_key); c=r.get(f"predicted_central_{base}"); lo=r.get(f"predicted_min_{base}"); hi=r.get(f"predicted_max_{base}")
        if truth is None or c is None or lo is None or hi is None: continue
        truth=float(truth); c=float(c); lo=float(lo); hi=float(hi)
        vals.append((truth,c,lo,hi))
    if not vals: return {"sample_count":0}
    abs_err=[abs(c-t) for t,c,_,_ in vals]
    pct=[abs(c-t)/t for t,c,_,_ in vals if t>0]
    within=[1.0 if abs(c-t)<=t*tolerance else 0.0 for t,c,_,_ in vals if t>0]
    cov=[1.0 if lo<=t<=hi else 0.0 for t,_,lo,hi in vals]
    width=[(hi-lo)/t for t,_,lo,hi in vals if t>0]
    return {
        "sample_count":len(vals), "mae":mean(abs_err), "median_absolute_error":median(abs_err),
        "mape":mean(pct) if pct else None, "central_within_15_rate":mean(within) if within else None,
        "interval_coverage":mean(cov), "mean_relative_interval_width":mean(width) if width else None,
    }


def evaluate_blind_predictions(predictions_csv: Path, truth_json: Path, *, output_json: Path|None=None,
                               minimum_samples:int=100, minimum_prediction_coverage:float=.80,
                               minimum_mass_coverage:float=.85, maximum_mass_mape:float=.35,
                               minimum_calorie_within15:float=.80, minimum_calorie_coverage:float=.90,
                               max_calorie_interval_width:float=.60, minimum_protein_within15:float=.70) -> dict[str, Any]:
    pred=load_predictions(predictions_csv); truth=load_sealed_truth(truth_json)
    unknown=[r["sample_id"] for r in pred if r["sample_id"] not in truth]
    if unknown: raise ValueError(f"predictions contain ids absent from sealed truth: {unknown[:5]}")
    joined=[]
    for r in pred:
        joined.append({**r, **truth[r["sample_id"]]})
    missing_truth=sorted(set(truth)-{r["sample_id"] for r in pred})
    prediction_coverage=(len(pred)/len(truth)) if truth else 0.0
    coverage_pass=prediction_coverage>=minimum_prediction_coverage
    mass=_metric(joined,"g","actual_g")
    kcal=_metric(joined,"kcal","actual_kcal")
    protein=_metric(joined,"protein_g","actual_protein_g")
    carb=_metric(joined,"carb_g","actual_carb_g")
    fat=_metric(joined,"fat_g","actual_fat_g")
    by_cat={}
    for cat in sorted({r["category"] for r in joined}):
        group=[r for r in joined if r["category"]==cat]
        by_cat[cat]={"mass":_metric(group,"g","actual_g"),"calorie":_metric(group,"kcal","actual_kcal"),"protein":_metric(group,"protein_g","actual_protein_g")}
    mass_pass=(
        len(joined)>=minimum_samples and
        coverage_pass and
        mass.get("interval_coverage",0)>=minimum_mass_coverage and
        mass.get("mape",999)<=maximum_mass_mape
    )
    nutrition_pass=(
        len(joined)>=minimum_samples and
        coverage_pass and
        kcal.get("central_within_15_rate",0)>=minimum_calorie_within15 and
        kcal.get("interval_coverage",0)>=minimum_calorie_coverage and
        kcal.get("mean_relative_interval_width",999)<=max_calorie_interval_width and
        (protein.get("sample_count",0)==0 or protein.get("central_within_15_rate",0)>=minimum_protein_within15)
    )
    passed=mass_pass and nutrition_pass
    payload={
        "benchmark_version":"movefuel-blind-meal-acceptance-v6-1",
        "leakage_controls":{"prediction_has_ground_truth_columns":False,"truth_joined_after_inference":True},
        "prediction_count":len(pred),"truth_count":len(truth),"missing_prediction_count":len(missing_truth),
        "prediction_coverage":prediction_coverage,"missing_prediction_sample_ids":missing_truth[:50],
        "metrics":{"mass":mass,"calorie":kcal,"protein":protein,"carbohydrate":carb,"fat":fat,"by_category":by_cat},
        "acceptance_gate":{
            "minimum_samples":minimum_samples,"minimum_prediction_coverage":minimum_prediction_coverage,"prediction_coverage_passed":coverage_pass,
            "minimum_mass_interval_coverage":minimum_mass_coverage,"maximum_mass_mape":maximum_mass_mape,
            "mass_passed":mass_pass,"minimum_calorie_central_within_15_rate":minimum_calorie_within15,
            "minimum_calorie_interval_coverage":minimum_calorie_coverage,"maximum_calorie_mean_relative_interval_width":max_calorie_interval_width,
            "minimum_protein_central_within_15_rate_when_available":minimum_protein_within15,"nutrition_passed":nutrition_pass,"passed":passed,
        },
        "warning":"These are provisional engineering release gates, not medical guarantees. Regional held-out validation remains separate.",
    }
    if output_json:
        output_json.parent.mkdir(parents=True,exist_ok=True); output_json.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    return payload
