#!/usr/bin/env python3
"""Benchmark Depth Anything V2 relative depth against Nutrition5k RGB-D.

The sparse-anchor fit is an *oracle calibration diagnostic*: it asks whether the
relative depth map contains enough geometric information to become useful after
metric calibration. It is not presented as proof that production photos have
those ground-truth anchors. Production scale/plate/reference calibration is a
separate acceptance gate.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from statistics import mean

import cv2  # type: ignore
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
PYROOT=ROOT/"nutrition-research"/"python"
import sys
sys.path.insert(0,str(PYROOT))
from movefuel_fdc.depth_anything_v2_adapter import DepthAnythingV2Small, fit_relative_to_metric, apply_metric_calibration  # noqa:E402


def sha(path:Path)->str:
    h=hashlib.sha256();
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1<<20),b''): h.update(b)
    return h.hexdigest()


def find_rgb_depth(dish:Path):
    files=[p for p in dish.rglob('*') if p.is_file()]
    rgb=next((p for p in files if 'rgb' in p.name.lower() and p.suffix.lower() in {'.png','.jpg','.jpeg'} and 'depth' not in p.name.lower()),None)
    depth=next((p for p in files if 'depth' in p.name.lower() and p.suffix.lower()=='.png' and 'color' not in p.name.lower()),None)
    return rgb,depth


def corr(a,b):
    if a.size<2:return None
    if np.std(a)==0 or np.std(b)==0:return None
    return float(np.corrcoef(a,b)[0,1])


def main()->int:
    ap=argparse.ArgumentParser()
    ap.add_argument('--n5k-overhead-root',type=Path,required=True)
    ap.add_argument('--repo',type=Path,required=True)
    ap.add_argument('--checkpoint',type=Path,required=True)
    ap.add_argument('--limit',type=int,default=20)
    ap.add_argument('--output',type=Path,required=True)
    args=ap.parse_args()
    model=DepthAnythingV2Small(args.repo,args.checkpoint)
    rows=[]
    rng=np.random.default_rng(20260810)
    for dish in sorted([p for p in args.n5k_overhead_root.iterdir() if p.is_dir()])[:args.limit]:
        rgb,dp=find_rgb_depth(dish)
        if not rgb or not dp: continue
        gt=cv2.imread(str(dp),cv2.IMREAD_UNCHANGED)
        if gt is None: continue
        gt=np.asarray(gt,dtype=np.float32)/10000.0
        rel=model.infer(rgb).depth
        if rel.shape!=gt.shape:
            rel=cv2.resize(rel,(gt.shape[1],gt.shape[0]),interpolation=cv2.INTER_LINEAR)
        valid=np.isfinite(gt)&(gt>0)&(gt<=0.4)&np.isfinite(rel)
        idx=np.flatnonzero(valid.ravel())
        if idx.size<100: continue
        # Fixed bounded sample prevents huge per-image memory use.
        if idx.size>20000: idx=rng.choice(idx,size=20000,replace=False)
        x=rel.ravel()[idx].astype(np.float64); y=gt.ravel()[idx].astype(np.float64)
        perm=rng.permutation(len(x)); split=max(8,int(len(x)*0.2)); train=perm[:split]; test=perm[split:]
        cal=fit_relative_to_metric(x[train],y[train],minimum_samples=8)
        metric=(cal.slope*x[test]+cal.intercept) if cal.sample_count>=8 else np.full(len(test),np.nan)
        ok=np.isfinite(metric)&(metric>0)
        rmse=float(np.sqrt(np.mean((metric[ok]-y[test][ok])**2))) if ok.any() else None
        mae=float(np.mean(np.abs(metric[ok]-y[test][ok]))) if ok.any() else None
        rows.append({
          'dish_id':dish.name,'rgb':str(rgb),'depth':str(dp),
          'relative_pearson':corr(x[test],y[test]),
          'oracle_sparse_anchor_calibration':cal.__dict__,
          'holdout_rmse_m':rmse,'holdout_mae_m':mae,'holdout_pixels':int(ok.sum())
        })
    valid_rmse=[r['holdout_rmse_m'] for r in rows if r['holdout_rmse_m'] is not None]
    report={
      'benchmark':'Nutrition5k RGB-D relative-depth diagnostic',
      'checkpoint_sha256':sha(args.checkpoint),
      'dish_count':len(rows),
      'mean_holdout_rmse_m':mean(valid_rmse) if valid_rmse else None,
      'production_metric_scale_proven':False,
      'warning':'Sparse fit uses held-out RGB-D ground truth as oracle anchors; production plate/reference/device-depth calibration still requires separate validation.',
      'rows':rows,
    }
    args.output.parent.mkdir(parents=True,exist_ok=True); args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n")
    print(json.dumps({k:v for k,v in report.items() if k!='rows'},indent=2))
    return 0 if rows else 2

if __name__=='__main__': raise SystemExit(main())
