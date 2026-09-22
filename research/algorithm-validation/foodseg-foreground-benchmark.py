#!/usr/bin/env python3
"""Score MoveFuel region polygons against FoodSeg103 foreground masks.

This intentionally scores foreground food-region geometry, not FoodSeg103's
104-way ingredient semantic classification. That matches MoveFuel's
SegmentationAdapter responsibility: locate visible food regions; identity is a
separate stage.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from statistics import mean

import cv2  # type: ignore
import numpy as np


def locate_pairs(root: Path) -> list[tuple[Path, Path]]:
    image_dirs = [
        root / "Images" / "img_dir" / "test",
        root / "img_dir" / "test",
        root / "images" / "test",
    ]
    ann_dirs = [
        root / "Images" / "ann_dir" / "test",
        root / "ann_dir" / "test",
        root / "annotations" / "test",
    ]
    images = next((p for p in image_dirs if p.exists()), None)
    anns = next((p for p in ann_dirs if p.exists()), None)
    if not images or not anns:
        return []
    pairs=[]
    for img in sorted(list(images.glob("*.jpg")) + list(images.glob("*.jpeg")) + list(images.glob("*.png"))):
        ann=anns / f"{img.stem}.png"
        if ann.exists(): pairs.append((img,ann))
    return pairs


def polygon_mask(shape: tuple[int,int], regions: list[dict]) -> np.ndarray:
    h,w=shape
    pred=np.zeros((h,w),dtype=np.uint8)
    for region in regions:
        poly=region.get("maskPolygon")
        if isinstance(poly,list) and len(poly)>=3:
            pts=[]
            for p in poly:
                if isinstance(p,list) and len(p)==2:
                    x=max(0,min(w-1,round(float(p[0])*(w-1))))
                    y=max(0,min(h-1,round(float(p[1])*(h-1))))
                    pts.append([x,y])
            if len(pts)>=3:
                cv2.fillPoly(pred,[np.asarray(pts,dtype=np.int32)],1)
                continue
        box=region.get("bbox")
        if isinstance(box,dict):
            x0=max(0,min(w-1,round(float(box.get("x",0))*(w-1))))
            y0=max(0,min(h-1,round(float(box.get("y",0))*(h-1))))
            x1=max(x0+1,min(w,round((float(box.get("x",0))+float(box.get("width",0)))*w)))
            y1=max(y0+1,min(h,round((float(box.get("y",0))+float(box.get("height",0)))*h)))
            pred[y0:y1,x0:x1]=1
    return pred


def score(gt: np.ndarray,pred: np.ndarray)->dict:
    gt=(gt>0)
    pred=(pred>0)
    inter=int(np.logical_and(gt,pred).sum())
    union=int(np.logical_or(gt,pred).sum())
    gt_n=int(gt.sum()); pred_n=int(pred.sum())
    iou=inter/union if union else (1.0 if pred_n==0 else 0.0)
    recall=inter/gt_n if gt_n else (1.0 if pred_n==0 else 0.0)
    precision=inter/pred_n if pred_n else (1.0 if gt_n==0 else 0.0)
    return {"iou":iou,"foreground_recall":recall,"foreground_precision":precision,"gt_pixels":gt_n,"pred_pixels":pred_n}


def main()->int:
    ap=argparse.ArgumentParser()
    ap.add_argument("--root",type=Path,required=True)
    ap.add_argument("--prediction-dir",type=Path,required=True,help="JSON files named <image-stem>.json from MoveFuel live segmentation")
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    pairs=locate_pairs(args.root)
    rows=[]; missing=[]
    for image,ann in pairs:
        pp=args.prediction_dir/f"{image.stem}.json"
        if not pp.exists():
            missing.append(image.stem); continue
        pred_doc=json.loads(pp.read_text(encoding="utf-8"))
        regions=pred_doc.get("regions") or []
        gt=cv2.imread(str(ann),cv2.IMREAD_UNCHANGED)
        if gt is None: continue
        if gt.ndim==3: gt=np.any(gt!=0,axis=2).astype(np.uint8)
        h,w=gt.shape[:2]
        pm=polygon_mask((h,w),regions)
        row={"sample_id":image.stem,**score(gt,pm),"region_count":len(regions)}
        rows.append(row)
    summary={
      "benchmark":"FoodSeg103 foreground-union geometry",
      "semantic_class_miou_claimed":False,
      "available_pairs":len(pairs),
      "scored":len(rows),
      "missing_predictions":len(missing),
      "mean_iou":mean([r["iou"] for r in rows]) if rows else None,
      "mean_foreground_recall":mean([r["foreground_recall"] for r in rows]) if rows else None,
      "mean_foreground_precision":mean([r["foreground_precision"] for r in rows]) if rows else None,
      "rows":rows,
      "missing_prediction_ids":missing[:200],
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(summary,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in summary.items() if k not in {"rows","missing_prediction_ids"}},indent=2))
    return 0 if rows else 2

if __name__=="__main__": raise SystemExit(main())
